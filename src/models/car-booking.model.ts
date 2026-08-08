import { Schema, model, Document, Types } from 'mongoose';

/**
 * A confirmed car rental. Kept separate from flight/resort bookings
 * because the pickup/dropoff/driver fields don't overlap enough to
 * justify a common shape.
 */

export interface ICarDriver {
  firstName: string;
  lastName: string;
  dob: string;
  licenseNumber: string;
  licenseCountry: string;
  isPrimary: boolean;
}

export interface ICarBookingAddOns {
  insurance: boolean;
  gps: boolean;
  childSeat: boolean;
  additionalDriver: boolean;
}

export interface ICarBooking extends Document {
  bookingReference: string;
  email: string;
  carId?: Types.ObjectId;
  carSnapshot: {
    carId: string;
    type: string;
    brand: string;
    image?: string;
    vendor: string;
    vendorLogo?: string;
    passengers: number;
    bags: number;
    transmission: string;
    mileagePolicy: string;
    freeMilesPerDay: number;
    overageRatePerMile: number;
    retailPricePerDay: number;
  };
  pickupLocation: string;
  dropoffLocation: string;
  pickupDate: string;
  dropoffDate: string;
  rentalDays: number;
  estimatedDailyMiles: number;
  drivers: ICarDriver[];
  contactInfo: { email: string; phone: string };
  addOns: ICarBookingAddOns;
  paymentMethod: 'cash' | 'points';
  pricing: {
    baseTotal: number;
    mileageOverageTotal: number;
    addOnsCash: number;
    addOnsPoints: number;
    discountedTotal: number;
    pointsRequired: number;
    processingFee: number;
    totalPoints: number;
    grandTotalCash: number;
    grandTotalPoints: number;
  };
  status: 'confirmed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const driverSchema = new Schema<ICarDriver>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    dob: { type: String, required: true, trim: true },
    licenseNumber: { type: String, required: true, trim: true },
    licenseCountry: { type: String, required: true, trim: true },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: false },
);

const carBookingSchema = new Schema<ICarBooking>(
  {
    bookingReference: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    carId: { type: Schema.Types.ObjectId, ref: 'Car' },
    carSnapshot: {
      carId: String,
      type: String,
      brand: String,
      image: String,
      vendor: String,
      vendorLogo: String,
      passengers: Number,
      bags: Number,
      transmission: String,
      mileagePolicy: String,
      freeMilesPerDay: Number,
      overageRatePerMile: Number,
      retailPricePerDay: Number,
    },
    pickupLocation: { type: String, required: true, trim: true },
    dropoffLocation: { type: String, required: true, trim: true },
    pickupDate: { type: String, required: true },
    dropoffDate: { type: String, required: true },
    rentalDays: { type: Number, required: true, min: 1 },
    estimatedDailyMiles: { type: Number, default: 0, min: 0 },
    drivers: { type: [driverSchema], required: true },
    contactInfo: {
      email: { type: String, required: true },
      phone: { type: String, required: true },
    },
    addOns: {
      insurance: { type: Boolean, default: false },
      gps: { type: Boolean, default: false },
      childSeat: { type: Boolean, default: false },
      additionalDriver: { type: Boolean, default: false },
    },
    paymentMethod: { type: String, enum: ['cash', 'points'], required: true },
    pricing: {
      baseTotal: Number,
      mileageOverageTotal: Number,
      addOnsCash: Number,
      addOnsPoints: Number,
      discountedTotal: Number,
      pointsRequired: Number,
      processingFee: Number,
      totalPoints: Number,
      grandTotalCash: Number,
      grandTotalPoints: Number,
    },
    status: { type: String, enum: ['confirmed', 'cancelled'], default: 'confirmed' },
  },
  { timestamps: true },
);

export const CarBookingModel = model<ICarBooking>(
  'CarBooking',
  carBookingSchema,
  'car_bookings',
);
