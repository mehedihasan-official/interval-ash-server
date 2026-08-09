/**
 * Curated image URLs for the seeded car and cruise fixtures.
 *
 * The upstream reference data (Expedia demo) hotlinked to
 * dealerinspire.com and unstable Wikimedia thumbnails — many of those
 * returned 403/404 in practice, hence the blank cards the client saw.
 * These replacements point at Unsplash's CDN (permissive licensing,
 * long-lived URLs) with `?w=800&auto=format&fit=crop` parameters so
 * every image is served at a consistent size regardless of the
 * original upload dimensions.
 */

export const CAR_IMAGE_OVERRIDES: Record<string, string> = {
  CAR001: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=800&auto=format&fit=crop', // Economy sedan
  CAR002: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&auto=format&fit=crop', // Compact sedan
  CAR003: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&auto=format&fit=crop', // Midsize sedan
  CAR004: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&auto=format&fit=crop', // Full size sedan
  CAR005: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800&auto=format&fit=crop', // Midsize SUV
  CAR006: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&auto=format&fit=crop', // Full size SUV
  CAR007: 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=800&auto=format&fit=crop', // Minivan
  CAR008: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&auto=format&fit=crop', // Luxury sedan
  CAR009: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&auto=format&fit=crop', // Compact SUV
  CAR010: 'https://images.unsplash.com/photo-1616422285623-13ff0162193c?w=800&auto=format&fit=crop', // Convertible
  CAR011: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800&auto=format&fit=crop', // Pickup truck
};

export const CRUISE_IMAGE_OVERRIDES: Record<string, string> = {
  'CR-CAR-001': 'https://images.unsplash.com/photo-1548574505-5e239809ee19?w=1200&auto=format&fit=crop',
  'CR-CAR-002': 'https://images.unsplash.com/photo-1599640842225-85d111c60e6b?w=1200&auto=format&fit=crop',
  'CR-CAR-003': 'https://images.unsplash.com/photo-1580541631950-7282082b53fe?w=1200&auto=format&fit=crop',
  'CR-CAR-004': 'https://images.unsplash.com/photo-1566375638485-3fcdcb44f125?w=1200&auto=format&fit=crop',
  'CR-MED-001': 'https://images.unsplash.com/photo-1548574505-5e239809ee19?w=1200&auto=format&fit=crop',
  'CR-MED-002': 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=1200&auto=format&fit=crop',
  'CR-MED-003': 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&auto=format&fit=crop',
  'CR-ALA-001': 'https://images.unsplash.com/photo-1531794499199-c123bb9cf7b0?w=1200&auto=format&fit=crop',
  'CR-ALA-002': 'https://images.unsplash.com/photo-1533677464002-6ae8e2f9c81b?w=1200&auto=format&fit=crop',
  'CR-ALA-003': 'https://images.unsplash.com/photo-1541348263662-e068662d82af?w=1200&auto=format&fit=crop',
  'CR-BAH-001': 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&auto=format&fit=crop',
  'CR-BAH-002': 'https://images.unsplash.com/photo-1580541631950-7282082b53fe?w=1200&auto=format&fit=crop',
  'CR-EUR-001': 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=1200&auto=format&fit=crop',
  'CR-EUR-002': 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=1200&auto=format&fit=crop',
  'CR-HAW-001': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop',
  'CR-HAW-002': 'https://images.unsplash.com/photo-1573521193826-58c7dc2e13c3?w=1200&auto=format&fit=crop',
  'CR-TRA-001': 'https://images.unsplash.com/photo-1519452635265-7b1fbfd1e4e0?w=1200&auto=format&fit=crop',
  'CR-MID-001': 'https://images.unsplash.com/photo-1512632578888-169bbbc64f33?w=1200&auto=format&fit=crop',
  'CR-MID-002': 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&auto=format&fit=crop',
};
