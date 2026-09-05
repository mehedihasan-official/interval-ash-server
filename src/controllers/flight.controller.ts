import { Request, Response } from 'express';
import { FilterQuery } from 'mongoose';
import { AirportModel } from '../models/airport.model';
import { FlightModel, IFlight } from '../models/flight.model';
import { AppError } from '../utils/app-error';
import { catchAsync } from '../utils/catch-async';
import { sendResponse } from '../utils/send-response';
import { calculateFlightPricing } from '../utils/flight-pricing';
import { applyRouteRetailPrice, resolveRouteContext, type RouteContext } from '../utils/route-context';
import {
  addMinutesToTimeLabel,
  estimateDurationMinutes,
  formatDurationLabel,
  getTripFareMultiplier,
  seededVariance,
} from '../utils/airport-geo';

// Plain (non-Mongoose) shape produced by .lean() plus the client-side
// pricing block we attach on the way out. Anywhere we hand a flight to
// the client, this is the shape it sees. We list the fields explicitly
// (rather than deriving from IFlight) because IFlight extends Mongoose
// Document, whose base properties would leak into filters/spreads if
// we omitted them via `keyof Document`.
interface PlainFlight {
  _id: unknown;
  flightId: string;
  airline: string;
  airlineLogo?: string;
  flightNumber: string;
  origin: string;
  originCity: string;
  destination: string;
  destinationCity: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  stops: number;
  stopLabel: string;
  cabinClass: IFlight['cabinClass'];
  retailPrice: number;
  seatsAvailable: number;
  aircraft: string;
  refundable: boolean;
  baggage: string;
  createdAt?: Date;
  updatedAt?: Date;
}

type ClientFlight = PlainFlight & { pricing: ReturnType<typeof calculateFlightPricing> };

/**
 * Attach the derived member/points pricing to a flight document.
 * We do this on the server so every caller (results list, detail
 * page, booking creator) reads the same numbers instead of each
 * recomputing them and drifting apart.
 */
function withPricing(flight: PlainFlight): ClientFlight {
  return { ...flight, pricing: calculateFlightPricing(flight.retailPrice) };
}

/**
 * Build the in-memory filter used for both DB queries and synthesized
 * results. When we fall back to synthesis (see below) we can't rely on
 * Mongo to apply cabin/airline/refundable/price filters for us, so the
 * same rules live here and get applied to the plain objects instead.
 */
const CABIN_CLASSES: readonly IFlight['cabinClass'][] = [
  'Economy',
  'Premium Economy',
  'Business',
  'First',
];

interface ParsedFilters {
  cabinClass: string;
  airline: string;
  stops: string;
  refundableOnly: boolean;
  minPrice: number;
  maxPrice: number;
}

function parseFilters(req: Request): ParsedFilters {
  return {
    cabinClass: String(req.query.cabinClass || '').trim(),
    airline: String(req.query.airline || '').trim(),
    stops: String(req.query.stops || '').trim(),
    refundableOnly:
      String(req.query.refundable || '').toLowerCase() === 'true',
    minPrice: Number(req.query.minPrice),
    maxPrice: Number(req.query.maxPrice),
  };
}

function buildMongoFilter(filters: ParsedFilters): FilterQuery<IFlight> {
  const filter: FilterQuery<IFlight> = {};
  if (filters.cabinClass) filter.cabinClass = filters.cabinClass;
  if (filters.airline) filter.airline = filters.airline;
  if (filters.refundableOnly) filter.refundable = true;

  if (filters.stops === 'nonstop') filter.stops = 0;
  else if (filters.stops === '1stop') filter.stops = 1;
  else if (filters.stops === '2plus') filter.stops = { $gte: 2 };

  if (!Number.isNaN(filters.minPrice) || !Number.isNaN(filters.maxPrice)) {
    const price: Record<string, number> = {};
    if (!Number.isNaN(filters.minPrice)) price.$gte = filters.minPrice;
    if (!Number.isNaN(filters.maxPrice)) price.$lte = filters.maxPrice;
    filter.retailPrice = price;
  }
  return filter;
}

