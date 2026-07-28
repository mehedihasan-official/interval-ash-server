import { Schema, model, Document } from 'mongoose';

/**
 * TypeScript interface describing a Resort document.
 *
 * The original project stored resort data with a flexible shape (it came
 * from a bulk-imported dataset of 1,700+ resorts), so beyond the core
 * fields we keep the schema permissive via `strict: false` — this lets
 * additional resort attributes pass through without every field needing
 * to be declared up front, while the fields we do know about still get
 * validation and TypeScript support.
 */
export interface IResort extends Document {
  name: string;
  location?: string;
  description?: string;
  pricePerNight?: number;
  images?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const resortSchema = new Schema<IResort>(
  {
    name: {
      type: String,
      required: [true, 'Resort name is required'],
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    pricePerNight: {
      type: Number,
      min: 0,
    },
    images: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    strict: false, // Allows additional, undeclared resort fields
  }
);

export const ResortModel = model<IResort>('Resort', resortSchema, 'resorts');
