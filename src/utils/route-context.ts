import { AirportModel } from '../models/airport.model';
import {
  estimateBaseEconomyFare,
  getAirlineTier,
  getAirportCoords,
  getCabinMultiplier,
  haversineKm,
  seededVariance,
  type GeoPoint,
} from './airport-geo';

/**
 * Resolves the metadata the server needs whenever it has to remap a
 * flight template onto a specific origin/destination pair the traveler
 * picked — used both by the search endpoint (synthesizing results for
 * un-seeded routes) and by the booking creator (snapshotting the
 * chosen route accurately on the confirmed booking).
 *
 * `distanceKm` is used to size the synthesized flight's duration + a
 * distance-based base fare (see estimateBaseEconomyFare). Both derive
 * from the airports' great-circle distance (airport lat/lng where
 * known, country centroid fallback).
 */
export interface RouteContext {
  originCity: string;
  destinationCity: string;
  originCountry: string;
  destinationCountry: string;
  isInternational: boolean;
  distanceKm: number;
  baseEconomyFare: number;
}

/**
 * Coordinates for one end of a route, best source first:
 *   1. lat/lng stored on the airport record (set when an admin adds an
 *      airport through the panel) — always the real runway location.
 *   2. the built-in AIRPORT_COORDS hub table.
 *   3. the country centroid, which only gets the order of magnitude right.
 *
 * Without (1), every flight to an admin-added airport would be measured
 * against its country's geographic centre — a 50-minute hop coming out
 * as two and a half hours.
 */
function coordsFor(
  code: string,
  airport: { latitude?: number | null; longitude?: number | null } | null,
  country: string,
): GeoPoint | null {
  const { latitude, longitude } = airport ?? {};
  if (typeof latitude === 'number' && typeof longitude === 'number') {
    return { lat: latitude, lng: longitude };
  }
  return getAirportCoords(code, country);
}

export async function resolveRouteContext(
  origin: string,
  destination: string,
): Promise<RouteContext> {
  const [originAirport, destAirport] = await Promise.all([
    AirportModel.findOne({ code: origin }).lean(),
    AirportModel.findOne({ code: destination }).lean(),
  ]);

  const originCountry = originAirport?.country || '';
  const destinationCountry = destAirport?.country || '';
  const isInternational =
    !!originCountry && !!destinationCountry && originCountry !== destinationCountry;

  const originCoords = coordsFor(origin, originAirport, originCountry);
  const destCoords = coordsFor(destination, destAirport, destinationCountry);
  const distanceKm =
    originCoords && destCoords ? haversineKm(originCoords, destCoords) : 0;

  return {
    originCity: originAirport?.city || origin,
    destinationCity: destAirport?.city || destination,
    originCountry,
    destinationCountry,
    isInternational,
    distanceKm,
    baseEconomyFare: distanceKm > 0 ? estimateBaseEconomyFare(distanceKm) : 0,
  };
}

/**
 * Compute a realistic retail price for one traveler on this route,
 * covering the whole itinerary (both legs of a round trip, not one).
 *
 * Ignores the template's own retail — carrying it forward is what led
 * to a JFK→MIA $110 Southwest template landing as $427 on MCO→DXB and
 * a $2100 Delta business template landing as $8148 on the same list.
 * Instead we derive from the route's economy base fare and layer in
 * airline tier, cabin class, and how many one-way fares the trip type
 * is worth, then a small deterministic ±8% jitter so different
 * templates on the same route come out with plausibly different fares
 * (they're all reading off the same economy base, so the underlying
 * spread stays coherent).
 *
 * Falls back to the template retail (bounded) when we have no
 * distance signal, so nothing crashes on an unlisted airport pair.
 */
export function applyRouteRetailPrice(
  templateRetail: number,
  cabinClass: string,
  airline: string,
  context: RouteContext,
  varianceSeed: string,
  tripFareMultiplier = 1,
): number {
  if (context.distanceKm <= 0 || context.baseEconomyFare <= 0) {
    return Math.max(79, Math.round(templateRetail * tripFareMultiplier));
  }
  const airlineTier = getAirlineTier(airline);
  const cabinMult = getCabinMultiplier(cabinClass);
  const jitter = seededVariance(varianceSeed, 0.08); // ±8%
  const raw =
    context.baseEconomyFare * airlineTier * cabinMult * tripFareMultiplier * jitter;
  return Math.max(79, Math.round(raw));
}
