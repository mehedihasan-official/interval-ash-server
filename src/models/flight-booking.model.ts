import { Schema, model, Document, Types } from 'mongoose';

/**
 * A confirmed flight booking. Separate from the resort BookingModel
 * because the shapes barely overlap — flight bookings need passenger
 * lists, seat/baggage add-ons, and a route snapshot, none of which
 * belong on a resort stay record.
 */

export interface IFlightPassenger {
  type: 'Adult' | 'Child' | 'Infant';
  firstName: string;
  lastName: string;
  dob: string;
  gender: 'Male' | 'Female' | 'Other';
  passportNumber?: string;
  knownTravelerNumber?: string;
  mealPreference?: string;
  seat?: string | null;
}

export interface IFlightBooking extends Document {
  bookingReference: string;
  email: string;
  flightId?: Types.ObjectId;
  flightSnapshot: {
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
    cabinClass: string;
    aircraft: string;
    stopLabel: string;
    baggage: string;
    refundable: boolean;
    retailPrice: number;
  };
  tripType: 'oneway' | 'roundtrip' | 'multicity';
  departureDate: string;
  returnDate?: string | null;
  passengers: IFlightPassenger[];
  contactInfo: { email: string; phone: string };
  addOns: {
    extraBaggage: boolean;
    seatSelections: (string | null)[];
  };
  paymentMethod: 'cash' | 'points';
  pricing: {
    retailPrice: number;
    discountedPrice: number;
    pointsRequired: number;
    processingFee: number;
    totalPoints: number;
    addOnsCash: number;
    addOnsPoints: number;
    grandTotalCash: number;
    grandTotalPoints: number;
  };
  status: 'confirmed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const passengerSchema = new Schema<IFlightPassenger>(
  {
    type: { type: String, enum: ['Adult', 'Child', 'Infant'], required: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    dob: { type: String, required: true, trim: true },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
    passportNumber: { type: String, trim: true },
    knownTravelerNumber: { type: String, trim: true },
    mealPreference: { type: String, trim: true, default: 'Standard' },
    seat: { type: String, default: null },
  },
  { _id: false }
);

const flightBookingSchema = new Schema<IFlightBooking>(
  {
    bookingReference: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    flightId: { type: Schema.Types.ObjectId, ref: 'Flight' },
    flightSnapshot: {
      flightId: String,
      airline: String,
      airlineLogo: String,
      flightNumber: String,
      origin: String,
      originCity: String,
      destination: String,
      destinationCity: String,
      departureTime: String,
      arrivalTime: String,
      duration: String,
      cabinClass: String,
      aircraft: String,
      stopLabel: String,
      baggage: String,
      refundable: Boolean,
      retailPrice: Number,
    },
    tripType: {
      type: String,
      enum: ['oneway', 'roundtrip', 'multicity'],
      default: 'oneway',
    },
    departureDate: { type: String, required: true },
    returnDate: { type: String, default: null },
    passengers: { type: [passengerSchema], required: true },
    contactInfo: {
      email: { type: String, required: true },
      phone: { type: String, required: true },
    },
    addOns: {
      extraBaggage: { type: Boolean, default: false },
      seatSelections: { type: [Schema.Types.Mixed], default: [] },
    },
    paymentMethod: { type: String, enum: ['cash', 'points'], required: true },
    pricing: {
      retailPrice: Number,
      discountedPrice: Number,
      pointsRequired: Number,
      processingFee: Number,
      totalPoints: Number,
      addOnsCash: Number,
      addOnsPoints: Number,
      grandTotalCash: Number,
      grandTotalPoints: Number,
    },
    status: {
      type: String,
      enum: ['confirmed', 'cancelled'],
      default: 'confirmed',
    },
  },
  { timestamps: true }
);

export const FlightBookingModel = model<IFlightBooking>(
  'FlightBooking',
  flightBookingSchema,
  'flight_bookings'
);
