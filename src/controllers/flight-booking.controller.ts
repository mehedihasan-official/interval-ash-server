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

  const seatSelections = body.addOns?.seatSelections ?? [];
  const extraBaggage = body.addOns?.extraBaggage ?? false;
  const seatCount = countSelectedSeats(seatSelections);

  const basePricing = calculateFlightPricing(flight.retailPrice);
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
      origin: flight.origin,
      originCity: flight.originCity,
      destination: flight.destination,
      destinationCity: flight.destinationCity,
      departureTime: flight.departureTime,
      arrivalTime: flight.arrivalTime,
      duration: flight.duration,
      cabinClass: flight.cabinClass,
      aircraft: flight.aircraft,
      stopLabel: flight.stopLabel,
      baggage: flight.baggage,
      refundable: flight.refundable,
      retailPrice: flight.retailPrice,
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
