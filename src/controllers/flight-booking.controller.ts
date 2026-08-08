import { Request, Response } from 'express';
import { FilterQuery } from 'mongoose';
import { FlightModel } from '../models/flight.model';
import {
  FlightBookingModel,
  IFlightBooking,
  IFlightPassenger,
} from '../models/flight-booking.model';
import { AppError } from '../utils/app-error';
import { catchAsync } from '../utils/catch-async';
import { sendResponse } from '../utils/send-response';
import {
  FLIGHT_ADDON_PRICING,
  calculateFlightPricing,
} from '../utils/flight-pricing';
import { applyRouteMultiplier, resolveRouteContext } from '../utils/route-context';

type SeatSelection = string | null;

interface CreateBookingBody {
  email: string;
  flightId: string;
  tripType?: 'oneway' | 'roundtrip' | 'multicity';
  departureDate: string;
  returnDate?: string | null;
  passengers: IFlightPassenger[];
  contactInfo: { email: string; phone: string };
  addOns?: { extraBaggage?: boolean; seatSelections?: SeatSelection[] };
  paymentMethod: 'cash' | 'points';
  // When the traveler booked a synthesized-route flight (any route the
  // seed data doesn't cover directly), the client passes the actual
  // origin/destination it displayed so the booking snapshot records
  // MCO→DXB instead of the template flight's original JFK→MIA.
  routeOverride?: { origin: string; destination: string };
}

/**
 * Format: PC-YYYY-XXXXXX where XXXXXX is a short random suffix. Kept
 * short enough to type over the phone if a member needs support, and
 * unique in practice because it embeds the year and the collection is
 * uniqueness-indexed on this field.
 */
function generateBookingReference(): string {
  const year = new Date().getFullYear();
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `PC-${year}-${suffix}`;
}

function countSelectedSeats(seats: SeatSelection[] | undefined) {
  if (!Array.isArray(seats)) return 0;
  return seats.filter(Boolean).length;
}

/**
 * POST /api/flight-bookings
 *
 * Create a confirmed flight booking. All pricing is recomputed on the
 * server from the flight's current retail price plus the requested
 * add-ons, so the client can't submit a low-balled amount — the client
 * only tells us which flight, who's flying, and how they want to pay.
 */
