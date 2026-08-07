import { Schema, model, Document } from 'mongoose';

/**
 * An airport record used for autocomplete when a member searches for
 * flights. We only keep the fields the UI actually renders — IATA code,
 * city, full airport name, and country — so the collection stays small
 * even with thousands of airports seeded in.
 */
export interface IAirport extends Document {
  code: string;
  city: string;
  name: string;
  country: string;
  createdAt: Date;
  updatedAt: Date;
}

const airportSchema = new Schema<IAirport>(
  {
    code: {
      type: String,
      required: [true, 'Airport IATA code is required'],
      trim: true,
      uppercase: true,
      unique: true,
      index: true,
    },
    city: {
      type: String,
      required: [true, 'Airport city is required'],
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Airport name is required'],
      trim: true,
    },
    country: {
      type: String,
      required: [true, 'Airport country is required'],
      trim: true,
    },
  },
  { timestamps: true }
);

// Compound text-ish index — code, city, name are all searchable from the
// UI autocomplete, so a plain multi-field index keeps prefix filters fast.
airportSchema.index({ code: 1, city: 1, name: 1 });

export const AirportModel = model<IAirport>('Airport', airportSchema, 'airports');
