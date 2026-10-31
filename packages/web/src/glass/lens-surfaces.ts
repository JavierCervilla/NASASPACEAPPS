/*
 *   _   _       _                         _ _
 *  | | | |_ __ (_)_   _____ _ __ ___  ___| | | ___
 *  | | | | '_ \| \ \ / / _ \ '__/ __|/ _ \ | |/ _ \
 *  | |_| | | | | |\ V /  __/ |  \__ \  __/ | |  __/
 *   \___/|_| |_|_| \_/ \___|_|  |___/\___|_|_|\___|
 *
 *             =++==--::.
 *         %%%%##**++=--:..  .
 *      ##**#%@%%#***+=--::.   .
 *    #**=+*#*#**#++++=-:::.. .  .
 *   #++-====*@%+*++==--::...   .  .    Ventana Lunar
 *  #+=-=--++==+===-+==--:..   .  .  .  Sun, Earth and landing
 * #----====-------=-=---:..  .  .  .   windows at the lunar
 * #+---+=====--=---==-::..     .  .  . south pole
 * #*----==---==-=-=-:-....    .  .  .
 * *#----===+*===--:-::...    .  .  .   Built for the NASA Space
 *  *----=*-+*%*+=-:::....   .  .  .    Apps Challenge 2026,
 *   *------=+*=--:::-:::.. .  .  .     Madrid. Not endorsed
 *    %*===-=-==--==-:::.  .  .  .      by NASA.
 *      *+:--+:--::::::.  .  .  .
 *         -=:::...:..   .  .           (c) 2026 Universelle
 *             :::.. .  .               SPDX-License-Identifier: MIT
 */

/**
 * One Liquid surface's lens (VENT-27): a filter sized to the surface in
 * the page's hidden SVG, named on the surface through the `--glass-lens`
 * custom property (set through the CSSOM, which the CSP allows). It is
 * rebuilt when the surface's layout size changes, by whole pixels: the
 * first build is at once, later ones wait until the size has held for
 * SETTLE_MS, so a dragged sheet rebuilds once when it rests, not every
 * frame. Transforms never resize the layout box: motion rebuilds nothing.
 */
import { lensFilter } from './lens-filter';
import { lensBezel } from './lens-map';

/** How long a new size must hold before the lens is rebuilt, ms. */
export const SETTLE_MS = 150;

export interface Lens {
  readonly id: string;
  size: string;
  filter: SVGFilterElement | null;
  timer: ReturnType<typeof setTimeout> | undefined;
}

/** What a set of lenses works in: the page and its hidden SVG. */
export interface LensPage {
  readonly doc: Document;
  readonly defs: Element;
}

/** Builds (or rebuilds) the lens of `el` at its recorded size. */
function build(page: LensPage, el: HTMLElement, lens: Lens): void {
  const [width = 0, height = 0] = lens.size.split('x').map(Number);
  if (width < 2 || height < 2) return;
  const style = getComputedStyle(el);
  const radius = Number.parseFloat(style.borderTopLeftRadius) || 0;
  const bezel = lensBezel(width, height);
  const filter = lensFilter(page.doc, lens.id,
    { width, height, radius, bezel });
  if (lens.filter) lens.filter.replaceWith(filter);
  else page.defs.append(filter);
  lens.filter = filter;
  el.style.setProperty('--glass-lens', `url(#${lens.id})`);
}

/** Takes a new layout size: builds at once the first time, else settles. */
export function resized(page: LensPage, el: HTMLElement, lens: Lens,
  entry: ResizeObserverEntry): void {
  const box = entry.borderBoxSize[0];
  const size = `${Math.round(box?.inlineSize ?? 0)}x` +
    `${Math.round(box?.blockSize ?? 0)}`;
  if (size === lens.size) return;
  lens.size = size;
  clearTimeout(lens.timer);
  if (!lens.filter) build(page, el, lens);
  else lens.timer = setTimeout(() => build(page, el, lens), SETTLE_MS);
}

/** A lens not built yet. */
export function newLens(id: string): Lens {
  return { id, size: '', filter: null, timer: undefined };
}

/** Removes a lens and its filter from the page. */
export function drop(el: HTMLElement, lens: Lens): void {
  clearTimeout(lens.timer);
  lens.filter?.remove();
  el.style.removeProperty('--glass-lens');
}
