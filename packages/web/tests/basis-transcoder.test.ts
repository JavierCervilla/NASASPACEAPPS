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
 * three's Basis Universal transcoder at build (VENT-101): copied from three
 * into `dist/basis/<three version>/`, never committed, its folder named by
 * the version so nginx can cache it for good; the worker finds it by the
 * same version, defined at build.
 */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  THREE_VERSION,
  TRANSCODER_FILES,
  basisDir,
  basisTranscoder,
  copyTranscoder,
} from '../scripts/basis-transcoder.mjs';

const made: string[] = [];
afterEach(() => made.splice(0).forEach((dir) => rmSync(dir, { recursive: true })));

describe('the transcoder at build', () => {
  it('is three\'s, under its version', () => {
    const three = JSON.parse(readFileSync(
      new URL('../../../node_modules/three/package.json', import.meta.url), 'utf8')) as { version: string };
    expect(THREE_VERSION).toBe(three.version);
    expect(basisDir()).toBe(`basis/${three.version}/`);
    expect(TRANSCODER_FILES).toEqual(['basis_transcoder.js', 'basis_transcoder.wasm']);
  });

  it('copies both files into dist', () => {
    const dist = mkdtempSync(join(tmpdir(), 'basis-'));
    made.push(dist);
    const copied = copyTranscoder(dist);
    expect(copied).toEqual([
      `basis/${THREE_VERSION}/basis_transcoder.js`,
      `basis/${THREE_VERSION}/basis_transcoder.wasm`,
    ]);
    const wasm = readFileSync(join(dist, copied[1]!));
    expect(wasm.subarray(0, 4)).toEqual(Buffer.from([0, 0x61, 0x73, 0x6d]));
  });

  it('defines the version for the worker\'s bundle', () => {
    let config: { vite?: { define?: Record<string, string> } } = {};
    const setup = basisTranscoder().hooks['astro:config:setup'];
    setup({ updateConfig: (update: typeof config) => (config = update) });
    expect(config.vite?.define).toEqual({ __THREE_VERSION__: JSON.stringify(THREE_VERSION) });
  });
});