function applyFiltersInMemory(
  flights: PlainFlight[],
  filters: ParsedFilters,
): PlainFlight[] {
  return flights.filter((flight) => {
    if (filters.cabinClass && flight.cabinClass !== filters.cabinClass) return false;
    if (filters.airline && flight.airline !== filters.airline) return false;
    if (filters.refundableOnly && !flight.refundable) return false;
    if (filters.stops === 'nonstop' && flight.stops !== 0) return false;
    if (filters.stops === '1stop' && flight.stops !== 1) return false;
    if (filters.stops === '2plus' && flight.stops < 2) return false;
    if (!Number.isNaN(filters.minPrice) && flight.retailPrice < filters.minPrice)
      return false;
    if (!Number.isNaN(filters.maxPrice) && flight.retailPrice > filters.maxPrice)
      return false;
    return true;
  });
}

/**
 * Build the result list for a route. We take every seeded flight as a
 * *template* for its airline/aircraft/times/cabin/baggage/refundable
 * properties, then rewrite origin/destination to match what the user
 * asked for and re-price it for the actual route and trip type.
 *
 * This runs for every route, including the ~20 that are seeded
 * directly. It used to only run for un-seeded pairs, which meant those
 * 20 routes kept their flat template fare — blind to trip type, and
 * the only rows on the whole site whose price didn't track distance.
 * One path means the results card and the receipt agree everywhere.
 */
async function buildRouteFlights(
  origin: string,
  destination: string,
  tripType: string,
): Promise<PlainFlight[]> {
  const [templates, context] = await Promise.all([
    FlightModel.find({}).lean<PlainFlight[]>(),
    resolveRouteContext(origin, destination),
  ]);

  if (templates.length === 0) return [];

  const tripFareMultiplier = getTripFareMultiplier(tripType);
  return templates.map((template) =>
    reshapeTemplate(template, context, origin, destination, tripFareMultiplier),
  );
}

/**
 * Rewrite a template flight for a specific origin/destination pair.
 * Keeps the airline, aircraft, cabin, refundable flag, seat count, and
 * baggage rules from the template (that's what makes the result list
 * feel varied) but recomputes anything the traveler would sanity-
 * check against the route: origin/destination + their cities, retail
 * price, flight duration, and arrival time.
 *
 * When we have no distance signal (both airports unlisted) we leave the
 * template's timings alone rather than fabricate a number — retail
 * still scales via the (minimum) multiplier.
 */
function reshapeTemplate(
  template: PlainFlight,
  context: RouteContext,
  origin: string,
  destination: string,
  tripFareMultiplier: number,
): PlainFlight {
  // Per-template deterministic seed so every flight on this route
  // jitters uniquely (different durations, different prices) but the
  // same request always returns the same numbers.
  const seed = `${origin}-${destination}-${template.flightId}`;

  const base: PlainFlight = {
    ...template,
    origin,
    originCity: context.originCity,
    destination,
    destinationCity: context.destinationCity,
    retailPrice: applyRouteRetailPrice(
      template.retailPrice,
      template.cabinClass,
      template.airline,
      context,
      seed,
      tripFareMultiplier,
    ),
  };

  if (context.distanceKm > 0) {
    // ±5% duration jitter — real same-route flights vary by wind and
    // aircraft type; without this every row shows an identical time
    // and the list reads as fake.
    const baseDurationMin = estimateDurationMinutes(context.distanceKm, template.stops);
    const durationMin = Math.round(baseDurationMin * seededVariance(seed, 0.05));
    base.duration = formatDurationLabel(durationMin);
    base.arrivalTime = addMinutesToTimeLabel(template.departureTime, durationMin);
  }

  return base;
}

/**
 * GET /api/flights
 *
 * Search flights by origin/destination, trip type, and optional
 * filters. Every airport pair a member picks from the autocomplete
 * produces on-route options, built from the seeded templates by
 * buildRouteFlights — no more "here's some random JFK-MIA flights when
 * you asked for MCO-DXB" surprises.
 *
 * `tripType` matters to the price, not just the itinerary: a round
 * trip is quoted for both legs, the way an airline site quotes it.
 * It defaults to `oneway` so a caller that omits it gets the cheaper,
 * more conservative number rather than a surprise doubling.
 */
