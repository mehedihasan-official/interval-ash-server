/**
 * Seeds the cars collection from src/scripts/data/cars.json.
 *
 * Run with:  npm run seed:cars
 *
 * Idempotent: upserts by carId, so re-running never duplicates rows.
 * Derives the mileage plan from each source record's `mileage` string —
 * "Unlimited" plans get freeMilesPerDay=0 (the sentinel our pricing
 * helper reads as "no overage ever"); anything else is treated as a
 * conservative 200 mi/day plan with a per-mile overage rate that
 * scales with the car's daily rate (higher-end cars charge more per
 * extra mile), so the results still feel realistic without needing to
 * hand-author a mileage plan for every row.
 */
import path from 'path';
import fs from 'fs';
import { connectToDatabase, disconnectFromDatabase } from '../config/database';
import { CarModel } from '../models/car.model';
import { CAR_IMAGE_OVERRIDES } from './data/image-overrides';

interface RawCar {
  id: string;
  type: string;
  category: string;
  brand: string;
  image?: string;
  passengers: number;
  transmission: 'Automatic' | 'Manual';
  bags: number;
  mileage: string;
  fuelType: string;
  airConditioning: boolean;
  vendor: string;
  vendorLogo?: string;
  rating: number;
  reviewCount: number;
  retailPricePerDay: number;
  features: string[];
}

function loadJson<T>(fileName: string): T {
  const p = path.join(__dirname, 'data', fileName);
  return JSON.parse(fs.readFileSync(p, 'utf8')) as T;
}

function deriveMileagePlan(raw: RawCar): {
  mileagePolicy: string;
  freeMilesPerDay: number;
  overageRatePerMile: number;
} {
  const isUnlimited = /unlimited/i.test(raw.mileage);
  if (isUnlimited) {
    return {
      mileagePolicy: 'Unlimited mileage',
      freeMilesPerDay: 0,
      overageRatePerMile: 0,
    };
  }
  // Non-unlimited plan: 200 free miles/day, overage scaled with rate.
  // Roughly $0.20/mi on cheap cars up to $0.45/mi on luxury.
  const overageRatePerMile =
    Math.round((0.15 + raw.retailPricePerDay / 1200) * 100) / 100;
  return {
    mileagePolicy: '200 mi/day included, then per-mile overage',
    freeMilesPerDay: 200,
    overageRatePerMile,
  };
}

async function seedCars(): Promise<void> {
  const cars = loadJson<RawCar[]>('cars.json');
  const ops = cars.map((raw) => {
    const plan = deriveMileagePlan(raw);
    return {
      updateOne: {
        filter: { carId: raw.id },
        update: {
          $set: {
            carId: raw.id,
            type: raw.type,
            category: raw.category,
            brand: raw.brand,
            // Replace the demo dataset's dealer-site hotlinks (many
            // return 403/404) with our curated Unsplash CDN images.
            image: CAR_IMAGE_OVERRIDES[raw.id] || raw.image || '',
            passengers: raw.passengers,
            transmission: raw.transmission,
            bags: raw.bags,
            mileagePolicy: plan.mileagePolicy,
            freeMilesPerDay: plan.freeMilesPerDay,
            overageRatePerMile: plan.overageRatePerMile,
            fuelType: raw.fuelType,
            airConditioning: raw.airConditioning,
            vendor: raw.vendor,
            vendorLogo: raw.vendorLogo ?? '',
            rating: raw.rating,
            reviewCount: raw.reviewCount,
            retailPricePerDay: raw.retailPricePerDay,
            features: raw.features ?? [],
          },
        },
        upsert: true,
      },
    };
  });

  const result = await CarModel.bulkWrite(ops);
  console.log(
    `Cars seeded: ${result.upsertedCount} inserted, ${result.modifiedCount} updated (of ${cars.length}).`,
  );
}

async function main(): Promise<void> {
  await connectToDatabase();
  try {
    await seedCars();
  } finally {
    await disconnectFromDatabase();
  }
}

main()
  .then(() => {
    console.log('Car seed complete.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Car seed failed:', error);
    process.exit(1);
  });
