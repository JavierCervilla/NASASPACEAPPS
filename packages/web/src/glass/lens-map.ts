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
 * The Liquid glass's lens (VENT-27, approved prototype): a displacement
 * map for one rounded rectangle, read by `feDisplacementMap` (red moves
 * x, green moves y, 128 moves nothing). Within the bezel the backdrop is
 * pulled in from the edge, more the closer to it, as a thick lens bends
 * light at its rim; the middle stays clear. Pure: RGBA bytes, no DOM.
 */

/** The widest bezel, px. */
export const MAX_BEZEL = 22;
/** A small surface's bezel is its shorter side over this. */
export const BEZEL_SHARE = 2.2;
/** `feDisplacementMap`'s scale: the most the lens moves a pixel, px. */
export const LENS_SCALE = 46;

/** A surface's size, corner radius and bezel, px. */
export interface LensBox {
  readonly width: number;
  readonly height: number;
  readonly radius: number;
  readonly bezel: number;
}

/** The bezel for a `width` × `height` surface, px. */
export function lensBezel(width: number, height: number): number {
  return Math.min(MAX_BEZEL, Math.min(width, height) / BEZEL_SHARE);
}

interface Edge {
  /** How far inside the edge the point is, px (negative outside). */
  readonly depth: number;
  /** The nearest edge's outward direction. */
  readonly nx: number;
  readonly ny: number;
}

/** The nearest edge of the rounded box to (px, py), from its centre. */
function nearestEdge(px: number, py: number, box: LensBox): Edge {
  const halfW = box.width / 2;
  const halfH = box.height / 2;
  const r = Math.min(box.radius, halfW, halfH);
  const qx = Math.abs(px) - (halfW - r);
  const qy = Math.abs(py) - (halfH - r);
  const out = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  const depth = r - out - Math.min(Math.max(qx, qy), 0);
  if (qx > 0 && qy > 0) {
    const length = Math.hypot(qx, qy);
    const nx = (Math.sign(px) * qx) / length;
    return { depth, nx, ny: (Math.sign(py) * qy) / length };
  }
  return qx > qy
    ? { depth, nx: Math.sign(px), ny: 0 }
    : { depth, nx: 0, ny: Math.sign(py) };
}

/** Writes the pull at one point as an RGBA pixel at `at`. */
function writePixel(data: Uint8ClampedArray, at: number, edge: Edge,
  bezel: number): void {
  const t = Math.max(0, 1 - edge.depth / bezel);
  const pull = t * t * 127;
  data[at] = 128 - edge.nx * pull;
  data[at + 1] = 128 - edge.ny * pull;
  data[at + 2] = 128;
  data[at + 3] = 255;
}

/** The box's displacement map: `width` × `height` RGBA pixels, row-major. */
export function lensMap(box: LensBox): Uint8ClampedArray<ArrayBuffer> {
  const { width, height } = box;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const px = x + 0.5 - width / 2;
      const py = y + 0.5 - height / 2;
      const at = (y * width + x) * 4;
      writePixel(data, at, nearestEdge(px, py, box), box.bezel);
    }
  }
  return data;
}
