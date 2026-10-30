/**
 * Critically damped springs and momentum projection (apple-design: damping
 * 1.0 by default, momentum only when the gesture carried velocity). Pure:
 * the caller owns the clock.
 */

/** One animated value: where it is, how fast it moves and where it goes. */
export interface SpringAxis {
  value: number;
  velocity: number;
  target: number;
}

/** Below these the axis is at rest and snaps to its target. */
const REST_DISTANCE = 1e-3;
const REST_VELOCITY = 1e-2;

/**
 * Advances a critically damped spring by `dt` seconds, in place. `response`
 * is the spring's period in seconds (apple-design's «response»). Exact
 * solution, so any frame time is stable. Returns true while it still moves.
 */
export function stepSpring(
  axis: SpringAxis,
  dt: number,
  response: number,
): boolean {
  const omega = (2 * Math.PI) / response;
  const offset = axis.value - axis.target;
  const decay = Math.exp(-omega * dt);
  const slope = axis.velocity + omega * offset;
  axis.value = axis.target + (offset + slope * dt) * decay;
  axis.velocity = (axis.velocity - omega * slope * dt) * decay;
  const resting =
    Math.abs(axis.value - axis.target) < REST_DISTANCE &&
    Math.abs(axis.velocity) < REST_VELOCITY;
  if (resting) {
    axis.value = axis.target;
    axis.velocity = 0;
  }
  return !resting;
}

/**
 * How far a flick at `velocity` (units per second) carries, with Apple's
 * exponential deceleration (rate per millisecond, 0.998 like scrolling).
 */
export function projectMomentum(velocity: number, rate = 0.998): number {
  return ((velocity / 1000) * rate) / (1 - rate);
}
