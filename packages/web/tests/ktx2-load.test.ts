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
 * A KTX2 map as the GPU's texture (VENT-101): fetched, transcoded in the
 * worker, and made into a CompressedTexture with every level, in sRGB,
 * trilinear, mipmaps not generated (they came with the file). A failed fetch
 * is a Ktx2Unavailable like any other, so the caller falls back.
 */
import {
  CompressedTexture,
  LinearMipmapLinearFilter,
  RGB_ETC2_Format,
  RGB_S3TC_DXT1_Format,
  SRGBColorSpace,
} from 'three';
import { describe, expect, it } from 'vitest';
import { compressedTexture, loadKtx2 } from '../src/textures/ktx2-load';
import { Ktx2Unavailable, type Transcoder } from '../src/textures/ktx2-transcoder';
import type { Ktx2Image } from '../src/textures/ktx2-image';

const IMAGE: Ktx2Image = {
  width: 8,
  height: 4,
  levels: [
    { data: new Uint8Array(16), width: 8, height: 4 },
    { data: new Uint8Array(8), width: 4, height: 2 },
  ],
};

const transcoder = (image = IMAGE): Transcoder & { asked: number[] } => {
  const asked: number[] = [];
  return {
    asked,
    warm: () => undefined,
    transcode: (buffer) => {
      asked.push(buffer.byteLength);
      return Promise.resolve(image);
    },
  };
};

describe('a KTX2 texture', () => {
  it('holds every level in ETC2 RGB, sRGB and trilinear', () => {
    const texture = compressedTexture(IMAGE, 'etc2');
    expect(texture).toBeInstanceOf(CompressedTexture);
    expect(texture.format).toBe(RGB_ETC2_Format);
    expect(texture.mipmaps).toHaveLength(2);
    expect(texture.image).toMatchObject({ width: 8, height: 4 });
    expect(texture.colorSpace).toBe(SRGBColorSpace);
    expect(texture.minFilter).toBe(LinearMipmapLinearFilter);
    expect(texture.generateMipmaps).toBe(false);
    expect(texture.version).toBeGreaterThan(0);
  });

  it('is BC1 RGB for bc1', () => {
    expect(compressedTexture(IMAGE, 'bc1').format).toBe(RGB_S3TC_DXT1_Format);
  });

  it('loads the bytes taken early instead of fetching them', async () => {
    const worker = transcoder();
    let fetched = 0;
    const texture = await loadKtx2('/textures/moon-lroc-2k.ktx2', 'etc2', {
      transcoder: worker,
      bytes: () => {
        fetched++;
        return Promise.resolve(new ArrayBuffer(3));
      },
      early: () => Promise.resolve(new ArrayBuffer(5)),
    });
    expect(texture.mipmaps).toHaveLength(2);
    expect(worker.asked).toEqual([5]);
    expect(fetched).toBe(0);
  });

  it('fetches the bytes when none were taken early', async () => {
    const worker = transcoder();
    await loadKtx2('/a.ktx2', 'bc1', {
      transcoder: worker,
      bytes: () => Promise.resolve(new ArrayBuffer(3)),
      early: () => null,
    });
    expect(worker.asked).toEqual([3]);
  });

  it('turns a failed fetch into Ktx2Unavailable', async () => {
    const load = loadKtx2('/a.ktx2', 'etc2', {
      transcoder: transcoder(),
      bytes: () => Promise.reject(new Error('HTTP 404')),
      early: () => null,
    });
    await expect(load).rejects.toBeInstanceOf(Ktx2Unavailable);
    await expect(load).rejects.toThrow('fetch failed: HTTP 404');
  });
});
