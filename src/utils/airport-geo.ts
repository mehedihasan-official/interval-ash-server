// Airport / country coordinates + distance-based flight sizing.
//
// The flight collection only seeds a couple dozen route templates. For
// every other airport pair, the controller reuses a template's timings
// and price as a stand-in — which is fine for domestic hops but reads
// as broken for a long-haul search (Orlando→Dubai showing 3h 15m and a
// $288 fare, borrowed from a JFK→MIA template). This module turns the
// origin/destination codes into an approximate great-circle distance,
// which the controller uses to rebuild the duration, arrival time, and
// price so the numbers on the results card stay believable.
//
// Coordinates come from two layered lookups:
//   1. AIRPORT_COORDS — hand-picked hubs (~120 codes) with real airport
//      lat/lng. Covers the airports that appear in the seed templates
//      and the ones members actually type.
//   2. COUNTRY_COORDS — country-centroid fallback so unlisted airports
//      still produce a distance that's the right order of magnitude
//      instead of degenerating to 0 km.

export interface GeoPoint {
  lat: number;
  lng: number;
}

// IATA → airport lat/lng for major international hubs. Values are the
// airport's own coordinates (not the city's) so short intra-metro
// routes come out reasonable.
export const AIRPORT_COORDS: Record<string, GeoPoint> = {
  // North America — United States
  ATL: { lat: 33.6407, lng: -84.4277 },
  AUS: { lat: 30.1975, lng: -97.6664 },
  BNA: { lat: 36.1245, lng: -86.6782 },
  BOS: { lat: 42.3656, lng: -71.0096 },
  BWI: { lat: 39.1754, lng: -76.6684 },
  CLT: { lat: 35.214, lng: -80.9431 },
  DAL: { lat: 32.8471, lng: -96.8518 },
  DCA: { lat: 38.8512, lng: -77.0402 },
  DEN: { lat: 39.8561, lng: -104.6737 },
  DFW: { lat: 32.8998, lng: -97.0403 },
  DTW: { lat: 42.2124, lng: -83.3534 },
  EWR: { lat: 40.6895, lng: -74.1745 },
  FLL: { lat: 26.0742, lng: -80.1506 },
  HNL: { lat: 21.3187, lng: -157.9225 },
  IAD: { lat: 38.9531, lng: -77.4565 },
  IAH: { lat: 29.9902, lng: -95.3368 },
  JFK: { lat: 40.6413, lng: -73.7781 },
  LAS: { lat: 36.084, lng: -115.1537 },
  LAX: { lat: 33.9416, lng: -118.4085 },
  LGA: { lat: 40.7769, lng: -73.874 },
  MCO: { lat: 28.4312, lng: -81.3081 },
  MIA: { lat: 25.7959, lng: -80.287 },
  MSP: { lat: 44.882, lng: -93.2218 },
  MSY: { lat: 29.9934, lng: -90.258 },
  OAK: { lat: 37.7213, lng: -122.2211 },
  ORD: { lat: 41.9742, lng: -87.9073 },
  PDX: { lat: 45.5898, lng: -122.5951 },
  PHL: { lat: 39.8744, lng: -75.2424 },
  PHX: { lat: 33.4342, lng: -112.0116 },
  RDU: { lat: 35.8776, lng: -78.7875 },
  SAN: { lat: 32.7336, lng: -117.1897 },
  SEA: { lat: 47.4502, lng: -122.3088 },
  SFO: { lat: 37.6213, lng: -122.379 },
  SJC: { lat: 37.3639, lng: -121.929 },
  SLC: { lat: 40.7899, lng: -111.9791 },
  STL: { lat: 38.7487, lng: -90.37 },
  TPA: { lat: 27.9755, lng: -82.5332 },
  // Canada
  YEG: { lat: 53.3097, lng: -113.5801 },
  YOW: { lat: 45.3225, lng: -75.6692 },
  YUL: { lat: 45.4706, lng: -73.7408 },
  YVR: { lat: 49.1967, lng: -123.1815 },
  YYC: { lat: 51.1315, lng: -114.0106 },
  YYZ: { lat: 43.6777, lng: -79.6248 },
  // Mexico / Central America / Caribbean
  CUN: { lat: 21.0365, lng: -86.877 },
  GDL: { lat: 20.5218, lng: -103.3106 },
  HAV: { lat: 22.9891, lng: -82.4091 },
  MEX: { lat: 19.4363, lng: -99.0721 },
  MTY: { lat: 25.7785, lng: -100.1076 },
  NAS: { lat: 25.039, lng: -77.4661 },
  PTY: { lat: 9.0714, lng: -79.3833 },
  PVR: { lat: 20.6801, lng: -105.2544 },
  SDQ: { lat: 18.4297, lng: -69.6689 },
  SJO: { lat: 9.9939, lng: -84.2088 },
  SJU: { lat: 18.4394, lng: -66.0018 },
  SXM: { lat: 18.041, lng: -63.1089 },
  // South America
  BOG: { lat: 4.7016, lng: -74.1469 },
  EZE: { lat: -34.8222, lng: -58.5358 },
  GIG: { lat: -22.8099, lng: -43.2506 },
  GRU: { lat: -23.4356, lng: -46.4731 },
  LIM: { lat: -12.0219, lng: -77.1143 },
  SCL: { lat: -33.393, lng: -70.7858 },
  UIO: { lat: -0.1292, lng: -78.3575 },
  // Europe
  AMS: { lat: 52.3086, lng: 4.7639 },
  ARN: { lat: 59.6519, lng: 17.9186 },
  ATH: { lat: 37.9364, lng: 23.9445 },
  BCN: { lat: 41.2974, lng: 2.0833 },
  BRU: { lat: 50.9014, lng: 4.4844 },
  BUD: { lat: 47.4394, lng: 19.2618 },
  CDG: { lat: 49.0097, lng: 2.5479 },
  CPH: { lat: 55.6179, lng: 12.6561 },
  DUB: { lat: 53.4213, lng: -6.2701 },
  DUS: { lat: 51.2895, lng: 6.7668 },
  FCO: { lat: 41.8003, lng: 12.2389 },
  FRA: { lat: 50.0379, lng: 8.5622 },
  GVA: { lat: 46.2381, lng: 6.1089 },
  HEL: { lat: 60.3172, lng: 24.9633 },
  IST: { lat: 41.2753, lng: 28.7519 },
  LGW: { lat: 51.1481, lng: -0.1903 },
  LHR: { lat: 51.47, lng: -0.4543 },
  LIS: { lat: 38.7742, lng: -9.1342 },
  MAD: { lat: 40.4936, lng: -3.5668 },
  MUC: { lat: 48.3538, lng: 11.7861 },
  MXP: { lat: 45.63, lng: 8.7231 },
  OSL: { lat: 60.1976, lng: 11.1004 },
  PRG: { lat: 50.1008, lng: 14.26 },
  SVO: { lat: 55.9736, lng: 37.4125 },
  VIE: { lat: 48.1103, lng: 16.5697 },
  WAW: { lat: 52.1657, lng: 20.9671 },
  ZRH: { lat: 47.4647, lng: 8.5492 },
  // Middle East
  AUH: { lat: 24.433, lng: 54.6511 },
  BAH: { lat: 26.2708, lng: 50.6336 },
  CAI: { lat: 30.1114, lng: 31.4139 },
  DOH: { lat: 25.2731, lng: 51.6081 },
  DXB: { lat: 25.2528, lng: 55.3644 },
  JED: { lat: 21.6796, lng: 39.1565 },
  KWI: { lat: 29.2266, lng: 47.9689 },
  RUH: { lat: 24.9576, lng: 46.6988 },
  TLV: { lat: 32.0114, lng: 34.8867 },
  // Africa
  ADD: { lat: 8.9779, lng: 38.7993 },
  CPT: { lat: -33.9648, lng: 18.6017 },
  CMN: { lat: 33.3675, lng: -7.5898 },
  JNB: { lat: -26.1367, lng: 28.246 },
  LOS: { lat: 6.5774, lng: 3.3212 },
  NBO: { lat: -1.3192, lng: 36.9278 },
  // Asia
  BKK: { lat: 13.6811, lng: 100.7475 },
  BLR: { lat: 13.1986, lng: 77.7066 },
  BOM: { lat: 19.0896, lng: 72.8656 },
  CAN: { lat: 23.3924, lng: 113.2988 },
  CGK: { lat: -6.1256, lng: 106.6558 },
  CTU: { lat: 30.5785, lng: 103.9471 },
  DEL: { lat: 28.5562, lng: 77.1 },
  DPS: { lat: -8.7482, lng: 115.1672 },
  HAN: { lat: 21.2187, lng: 105.8042 },
  HKG: { lat: 22.308, lng: 113.9185 },
  HND: { lat: 35.5494, lng: 139.7798 },
  ICN: { lat: 37.4602, lng: 126.4407 },
  KIX: { lat: 34.4342, lng: 135.2325 },
  KUL: { lat: 2.7456, lng: 101.7099 },
  MNL: { lat: 14.5086, lng: 121.0198 },
  NRT: { lat: 35.7647, lng: 140.3864 },
  PEK: { lat: 40.0801, lng: 116.5846 },
  PVG: { lat: 31.1443, lng: 121.8083 },
  SGN: { lat: 10.8188, lng: 106.6519 },
  SIN: { lat: 1.3644, lng: 103.9915 },
  TPE: { lat: 25.0797, lng: 121.2342 },
  // Oceania
  AKL: { lat: -37.0082, lng: 174.7917 },
  BNE: { lat: -27.3842, lng: 153.1175 },
  MEL: { lat: -37.6733, lng: 144.8433 },
  NAN: { lat: -17.7554, lng: 177.4434 },
  PER: { lat: -31.9403, lng: 115.9669 },
  PPT: { lat: -17.5537, lng: -149.6069 },
  SYD: { lat: -33.9399, lng: 151.1753 },
};

