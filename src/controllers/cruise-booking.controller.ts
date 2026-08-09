import { Request, Response } from 'express';
import { FilterQuery } from 'mongoose';
import { CruiseModel, CabinKey } from '../models/cruise.model';
import {
  CruiseBookingModel,
  ICruiseBooking,
  ICruiseBookingAddOns,
  ICruiseGuest,
} from '../models/cruise-booking.model';
import { AppError } from '../utils/app-error';
import { catchAsync } from '../utils/catch-async';
import { sendResponse } from '../utils/send-response';
import { calculateCruisePricing } from '../utils/cruise-pricing';

interface CreateCruiseBookingBody {
  email: string;
  cruiseId: string;
  cabinType: CabinKey;
  departureDate: string;
  guests: ICruiseGuest[];
  contactInfo: { email: string; phone: string };
  addOns?: Partial<ICruiseBookingAddOns>;
  paymentMethod: 'cash' | 'points';
}

const VALID_CABIN_KEYS: CabinKey[] = ['inside', 'outside', 'balcony', 'suite'];

function generateBookingReference(): string {
  const year = new Date().getFullYear();
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `CS-${year}-${suffix}`;
}

// Cruise return date isn't part of the input — every cruise stores its
// own duration, so we compute the return by adding nights to the picked
// departure. Keeps the client from having to know or store two dates.
function addNights(dateIso: string, nights: number): string {
  const departure = new Date(dateIso);
  if (Number.isNaN(departure.getTime())) return dateIso;
  const returnDate = new Date(departure.getTime() + nights * 86400000);
  return returnDate.toISOString().slice(0, 10);
}

function countGuestsByType(guests: ICruiseGuest[]) {
  let adults = 0;
  let children = 0;
  let infants = 0;
  for (const g of guests) {
    if (g.type === 'Adult') adults += 1;
    else if (g.type === 'Child') children += 1;
    else if (g.type === 'Infant') infants += 1;
  }
  return { adults, children, infants };
}

/**
 * POST /api/cruise-bookings
 *
 * Records a confirmed cruise booking. The server recomputes every
 * dollar from the cruise's stored cabin price + party composition + add-ons,
 * so the client can't submit a tampered total.
 */
export const createCruiseBooking = catchAsync(
  async (req: Request, res: Response) => {
    const body = req.body as CreateCruiseBookingBody;

    if (!body?.email) throw new AppError('Booking email is required', 400);
    if (!body?.cruiseId) throw new AppError('Cruise id is required', 400);
    if (!body?.cabinType || !VALID_CABIN_KEYS.includes(body.cabinType)) {
      throw new AppError('A valid cabin type is required', 400);
    }
    if (!body?.departureDate) throw new AppError('Departure date is required', 400);
    if (!Array.isArray(body?.guests) || body.guests.length === 0) {
      throw new AppError('At least one guest is required', 400);
    }
    if (!body?.contactInfo?.email || !body?.contactInfo?.phone) {
      throw new AppError('Contact email and phone are required', 400);
    }
    if (body.paymentMethod !== 'cash' && body.paymentMethod !== 'points') {
      throw new AppError('Payment method must be either cash or points', 400);
    }

    const cruise = /^[a-f0-9]{24}$/i.test(body.cruiseId)
      ? await CruiseModel.findById(body.cruiseId)
      : await CruiseModel.findOne({ cruiseId: body.cruiseId });
    if (!cruise) throw new AppError('Cruise not found', 404);

    // Departure must be one the cruise actually offers.
    if (
      cruise.departureDates.length > 0 &&
      !cruise.departureDates.includes(body.departureDate)
    ) {
      throw new AppError(
        'Selected departure date is not offered for this cruise',
        400,
      );
    }

    const cabin = cruise.cabinTypes[body.cabinType];
    if (!cabin) {
      throw new AppError('Selected cabin type not available on this cruise', 400);
    }

    const { adults, children, infants } = countGuestsByType(body.guests);
    if (adults === 0) {
      throw new AppError('At least one adult guest is required', 400);
    }

    const addOns: ICruiseBookingAddOns = {
      travelInsurance: !!body.addOns?.travelInsurance,
      drinkPackage: !!body.addOns?.drinkPackage,
      wifiPackage: !!body.addOns?.wifiPackage,
      excursionPackage: !!body.addOns?.excursionPackage,
    };

    const pricing = calculateCruisePricing({
      cabinRetailPrice: cabin.retailPrice,
      cabinType: body.cabinType,
      nights: cruise.duration,
      adults,
      children,
      infants,
      addOns,
    });

    const returnDate = addNights(body.departureDate, cruise.duration);

    const booking = await CruiseBookingModel.create({
      bookingReference: generateBookingReference(),
      email: body.email.trim().toLowerCase(),
      cruiseId: cruise._id,
      cruiseSnapshot: {
        cruiseId: cruise.cruiseId,
        name: cruise.name,
        cruiseLine: cruise.cruiseLine,
        cruiseLineLogo: cruise.cruiseLineLogo,
        route: cruise.route,
        departurePort: cruise.departurePort,
        duration: cruise.duration,
        image: cruise.image,
        itinerary: cruise.itinerary,
        cabinName: cabin.name,
        cabinRetailPrice: cabin.retailPrice,
      },
      cabinType: body.cabinType,
      departureDate: body.departureDate,
      returnDate,
      guests: body.guests,
      contactInfo: body.contactInfo,
      addOns,
      paymentMethod: body.paymentMethod,
      pricing: {
        cabinBaseTotal: pricing.cabinBaseTotal,
        taxesAndPortFees: pricing.taxesAndPortFees,
        gratuities: pricing.gratuities,
        addOnsCash: pricing.addOnsCash,
        subtotal: pricing.subtotal,
        memberDiscount: pricing.memberDiscount,
        discountedTotal: pricing.discountedTotal,
        pointsRequired: pricing.pointsRequired,
        processingFee: pricing.processingFee,
        totalPoints: pricing.totalPoints,
        grandTotalCash: pricing.grandTotalCash,
        grandTotalPoints: pricing.grandTotalPoints,
      },
    });

    sendResponse(res, 201, 'Cruise booking confirmed', booking);
  },
);

/** GET /api/cruise-bookings/reference/:reference */
export const getCruiseBookingByReference = catchAsync(
  async (req: Request, res: Response) => {
    const reference = String(req.params.reference || '').trim();
    if (!reference) throw new AppError('Booking reference is required', 400);
    const booking = await CruiseBookingModel.findOne({
      bookingReference: reference,
    });
    if (!booking) throw new AppError('Cruise booking not found', 404);
    sendResponse(res, 200, 'Cruise booking retrieved successfully', booking);
  },
);

/** GET /api/cruise-bookings?email=user@example.com */
export const getCruiseBookingsByEmail = catchAsync(
  async (req: Request, res: Response) => {
    const email = String(req.query.email || '').trim().toLowerCase();
    if (!email) throw new AppError('Email is required', 400);
    const filter: FilterQuery<ICruiseBooking> = { email };
    const bookings = await CruiseBookingModel.find(filter).sort({ createdAt: -1 });
    sendResponse(res, 200, 'Cruise bookings retrieved successfully', bookings);
  },
);
