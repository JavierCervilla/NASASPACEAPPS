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
 * is a constant of the tile's level (`levelQuantumM`: 0.1 m at levels 0 and
 * 1, doubling after that, so any relief of the Moon fits a level without
 * widening it), and the base a whole number of steps, never the tile's
 * minimum, so two tiles of a level that share a node decode to the same
 * height whatever else they hold. A tile whose relief still did not fit
 * 65534 steps would double the step as often as it needs (it cannot happen
 * on the Moon). 2 bytes a height. Pure.
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

/**
 * The 16-bit form of `heights` (NaN for no data), with a step of at least
 * `minQuantumM`.
 */
export function quantiseHeights(
  heights: ArrayLike<number>,
  minQuantumM = MIN_QUANTUM_M,
): QuantisedHeights {
  const [low, high] = span(heights);
  let quantumM = minQuantumM;
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