// Country → approximate centroid lat/lng. Used as a fallback when an
// airport code isn't in AIRPORT_COORDS above — the resulting distance
// won't match the exact runway location, but it stays in the right
// order of magnitude (a Lagos → Sydney synth won't look like a hop).
export const COUNTRY_COORDS: Record<string, GeoPoint> = {
  Afghanistan: { lat: 33.9391, lng: 67.71 },
  Albania: { lat: 41.1533, lng: 20.1683 },
  Algeria: { lat: 28.0339, lng: 1.6596 },
  Angola: { lat: -11.2027, lng: 17.8739 },
  Argentina: { lat: -38.4161, lng: -63.6167 },
  Armenia: { lat: 40.0691, lng: 45.0382 },
  Australia: { lat: -25.2744, lng: 133.7751 },
  Austria: { lat: 47.5162, lng: 14.5501 },
  Azerbaijan: { lat: 40.1431, lng: 47.5769 },
  Bahamas: { lat: 25.0343, lng: -77.3963 },
  Bahrain: { lat: 25.9304, lng: 50.6378 },
  Bangladesh: { lat: 23.685, lng: 90.3563 },
  Barbados: { lat: 13.1939, lng: -59.5432 },
  Belarus: { lat: 53.7098, lng: 27.9534 },
  Belgium: { lat: 50.5039, lng: 4.4699 },
  Belize: { lat: 17.1899, lng: -88.4976 },
  Bhutan: { lat: 27.5142, lng: 90.4336 },
  Bolivia: { lat: -16.2902, lng: -63.5887 },
  'Bosnia and Herzegovina': { lat: 43.9159, lng: 17.6791 },
  Botswana: { lat: -22.3285, lng: 24.6849 },
  Brazil: { lat: -14.235, lng: -51.9253 },
  Brunei: { lat: 4.5353, lng: 114.7277 },
  Bulgaria: { lat: 42.7339, lng: 25.4858 },
  'Burkina Faso': { lat: 12.2383, lng: -1.5616 },
  Cambodia: { lat: 12.5657, lng: 104.991 },
  Cameroon: { lat: 7.3697, lng: 12.3547 },
  Canada: { lat: 56.1304, lng: -106.3468 },
  'Cape Verde': { lat: 16.5388, lng: -23.0418 },
  Chad: { lat: 15.4542, lng: 18.7322 },
  Chile: { lat: -35.6751, lng: -71.543 },
  China: { lat: 35.8617, lng: 104.1954 },
  Colombia: { lat: 4.5709, lng: -74.2973 },
  Congo: { lat: -0.228, lng: 15.8277 },
  'Costa Rica': { lat: 9.7489, lng: -83.7534 },
  Croatia: { lat: 45.1, lng: 15.2 },
  Cuba: { lat: 21.5218, lng: -77.7812 },
  Cyprus: { lat: 35.1264, lng: 33.4299 },
  'Czech Republic': { lat: 49.8175, lng: 15.473 },
  Denmark: { lat: 56.2639, lng: 9.5018 },
  'Dominican Republic': { lat: 18.7357, lng: -70.1627 },
  Ecuador: { lat: -1.8312, lng: -78.1834 },
  Egypt: { lat: 26.8206, lng: 30.8025 },
  'El Salvador': { lat: 13.7942, lng: -88.8965 },
  Estonia: { lat: 58.5953, lng: 25.0136 },
  Ethiopia: { lat: 9.145, lng: 40.4897 },
  Fiji: { lat: -17.7134, lng: 178.065 },
  Finland: { lat: 61.9241, lng: 25.7482 },
  France: { lat: 46.6034, lng: 1.8883 },
  Gabon: { lat: -0.8037, lng: 11.6094 },
  Georgia: { lat: 42.3154, lng: 43.3569 },
  Germany: { lat: 51.1657, lng: 10.4515 },
  Ghana: { lat: 7.9465, lng: -1.0232 },
  Greece: { lat: 39.0742, lng: 21.8243 },
  Guatemala: { lat: 15.7835, lng: -90.2308 },
  Haiti: { lat: 18.9712, lng: -72.2852 },
  Honduras: { lat: 15.199, lng: -86.2419 },
  'Hong Kong': { lat: 22.3193, lng: 114.1694 },
  Hungary: { lat: 47.1625, lng: 19.5033 },
  Iceland: { lat: 64.9631, lng: -19.0208 },
  India: { lat: 20.5937, lng: 78.9629 },
  Indonesia: { lat: -0.7893, lng: 113.9213 },
  Iran: { lat: 32.4279, lng: 53.688 },
  Iraq: { lat: 33.2232, lng: 43.6793 },
  Ireland: { lat: 53.1424, lng: -7.6921 },
  Israel: { lat: 31.0461, lng: 34.8516 },
  Italy: { lat: 41.8719, lng: 12.5674 },
  'Ivory Coast': { lat: 7.54, lng: -5.5471 },
  Jamaica: { lat: 18.1096, lng: -77.2975 },
  Japan: { lat: 36.2048, lng: 138.2529 },
  Jordan: { lat: 30.5852, lng: 36.2384 },
  Kazakhstan: { lat: 48.0196, lng: 66.9237 },
  Kenya: { lat: -0.0236, lng: 37.9062 },
  Kuwait: { lat: 29.3117, lng: 47.4818 },
  Laos: { lat: 19.8563, lng: 102.4955 },
  Latvia: { lat: 56.8796, lng: 24.6032 },
  Lebanon: { lat: 33.8547, lng: 35.8623 },
  Libya: { lat: 26.3351, lng: 17.2283 },
  Lithuania: { lat: 55.1694, lng: 23.8813 },
  Luxembourg: { lat: 49.8153, lng: 6.1296 },
  Macau: { lat: 22.1987, lng: 113.5439 },
  Madagascar: { lat: -18.7669, lng: 46.8691 },
  Malaysia: { lat: 4.2105, lng: 101.9758 },
  Maldives: { lat: 3.2028, lng: 73.2207 },
  Mali: { lat: 17.5707, lng: -3.9962 },
  Malta: { lat: 35.9375, lng: 14.3754 },
  Mauritius: { lat: -20.3484, lng: 57.5522 },
  Mexico: { lat: 23.6345, lng: -102.5528 },
  Moldova: { lat: 47.4116, lng: 28.3699 },
  Mongolia: { lat: 46.8625, lng: 103.8467 },
  Montenegro: { lat: 42.7087, lng: 19.3744 },
  Morocco: { lat: 31.7917, lng: -7.0926 },
  Mozambique: { lat: -18.6657, lng: 35.5296 },
  Myanmar: { lat: 21.9162, lng: 95.956 },
  Namibia: { lat: -22.9576, lng: 18.4904 },
  Nepal: { lat: 28.3949, lng: 84.124 },
  Netherlands: { lat: 52.1326, lng: 5.2913 },
  'New Zealand': { lat: -40.9006, lng: 174.886 },
  Nicaragua: { lat: 12.8654, lng: -85.2072 },
  Niger: { lat: 17.6078, lng: 8.0817 },
  Nigeria: { lat: 9.082, lng: 8.6753 },
  'North Korea': { lat: 40.3399, lng: 127.5101 },
  'North Macedonia': { lat: 41.6086, lng: 21.7453 },
  Norway: { lat: 60.472, lng: 8.4689 },
  Oman: { lat: 21.4735, lng: 55.9754 },
  Pakistan: { lat: 30.3753, lng: 69.3451 },
  Palestine: { lat: 31.9522, lng: 35.2332 },
  Panama: { lat: 8.538, lng: -80.7821 },
  'Papua New Guinea': { lat: -6.315, lng: 143.9555 },
  Paraguay: { lat: -23.4425, lng: -58.4438 },
  Peru: { lat: -9.19, lng: -75.0152 },
  Philippines: { lat: 12.8797, lng: 121.774 },
  Poland: { lat: 51.9194, lng: 19.1451 },
  Portugal: { lat: 39.3999, lng: -8.2245 },
  'Puerto Rico': { lat: 18.2208, lng: -66.5901 },
  Qatar: { lat: 25.3548, lng: 51.1839 },
  Romania: { lat: 45.9432, lng: 24.9668 },
  Russia: { lat: 61.524, lng: 105.3188 },
  Rwanda: { lat: -1.9403, lng: 29.8739 },
  'Saudi Arabia': { lat: 23.8859, lng: 45.0792 },
  Senegal: { lat: 14.4974, lng: -14.4524 },
  Serbia: { lat: 44.0165, lng: 21.0059 },
  Seychelles: { lat: -4.6796, lng: 55.492 },
  Singapore: { lat: 1.3521, lng: 103.8198 },
  Slovakia: { lat: 48.669, lng: 19.699 },
  Slovenia: { lat: 46.1512, lng: 14.9955 },
  'South Africa': { lat: -30.5595, lng: 22.9375 },
  'South Korea': { lat: 35.9078, lng: 127.7669 },
  Spain: { lat: 40.4637, lng: -3.7492 },
  'Sri Lanka': { lat: 7.8731, lng: 80.7718 },
  Sudan: { lat: 12.8628, lng: 30.2176 },
  Sweden: { lat: 60.1282, lng: 18.6435 },
  Switzerland: { lat: 46.8182, lng: 8.2275 },
  Syria: { lat: 34.8021, lng: 38.9968 },
  Taiwan: { lat: 23.6978, lng: 120.9605 },
  Tanzania: { lat: -6.369, lng: 34.8888 },
  Thailand: { lat: 15.87, lng: 100.9925 },
  'Trinidad and Tobago': { lat: 10.6918, lng: -61.2225 },
  Tunisia: { lat: 33.8869, lng: 9.5375 },
  Turkey: { lat: 38.9637, lng: 35.2433 },
  Turkmenistan: { lat: 38.9697, lng: 59.5563 },
  Uganda: { lat: 1.3733, lng: 32.2903 },
  Ukraine: { lat: 48.3794, lng: 31.1656 },
  'United Arab Emirates': { lat: 23.4241, lng: 53.8478 },
  'United Kingdom': { lat: 55.3781, lng: -3.436 },
  'United States': { lat: 39.0458, lng: -95.6892 },
  'United States of America': { lat: 39.0458, lng: -95.6892 },
  USA: { lat: 39.0458, lng: -95.6892 },
  Uruguay: { lat: -32.5228, lng: -55.7658 },
  Uzbekistan: { lat: 41.3775, lng: 64.5853 },
  Venezuela: { lat: 6.4238, lng: -66.5897 },
  Vietnam: { lat: 14.0583, lng: 108.2772 },
  Yemen: { lat: 15.5527, lng: 48.5164 },
  Zambia: { lat: -13.1339, lng: 27.8493 },
  Zimbabwe: { lat: -19.0154, lng: 29.1549 },
};

