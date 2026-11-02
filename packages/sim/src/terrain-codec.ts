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
 * The compact text form of a {@link HorizonProfile}: its values as 16-bit
 * little-endian integers, in base64 (RFC 4648, with padding). 720 bins take
 * 1440 bytes, 1920 characters. Written by hand: the simulator has no `atob`
 * or `Buffer`. Pure.
 */
import type { HorizonProfile } from './terrain-profile.ts';

const ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const BYTES_PER_VALUE = 2;

/** `bytes` in base64. */
export function toBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0;
    const b = bytes[i + 1] ?? 0;
    const c = bytes[i + 2] ?? 0;
    const word = (a << 16) | (b << 8) | c;
    const left = bytes.length - i;
    out += ALPHABET[(word >> 18) & 63];
    out += ALPHABET[(word >> 12) & 63];
    out += left > 1 ? ALPHABET[(word >> 6) & 63] : '=';
    out += left > 2 ? ALPHABET[word & 63] : '=';
  }
  return out;
}

/** The bytes of a base64 text; throws on a character outside it. */
export function fromBase64(text: string): Uint8Array {
  const clean = text.replace(/=+$/, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let word = 0;
  let bits = 0;
  let n = 0;
  for (const char of clean) {
    const value = ALPHABET.indexOf(char);
    if (value < 0) throw new RangeError(`not base64: "${char}"`);
    word = ((word << 6) | value) & 0xffffff;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[n++] = (word >> bits) & 0xff;
    }
  }
  return out;
}

/** A profile as base64 of its little-endian 16-bit values. */
export function encodeProfile(profile: HorizonProfile): string {
  const values = profile.centiDeg;
  const bytes = new Uint8Array(values.length * BYTES_PER_VALUE);
  const view = new DataView(bytes.buffer);
  values.forEach((v, i) => view.setInt16(i * BYTES_PER_VALUE, v, true));
  return toBase64(bytes);
}

/** The profile written by {@link encodeProfile}. */
export function decodeProfile(text: string): HorizonProfile {
  const bytes = fromBase64(text);
  if (bytes.length === 0 || bytes.length % BYTES_PER_VALUE !== 0) {
    throw new RangeError('a horizon profile needs whole 16-bit values');
  }
  const view = new DataView(bytes.buffer);
  const centiDeg = new Int16Array(bytes.length / BYTES_PER_VALUE);
  for (let i = 0; i < centiDeg.length; i++) {
    centiDeg[i] = view.getInt16(i * BYTES_PER_VALUE, true);
  }
  return { centiDeg };
}
