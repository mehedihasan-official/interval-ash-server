import { AirportModel } from '../models/airport.model';

/**
 * Resolves the metadata the server needs whenever it has to remap a
 * flight template onto a specific origin/destination pair the traveler
 * picked — used both by the search endpoint (synthesizing results for
 * un-seeded routes) and by the booking creator (snapshotting the
 * chosen route accurately on the confirmed booking).
 *
 * `priceMultiplier` is a small nudge so cross-country itineraries feel
 * realistically more expensive than domestic ones; every derived
 * number (member discount, points, fees) inherits it via the shared
 * pricing helper.
 */
export interface RouteContext {
  originCity: string;
  destinationCity: string;
  isInternational: boolean;
  priceMultiplier: number;
}

const DOMESTIC_MULTIPLIER = 1.0;
const INTERNATIONAL_MULTIPLIER = 1.7;

export async function resolveRouteContext(
  origin: string,
  destination: string,
): Promise<RouteContext> {
  const [originAirport, destAirport] = await Promise.all([
    AirportModel.findOne({ code: origin }).lean(),
    AirportModel.findOne({ code: destination }).lean(),
  ]);

  const bothKnown = !!originAirport && !!destAirport;
  const isInternational =
    bothKnown && originAirport.country !== destAirport.country;

  return {
    originCity: originAirport?.city || origin,
    destinationCity: destAirport?.city || destination,
    isInternational,
    priceMultiplier: isInternational
      ? INTERNATIONAL_MULTIPLIER
      : DOMESTIC_MULTIPLIER,
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
