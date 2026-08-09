/**
 * Curated image URLs for the seeded car and cruise fixtures.
 *
 * ── Cars ────────────────────────────────────────────────────────────
 * We render car images through imagin.studio — a service designed
 * specifically for this: given a make + model family it returns a
 * brand-accurate render of that exact vehicle (so a BMW row shows a
 * BMW, not whichever generic sedan Unsplash happened to have). The
 * `img` customer key is imagin's public/watermarked tier, appropriate
 * for a demo project. If a car isn't in the map, seeder falls back to
 * whatever `image` came in with the raw record.
 *
 * ── Cruises ────────────────────────────────────────────────────────
 * Cruise imagery isn't as brand-critical (ships look like ships), so
 * we keep a curated set of stock Unsplash photos that render reliably
 * and match the destination vibe (ice for Alaska, palm trees for
 * Caribbean, etc.).
 */

/**
 * imagin.studio render URL for a specific make + model family.
 *
 * `angle=23` is a 3/4 front view — the most flattering angle for
 * result-card thumbnails; `zoomType=fullscreen` renders the vehicle
 * against a transparent background so it composites cleanly on our
 * light and dark themes; `width=800` matches the card's target
 * display size to keep payloads small.
 */
const imaginCarUrl = (make: string, modelFamily: string): string =>
  `https://cdn.imagin.studio/getImage?customer=img&make=${encodeURIComponent(
    make,
  )}&modelFamily=${encodeURIComponent(
    modelFamily,
  )}&angle=23&zoomType=fullscreen&width=800`;

export const CAR_IMAGE_OVERRIDES: Record<string, string> = {
  // Base 11 cars (from the Expedia demo data).
  CAR001: imaginCarUrl('kia', 'rio'),
  CAR002: imaginCarUrl('toyota', 'corolla'),
  CAR003: imaginCarUrl('honda', 'accord'),
  CAR004: imaginCarUrl('chevrolet', 'malibu'),
  CAR005: imaginCarUrl('toyota', 'rav4'),
  CAR006: imaginCarUrl('chevrolet', 'tahoe'),
  CAR007: imaginCarUrl('chrysler', 'pacifica'),
  CAR008: imaginCarUrl('mercedes-benz', 'c-class'),
  CAR009: imaginCarUrl('nissan', 'rogue'),
  CAR010: imaginCarUrl('ford', 'mustang'),
  CAR011: imaginCarUrl('ford', 'f-150'),

  // Extras (see cars-extra.json).
  CAR012: imaginCarUrl('tesla', 'model3'),
  CAR013: imaginCarUrl('bmw', '5series'),
  CAR014: imaginCarUrl('mercedes-benz', 'e-class'),
  CAR015: imaginCarUrl('jeep', 'wrangler'),
  CAR016: imaginCarUrl('ford', 'mustang'),
  CAR017: imaginCarUrl('ford', 'f-150'),
  CAR018: imaginCarUrl('nissan', 'altima'),
  CAR019: imaginCarUrl('hyundai', 'sonata'),
  CAR020: imaginCarUrl('chrysler', 'pacifica'),
  CAR021: imaginCarUrl('volkswagen', 'jetta'),
  CAR022: imaginCarUrl('cadillac', 'escalade'),
  CAR023: imaginCarUrl('porsche', 'macan'),
  CAR024: imaginCarUrl('tesla', 'modely'),
  CAR025: imaginCarUrl('land-rover', 'range-rover'),
  CAR026: imaginCarUrl('mazda', 'cx-5'),
};

/**
 * Backup Unsplash photos grouped by broad category — used by the
 * client's <img onError> fallback when imagin.studio doesn't have a
 * render for a specific make/model combination. Not brand-specific,
 * but at least visually appropriate for the vehicle class so a member
 * never sees a broken image.
 */