export const searchFlights = catchAsync(async (req: Request, res: Response) => {
  const origin = String(req.query.origin || '').trim().toUpperCase();
  const destination = String(req.query.destination || '').trim().toUpperCase();
  const tripType = String(req.query.tripType || 'oneway').trim();
  const filters = parseFilters(req);

  // With a route we always rebuild from templates so the price reflects
  // this route and this trip type. Without one (an unfiltered browse of
  // the raw inventory) there's nothing to rebuild against, so the seeded
  // records go out as they are and Mongo does the filtering.
  const flights =
    origin && destination && origin !== destination
      ? applyFiltersInMemory(
          await buildRouteFlights(origin, destination, tripType),
          filters,
        )
      : await FlightModel.find(buildMongoFilter(filters)).lean<PlainFlight[]>();

  sendResponse(res, 200, 'Flights retrieved successfully', {
    flights: flights.map(withPricing),
    // Results are on-route by construction, so anything we return is an
    // exact match from the traveler's perspective.
    exactMatch: flights.length > 0,
    total: flights.length,
  });
});

/**
 * GET /api/flights/:id
 *
 * Fetch a single flight (by either its Mongo `_id` or the human-readable
 * `flightId` we assigned at seed time). Both are accepted because
 * different call sites have different pieces of information handy — the
 * search page holds `_id`, the confirmation page holds the human id.
 */
export const getFlightById = catchAsync(async (req: Request, res: Response) => {
  const id = String(req.params.id || '').trim();
  if (!id) throw new AppError('Flight id is required', 400);

  const filter: FilterQuery<IFlight> = /^[a-f0-9]{24}$/i.test(id)
    ? { $or: [{ _id: id }, { flightId: id }] }
    : { flightId: id };

  const flight = await FlightModel.findOne(filter).lean<PlainFlight | null>();
  if (!flight) throw new AppError('Flight not found', 404);

  sendResponse(res, 200, 'Flight retrieved successfully', withPricing(flight));
});

/**
 * POST /api/flights (admin)
 *
 * Create a new flight offering. Admin-only so members can't seed
 * arbitrary inventory into the search results.
 *
 * Both airports must already exist in the airports collection. A flight
 * to a code nobody can pick from the autocomplete is unreachable, and
 * without an airport record the route has no coordinates, so its
 * duration and price would fall back to the template value rather than
 * the real distance. Rejecting it up front with a pointer to "Add
 * Airport" beats silently storing a flight that never surfaces.
 *
 * `duration`, `arrivalTime` and `retailPrice` are optional: left blank,
 * they're derived from the route the same way every other flight on the
 * site is, so an admin only has to supply what they actually know.
 */
