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
 * The on-foot view's Earth as KTX2 (VENT-101): both sizes come through the
 * page's transcoder in the GPU's format; the regolith's albedo and normal map
 * stay WebP (the albedo's KTX2 is 44 kB more than its WebP, over the VENT-94
 * budget of the view's opening maps), and any KTX2 failure turns
 * KTX2 off for the session and loads the WebP instead, so the view still
 * gets its surfaces.
 */
import { CompressedTexture, RepeatWrapping, RGB_ETC2_Format, Texture } from 'three';
import { describe, expect, it } from 'vitest';
import { loadSurfaceMaps, type SurfaceLoad } from '../src/terrain/scene/surface-maps';
import { ktx2Switch } from '../src/textures/ktx2-session';

function harness(ktx2Fails: boolean) {
  const asked: string[] = [];
  const name = (url: string) => url.replace(/^.*\//, '');
  const load: SurfaceLoad = {
    session: ktx2Switch(() => ({ target: 'etc2' })),
    image: (url) => {
      asked.push(`image ${name(url)}`);
      return Promise.resolve(new Texture());
    },
    ktx2: (url, target) => {
      asked.push(`${target} ${name(url)}`);
      if (ktx2Fails) return Promise.reject(new Error('worker failed: CSP'));
      return Promise.resolve(new CompressedTexture([], 4, 4, RGB_ETC2_Format));
    },
  };
  return { load, asked };
}

describe('the on-foot surfaces as KTX2', () => {
  it('takes the Earth as KTX2 and the albedo and normal map as WebP', async () => {
    const { load, asked } = harness(false);
    const maps = await loadSurfaceMaps(true, load);
    expect(maps.albedo).not.toBeInstanceOf(CompressedTexture);
    expect(maps.earth).toBeInstanceOf(CompressedTexture);
    expect(maps.normal).not.toBeInstanceOf(CompressedTexture);
    expect(maps.albedo.wrapS).toBe(RepeatWrapping);
    expect(maps.albedo.anisotropy).toBe(8);
    expect(asked.toSorted()).toEqual([
      'etc2 on-foot-earth-512.ktx2',
      'image on-foot-regolith-albedo.webp',
      'image on-foot-regolith-normal.webp',
    ]);
  });

  it('asks the desktop Earth as KTX2 on a wider viewport', async () => {
    const { load, asked } = harness(false);
    await loadSurfaceMaps(false, load);
    expect(asked).toContain('etc2 on-foot-earth.ktx2');
  });

  it('falls back to the WebP maps when KTX2 fails, and turns it off', async () => {
    const { load, asked } = harness(true);
    const maps = await loadSurfaceMaps(false, load);
    expect(maps.earth).not.toBeInstanceOf(CompressedTexture);
    expect(asked).toEqual(expect.arrayContaining([
      'image on-foot-regolith-albedo.webp',
      'image on-foot-earth.webp',
    ]));
    expect(load.session.choice().target).toBeNull();
  });
});
