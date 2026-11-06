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
 * The transcoder worker's work (VENT-101), over a fake Basis module: every
 * level of an ETC1S map to ETC2 RGB or BC1 RGB, at the levels' own sizes,
 * and the file always closed and freed, also when a step fails.
 */
import { describe, expect, it } from 'vitest';
import {
  TRANSCODER_FORMAT,
  transcodeKtx2,
  type BasisModule,
} from '../src/textures/basis-transcode';

interface FileOptions {
  valid?: boolean;
  etc1s?: boolean;
  start?: boolean;
  transcode?: boolean;
}

/** A 16 x 8 map with three levels; logs what was asked of it. */
function fakeModule(options: FileOptions = {}) {
  const log: string[] = [];
  const sizes = [[16, 8], [8, 4], [4, 2]] as const;
  class KTX2File {
    constructor(readonly bytes: Uint8Array) {
      log.push(`open ${bytes.byteLength}`);
    }
    isValid = () => options.valid ?? true;
    isETC1S = () => options.etc1s ?? true;
    getWidth = () => 16;
    getHeight = () => 8;
    getLevels = () => sizes.length;
    startTranscoding = () => options.start ?? true;
    getImageLevelInfo = (mip: number) => {
      const [w, h] = sizes[mip]!;
      return { origWidth: w, origHeight: h };
    };
    getImageTranscodedSizeInBytes = (mip: number, _l: number, _f: number,
      format: number) => {
      log.push(`size ${mip} ${format}`);
      return [64, 16, 8][mip]!;
    };
    transcodeImage = (dst: Uint8Array, mip: number) => {
      dst.fill(mip + 1);
      return options.transcode ?? true;
    };
    close = () => log.push('close');
    delete = () => log.push('delete');
  }
  const module = { KTX2File } as unknown as BasisModule;
  return { module, log };
}

describe('the transcode', () => {
  it('turns every level of an ETC1S map into ETC2 RGB', () => {
    const { module, log } = fakeModule();
    const image = transcodeKtx2(module, new Uint8Array(32), 'etc2');
    expect(image.width).toBe(16);
    expect(image.height).toBe(8);
    expect(image.levels.map((l) => [l.width, l.height, l.data.byteLength]))
      .toEqual([[16, 8, 64], [8, 4, 16], [4, 2, 8]]);
    expect(image.levels[1]!.data[0]).toBe(2);
    expect(log).toContain(`size 0 ${TRANSCODER_FORMAT.etc2}`);
    expect(log.slice(-2)).toEqual(['close', 'delete']);
  });

  it('asks BC1 RGB for bc1', () => {
    const { module, log } = fakeModule();
    transcodeKtx2(module, new Uint8Array(4), 'bc1');
    expect(log).toContain(`size 2 ${TRANSCODER_FORMAT.bc1}`);
    expect(TRANSCODER_FORMAT).toEqual({ etc2: 0, bc1: 2 });
  });

  it.each([
    ['an invalid file', { valid: false }, /not a valid KTX2/],
    ['a UASTC file', { etc1s: false }, /not ETC1S/],
    ['a failed start', { start: false }, /startTranscoding failed/],
    ['a failed level', { transcode: false }, /level 0 failed/],
  ] as const)('throws on %s and frees the file', (_name, options, error) => {
    const { module, log } = fakeModule(options);
    expect(() => transcodeKtx2(module, new Uint8Array(4), 'etc2'))
      .toThrow(error);
    expect(log.slice(-2)).toEqual(['close', 'delete']);
  });
});
