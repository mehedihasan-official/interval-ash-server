import { AirportModel } from '../models/airport.model';
import {
  estimatePriceMultiplier,
  getAirportCoords,
  haversineKm,
  type GeoPoint,
} from './airport-geo';

/**
 * Resolves the metadata the server needs whenever it has to remap a
 * flight template onto a specific origin/destination pair the traveler
 * picked — used both by the search endpoint (synthesizing results for
 * un-seeded routes) and by the booking creator (snapshotting the
 * chosen route accurately on the confirmed booking).
 *
 * `distanceKm` is used to size the synthesized flight's duration and
 * arrival time so a long-haul search doesn't display a domestic
 * template's 3h 15m; `priceMultiplier` scales the retail so the fare
 * grows with distance. Both derive from the airports' great-circle
 * distance (airport lat/lng where known, country centroid fallback).
 */
export interface RouteContext {
  originCity: string;
  destinationCity: string;
  originCountry: string;
  destinationCountry: string;
  isInternational: boolean;
  distanceKm: number;
  priceMultiplier: number;
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

  const originCoords: GeoPoint | null = getAirportCoords(origin, originCountry);
  const destCoords: GeoPoint | null = getAirportCoords(destination, destinationCountry);
  const distanceKm =
    originCoords && destCoords ? haversineKm(originCoords, destCoords) : 0;

  return {
    originCity: originAirport?.city || origin,
    destinationCity: destAirport?.city || destination,
    originCountry,
    destinationCountry,
    isInternational,
    distanceKm,
    priceMultiplier: estimatePriceMultiplier(distanceKm),
  };
}

/**
 * Applies the route multiplier to a template's retail price, clamped
 * to a small floor so demo data never produces sub-$79 fares that
 * would look broken to a user.
 */
export function applyRouteMultiplier(
  templateRetail: number,
  context: RouteContext,
): number {
  return Math.max(79, Math.round(templateRetail * context.priceMultiplier));
}
