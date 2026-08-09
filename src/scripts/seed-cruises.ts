/**
 * Seeds the cruises collection from src/scripts/data/cruises.json.
 *
 * Run with:  npm run seed:cruises
 *
 * Idempotent: upserts by cruiseId, so re-running never duplicates.
 * Applies the curated image overrides (see data/image-overrides.ts)
 * because many of the Wikipedia hotlinks in the source data now 404.
 */
import path from 'path';
import fs from 'fs';
import { configureLocalDns } from './lib/configure-local-dns';
import { connectToDatabase, disconnectFromDatabase } from '../config/database';

// Force a reliable public resolver BEFORE anything touches Mongoose —
// some local DNS setups can't resolve Atlas's SRV records.
configureLocalDns();
import { CruiseModel, ICruise, CabinKey } from '../models/cruise.model';
import { CRUISE_IMAGE_OVERRIDES } from './data/image-overrides';

interface RawCruise {
  id: string;
  name: string;
  cruiseLine: string;
  cruiseLineLogo?: string;
  route: string;
  departurePort: string;
  duration: number;
  category: string;
  image?: string;
  rating: number;
  reviews: number;
  retailPrice?: number;
  itinerary: string[];
  shipFeatures: string[];
  cabinTypes: Record<
    CabinKey,
    { name: string; retailPrice: number }
  >;
  departureDates: string[];
  includes: string[];
}

function loadJson<T>(fileName: string): T {
  const p = path.join(__dirname, 'data', fileName);
  return JSON.parse(fs.readFileSync(p, 'utf8')) as T;
}

// Some source records only ship departure dates in 2025. Rather than
// keep members from booking, we shift any past dates forward by whole
// years so the seed always produces at least one bookable departure.
function futureProof(dates: string[]): string[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dates.map((iso) => {
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime()) || parsed >= today) return iso;
    while (parsed < today) {
      parsed.setFullYear(parsed.getFullYear() + 1);
    }
    return parsed.toISOString().slice(0, 10);
  });
}

async function seedCruises(): Promise<void> {
  // Base cruises come from the demo dataset; cruises-extra.json adds
  // our own inventory across existing and new destinations (Asia,
  // Antarctica). De-dupe by id so re-running is safe.
  const baseCruises = loadJson<RawCruise[]>('cruises.json');
  const extraCruises = loadJson<RawCruise[]>('cruises-extra.json');
  const byId = new Map<string, RawCruise>();
  for (const cruise of [...baseCruises, ...extraCruises]) byId.set(cruise.id, cruise);
  const cruises = Array.from(byId.values());
  const ops = cruises.map((raw) => ({
    updateOne: {
      filter: { cruiseId: raw.id },
      update: {
        $set: {
          cruiseId: raw.id,
          name: raw.name,
          cruiseLine: raw.cruiseLine,
          cruiseLineLogo: raw.cruiseLineLogo || '',
          route: raw.route,
          departurePort: raw.departurePort,
          duration: raw.duration,
          category: raw.category,
          image: CRUISE_IMAGE_OVERRIDES[raw.id] || raw.image || '',
          rating: raw.rating,
          reviews: raw.reviews,
          itinerary: raw.itinerary ?? [],
          shipFeatures: raw.shipFeatures ?? [],
          cabinTypes: raw.cabinTypes,
          departureDates: futureProof(raw.departureDates ?? []),
          includes: raw.includes ?? [],
        } satisfies Partial<ICruise>,
      },
      upsert: true,
    },
  }));

  const result = await CruiseModel.bulkWrite(ops);
  console.log(
    `Cruises seeded: ${result.upsertedCount} inserted, ${result.modifiedCount} updated (of ${cruises.length}).`,
  );
}

async function main(): Promise<void> {
  await connectToDatabase();
  try {
    await seedCruises();
  } finally {
    await disconnectFromDatabase();
  }
}

main()
  .then(() => {
    console.log('Cruise seed complete.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Cruise seed failed:', error);
    process.exit(1);
  });