/** Resolve a lat/lng for an airport, falling back to its country. */
export function getAirportCoords(
  code: string,
  country?: string,
): GeoPoint | null {
  const direct = AIRPORT_COORDS[code?.toUpperCase()];
  if (direct) return direct;
  if (country && COUNTRY_COORDS[country]) return COUNTRY_COORDS[country];
  return null;
}

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in kilometers. */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Cruise speed varies with distance: short hops spend more of their
// time climbing and descending (so effective km/min is lower); long-
// haul jets sit in cruise longer and often benefit from the jet stream
// so their effective km/min is higher. This piecewise curve keeps
// short-hops honest and pulls very-long-haul back from the ~16h a flat
// 800 km/h cruise gave for MCO → DXB toward the ~14h real airlines
// advertise.
const LAYOVER_MIN_PER_STOP = 90;
const MIN_DURATION_MIN = 55;

/** Whole-minutes flight duration for a route of `distanceKm` with `stops`. */
export function estimateDurationMinutes(distanceKm: number, stops: number): number {
  const km = Math.max(0, distanceKm);
  let flying: number;
  let overhead: number;
  if (km < 500) {
    // Regional / short-hop: 45m overhead, ~600 km/h effective.
    overhead = 45;
    flying = km / 10.0;
  } else if (km < 1500) {
    // Domestic short-medium: ~720 km/h effective.
    overhead = 40;
    flying = km / 12.0;
  } else if (km < 4000) {
    // Domestic long / short international: ~810 km/h effective.
    overhead = 40;
    flying = km / 13.5;
  } else if (km < 8000) {
    // Transatlantic / medium long-haul: ~870 km/h.
    overhead = 45;
    flying = km / 14.5;
  } else {
    // Ultra long-haul: real 787/A350 cruise ~900+ km/h.
    overhead = 50;
    flying = km / 15.5;
  }
  const total = overhead + flying + Math.max(0, stops) * LAYOVER_MIN_PER_STOP;
  return Math.max(MIN_DURATION_MIN, Math.round(total));
}

