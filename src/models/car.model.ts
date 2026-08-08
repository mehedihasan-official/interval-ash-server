import { Schema, model, Document } from 'mongoose';

/**
 * A rentable car offering. Pricing is stored at the "per day" level
 * plus a per-mile overage rate so the final quote can honour both the
 * requested rental length AND the traveler's estimated daily mileage —
 * see utils/car-pricing.ts for the math.
 */
export interface ICar extends Document {
  carId: string;
  type: string;
  category: string;
  brand: string;
  image?: string;
  passengers: number;
  transmission: 'Automatic' | 'Manual';
  bags: number;
  mileagePolicy: string;
  freeMilesPerDay: number;
  overageRatePerMile: number;
  fuelType: string;
  airConditioning: boolean;
  vendor: string;
  vendorLogo?: string;
  rating: number;
  reviewCount: number;
  retailPricePerDay: number;
  features: string[];
  createdAt: Date;
  updatedAt: Date;
}

const carSchema = new Schema<ICar>(
  {
    carId: { type: String, required: true, unique: true, trim: true, index: true },
    type: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true, index: true },
    brand: { type: String, required: true, trim: true },
    image: { type: String, trim: true },
    passengers: { type: Number, required: true, min: 1 },
    transmission: {
      type: String,
      enum: ['Automatic', 'Manual'],
      default: 'Automatic',
    },
    bags: { type: Number, default: 2, min: 0 },
    // Free-form label like "Unlimited mileage" or "200 mi/day included"
    // that the UI can render verbatim without recomputing it.
    mileagePolicy: { type: String, default: 'Unlimited mileage', trim: true },
    // 0 means unlimited — pricing helper interprets this specially.
    freeMilesPerDay: { type: Number, default: 0, min: 0 },
    overageRatePerMile: { type: Number, default: 0.25, min: 0 },
    fuelType: { type: String, default: 'Gasoline', trim: true },
    airConditioning: { type: Boolean, default: true },
    vendor: { type: String, required: true, trim: true, index: true },
    vendorLogo: { type: String, trim: true },
    rating: { type: Number, default: 4.0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    retailPricePerDay: { type: Number, required: true, min: 0 },
    features: { type: [String], default: [] },
  },
  { timestamps: true },
);

carSchema.index({ category: 1, vendor: 1 });

export const CarModel = model<ICar>('Car', carSchema, 'cars');
