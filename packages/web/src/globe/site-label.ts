/**
 * The glass label of the selected site, riding next to its marker inside
 * the part of the globe the page leaves visible: on a phone, above the
 * bottom sheet's top edge, which moves with every drag. A label whose
 * marker is under the sheet hides with it.
 */
import { labelPlacement } from './marker-button';

export class SiteLabel {
  readonly el = document.createElement('div');
  private at: { x: number; y: number } | null = null;
  private width = 0;
  /** The visible area's bottom, px from the host's top; no sheet: none. */
  private bottom = Number.POSITIVE_INFINITY;

  constructor() {
    this.el.className = 'globe-label';
    this.el.hidden = true;
  }

  /** Names the selected site. */
  name(text: string): void {
    this.el.textContent = text;
  }

  /** Follows the marker at `at` (px in the host), or hides for null. */
  follow(at: { x: number; y: number } | null, hostWidth: number): void {
    this.at = at;
    this.width = hostWidth;
    this.draw();
  }

  /** The visible area now ends `bottom` px below the host's top. */
  clip(bottom: number): void {
    this.bottom = bottom;
    this.draw();
  }

  private draw(): void {
    const { el, at } = this;
    el.hidden = at === null;
    if (!at) return;
    const size = { width: el.offsetWidth, height: el.offsetHeight };
    const area = { width: this.width, bottom: this.bottom };
    const place = labelPlacement(at, size, area);
    el.hidden = place === null;
    if (!place) return;
    el.style.transform = `translate3d(${place.x}px, ${place.y}px, 0)`;
    el.classList.toggle('globe-label--flip', place.flip);
  }
}