/**
 * Piecewise base-fare-in-USD estimate for one economy seat on a route
 * of `distanceKm`. Comes out roughly where a mainstream airline like
 * United / Delta / British Airways lists an economy ticket — budget
 * carriers land below via `AIRLINE_TIER`, premium carriers (Emirates,
 * Singapore, Qatar) land above.
 */
export function estimateBaseEconomyFare(distanceKm: number): number {
  const km = Math.max(0, distanceKm);
  if (km < 500) return 65 + km * 0.16;
  if (km < 1500) return 75 + km * 0.12;
  if (km < 4000) return 110 + km * 0.1;
  if (km < 8000) return 210 + km * 0.09;
  return 320 + km * 0.07;
}

/**
 * Airline-tier factor applied to the base fare. Budget carriers (0.72)
 * sit below a mainline, premium/full-service internationals sit above.
 * Anything unknown gets 1.0 so no template disappears from the list.
 */
const AIRLINE_TIER: Record<string, number> = {
  // Budget / low-cost
  'Southwest Airlines': 0.75,
  'Spirit Airlines': 0.7,
  'Frontier Airlines': 0.7,
  'JetBlue Airways': 0.85,
  'Allegiant Air': 0.72,
  Ryanair: 0.68,
  EasyJet: 0.72,
  'Wizz Air': 0.7,
  'AirAsia': 0.7,
  'IndiGo': 0.75,
  // Mainline (~1.0 — default)
  'Alaska Airlines': 0.95,
  'American Airlines': 1.0,
  'Delta Air Lines': 1.05,
  'United Airlines': 1.0,
  'Air Canada': 1.0,
  'British Airways': 1.1,
  'Air France': 1.05,
  'KLM': 1.05,
  Lufthansa: 1.1,
  'Iberia': 1.0,
  'Turkish Airlines': 1.05,
  'Aeromexico': 0.95,
  // Premium / long-haul flagship
  'Emirates': 1.35,
  'Qatar Airways': 1.35,
  'Etihad Airways': 1.3,
  'Singapore Airlines': 1.35,
  'Cathay Pacific': 1.25,
  'ANA': 1.3,
  'Japan Airlines': 1.3,
  'Korean Air': 1.2,
  'Qantas': 1.25,
  'Swiss International Air Lines': 1.2,
};

