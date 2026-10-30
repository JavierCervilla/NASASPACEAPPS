/** The DOM of one site marker, and the label that rides next to it. */
import { markerKind, markerLabel, type GlobeSite } from './markers';

/** Gap between a marker's centre and its label (globe.css margins). */
const LABEL_GAP_PX = 12;
/** The label's box starts this far below its point (globe.css margin). */
const LABEL_DROP_PX = 10;
/** Room the label keeps above the sheet's edge. */
const EDGE_GAP_PX = 8;

/**
 * A button for `site`, styled by its kind (`globe-marker--exact` or
 * `--zone`, in globe.css) and named for assistive technology.
 */
export function markerButton(site: GlobeSite): HTMLButtonElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = `globe-marker globe-marker--${markerKind(site)}`;
  el.setAttribute('aria-label', markerLabel(site));
  el.setAttribute('aria-pressed', 'false');
  el.dataset['siteId'] = site.id;
  return el;
}

/** Where a label goes, or null when it must hide. */
export interface LabelPlace {
  readonly x: number;
  readonly y: number;
  /** To the left of the marker (`globe-label--flip`). */
  readonly flip: boolean;
}

/**
 * Where the label of a marker at `at` (px in the host) goes: to its right,
 * or to its left when it would run past `area.width`, as on a phone; and
 * raised to stay above `area.bottom` (the sheet's top edge). Null when the
 * marker itself is under the sheet.
 */
export function labelPlacement(
  at: { x: number; y: number },
  size: { width: number; height: number },
  area: { width: number; bottom: number },
): LabelPlace | null {
  if (at.y > area.bottom) return null;
  const flip = at.x + LABEL_GAP_PX + size.width > area.width;
  const lowest = area.bottom - EDGE_GAP_PX - LABEL_DROP_PX - size.height;
  return { x: at.x, y: Math.min(at.y, lowest), flip };
}
