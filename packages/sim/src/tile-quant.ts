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
 * The 16-bit form of a tile's heights (VENT-46): `h = (baseUnits + q) *
 * quantumM`, `q` an unsigned 16-bit number, 65535 meaning no data. The step
 * is 0.1 m (an error of at most 0.05 m), doubled as many times as the tile's
 * relief needs to fit 65534 steps (6.5 km at 0.1 m: only a 128 km tile over
 * a very deep crater needs more, and then at most 0.15 m). The step is a
 * constant and the base a whole number of steps, never the tile's minimum,
 * so two tiles that share a node decode to the same height whatever else
 * they hold. 2 bytes a height. Pure.
 */
import { fromBase64, toBase64 } from './terrain-codec.ts';

/** The value of `q` that stands for a node without data. */
export const NO_DATA = 65_535;
/** The finest step, metres. */
export const MIN_QUANTUM_M = 0.1;
const MAX_STEPS = NO_DATA - 1;

export interface QuantisedHeights {
  readonly quantumM: number;
  /** In steps: the height of `q = 0` is `baseUnits * quantumM`. */
  readonly baseUnits: number;
  readonly q: Uint16Array;
}

function span(heights: ArrayLike<number>): [number, number] {
  let [low, high] = [Infinity, -Infinity];
  for (let i = 0; i < heights.length; i++) {
    const h = heights[i] as number;
    if (Number.isNaN(h)) continue;
    [low, high] = [Math.min(low, h), Math.max(high, h)];
  }
  return low > high ? [0, 0] : [low, high];
}

/** The 16-bit form of `heights` (NaN for no data). */
export function quantiseHeights(heights: ArrayLike<number>): QuantisedHeights {
  const [low, high] = span(heights);
  let quantumM = MIN_QUANTUM_M;
  while (Math.round(high / quantumM) - Math.floor(low / quantumM) > MAX_STEPS) {
    quantumM *= 2;
  }
  const baseUnits = Math.floor(low / quantumM);
  const q = Uint16Array.from(heights as ArrayLike<number>, (h) =>
    Number.isNaN(h) ? NO_DATA : Math.round(h / quantumM) - baseUnits,
  );
  return { quantumM, baseUnits, q };
}

/** The heights a client reads from `q`: float32, NaN for no data. */
export function dequantiseHeights(quantised: QuantisedHeights): Float32Array {
  const { quantumM, baseUnits, q } = quantised;
  return Float32Array.from(q, (v) =>
    v === NO_DATA ? Number.NaN : (baseUnits + v) * quantumM,
  );
}

/** `q` as base64 of its little-endian 16-bit values. */
export function encodeQuantised(quantised: QuantisedHeights): string {
  const { q } = quantised;
  const bytes = new Uint8Array(q.length * 2);
  const view = new DataView(bytes.buffer);
  q.forEach((v, i) => view.setUint16(i * 2, v, true));
  return toBase64(bytes);
}

/** The heights of text written by {@link encodeQuantised}. */
export function decodeQuantised(
  text: string,
  quantumM: number,
  baseUnits: number,
): Float32Array {
  const bytes = fromBase64(text);
  if (bytes.length === 0 || bytes.length % 2 !== 0) {
    throw new RangeError('quantised heights need whole 16-bit values');
  }
  const view = new DataView(bytes.buffer);
  const q = Uint16Array.from({ length: bytes.length / 2 }, (_, i) =>
    view.getUint16(i * 2, true),
  );
  return dequantiseHeights({ quantumM, baseUnits, q });
}