export const createFlight = catchAsync(async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  if (Object.keys(body).length === 0) {
    throw new AppError('Flight data cannot be empty', 400);
  }

  const text = (key: string) => String(body[key] ?? '').trim();
  const flightId = text('flightId');
  const airline = text('airline');
  const flightNumber = text('flightNumber');
  const origin = text('origin').toUpperCase();
  const destination = text('destination').toUpperCase();
  const departureTime = text('departureTime');
  const aircraft = text('aircraft');

  const missing = [
    !flightId && 'flight ID',
    !airline && 'airline',
    !flightNumber && 'flight number',
    !origin && 'origin',
    !destination && 'destination',
    !departureTime && 'departure time',
    !aircraft && 'aircraft',
  ].filter(Boolean);
  if (missing.length > 0) {
    throw new AppError(
      `Flight ${missing.join(', ')} ${missing.length > 1 ? 'are' : 'is'} required`,
      400,
    );
  }
  if (origin === destination) {
    throw new AppError('Origin and destination must be different airports', 400);
  }

  const existing = await FlightModel.findOne({ flightId });
  if (existing) {
    throw new AppError(
      `Flight ID ${flightId} is already used by ${existing.airline} ${existing.flightNumber}. Pick a different one.`,
      409,
    );
  }

  const [originAirport, destinationAirport] = await Promise.all([
    AirportModel.findOne({ code: origin }).lean(),
    AirportModel.findOne({ code: destination }).lean(),
  ]);
  const unknown = [
    !originAirport && origin,
    !destinationAirport && destination,
  ].filter(Boolean);
  if (unknown.length > 0) {
    throw new AppError(
      `${unknown.join(' and ')} ${unknown.length > 1 ? 'are' : 'is'} not in the airport list yet. Add ${unknown.length > 1 ? 'them' : 'it'} under Add Airport first.`,
      400,
    );
  }

  const cabinClass = (CABIN_CLASSES as readonly string[]).includes(text('cabinClass'))
    ? (text('cabinClass') as IFlight['cabinClass'])
    : 'Economy';
  const stops = Math.max(0, Number(body.stops) || 0);

  // Fill in whatever the admin left blank from the route itself, using
  // the same helpers the search endpoint uses, so a hand-added flight
  // sits on the same curve as every seeded one.
  //
  // Only airports with known coordinates give a distance to work from
  // (see AIRPORT_COORDS). Without one we ask for the number rather than
  // inventing it — the fallbacks would quietly produce a 55m, $79
  // flight regardless of how far apart the two airports really are.
  const context = await resolveRouteContext(origin, destination);
  const hasDistance = context.distanceKm > 0;

  const submittedDuration = text('duration');
  const submittedArrival = text('arrivalTime');
  if (!hasDistance && (!submittedDuration || !submittedArrival)) {
    throw new AppError(
      `We can't measure ${origin} to ${destination} automatically. Please fill in the duration and arrival time.`,
      400,
    );
  }
  const durationMinutes = estimateDurationMinutes(context.distanceKm, stops);
  const duration = submittedDuration || formatDurationLabel(durationMinutes);
  const arrivalTime =
    submittedArrival || addMinutesToTimeLabel(departureTime, durationMinutes);

  const submittedPrice = Number(body.retailPrice);
  const hasSubmittedPrice = Number.isFinite(submittedPrice) && submittedPrice > 0;
  if (!hasSubmittedPrice && !hasDistance) {
    throw new AppError(
      `We can't work out a fare for ${origin} to ${destination} automatically. Please enter a retail price.`,
      400,
    );
  }
  const retailPrice = hasSubmittedPrice
    ? Math.round(submittedPrice)
    : applyRouteRetailPrice(0, cabinClass, airline, context, flightId);

  const created = await FlightModel.create({
    flightId,
    airline,
    airlineLogo: text('airlineLogo'),
    flightNumber,
    origin,
    originCity: text('originCity') || originAirport!.city,
    destination,
    destinationCity: text('destinationCity') || destinationAirport!.city,
    departureTime,
    arrivalTime,
    duration,
    stops,
    stopLabel: text('stopLabel') || (stops === 0 ? 'Nonstop' : `${stops} stop${stops > 1 ? 's' : ''}`),
    cabinClass,
    retailPrice,
    seatsAvailable: Math.max(0, Number(body.seatsAvailable) || 0),
    aircraft,
    refundable: body.refundable === true || body.refundable === 'true',
    baggage: text('baggage') || '1 carry-on included',
  });

  const plain = created.toObject() as PlainFlight;
  sendResponse(res, 201, 'Flight created successfully', withPricing(plain));
});

/**
 * PATCH /api/flights/:id (admin)
 */
export const updateFlight = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updated = await FlightModel.findByIdAndUpdate(
    id,
    { $set: req.body },
    { new: true, runValidators: true },
  ).lean<PlainFlight | null>();
  if (!updated) throw new AppError('Flight not found', 404);
  sendResponse(res, 200, 'Flight updated successfully', withPricing(updated));
});

/**
 * DELETE /api/flights/:id (admin)
 */
export const deleteFlight = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const deleted = await FlightModel.findByIdAndDelete(id);
  if (!deleted) throw new AppError('Flight not found', 404);
  sendResponse(res, 200, 'Flight deleted successfully', deleted);
});