export function getAirlineTier(airline: string): number {
  return AIRLINE_TIER[airline] ?? 1.0;
}

/**
 * Multiplier applied on top of economy to price a Premium Economy /
 * Business / First cabin. Falls back to 1x if the label is unknown
 * so nothing crashes on an unexpected value.
 */
const CABIN_MULTIPLIER: Record<string, number> = {
  Economy: 1,
  'Premium Economy': 1.75,
  Business: 3.8,
  First: 7.5,
};

export function getCabinMultiplier(cabinClass: string): number {
  return CABIN_MULTIPLIER[cabinClass] ?? 1;
}

/**
 * Small, deterministic 0–1 pseudo-random derived from a string. Same
 * input always produces the same output, so a given template on a
 * given route jitters the same way every request (results don't
 * shuffle around between refreshes).
 */
function seededUnit(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const normalized = ((hash >>> 0) % 10_000) / 10_000;
  return normalized;
}

/**
 * ±`amplitude` variance in the range [1 - amplitude, 1 + amplitude],
 * deterministic per `seed` so a template's flight always jitters the
 * same amount on a given route.
 */
export function seededVariance(seed: string, amplitude: number): number {
  const unit = seededUnit(seed); // 0..1
  return 1 - amplitude + unit * (2 * amplitude);
}

/** Format minutes as the "3h 15m" strings the flight schema stores. */
export function formatDurationLabel(totalMinutes: number): string {
  const safe = Math.max(1, Math.round(totalMinutes));
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/**
 * Add `minutes` to a wall-clock label like "06:00 AM" and return a new
 * label in the same 12-hour format. Timezones are intentionally not
 * modeled — the UI shows arrival in local wall time relative to
 * departure, same as it did before this change.
 */
export function addMinutesToTimeLabel(label: string, minutes: number): string {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(label.trim());
  if (!match) return label;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3].toUpperCase();
  if (meridiem === 'PM' && hour !== 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;
  const totalStart = hour * 60 + minute;
  const totalEnd = ((totalStart + Math.max(0, Math.round(minutes))) % 1440 + 1440) % 1440;
  let endHour = Math.floor(totalEnd / 60);
  const endMin = totalEnd % 60;
  const endMeridiem = endHour >= 12 ? 'PM' : 'AM';
  endHour = endHour % 12;
  if (endHour === 0) endHour = 12;
  return `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')} ${endMeridiem}`;
}
