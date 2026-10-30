/**
 * How the globe yields to the phone sheet. The site label stays above the
 * sheet's top edge, and once the sheet drops below the globe's viewport
 * (towards peek or closed) the viewport slides down to stay centred in the
 * space the sheet frees: with the sheet closed the Moon sits between the
 * top bar and the tab bar, as the validated canvas «Phone · sheet closed»
 * shows. It slides, not grows, so the zoom never changes under the finger.
 */
import type { WatchedValue } from '../lib/watched-value';
import type { MarkerLayer } from './marker-layer';

/**
 * Px the viewport (`height` px tall, from the top of a `screen` px tall
 * screen) moves down to sit centred above a sheet edge at `edge` px, which
 * rests below the screen when closed; 0 while the sheet covers the
 * viewport's lower part.
 */
export function viewportShift(
  edge: number,
  height: number,
  screen: number,
): number {
  return Math.max(0, (Math.min(edge, screen) - height) / 2);
}

/**
 * Follows the sheet's edge: slides `host`, then clips the label to the
 * part of the globe above the sheet, in the host's coordinates. Returns
 * the unbind function.
 */
export function bindSheetEdge(
  host: HTMLElement,
  markers: MarkerLayer,
  edge: WatchedValue<number | null>,
): () => void {
  const follow = (): void => {
    const top = edge.get();
    const shift =
      top === null
        ? 0
        : viewportShift(top, host.offsetHeight, window.innerHeight);
    host.style.transform = shift > 0 ? `translate3d(0, ${shift}px, 0)` : '';
    const bottom = top === null ? Number.POSITIVE_INFINITY : top;
    markers.label.clip(bottom - host.getBoundingClientRect().top);
  };
  follow();
  return edge.subscribe(follow);
}