export const createFlightBooking = catchAsync(async (req: Request, res: Response) => {
  const body = req.body as CreateBookingBody;

  if (!body?.email) throw new AppError('Booking email is required', 400);
  if (!body?.flightId) throw new AppError('Flight id is required', 400);
  if (!Array.isArray(body?.passengers) || body.passengers.length === 0) {
    throw new AppError('At least one passenger is required', 400);
  }
  if (!body?.contactInfo?.email || !body?.contactInfo?.phone) {
    throw new AppError('Contact email and phone are required', 400);
  }
  if (body.paymentMethod !== 'cash' && body.paymentMethod !== 'points') {
    throw new AppError('Payment method must be either cash or points', 400);
  }

  const flight = /^[a-f0-9]{24}$/i.test(body.flightId)
    ? await FlightModel.findById(body.flightId)
    : await FlightModel.findOne({ flightId: body.flightId });

  if (!flight) throw new AppError('Flight not found', 404);

  // If the traveler booked a route the seed data didn't have (the common
  // case), the client sends the origin/destination it actually showed
  // them. We resolve that route the same way the search endpoint did so
  // the snapshot's route, city names, and retail price all match what
  // the traveler saw when they clicked "Complete Booking".
  const overrideOrigin = body.routeOverride?.origin?.trim().toUpperCase();
  const overrideDestination = body.routeOverride?.destination?.trim().toUpperCase();
  const hasRouteOverride =
    !!overrideOrigin &&
    !!overrideDestination &&
    (overrideOrigin !== flight.origin || overrideDestination !== flight.destination);

  const snapshotOrigin = hasRouteOverride ? overrideOrigin! : flight.origin;
  const snapshotDestination = hasRouteOverride
    ? overrideDestination!
    : flight.destination;
  let snapshotOriginCity = flight.originCity;
  let snapshotDestinationCity = flight.destinationCity;
  let effectiveRetailPrice = flight.retailPrice;

  if (hasRouteOverride) {
    const context = await resolveRouteContext(snapshotOrigin, snapshotDestination);
    snapshotOriginCity = context.originCity;
    snapshotDestinationCity = context.destinationCity;
    effectiveRetailPrice = applyRouteMultiplier(flight.retailPrice, context);
  }

  const seatSelections = body.addOns?.seatSelections ?? [];
  const extraBaggage = body.addOns?.extraBaggage ?? false;
  const seatCount = countSelectedSeats(seatSelections);

  const basePricing = calculateFlightPricing(effectiveRetailPrice);
  const addOnsCash =
    seatCount * FLIGHT_ADDON_PRICING.seatCash +
    (extraBaggage ? FLIGHT_ADDON_PRICING.baggageCash : 0);
  const addOnsPoints =
    seatCount * FLIGHT_ADDON_PRICING.seatPoints +
    (extraBaggage ? FLIGHT_ADDON_PRICING.baggagePoints : 0);

  const pricing = {
    ...basePricing,
    addOnsCash,
    addOnsPoints,
    grandTotalCash: Math.round((basePricing.discountedPrice + addOnsCash) * 100) / 100,
    grandTotalPoints: basePricing.totalPoints + addOnsPoints,
  };

  const booking = await FlightBookingModel.create({
    bookingReference: generateBookingReference(),
    email: body.email.trim().toLowerCase(),
    flightId: flight._id,
    flightSnapshot: {
      flightId: flight.flightId,
      airline: flight.airline,
      airlineLogo: flight.airlineLogo,
      flightNumber: flight.flightNumber,
      origin: snapshotOrigin,
      originCity: snapshotOriginCity,
      destination: snapshotDestination,
      destinationCity: snapshotDestinationCity,
      departureTime: flight.departureTime,
      arrivalTime: flight.arrivalTime,
      duration: flight.duration,
      cabinClass: flight.cabinClass,
      aircraft: flight.aircraft,
      stopLabel: flight.stopLabel,
      baggage: flight.baggage,
      refundable: flight.refundable,
      retailPrice: effectiveRetailPrice,
    },
    tripType: body.tripType ?? 'oneway',
    departureDate: body.departureDate,
    returnDate: body.returnDate ?? null,
    passengers: body.passengers,
    contactInfo: body.contactInfo,
    addOns: { extraBaggage, seatSelections },
    paymentMethod: body.paymentMethod,
    pricing,
  });

  sendResponse(res, 201, 'Flight booking confirmed', booking);
});

/**
 * GET /api/flight-bookings/reference/:reference
 *
 * Look up a single booking by its human-readable reference — this is
 * the id we show on the confirmation page, so page reloads still work
 * without keeping the Mongo `_id` in the URL.
 */
export const getFlightBookingByReference = catchAsync(
  async (req: Request, res: Response) => {
    const reference = String(req.params.reference || '').trim();
    if (!reference) throw new AppError('Booking reference is required', 400);

    const booking = await FlightBookingModel.findOne({ bookingReference: reference });
    if (!booking) throw new AppError('Flight booking not found', 404);

    sendResponse(res, 200, 'Flight booking retrieved successfully', booking);
  }
);

/**
 * GET /api/flight-bookings?email=user@example.com
 *
 * List the current member's flight bookings, newest first, so the
 * dashboard's "my flights" list can render without needing a per-user
 * pre-aggregation.
 */
export const getFlightBookingsByEmail = catchAsync(
  async (req: Request, res: Response) => {
    const email = String(req.query.email || '').trim().toLowerCase();
    if (!email) throw new AppError('Email is required', 400);

    const filter: FilterQuery<IFlightBooking> = { email };
    const bookings = await FlightBookingModel.find(filter).sort({ createdAt: -1 });

    sendResponse(res, 200, 'Flight bookings retrieved successfully', bookings);
  }
);
