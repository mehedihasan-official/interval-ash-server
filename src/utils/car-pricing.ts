/**
 * Central source of truth for car-rental pricing.
 *
 * Base = retailPricePerDay × rentalDays
 * Mileage overage:
 *   - If freeMilesPerDay > 0 and estimatedDailyMiles > freeMilesPerDay:
 *     overage = (estimatedDailyMiles - freeMilesPerDay) × rentalDays × overageRatePerMile
 *   - If freeMilesPerDay is 0 the plan is "unlimited" — no overage.
 * Add-ons: fixed daily surcharges applied for the rental length.
 * Member (Interval) discount: 25% off the pre-tax subtotal on cash;
 * or convert the discounted total to points at the same $0.04/point
 * rate the flight flow uses, with the same 10% processing fee.
 *
 * A single helper on the server keeps the results grid, the detail
 * page, and the booking snapshot from drifting apart.
 */

export interface CarPricingInput {
  retailPricePerDay: number;
  rentalDays: number;
  freeMilesPerDay: number;
  overageRatePerMile: number;
  estimatedDailyMiles: number;
  addOns: {
    insurance: boolean;
    gps: boolean;
    childSeat: boolean;
    additionalDriver: boolean;
  };
}

export interface CarPricingResult {
  baseTotal: number;
  mileageOverageTotal: number;
  addOnsCash: number;
  addOnsPoints: number;
  subtotal: number;
  memberDiscount: number;
  discountedTotal: number;
  pointsRequired: number;
  processingFee: number;
  totalPoints: number;
  grandTotalCash: number;
  grandTotalPoints: number;
}

// Daily surcharge in USD for each optional add-on. Points equivalents
// use the same $0.04/point valuation as the flight flow.
export const CAR_ADDON_PRICING = {
  insurancePerDay: 18,
  gpsPerDay: 5,
  childSeatPerDay: 10,
  additionalDriverPerDay: 12,
} as const;

const MEMBER_DISCOUNT_RATE = 0.25; // 25% off retail
const POINT_VALUE_USD = 0.04;
const POINTS_PROCESSING_FEE_RATE = 0.1;

const round2 = (value: number) => Math.round(value * 100) / 100;

function computeAddOnsCash(
  addOns: CarPricingInput['addOns'],
  days: number,
): number {
  let total = 0;
  if (addOns.insurance) total += CAR_ADDON_PRICING.insurancePerDay * days;
  if (addOns.gps) total += CAR_ADDON_PRICING.gpsPerDay * days;
  if (addOns.childSeat) total += CAR_ADDON_PRICING.childSeatPerDay * days;
  if (addOns.additionalDriver)
    total += CAR_ADDON_PRICING.additionalDriverPerDay * days;
  return round2(total);
}

export function calculateCarPricing(input: CarPricingInput): CarPricingResult {
  const days = Math.max(1, Math.floor(input.rentalDays));
  const baseTotal = round2(input.retailPricePerDay * days);

  // "Unlimited" plans skip overage entirely (freeMilesPerDay = 0 sentinel).
  const overageMilesPerDay =
    input.freeMilesPerDay > 0
      ? Math.max(0, input.estimatedDailyMiles - input.freeMilesPerDay)
      : 0;
  const mileageOverageTotal = round2(
    overageMilesPerDay * days * input.overageRatePerMile,
  );

  const addOnsCash = computeAddOnsCash(input.addOns, days);
  const addOnsPoints = Math.round(addOnsCash / POINT_VALUE_USD);

  const subtotal = round2(baseTotal + mileageOverageTotal + addOnsCash);
  const memberDiscount = round2(subtotal * MEMBER_DISCOUNT_RATE);
  const discountedTotal = round2(subtotal - memberDiscount);

  const pointsRequired = Math.round(discountedTotal / POINT_VALUE_USD);
  const processingFee = Math.round(pointsRequired * POINTS_PROCESSING_FEE_RATE);
  const totalPoints = pointsRequired + processingFee;

  return {
    baseTotal,
    mileageOverageTotal,
    addOnsCash,
    addOnsPoints,
    subtotal,
    memberDiscount,
    discountedTotal,
    pointsRequired,
    processingFee,
    totalPoints,
    grandTotalCash: discountedTotal,
    grandTotalPoints: totalPoints,
  };
}
