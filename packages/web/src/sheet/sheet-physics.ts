/**
 * The bottom sheet's geometry and release physics (apple-design §6, §9).
 * Positions are the sheet's top edge, in px from the top of the viewport,
 * so a smaller number is a taller sheet. Pure, so it is tested alone.
 */
import { projectMomentum } from '../globe/spring';

export type DetentName = 'closed' | 'peek' | 'half' | 'full';

/** The four rest positions, in px from the top of the viewport. */
export type Detents = Readonly<Record<DetentName, number>>;

/** The visible heights the detents are built from (validated canvas). */
export interface SheetLayout {
  /** Gap above the sheet at full: the top bar stays in view. */
  readonly fullGapPx: number;
  /** Visible sheet at half: the name and the four widgets. */
  readonly halfPx: number;
  /** Visible sheet at peek: the name and the coordinates. */
  readonly peekPx: number;
  /**
   * How far below the screen the closed sheet's edge rests: past the
   * reach of its shadow, so nothing of it shows.
   */
  readonly closedPx: number;
}

export const SHEET_LAYOUT: SheetLayout = {
  fullGapPx: 96,
  halfPx: 344,
  peekPx: 136,
  closedPx: 56,
};

/**
 * Deceleration per ms for a flick: between Apple's scroll (0.998) and
 * snappy (0.99), so a firm flick crosses one detent, not three.
 */
const SHEET_DECELERATION = 0.995;
/** Rubber-band stiffness, Apple's constant. */
const RUBBER_BAND = 0.55;

/** The detents for a viewport `heightPx` tall, top to bottom in order. */
export function detentsFor(
  heightPx: number,
  layout: SheetLayout = SHEET_LAYOUT,
): Detents {
  const full = layout.fullGapPx;
  const half = Math.max(full, heightPx - layout.halfPx);
  const peek = Math.max(half, heightPx - layout.peekPx);
  return { full, half, peek, closed: heightPx + layout.closedPx };
}

/**
 * Where the sheet shows for a finger at `y`: 1:1 between `min` and `max`,
 * and beyond them progressively less (`dimension` is the viewport height).
 */
export function rubberBand(
  y: number,
  bounds: { min: number; max: number },
  dimension: number,
): number {
  const band = (over: number): number =>
    (over * dimension * RUBBER_BAND) / (dimension + RUBBER_BAND * over);
  if (y < bounds.min) return bounds.min - band(bounds.min - y);
  if (y > bounds.max) return bounds.max + band(y - bounds.max);
  return y;
}

/**
 * The finger position that {@link rubberBand} shows at `y`: its inverse, so
 * a sheet grabbed mid-bounce does not jump.
 */
export function unRubberBand(
  y: number,
  bounds: { min: number; max: number },
  dimension: number,
): number {
  const unband = (shown: number): number =>
    (shown * dimension) / (RUBBER_BAND * Math.max(dimension - shown, 1));
  if (y < bounds.min) return bounds.min - unband(bounds.min - y);
  if (y > bounds.max) return bounds.max + unband(y - bounds.max);
  return y;
}

/** The detent closest to `y`. */
export function nearestDetent(detents: Detents, y: number): DetentName {
  const names: DetentName[] = ['full', 'half', 'peek', 'closed'];
  return names.reduce((best, name) =>
    Math.abs(detents[name] - y) < Math.abs(detents[best] - y) ? name : best,
  );
}

/**
 * The detent a release at `y` with velocity `vy` (px/s, positive down)
 * settles on: the one nearest to where the momentum would carry it.
 */
export function releaseDetent(
  detents: Detents,
  y: number,
  vy: number,
): DetentName {
  const projected = y + projectMomentum(vy, SHEET_DECELERATION);
  return nearestDetent(detents, projected);
}
