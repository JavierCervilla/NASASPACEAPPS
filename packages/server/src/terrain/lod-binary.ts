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
 * A levelled tile's binary answer (VENT-98): the stored JSON answer
 * (`lod-answer.ts`) encoded on the way out by `encodeTileBinary` of
 * `@ventana/sim`. The disk cache keeps one form, the JSON, so binary tiles
 * cost no memory or disk; encoding takes about half a millisecond a tile
 * (base64 read, the predictor, the byte planes).
 */
import { encodeTileBinary } from '@ventana/sim';
import type { LodAnswer } from './lod-answer.ts';

/** The `q` values of the answer's base64 heights. */
function valuesOf(heights: string): Uint16Array {
  const bytes = Buffer.from(heights, 'base64');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const q = new Uint16Array(bytes.length / 2);
  for (let i = 0; i < q.length; i++) q[i] = view.getUint16(i * 2, true);
  return q;
}

/** `answer` in the binary format of docs/terrain-api.md. */
export function lodBinary(answer: LodAnswer): Uint8Array<ArrayBuffer> {
  const { version, scheme, level, x, y, n, quantumM, baseUnits } = answer;
  return encodeTileBinary({
    version, key: { scheme, level, x, y }, n, quantumM, baseUnits,
    q: valuesOf(answer.heights),
    resolutionM: answer.resolutionM, minM: answer.minM, maxM: answer.maxM,
    coverage: answer.coverage,
  });
}
