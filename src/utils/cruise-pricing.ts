/**
 * Central source of truth for cruise pricing. Cruise fares in the
 * industry are quoted per person, double occupancy — the "retail
 * price" on a cabin is what the first two adults each pay. Extra
 * adults, children, and infants get standard cruise-industry
 * multipliers, then taxes + port fees and gratuities are added on top.
 *
 * Cabin base × occupancy:
 *   adults 1-2  → 100% of cabin retail per adult
 *   adults 3-4  → 60% of cabin retail per extra adult (share the cabin)
 *   children     → 50% of cabin retail per child
 *   infants      → free (industry standard, sits on adult's lap)
 *
 * Taxes & port fees: flat $95 per adult + $65 per child per cruise.
 * Gratuities: $16/guest/night for standard cabins, $20/guest/night for suites.
 * Add-ons: fixed per-guest, per-night surcharges for the whole trip.
 * Interval member discount: 30% off the pre-tax cabin subtotal.
 */

export type CabinKey = 'inside' | 'outside' | 'balcony' | 'suite';

export interface CruisePricingInput {
  cabinRetailPrice: number; // per-person, double occupancy
  cabinType: CabinKey;
  nights: number;
  adults: number;
  children: number;
  infants: number;
  addOns: {
    travelInsurance: boolean;
    drinkPackage: boolean;
    wifiPackage: boolean;
    excursionPackage: boolean;
  };
}

export interface CruisePricingResult {
  cabinBaseTotal: number;
  taxesAndPortFees: number;
  gratuities: number;
  addOnsCash: number;
  subtotal: number;
  memberDiscount: number;
  discountedTotal: number;
  pointsRequired: number;
  processingFee: number;
  totalPoints: number;
  grandTotalCash: number;
  grandTotalPoints: number;
}

// Per-guest, per-night surcharges. Realistic ballpark for the industry
// (drink packages ~$65-90/day, wifi ~$15-25/day, shore excursions
// ~$40/day when bundled).
export const CRUISE_ADDON_PRICING = {
  travelInsurancePerGuest: 89, // flat, not per night
  drinkPackagePerGuestPerNight: 75,
  wifiPackagePerGuestPerNight: 20,
  excursionPackagePerGuestPerNight: 40,
} as const;

const TAX_PER_ADULT = 95;
const TAX_PER_CHILD = 65;
const GRATUITIES_STANDARD_PER_GUEST_PER_NIGHT = 16;
const GRATUITIES_SUITE_PER_GUEST_PER_NIGHT = 20;

const MEMBER_DISCOUNT_RATE = 0.3; // 30% off cabin subtotal
const POINT_VALUE_USD = 0.04;
const POINTS_PROCESSING_FEE_RATE = 0.1;

const round2 = (value: number) => Math.round(value * 100) / 100;

function computeCabinBase(input: CruisePricingInput): number {
  const base = input.cabinRetailPrice;
  const primaryAdults = Math.min(2, input.adults);
  const extraAdults = Math.max(0, input.adults - 2);

  const adultsCost = primaryAdults * base + extraAdults * base * 0.6;
  const childrenCost = input.children * base * 0.5;
  // Infants are free.
  return round2(adultsCost + childrenCost);
}

function computeAddOnsCash(
  addOns: CruisePricingInput['addOns'],
  nights: number,
  payingGuests: number,
): number {
  let total = 0;
  if (addOns.travelInsurance)
    total += CRUISE_ADDON_PRICING.travelInsurancePerGuest * payingGuests;
  if (addOns.drinkPackage)
    total +=
      CRUISE_ADDON_PRICING.drinkPackagePerGuestPerNight * payingGuests * nights;
  if (addOns.wifiPackage)
    total +=
      CRUISE_ADDON_PRICING.wifiPackagePerGuestPerNight * payingGuests * nights;
  if (addOns.excursionPackage)
    total +=
      CRUISE_ADDON_PRICING.excursionPackagePerGuestPerNight *
      payingGuests *
      nights;
  return round2(total);
}

export function calculateCruisePricing(
  input: CruisePricingInput,
): CruisePricingResult {
  const nights = Math.max(1, Math.floor(input.nights));
  const adults = Math.max(1, input.adults);
  const children = Math.max(0, input.children);
  const infants = Math.max(0, input.infants);
  // Add-ons and gratuities count adults + children (infants excluded).
  const payingGuests = adults + children;

  const cabinBaseTotal = computeCabinBase({
    ...input,
    adults,
    children,
    infants,
  });
  const taxesAndPortFees = round2(
    adults * TAX_PER_ADULT + children * TAX_PER_CHILD,
  );
  const gratuitiesRate =
    input.cabinType === 'suite'
      ? GRATUITIES_SUITE_PER_GUEST_PER_NIGHT
      : GRATUITIES_STANDARD_PER_GUEST_PER_NIGHT;
  const gratuities = round2(gratuitiesRate * payingGuests * nights);
  const addOnsCash = computeAddOnsCash(input.addOns, nights, payingGuests);

  // Member discount applies only to the cabin subtotal — taxes,
  // gratuities and add-ons are not discountable in the real industry.
  const memberDiscount = round2(cabinBaseTotal * MEMBER_DISCOUNT_RATE);
  const discountedCabin = round2(cabinBaseTotal - memberDiscount);

  const subtotal = round2(
    cabinBaseTotal + taxesAndPortFees + gratuities + addOnsCash,
  );
  const discountedTotal = round2(
    discountedCabin + taxesAndPortFees + gratuities + addOnsCash,
  );

  const pointsRequired = Math.round(discountedTotal / POINT_VALUE_USD);
  const processingFee = Math.round(pointsRequired * POINTS_PROCESSING_FEE_RATE);
  const totalPoints = pointsRequired + processingFee;

  return {
    cabinBaseTotal,
    taxesAndPortFees,
    gratuities,
    addOnsCash,
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
