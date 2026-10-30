import { describe, expect, it } from 'vitest';
import {
  cameraPosition,
  clampPose,
  degreesPerPixel,
  LIMITS,
  SOUTH_POLE_VIEW,
  zoomedDistance,
} from '../src/globe/framing';
import { isFacing, latLonToVector, vectorToLatLon } from '../src/globe/geo';

// IM-2 Athena's touchdown and the Shackleton rim (Chang'e-7 target), from packages/server/data/sites.json.
const IM2 = latLonToVector(-84.7906, 29.1957);
const SHACKLETON = latLonToVector(-89.67, 129.78);

describe('the south pole view', () => {
  const eye = cameraPosition(SOUTH_POLE_VIEW);

  it('looks down on the southern hemisphere', () => {
    expect(vectorToLatLon(eye).latDeg).toBeLessThan(-45);
  });

  it('shows IM-2 and Shackleton', () => {
    expect(isFacing(IM2, eye)).toBe(true);
    expect(isFacing(SHACKLETON, eye)).toBe(true);
  });

  it('puts both below the centre of the disc, as in the canvas', () => {
    // Below the centre means further south than the point the camera looks down on.
    expect(vectorToLatLon(IM2).latDeg).toBeLessThan(SOUTH_POLE_VIEW.latDeg);
    expect(vectorToLatLon(SHACKLETON).latDeg).toBeLessThan(SOUTH_POLE_VIEW.latDeg);
  });

  it('is inside the orbit limits', () => {
    expect(clampPose(SOUTH_POLE_VIEW)).toEqual(SOUTH_POLE_VIEW);
  });
});

describe('clampPose', () => {
  it('stops short of the poles and holds the zoom range', () => {
    const pose = clampPose({ latDeg: -120, lonEastDeg: 400, distance: 0.5 });
    expect(pose).toEqual({ latDeg: -LIMITS.maxLatDeg, lonEastDeg: 400, distance: LIMITS.minDistance });
    expect(clampPose({ latDeg: 0, lonEastDeg: 0, distance: 99 }).distance).toBe(LIMITS.maxDistance);
  });
});

describe('zoomedDistance', () => {
  it('zooms in for negative steps and out for positive ones, never inside the Moon', () => {
    expect(zoomedDistance(5, -1)).toBeLessThan(5);
    expect(zoomedDistance(5, 1)).toBeGreaterThan(5);
    expect(zoomedDistance(1.001, -50)).toBeGreaterThan(1);
  });

  it('undoes itself', () => {
    expect(zoomedDistance(zoomedDistance(3, 2), -2)).toBeCloseTo(3, 12);
  });
});

describe('degreesPerPixel', () => {
  it('turns slower when closer and on a taller viewport', () => {
    expect(degreesPerPixel(2, 800)).toBeLessThan(degreesPerPixel(5, 800));
    expect(degreesPerPixel(5, 1000)).toBeLessThan(degreesPerPixel(5, 500));
  });
});
