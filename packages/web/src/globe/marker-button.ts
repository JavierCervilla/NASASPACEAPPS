/** The DOM of one site marker. */
import { markerKind, markerLabel, type GlobeSite } from './markers';

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
