import { Schema, model, Document } from 'mongoose';

/**
 * A single flight offering. The pricing model matches what the client
 * displays: the schema stores a `retailPrice`, and everything else
 * (member discount, points required, processing fee) is derived by the
 * controller so a single source of truth stays in one place.
 */
export interface IFlight extends Document {
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
  cabinClass: 'Economy' | 'Premium Economy' | 'Business' | 'First';
  retailPrice: number;
  seatsAvailable: number;
  aircraft: string;
  refundable: boolean;
  baggage: string;
  createdAt: Date;
  updatedAt: Date;
}

const flightSchema = new Schema<IFlight>(
  {
    flightId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    airline: { type: String, required: true, trim: true, index: true },
    airlineLogo: { type: String, trim: true },
    flightNumber: { type: String, required: true, trim: true },
    origin: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    originCity: { type: String, required: true, trim: true },
    destination: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    destinationCity: { type: String, required: true, trim: true },
    departureTime: { type: String, required: true, trim: true },
    arrivalTime: { type: String, required: true, trim: true },
    duration: { type: String, required: true, trim: true },
    stops: { type: Number, default: 0, min: 0 },
    stopLabel: { type: String, default: 'Nonstop', trim: true },
    cabinClass: {
      type: String,
      enum: ['Economy', 'Premium Economy', 'Business', 'First'],
      default: 'Economy',
    },
    retailPrice: { type: Number, required: true, min: 0 },
    seatsAvailable: { type: Number, default: 0, min: 0 },
    aircraft: { type: String, required: true, trim: true },
    refundable: { type: Boolean, default: false },
    baggage: { type: String, default: '1 carry-on included', trim: true },
  },
  { timestamps: true }
);

// Route lookups are the primary search case (from X to Y).
flightSchema.index({ origin: 1, destination: 1 });

export const FlightModel = model<IFlight>('Flight', flightSchema, 'flights');
