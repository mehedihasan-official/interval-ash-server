import { Schema, model, Document } from 'mongoose';

/**
 * A cruise offering. Pricing is stored per cabin type at the "inside"
 * starting price, and the per-person total for a booking is computed
 * as cabin base × occupancy multipliers plus taxes/gratuities (see
 * utils/cruise-pricing.ts). Departure dates are stored as ISO date
 * strings the UI presents in a dropdown.
 */

export type CabinKey = 'inside' | 'outside' | 'balcony' | 'suite';

export interface ICabinType {
  name: string;
  retailPrice: number;
}

export interface ICruise extends Document {
  cruiseId: string;
  name: string;
  cruiseLine: string;
  cruiseLineLogo?: string;
  route: string;
  departurePort: string;
  duration: number; // nights
  category: string;
  image?: string;
  rating: number;
  reviews: number;
  itinerary: string[];
  shipFeatures: string[];
  cabinTypes: Record<CabinKey, ICabinType>;
  departureDates: string[];
  includes: string[];
  createdAt: Date;
  updatedAt: Date;
}

const cabinTypeSchema = new Schema<ICabinType>(
  {
    name: { type: String, required: true, trim: true },
    retailPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const cruiseSchema = new Schema<ICruise>(
  {
    cruiseId: { type: String, required: true, unique: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    cruiseLine: { type: String, required: true, trim: true, index: true },
    cruiseLineLogo: { type: String, trim: true },
    route: { type: String, required: true, trim: true },
    departurePort: { type: String, required: true, trim: true, index: true },
    duration: { type: Number, required: true, min: 1 },
    category: { type: String, required: true, trim: true, index: true },
    image: { type: String, trim: true },
    rating: { type: Number, default: 4.0, min: 0, max: 5 },
    reviews: { type: Number, default: 0, min: 0 },
    itinerary: { type: [String], default: [] },
    shipFeatures: { type: [String], default: [] },
    cabinTypes: {
      inside: { type: cabinTypeSchema, required: true },
      outside: { type: cabinTypeSchema, required: true },
      balcony: { type: cabinTypeSchema, required: true },
      suite: { type: cabinTypeSchema, required: true },
    },
    departureDates: { type: [String], default: [] },
    includes: { type: [String], default: [] },
  },
  { timestamps: true },
);

cruiseSchema.index({ category: 1, cruiseLine: 1 });

export const CruiseModel = model<ICruise>('Cruise', cruiseSchema, 'cruises');
