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
 * The text form of a height tile's heights (VENT-34): 32-bit floats,
 * little-endian, in base64, 4 bytes a height. Pure.
 */
import { fromBase64, toBase64 } from './terrain-codec.ts';

const BYTES_PER_VALUE = 4;

/** `heights` as base64 of their little-endian float32 bytes. */
export function encodeHeights(heights: Float32Array): string {
  const bytes = new Uint8Array(heights.length * BYTES_PER_VALUE);
  const view = new DataView(bytes.buffer);
  heights.forEach((h, i) => view.setFloat32(i * BYTES_PER_VALUE, h, true));
  return toBase64(bytes);
}

/** The heights written by {@link encodeHeights}. */
export function decodeHeights(text: string): Float32Array {
  const bytes = fromBase64(text);
  if (bytes.length === 0 || bytes.length % BYTES_PER_VALUE !== 0) {
    throw new RangeError('a height tile needs whole 32-bit values');
  }
  const view = new DataView(bytes.buffer);
  const out = new Float32Array(bytes.length / BYTES_PER_VALUE);
  for (let i = 0; i < out.length; i++) {
    out[i] = view.getFloat32(i * BYTES_PER_VALUE, true);
  }
  return out;
}
