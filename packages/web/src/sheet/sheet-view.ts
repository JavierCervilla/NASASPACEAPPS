/**
 * How the sheet's position reaches the page, and how it is named to
 * assistive technology. Pure apart from writing one style.
 */
import type { DetentName, Detents } from './sheet-physics';

/**
 * The order the grabber button cycles through. Closed is not in it: a
 * closed sheet hides its grabber, and the Globe tab closes it instead.
 */
const NEXT: Readonly<Record<DetentName, DetentName>> = {
  closed: 'half',
  peek: 'half',
  half: 'full',
  full: 'peek',
};

const SPOKEN: Readonly<Record<DetentName, string>> = {
  closed: 'closed',
  peek: 'collapsed',
  half: 'half height',
  full: 'full height',
};

/** The detent the grabber moves to from `detent`. */
export function nextDetent(detent: DetentName): DetentName {
  return NEXT[detent];
}

/** The grabber's accessible name: where the sheet is and what it does. */
export function grabberLabel(detent: DetentName): string {
  const next = SPOKEN[nextDetent(detent)];
  return `Sheet ${SPOKEN[detent]}; press for ${next}`;
}

/**
 * How far the sheet is open past half, 0 to 1: the scrim over the globe
 * darkens with it as the picker rises.
 */
export function openness(detents: Detents, y: number): number {
  const span = detents.half - detents.full;
  if (span <= 0) return 1;
  return Math.min(1, Math.max(0, (detents.half - y) / span));
}

/** Puts the sheet's top edge `y` px below the top of the viewport. */
export function placeSheet(el: HTMLElement, y: number): void {
  el.style.transform = `translate3d(0, ${y}px, 0)`;
}
