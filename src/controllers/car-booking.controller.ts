import { Request, Response } from 'express';
import { FilterQuery } from 'mongoose';
import { CarModel } from '../models/car.model';
import {
  CarBookingModel,
  ICarBooking,
  ICarBookingAddOns,
  ICarDriver,
} from '../models/car-booking.model';
import { AppError } from '../utils/app-error';
import { catchAsync } from '../utils/catch-async';
import { sendResponse } from '../utils/send-response';
import { calculateCarPricing } from '../utils/car-pricing';

interface CreateCarBookingBody {
  email: string;
  carId: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupDate: string;
  dropoffDate: string;
  rentalDays: number;
  estimatedDailyMiles?: number;
  drivers: ICarDriver[];
  contactInfo: { email: string; phone: string };
  addOns?: Partial<ICarBookingAddOns>;
  paymentMethod: 'cash' | 'points';
}

/** Booking reference format: CR-YYYY-XXXXXX (short + typeable). */
function generateBookingReference(): string {
  const year = new Date().getFullYear();
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `CR-${year}-${suffix}`;
}

/**
 * POST /api/car-bookings
 *
 * Records a confirmed car rental. The client submits its intent (which
 * car, when, who's driving, add-ons, payment method); the server
 * recomputes every dollar from the car's stored per-day rate plus the
 * trip length and mileage estimate so no one can tamper with the
 * final total client-side.
 */
export const createCarBooking = catchAsync(async (req: Request, res: Response) => {
  const body = req.body as CreateCarBookingBody;

  if (!body?.email) throw new AppError('Booking email is required', 400);
  if (!body?.carId) throw new AppError('Car id is required', 400);
  if (!body?.pickupLocation || !body?.dropoffLocation) {
    throw new AppError('Pickup and dropoff locations are required', 400);
  }
  if (!body?.pickupDate || !body?.dropoffDate) {
    throw new AppError('Pickup and dropoff dates are required', 400);
  }
  if (!Number.isFinite(body?.rentalDays) || body.rentalDays < 1) {
    throw new AppError('Rental must be at least 1 day', 400);
  }
  if (!Array.isArray(body?.drivers) || body.drivers.length === 0) {
    throw new AppError('At least one driver is required', 400);
  }
  if (!body?.contactInfo?.email || !body?.contactInfo?.phone) {
    throw new AppError('Contact email and phone are required', 400);
  }
  if (body.paymentMethod !== 'cash' && body.paymentMethod !== 'points') {
    throw new AppError('Payment method must be either cash or points', 400);
  }

  const car = /^[a-f0-9]{24}$/i.test(body.carId)
    ? await CarModel.findById(body.carId)
    : await CarModel.findOne({ carId: body.carId });
  if (!car) throw new AppError('Car not found', 404);

  const addOns: ICarBookingAddOns = {
    insurance: !!body.addOns?.insurance,
    gps: !!body.addOns?.gps,
    childSeat: !!body.addOns?.childSeat,
    additionalDriver: !!body.addOns?.additionalDriver,
  };

  const pricing = calculateCarPricing({
    retailPricePerDay: car.retailPricePerDay,
    rentalDays: body.rentalDays,
    freeMilesPerDay: car.freeMilesPerDay,
    overageRatePerMile: car.overageRatePerMile,
    estimatedDailyMiles: body.estimatedDailyMiles ?? 0,
    addOns,
  });

  const booking = await CarBookingModel.create({
    bookingReference: generateBookingReference(),
    email: body.email.trim().toLowerCase(),
    carId: car._id,
    carSnapshot: {
      carId: car.carId,
      type: car.type,
      brand: car.brand,
      image: car.image,
      vendor: car.vendor,
      vendorLogo: car.vendorLogo,
      passengers: car.passengers,
      bags: car.bags,
      transmission: car.transmission,
      mileagePolicy: car.mileagePolicy,
      freeMilesPerDay: car.freeMilesPerDay,
      overageRatePerMile: car.overageRatePerMile,
      retailPricePerDay: car.retailPricePerDay,
    },
    pickupLocation: body.pickupLocation.trim(),
    dropoffLocation: body.dropoffLocation.trim(),
    pickupDate: body.pickupDate,
    dropoffDate: body.dropoffDate,
    rentalDays: body.rentalDays,
    estimatedDailyMiles: body.estimatedDailyMiles ?? 0,
    drivers: body.drivers,
    contactInfo: body.contactInfo,
    addOns,
    paymentMethod: body.paymentMethod,
    pricing: {
      baseTotal: pricing.baseTotal,
      mileageOverageTotal: pricing.mileageOverageTotal,
      addOnsCash: pricing.addOnsCash,
      addOnsPoints: pricing.addOnsPoints,
      discountedTotal: pricing.discountedTotal,
      pointsRequired: pricing.pointsRequired,
      processingFee: pricing.processingFee,
      totalPoints: pricing.totalPoints,
      grandTotalCash: pricing.grandTotalCash,
      grandTotalPoints: pricing.grandTotalPoints,
    },
  });

  sendResponse(res, 201, 'Car booking confirmed', booking);
});

/** GET /api/car-bookings/reference/:reference */
export const getCarBookingByReference = catchAsync(
  async (req: Request, res: Response) => {
    const reference = String(req.params.reference || '').trim();
    if (!reference) throw new AppError('Booking reference is required', 400);
    const booking = await CarBookingModel.findOne({ bookingReference: reference });
    if (!booking) throw new AppError('Car booking not found', 404);
    sendResponse(res, 200, 'Car booking retrieved successfully', booking);
  },
);

/** GET /api/car-bookings?email=user@example.com */
export const getCarBookingsByEmail = catchAsync(
  async (req: Request, res: Response) => {
    const email = String(req.query.email || '').trim().toLowerCase();
    if (!email) throw new AppError('Email is required', 400);
    const filter: FilterQuery<ICarBooking> = { email };
    const bookings = await CarBookingModel.find(filter).sort({ createdAt: -1 });
    sendResponse(res, 200, 'Car bookings retrieved successfully', bookings);
  },
);
