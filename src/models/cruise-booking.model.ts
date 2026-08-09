import { Schema, model, Document, Types } from 'mongoose';
import type { CabinKey } from './cruise.model';

export interface ICruiseGuest {
  type: 'Adult' | 'Child' | 'Infant';
  firstName: string;
  lastName: string;
  dob: string;
  gender: 'Male' | 'Female' | 'Other';
  passportNumber?: string;
  nationality?: string;
  diningPreference?: string;
}

export interface ICruiseBookingAddOns {
  travelInsurance: boolean;
  drinkPackage: boolean;
  wifiPackage: boolean;
  excursionPackage: boolean;
}

export interface ICruiseBooking extends Document {
  bookingReference: string;
  email: string;
  cruiseId?: Types.ObjectId;
  cruiseSnapshot: {
    cruiseId: string;
    name: string;
    cruiseLine: string;
    cruiseLineLogo?: string;
    route: string;
    departurePort: string;
    duration: number;
    image?: string;
    itinerary: string[];
    cabinName: string;
    cabinRetailPrice: number;
  };
  cabinType: CabinKey;
  departureDate: string;
  returnDate: string;
  guests: ICruiseGuest[];
  contactInfo: { email: string; phone: string };
  addOns: ICruiseBookingAddOns;
  paymentMethod: 'cash' | 'points';
  pricing: {
    cabinBaseTotal: number;
    taxesAndPortFees: number;
    gratuities: number;
    addOnsCash: number;
    subtotal: number;
    memberDiscount: number;
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

const guestSchema = new Schema<ICruiseGuest>(
  {
    type: { type: String, enum: ['Adult', 'Child', 'Infant'], required: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    dob: { type: String, required: true, trim: true },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
    passportNumber: { type: String, trim: true },
    nationality: { type: String, trim: true },
    diningPreference: { type: String, trim: true, default: 'Standard' },
  },
  { _id: false },
);

const cruiseBookingSchema = new Schema<ICruiseBooking>(
  {
    bookingReference: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    cruiseId: { type: Schema.Types.ObjectId, ref: 'Cruise' },
    cruiseSnapshot: {
      cruiseId: String,
      name: String,
      cruiseLine: String,
      cruiseLineLogo: String,
      route: String,
      departurePort: String,
      duration: Number,
      image: String,
      itinerary: [String],
      cabinName: String,
      cabinRetailPrice: Number,
    },
    cabinType: {
      type: String,
      enum: ['inside', 'outside', 'balcony', 'suite'],
      required: true,
    },
    departureDate: { type: String, required: true },
    returnDate: { type: String, required: true },
    guests: { type: [guestSchema], required: true },
    contactInfo: {
      email: { type: String, required: true },
      phone: { type: String, required: true },
    },
    addOns: {
      travelInsurance: { type: Boolean, default: false },
      drinkPackage: { type: Boolean, default: false },
      wifiPackage: { type: Boolean, default: false },
      excursionPackage: { type: Boolean, default: false },
    },
    paymentMethod: { type: String, enum: ['cash', 'points'], required: true },
    pricing: {
      cabinBaseTotal: Number,
      taxesAndPortFees: Number,
      gratuities: Number,
      addOnsCash: Number,
      subtotal: Number,
      memberDiscount: Number,
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

export const CruiseBookingModel = model<ICruiseBooking>(
  'CruiseBooking',
  cruiseBookingSchema,
  'cruise_bookings',
);
