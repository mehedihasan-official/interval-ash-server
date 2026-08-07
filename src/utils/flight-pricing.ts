/**
 * Central source of truth for how a flight's retail price becomes
 * everything else the UI needs: member (Platinum Club) cash price,
 * points required, processing fee, and the total in points.
 *
 * Kept in one place so the client's Booking Summary, the server's
 * booking record, and any future admin report all agree on the same
 * numbers instead of each recomputing them independently.
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

export const FLIGHT_ADDON_PRICING = {
  seatCash: 15,
  seatPoints: 375,
  baggageCash: 35,
  baggagePoints: 875,
} as const;
