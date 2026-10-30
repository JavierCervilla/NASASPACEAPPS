import { describe, expect, it } from 'vitest';
import { isFacing, latLonToVector, vectorToLatLon } from '../src/globe/geo';

describe('latLonToVector', () => {
  it('puts the poles on ±Y and the texture centre (0° E) on +X', () => {
    expect(latLonToVector(90, 0).y).toBeCloseTo(1, 12);
    expect(latLonToVector(-90, 0).y).toBeCloseTo(-1, 12);
    const centre = latLonToVector(0, 0);
    expect([centre.x, centre.y, centre.z]).toEqual([1, 0, -0]);
  });

  it('puts 90° E on -Z, where SphereGeometry maps the texture at u = 0.75', () => {
    const east = latLonToVector(0, 90);
    expect(east.x).toBeCloseTo(0, 12);
    expect(east.z).toBeCloseTo(-1, 12);
  });

  it('scales by the radius', () => {
    const v = latLonToVector(-62, 30, 5);
    expect(Math.hypot(v.x, v.y, v.z)).toBeCloseTo(5, 12);
  });
});

describe('vectorToLatLon', () => {
  it.each([
    [-84.7906, 29.1957],
    [-89.67, 129.78],
    [44.1214, -19.5117],
    [0, -179.5],
  ])('round-trips %s, %s', (lat, lon) => {
    const back = vectorToLatLon(latLonToVector(lat, lon, 3));
    expect(back.latDeg).toBeCloseTo(lat, 9);
    expect(back.lonEastDeg).toBeCloseTo(lon, 9);
  });
});

describe('isFacing', () => {
  const eye = latLonToVector(0, 0, 4);

  it('sees the point under the camera and not the one opposite', () => {
    expect(isFacing(latLonToVector(0, 0), eye)).toBe(true);
    expect(isFacing(latLonToVector(0, 180), eye)).toBe(false);
  });

  it('cuts at the limb, where the line of sight grazes the sphere', () => {
    // From distance 4 the limb is at acos(1/4) = 75.5° from the sub-camera point.
    expect(isFacing(latLonToVector(0, 75), eye)).toBe(true);
    expect(isFacing(latLonToVector(0, 76), eye)).toBe(false);
  });
});
