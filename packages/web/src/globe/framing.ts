/**
 * Where the camera sits: an orbit around the Moon given by the latitude and
 * east longitude it looks down on and its distance from the centre, in Moon
 * radii. The camera always looks at the centre with north up.
 */
import { latLonToVector, type Vec3 } from './geo';

export interface OrbitPose {
  readonly latDeg: number;
  readonly lonEastDeg: number;
  /** Distance from the Moon's centre, in Moon radii. */
  readonly distance: number;
}

/** Vertical field of view of the camera, in degrees. */
export const FOV_DEG = 35;

/**
 * The opening view: over the south polar region, tilted so Mons Mouton
 * (IM-2, 84.8° S 29.2° E) and Shackleton (89.7° S) sit in the lower half of
 * the disc, as in the validated canvas.
 */
export const SOUTH_POLE_VIEW: OrbitPose = {
  latDeg: -62,
  lonEastDeg: 30,
  distance: 5,
};

/**
 * Orbit limits: the camera never crosses a pole (north would flip) and the
 * zoom stays between a close look at the pole and the whole disc.
 */
export const LIMITS = { maxLatDeg: 85, minDistance: 1.6, maxDistance: 8 };

/** `pose` held inside {@link LIMITS}. */
export function clampPose(pose: OrbitPose): OrbitPose {
  const clamp = (v: number, lo: number, hi: number): number =>
    Math.min(hi, Math.max(lo, v));
  return {
    latDeg: clamp(pose.latDeg, -LIMITS.maxLatDeg, LIMITS.maxLatDeg),
    lonEastDeg: pose.lonEastDeg,
    distance: clamp(pose.distance, LIMITS.minDistance, LIMITS.maxDistance),
  };
}

/** The camera's position for a pose, in the globe's frame. */
export function cameraPosition(pose: OrbitPose): Vec3 {
  return latLonToVector(pose.latDeg, pose.lonEastDeg, pose.distance);
}

/**
 * Degrees of rotation per pixel of drag, so the surface at the centre of the
 * disc follows the pointer 1:1 for a viewport `heightPx` tall.
 */
export function degreesPerPixel(distance: number, heightPx: number): number {
  const halfFov = (FOV_DEG / 2) * (Math.PI / 180);
  // Pixels per unit length at the distance of the nearest surface point.
  const pxPerRadius = heightPx / 2 / ((distance - 1) * Math.tan(halfFov));
  return 180 / Math.PI / pxPerRadius;
}

/**
 * The distance after zooming by `steps` (positive zooms out). It scales the
 * altitude above the surface, so each step feels the same near and far.
 */
export function zoomedDistance(distance: number, steps: number): number {
  return 1 + (distance - 1) * Math.exp(steps * 0.15);
}
