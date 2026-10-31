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
 * One surface's lens as an SVG filter (VENT-27): its displacement map
 * (lens-map.ts) drawn on a canvas, handed to `feImage` as a PNG data URL,
 * and bent through `feDisplacementMap`. Presentation attributes only: the
 * page's CSP allows no style attributes.
 */
import { LENS_SCALE, lensMap, type LensBox } from './lens-map';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Sets every attribute of `attrs` on `el`. */
function setAll(el: Element, attrs: Record<string, string>): void {
  for (const [name, value] of Object.entries(attrs)) {
    el.setAttribute(name, value);
  }
}

/** The box's map as a PNG data URL, or '' without a 2D canvas. */
function mapUrl(doc: Document, box: LensBox): string {
  const canvas = doc.createElement('canvas');
  canvas.width = box.width;
  canvas.height = box.height;
  const context = canvas.getContext('2d');
  if (!context) return '';
  const image = new ImageData(lensMap(box), box.width, box.height);
  context.putImageData(image, 0, 0);
  return canvas.toDataURL();
}

/** A `<filter id>` that bends the backdrop through the box's lens. */
export function lensFilter(doc: Document, id: string,
  box: LensBox): SVGFilterElement {
  const filter = doc.createElementNS(SVG_NS, 'filter');
  setAll(filter, { id, x: '0', y: '0', width: '100%', height: '100%',
    'color-interpolation-filters': 'sRGB' });
  const image = doc.createElementNS(SVG_NS, 'feImage');
  setAll(image, { href: mapUrl(doc, box), x: '0', y: '0',
    width: String(box.width), height: String(box.height),
    preserveAspectRatio: 'none', result: 'lens' });
  const bend = doc.createElementNS(SVG_NS, 'feDisplacementMap');
  setAll(bend, { in: 'SourceGraphic', in2: 'lens',
    scale: String(LENS_SCALE), xChannelSelector: 'R',
    yChannelSelector: 'G' });
  filter.append(image, bend);
  return filter;
}
