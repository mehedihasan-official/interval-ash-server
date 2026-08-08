import { Request, Response } from 'express';
import { FilterQuery } from 'mongoose';
import { FlightModel, IFlight } from '../models/flight.model';
import { AppError } from '../utils/app-error';
import { catchAsync } from '../utils/catch-async';
import { sendResponse } from '../utils/send-response';
import { calculateFlightPricing } from '../utils/flight-pricing';
import { applyRouteMultiplier, resolveRouteContext } from '../utils/route-context';

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

function buildMongoFilter(
  filters: ParsedFilters,
  route?: { origin: string; destination: string },
): FilterQuery<IFlight> {
  const filter: FilterQuery<IFlight> = {};
  if (route?.origin) filter.origin = route.origin;
  if (route?.destination) filter.destination = route.destination;
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
 * Build a set of flight results for a route that isn't directly seeded
 * in the DB (which is most of the ~615,000 possible airport pairs among
 * our 785 seeded airports). We take every seeded flight as a *template*
 * for its airline/aircraft/times/cabin/baggage/refundable properties,
 * then rewrite origin/destination to match what the user asked for.
 *
 * Pricing is nudged so international itineraries feel realistically
 * more expensive than domestic ones — we bump the retail price by a
 * multiplier tied to whether the two airports are in different
 * countries. Every other number the client shows (member price, points,
 * fees) is derived from retail via the shared pricing helper, so the
 * bump propagates consistently.
 */
async function synthesizeFlightsForRoute(
  origin: string,
  destination: string,
): Promise<PlainFlight[]> {
  const [templates, context] = await Promise.all([
    FlightModel.find({}).lean<PlainFlight[]>(),
    resolveRouteContext(origin, destination),
  ]);

  if (templates.length === 0) return [];

  return templates.map((template) => ({
    ...template,
    origin,
    originCity: context.originCity,
    destination,
    destinationCity: context.destinationCity,
    retailPrice: applyRouteMultiplier(template.retailPrice, context),
  }));
}

/**
 * GET /api/flights
 *
 * Search flights by origin/destination and optional filters. If the
 * requested route isn't seeded in the flights collection, we synthesize
 * a full set of results on-the-fly (see synthesizeFlightsForRoute) so
 * every airport pair a member picks from the autocomplete produces
 * on-route options — no more "here's some random JFK-MIA flights when
 * you asked for MCO-DXB" surprises.
 */
export const searchFlights = catchAsync(async (req: Request, res: Response) => {
  const origin = String(req.query.origin || '').trim().toUpperCase();
  const destination = String(req.query.destination || '').trim().toUpperCase();
  const filters = parseFilters(req);

  // Try the exact route first — if someone happens to search a route we
  // did seed (say JFK→MIA), we prefer the real records over synthesis.
  let flights = await FlightModel.find(
    buildMongoFilter(filters, origin && destination ? { origin, destination } : undefined),
  ).lean<PlainFlight[]>();

  let exactMatch = flights.length > 0;

  // No direct match on the route → synthesize. This is the common case
  // because we only seed 20 routes, so 99%+ of user searches take this
  // branch and receive flights whose origin/destination match exactly
  // what they typed.
  if (!exactMatch && origin && destination && origin !== destination) {
    const synthesized = await synthesizeFlightsForRoute(origin, destination);
    flights = applyFiltersInMemory(synthesized, filters);
    // Synthesized results are on-route by construction, so it's still
    // an exact match from the traveler's perspective.
    exactMatch = flights.length > 0;
  }

  sendResponse(res, 200, 'Flights retrieved successfully', {
    flights: flights.map(withPricing),
    exactMatch,
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
 * Create a new flight offering. Admin-only so members can't seed
 * arbitrary inventory into the search results.
 */
export const createFlight = catchAsync(async (req: Request, res: Response) => {
  const body = req.body;
  if (!body || Object.keys(body).length === 0) {
    throw new AppError('Flight data cannot be empty', 400);
  }
  const created = await FlightModel.create(body);
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
