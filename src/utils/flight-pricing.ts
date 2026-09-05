/**
 * Central source of truth for how a flight's retail price becomes
 * everything else the UI needs: member (Platinum Club) cash price,
 * points required, processing fee, and the total in points.
 *
 * Kept in one place so the client's Booking Summary, the server's
 * booking record, and any future admin report all agree on the same
 * numbers instead of each recomputing them independently.
 *
 * Everything here is **per traveler, for the whole itinerary** — a
 * round trip is already priced as a round trip by the time a retail
 * price reaches this module (see getTripFareMultiplier in
 * airport-geo.ts). Multiplying up to a booking total is the caller's
 * job, via sumPassengerFareWeight below.
 */

export interface FlightPricing {
  retailPrice: number;
  discountedPrice: number;
  pointsRequired: number;
  processingFee: number;
  totalPoints: number;
}

const MEMBER_DISCOUNT_RATE = 0.47; // 47% off retail for members
const POINT_VALUE_USD = 0.04; // 1 point = $0.04
const POINTS_PROCESSING_FEE_RATE = 0.1; // 10% surcharge on points

export function calculateFlightPricing(retailPrice: number): FlightPricing {
  const discountedPrice =
    Math.round(retailPrice * (1 - MEMBER_DISCOUNT_RATE) * 100) / 100;
  const pointsRequired = Math.round(discountedPrice / POINT_VALUE_USD);
  const processingFee = Math.round(pointsRequired * POINTS_PROCESSING_FEE_RATE);
  const totalPoints = pointsRequired + processingFee;

  return {
    retailPrice,
    discountedPrice,
    pointsRequired,
    processingFee,
    totalPoints,
  };
}

/**
 * What each traveler type pays, as a share of the adult fare. Mirrors
 * how airlines actually sell: a child in their own seat is discounted,
 * a lap infant is a token fee rather than a fare.
 */
const PASSENGER_FARE_WEIGHT: Record<string, number> = {
  Adult: 1,
  Child: 0.75,
  Infant: 0.1,
};

/**
 * Total fare weight for a passenger list — 2 adults + 1 child is 2.75
 * adult fares, not 3. An empty or unrecognized list still counts as
 * one traveler so a booking can never total $0.
 */
export function sumPassengerFareWeight(
  passengers: { type?: string }[] | undefined,
): number {
  if (!Array.isArray(passengers) || passengers.length === 0) return 1;
  const weight = passengers.reduce(
    (sum, passenger) => sum + (PASSENGER_FARE_WEIGHT[String(passenger?.type)] ?? 1),
    0,
  );
  return weight > 0 ? weight : 1;
}

export const FLIGHT_ADDON_PRICING = {
  seatCash: 15,
  seatPoints: 375,
  baggageCash: 35,
  baggagePoints: 875,
} as const;