export const CAR_CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  economy:
    'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=800&auto=format&fit=crop',
  compact:
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&auto=format&fit=crop',
  midsize:
    'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&auto=format&fit=crop',
  fullsize:
    'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&auto=format&fit=crop',
  suv: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&auto=format&fit=crop',
  'compact-suv':
    'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&auto=format&fit=crop',
  luxury:
    'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&auto=format&fit=crop',
  electric:
    'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800&auto=format&fit=crop',
  minivan:
    'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=800&auto=format&fit=crop',
  convertible:
    'https://images.unsplash.com/photo-1547038577-da80abbc4f19?w=800&auto=format&fit=crop',
  pickup:
    'https://images.unsplash.com/photo-1594502184342-2e12f877aa73?w=800&auto=format&fit=crop',
};

export const CRUISE_IMAGE_OVERRIDES: Record<string, string> = {
  'CR-CAR-001': 'https://images.unsplash.com/photo-1548574505-5e239809ee19?w=1200&auto=format&fit=crop',
  'CR-CAR-002': 'https://images.unsplash.com/photo-1599640842225-85d111c60e6b?w=1200&auto=format&fit=crop',
  'CR-CAR-003': 'https://images.unsplash.com/photo-1580541631950-7282082b53fe?w=1200&auto=format&fit=crop',
  'CR-CAR-004': 'https://images.unsplash.com/photo-1566375638485-3fcdcb44f125?w=1200&auto=format&fit=crop',
  'CR-CAR-005': 'https://images.unsplash.com/photo-1548574505-5e239809ee19?w=1200&auto=format&fit=crop',
  'CR-CAR-006': 'https://images.unsplash.com/photo-1580541631950-7282082b53fe?w=1200&auto=format&fit=crop',
  'CR-CAR-007': 'https://images.unsplash.com/photo-1548574505-5e239809ee19?w=1200&auto=format&fit=crop',
  'CR-MED-001': 'https://images.unsplash.com/photo-1548574505-5e239809ee19?w=1200&auto=format&fit=crop',
  'CR-MED-002': 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=1200&auto=format&fit=crop',
  'CR-MED-003': 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&auto=format&fit=crop',
  'CR-MED-004': 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=1200&auto=format&fit=crop',
  'CR-MED-005': 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&auto=format&fit=crop',
  'CR-ALA-001': 'https://images.unsplash.com/photo-1531794499199-c123bb9cf7b0?w=1200&auto=format&fit=crop',
  'CR-ALA-002': 'https://images.unsplash.com/photo-1533677464002-6ae8e2f9c81b?w=1200&auto=format&fit=crop',
  'CR-ALA-003': 'https://images.unsplash.com/photo-1541348263662-e068662d82af?w=1200&auto=format&fit=crop',
  'CR-ALA-004': 'https://images.unsplash.com/photo-1531794499199-c123bb9cf7b0?w=1200&auto=format&fit=crop',
  'CR-BAH-001': 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&auto=format&fit=crop',
  'CR-BAH-002': 'https://images.unsplash.com/photo-1580541631950-7282082b53fe?w=1200&auto=format&fit=crop',
  'CR-BAH-003': 'https://images.unsplash.com/photo-1580541631950-7282082b53fe?w=1200&auto=format&fit=crop',
  'CR-EUR-001': 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=1200&auto=format&fit=crop',
  'CR-EUR-002': 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=1200&auto=format&fit=crop',
  'CR-EUR-003': 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=1200&auto=format&fit=crop',
  'CR-HAW-001': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop',
  'CR-HAW-002': 'https://images.unsplash.com/photo-1573521193826-58c7dc2e13c3?w=1200&auto=format&fit=crop',
  'CR-HAW-003': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop',
  'CR-TRA-001': 'https://images.unsplash.com/photo-1519452635265-7b1fbfd1e4e0?w=1200&auto=format&fit=crop',
  'CR-TRA-002': 'https://images.unsplash.com/photo-1519452635265-7b1fbfd1e4e0?w=1200&auto=format&fit=crop',
  'CR-MID-001': 'https://images.unsplash.com/photo-1512632578888-169bbbc64f33?w=1200&auto=format&fit=crop',
  'CR-MID-002': 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&auto=format&fit=crop',
  'CR-ASI-001': 'https://images.unsplash.com/photo-1512632578888-169bbbc64f33?w=1200&auto=format&fit=crop',
  'CR-ANT-001': 'https://images.unsplash.com/photo-1541348263662-e068662d82af?w=1200&auto=format&fit=crop',
};
