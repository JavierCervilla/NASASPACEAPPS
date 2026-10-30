/**
 * A spring with a damping ratio (apple-design §4): 1 is critically damped,
 * below 1 it overshoots. The sheet uses 0.8 only after a flick. Exact
 * solution, so any frame time is stable. Pure: the caller owns the clock.
 */
import { stepSpring, type SpringAxis } from '../globe/spring';

export interface SpringParams {
  /** The spring's period, in seconds (apple-design's «response»). */
  readonly response: number;
  /** 1 for no bounce; lower bounces more. Values above 1 count as 1. */
  readonly damping: number;
}

const REST_DISTANCE = 0.5;
const REST_VELOCITY = 5;

/** Underdamped step: the closed-form solution of the oscillator. */
function stepUnderdamped(
  axis: SpringAxis,
  dt: number,
  params: SpringParams,
): void {
  const omega = (2 * Math.PI) / params.response;
  const zeta = params.damping;
  const wd = omega * Math.sqrt(1 - zeta * zeta);
  const x0 = axis.value - axis.target;
  const v0 = axis.velocity;
  const decay = Math.exp(-zeta * omega * dt);
  const cos = Math.cos(wd * dt);
  const sin = Math.sin(wd * dt);
  const b = (v0 + zeta * omega * x0) / wd;
  axis.value = axis.target + decay * (x0 * cos + b * sin);
  axis.velocity =
    decay * (v0 * cos - ((zeta * omega * v0 + omega * omega * x0) / wd) * sin);
}

/**
 * Advances `axis` by `dt` seconds, in place; true while it still moves.
 * Rest thresholds are in px, the unit of the sheet.
 */
export function stepDampedSpring(
  axis: SpringAxis,
  dt: number,
  params: SpringParams,
): boolean {
  if (params.damping >= 1) {
    stepSpring(axis, dt, params.response);
  } else {
    stepUnderdamped(axis, dt, params);
  }
  const resting =
    Math.abs(axis.value - axis.target) < REST_DISTANCE &&
    Math.abs(axis.velocity) < REST_VELOCITY;
  if (resting) Object.assign(axis, { value: axis.target, velocity: 0 });
  return !resting;
}
