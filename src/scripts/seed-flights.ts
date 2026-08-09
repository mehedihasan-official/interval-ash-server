/**
 * Seed script for the flights + airports collections.
 *
 * Run with:  npm run seed:flights
 *
 * Behavior:
 *   - Upserts every airport by IATA code so the script is safe to
 *     re-run without producing duplicates.
 *   - Upserts every flight by its flightId for the same reason.
 *   - Never touches other collections, so it's safe to run against a
 *     database that already has resorts/users/bookings.
 */
import path from 'path';
import fs from 'fs';
import { configureLocalDns } from './lib/configure-local-dns';
import { connectToDatabase, disconnectFromDatabase } from '../config/database';

// Force a reliable public resolver BEFORE anything touches Mongoose —
// some local DNS setups can't resolve Atlas's SRV records.
configureLocalDns();
import { AirportModel } from '../models/airport.model';
import { FlightModel, IFlight } from '../models/flight.model';

interface RawAirport {
  code: string;
  city: string;
  name: string;
  country: string;
}

interface RawFlight {
  id: string;
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
  cabinClass: string;
  retailPrice: number;
  seatsAvailable: number;
  aircraft: string;
  refundable: boolean;
  baggage: string;
}

function loadJson<T>(fileName: string): T {
  const filePath = path.join(__dirname, 'data', fileName);
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

async function seedAirports(): Promise<void> {
  const airports = loadJson<RawAirport[]>('airports.json');

  // Bulk upsert — one Mongo round trip per document is fine here since
  // this script only runs manually and we care more about correctness
  // than throughput.
  const ops = airports.map((airport) => ({
    updateOne: {
      filter: { code: airport.code.toUpperCase() },
      update: {
        $set: {
          code: airport.code.toUpperCase(),
          city: airport.city,
          name: airport.name,
          country: airport.country,
        },
      },
      upsert: true,
    },
  }));

  const result = await AirportModel.bulkWrite(ops);
  console.log(
    `Airports seeded: ${result.upsertedCount} inserted, ${result.modifiedCount} updated (of ${airports.length}).`
  );
}

async function seedFlights(): Promise<void> {
  const flights = loadJson<RawFlight[]>('flights.json');

  const validCabinClasses: readonly IFlight['cabinClass'][] = [
    'Economy',
    'Premium Economy',
    'Business',
    'First',
  ];

  const normalizeCabin = (value: string | undefined): IFlight['cabinClass'] => {
    if (value && (validCabinClasses as readonly string[]).includes(value)) {
      return value as IFlight['cabinClass'];
    }
    return 'Economy';
  };

  const ops = flights.map((flight) => ({
    updateOne: {
      filter: { flightId: flight.id },
      update: {
        $set: {
          flightId: flight.id,
          airline: flight.airline,
          airlineLogo: flight.airlineLogo ?? '',
          flightNumber: flight.flightNumber,
          origin: flight.origin.toUpperCase(),
          originCity: flight.originCity,
          destination: flight.destination.toUpperCase(),
          destinationCity: flight.destinationCity,
          departureTime: flight.departureTime,
          arrivalTime: flight.arrivalTime,
          duration: flight.duration,
          stops: flight.stops ?? 0,
          stopLabel: flight.stopLabel ?? 'Nonstop',
          cabinClass: normalizeCabin(flight.cabinClass),
          retailPrice: flight.retailPrice,
          seatsAvailable: flight.seatsAvailable ?? 0,
          aircraft: flight.aircraft,
          refundable: !!flight.refundable,
          baggage: flight.baggage ?? '1 carry-on included',
        },
      },
      upsert: true,
    },
  }));

  const result = await FlightModel.bulkWrite(ops);
  console.log(
    `Flights seeded: ${result.upsertedCount} inserted, ${result.modifiedCount} updated (of ${flights.length}).`
  );
}

async function main(): Promise<void> {
  await connectToDatabase();
  try {
    await seedAirports();
    await seedFlights();
  } finally {
    await disconnectFromDatabase();
  }
}

main()
  .then(() => {
    console.log('Flight seed complete.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Flight seed failed:', error);
    process.exit(1);
  });
