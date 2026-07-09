// ============================================================
// VIGÍA 54 — Geohash Utilities (RF2/RF4)
// Used for geospatial queries in Firestore
// ============================================================

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

/**
 * Encode latitude/longitude to a geohash string.
 * @param lat  Latitude (-90 to 90)
 * @param lng  Longitude (-180 to 180)
 * @param precision  Length of hash (default 7 ≈ 150m accuracy)
 */
export function encodeGeohash(lat: number, lng: number, precision = 7): string {
  if (lat < -90 || lat > 90)   throw new RangeError(`Latitude ${lat} out of range [-90, 90]`);
  if (lng < -180 || lng > 180) throw new RangeError(`Longitude ${lng} out of range [-180, 180]`);
  if (precision < 1 || precision > 12) throw new RangeError(`Precision ${precision} out of range [1, 12]`);

  let idx = 0, bit = 0, isEven = true, hash = '';
  let latMin = -90, latMax = 90, lngMin = -180, lngMax = 180;

  while (hash.length < precision) {
    if (isEven) {
      const mid = (lngMin + lngMax) / 2;
      if (lng >= mid) { idx = (idx << 1) | 1; lngMin = mid; }
      else            { idx = idx << 1;        lngMax = mid; }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) { idx = (idx << 1) | 1; latMin = mid; }
      else            { idx = idx << 1;        latMax = mid; }
    }
    isEven = !isEven;
    if (++bit === 5) { hash += BASE32[idx]; idx = 0; bit = 0; }
  }
  return hash;
}

/**
 * Decode a geohash back to {lat, lng, error} bounding box.
 */
export function decodeGeohash(hash: string): { lat: number; lng: number; latErr: number; lngErr: number } {
  if (!hash) throw new Error('Empty geohash');
  let isEven = true;
  let latMin = -90, latMax = 90, lngMin = -180, lngMax = 180;
  let latErr = 90, lngErr = 180;

  for (const char of hash.toLowerCase()) {
    const idx = BASE32.indexOf(char);
    if (idx === -1) throw new Error(`Invalid geohash character: ${char}`);
    for (let bits = 4; bits >= 0; bits--) {
      const mask = 1 << bits;
      if (isEven) {
        lngErr /= 2;
        const mid = (lngMin + lngMax) / 2;
        if (idx & mask) lngMin = mid; else lngMax = mid;
      } else {
        latErr /= 2;
        const mid = (latMin + latMax) / 2;
        if (idx & mask) latMin = mid; else latMax = mid;
      }
      isEven = !isEven;
    }
  }

  return {
    lat: (latMin + latMax) / 2,
    lng: (lngMin + lngMax) / 2,
    latErr,
    lngErr,
  };
}

/**
 * Get the geohash prefix for a bounding radius query.
 * @param lat        Center latitude
 * @param lng        Center longitude
 * @param radiusKm   Search radius in kilometers
 */
export function getGeohashRange(lat: number, lng: number, radiusKm: number): { lower: string; upper: string } {
  // Precision level based on radius
  let precision = 7;
  if (radiusKm > 500)  precision = 1;
  else if (radiusKm > 100) precision = 2;
  else if (radiusKm > 50)  precision = 3;
  else if (radiusKm > 10)  precision = 4;
  else if (radiusKm > 1)   precision = 5;
  else if (radiusKm > 0.1) precision = 6;

  const center = encodeGeohash(lat, lng, precision);
  const lower = center;
  const upper = center + '~';   // '~' is after 'z' in ASCII, covers all suffixes
  return { lower, upper };
}

/**
 * Calculate distance between two lat/lng points (Haversine formula).
 * @returns Distance in kilometers
 */
export function haversineDistance(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }): number {
  const R = 6371; // Earth radius km
  const dLat = toRad(p2.lat - p1.lat);
  const dLng = toRad(p2.lng - p1.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(p1.lat)) * Math.cos(toRad(p2.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Arequipa district centers for reference (RF4)
 */
export const AREQUIPA_DISTRICTS: Record<string, { lat: number; lng: number; name: string }> = {
  cercado:       { lat: -16.3989, lng: -71.5372, name: 'Cercado' },
  cayma:         { lat: -16.3614, lng: -71.5617, name: 'Cayma' },
  yanahuara:     { lat: -16.3914, lng: -71.5542, name: 'Yanahuara' },
  miraflores:    { lat: -16.3789, lng: -71.5206, name: 'Miraflores' },
  mariano_melgar:{ lat: -16.4072, lng: -71.5089, name: 'Mariano Melgar' },
  paucarpata:    { lat: -16.4278, lng: -71.4897, name: 'Paucarpata' },
  socabaya:      { lat: -16.4586, lng: -71.5203, name: 'Socabaya' },
  hunter:        { lat: -16.4436, lng: -71.5597, name: 'Hunter' },
  jose_luis:     { lat: -16.4114, lng: -71.5614, name: 'J.L. Bustamante' },
  alto_selva:    { lat: -16.3669, lng: -71.4953, name: 'Alto Selva Alegre' },
};

/**
 * Get nearest district name based on latitude/longitude coordinates using Haversine formula
 */
export function getNearestDistrict(lat: number, lng: number): string {
  let nearestDistrict = 'Cercado';
  let minDistance = Infinity;

  for (const dist of Object.values(AREQUIPA_DISTRICTS)) {
    const d = haversineDistance({ lat, lng }, { lat: dist.lat, lng: dist.lng });
    if (d < minDistance) {
      minDistance = d;
      nearestDistrict = dist.name;
    }
  }

  return nearestDistrict;
}

