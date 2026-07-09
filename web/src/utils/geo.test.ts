// ============================================================
// VIGÍA 54 — Tests: Geohash Utilities (RF2/RF4)
// ============================================================
import { encodeGeohash, decodeGeohash, haversineDistance, getGeohashRange, getNearestDistrict, AREQUIPA_DISTRICTS } from '@/utils/geo';

describe('encodeGeohash', () => {
  it('returns a string of the requested precision', () => {
    const hash = encodeGeohash(-16.3989, -71.5372, 7);
    expect(typeof hash).toBe('string');
    expect(hash.length).toBe(7);
  });

  it('encodes known Arequipa coordinates to a consistent prefix', () => {
    const hash = encodeGeohash(-16.3989, -71.5372, 4);
    // All of Arequipa city falls in the '6mj' range
    expect(hash.startsWith('6mj')).toBe(true);
  });

  it('throws on out-of-range latitude', () => {
    expect(() => encodeGeohash(91, 0)).toThrow(RangeError);
    expect(() => encodeGeohash(-91, 0)).toThrow(RangeError);
  });

  it('throws on out-of-range longitude', () => {
    expect(() => encodeGeohash(0, 181)).toThrow(RangeError);
    expect(() => encodeGeohash(0, -181)).toThrow(RangeError);
  });

  it('throws on invalid precision', () => {
    expect(() => encodeGeohash(0, 0, 0)).toThrow(RangeError);
    expect(() => encodeGeohash(0, 0, 13)).toThrow(RangeError);
  });
});

describe('decodeGeohash', () => {
  it('round-trips encode→decode within expected error bounds', () => {
    const lat = -16.3989, lng = -71.5372;
    const hash = encodeGeohash(lat, lng, 7);
    const { lat: dLat, lng: dLng, latErr, lngErr } = decodeGeohash(hash);
    expect(Math.abs(dLat - lat)).toBeLessThan(latErr * 2);
    expect(Math.abs(dLng - lng)).toBeLessThan(lngErr * 2);
  });

  it('throws on empty string', () => {
    expect(() => decodeGeohash('')).toThrow();
  });

  it('throws on invalid character', () => {
    expect(() => decodeGeohash('abc!xyz')).toThrow();
  });
});

describe('haversineDistance', () => {
  it('returns ~0 for identical points', () => {
    const p = { lat: -16.4, lng: -71.53 };
    expect(haversineDistance(p, p)).toBeCloseTo(0);
  });

  it('returns correct distance between two Arequipa districts (~5km)', () => {
    const cercado    = { lat: -16.3989, lng: -71.5372 };
    const paucarpata = { lat: -16.4278, lng: -71.4897 };
    const dist = haversineDistance(cercado, paucarpata);
    expect(dist).toBeGreaterThan(3);
    expect(dist).toBeLessThan(8);
  });
});

describe('getGeohashRange', () => {
  it('returns lower and upper strings', () => {
    const { lower, upper } = getGeohashRange(-16.4, -71.53, 1);
    expect(typeof lower).toBe('string');
    expect(typeof upper).toBe('string');
  });

  it('upper is always alphabetically after lower', () => {
    const { lower, upper } = getGeohashRange(-16.4, -71.53, 5);
    expect(lower < upper).toBe(true);
  });
});

describe('getNearestDistrict (Complex Geographical Calculations)', () => {
  it('correctly maps coordinates precisely to the closest Arequipa district center', () => {
    // 1. Cercado Center ( Plaza de Armas )
    const nearPlaza = { lat: -16.3988, lng: -71.5369 };
    expect(getNearestDistrict(nearPlaza.lat, nearPlaza.lng)).toBe('Cercado');

    // 2. Cayma Center ( Near Cayma main church )
    const nearCayma = { lat: -16.3620, lng: -71.5620 };
    expect(getNearestDistrict(nearCayma.lat, nearCayma.lng)).toBe('Cayma');

    // 3. Paucarpata Center
    const nearPaucarpata = { lat: -16.4270, lng: -71.4890 };
    expect(getNearestDistrict(nearPaucarpata.lat, nearPaucarpata.lng)).toBe('Paucarpata');

    // 4. Yanahuara Center ( Mirador de Yanahuara )
    const nearYanahuara = { lat: -16.3910, lng: -71.5540 };
    expect(getNearestDistrict(nearYanahuara.lat, nearYanahuara.lng)).toBe('Yanahuara');
  });

  it('handles arbitrary boundary points by calculating exact mathematical proximity', () => {
    // A point equidistant between Miraflores and Alto Selva Alegre should resolve to the closest one
    // Alto Selva Alegre center: -16.3669, -71.4953
    // Miraflores center: -16.3789, -71.5206
    
    // A coordinate very close to Alto Selva Alegre
    const coordA = { lat: -16.3670, lng: -71.4960 };
    expect(getNearestDistrict(coordA.lat, coordA.lng)).toBe('Alto Selva Alegre');

    // A coordinate very close to Miraflores
    const coordB = { lat: -16.3780, lng: -71.5210 };
    expect(getNearestDistrict(coordB.lat, coordB.lng)).toBe('Miraflores');
  });
});
