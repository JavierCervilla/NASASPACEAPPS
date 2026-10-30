/** The DOM of one site marker, and the label that rides next to it. */
import { markerKind, markerLabel, type GlobeSite } from './markers';

/** Gap between a marker's centre and its label (globe.css margins). */
const LABEL_GAP_PX = 12;

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

/**
 * Puts the label at `at` (px in the host), to the right of the marker, or
 * to its left (`globe-label--flip`) when it would run past the host's
 * right edge, as on a phone.
 */
export function placeLabel(
  label: HTMLElement,
  at: { x: number; y: number },
  hostWidth: number,
): void {
  label.style.transform = `translate3d(${at.x}px, ${at.y}px, 0)`;
  const right = at.x + LABEL_GAP_PX + label.offsetWidth;
  label.classList.toggle('globe-label--flip', right > hostWidth);
}
