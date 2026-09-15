import { Document, Schema, model } from "mongoose";

/**
 * An airport record used for autocomplete when a member searches for
 * flights. We keep the core fields used by the UI and add optional
 * state/stateCode so region-based searches work for US/Canada/Mexico and
 * Australia airports without making non-region airports any harder to use.
 */
export interface IAirport extends Document {
  code: string;
  city: string;
  name: string;
  country: string;
  state?: string;
  stateCode?: string;
  // Optional, and only set on airports added through the admin panel.
  // The built-in AIRPORT_COORDS table (utils/airport-geo.ts) covers the
  // major hubs; for anything outside it, storing the real lat/lng here
  // is what stops a route from being measured against the country's
  // geographic centre instead of the actual runway.
  latitude?: number;
  longitude?: number;
  createdAt: Date;
  updatedAt: Date;
}

const airportSchema = new Schema<IAirport>(
  {
    code: {
      type: String,
      required: [true, "Airport IATA code is required"],
      trim: true,
      uppercase: true,
      unique: true,
      index: true,
    },
    city: {
      type: String,
      required: [true, "Airport city is required"],
      trim: true,
    },
    name: {
      type: String,
      required: [true, "Airport name is required"],
      trim: true,
    },
    country: {
      type: String,
      required: [true, "Airport country is required"],
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    stateCode: {
      type: String,
      trim: true,
      uppercase: true,
    },
    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 },
  },
  { timestamps: true },
);

// Keep the existing compound search pattern and extend it to region fields,
// since the autocomplete does a regex OR-match across the same airport data.
airportSchema.index({ code: 1, city: 1, name: 1, state: 1, stateCode: 1 });

export const AirportModel = model<IAirport>(
  "Airport",
  airportSchema,
  "airports",
);
