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

import { describe, expect, it, vi } from 'vitest';
import { LIMITS, SOUTH_POLE_VIEW } from '../src/globe/framing';
import type { SwapDeps } from '../src/globe/texture-fetch';
import { discPixels, pxPerTexel } from '../src/globe/disc-density';
import {
  levelUrls,
  maxLevel,
  startLevel,
  wantedLevel,
  type LodCaps,
  type LodLevel,
} from '../src/globe/texture-lod';
import { TextureSwap } from '../src/globe/texture-swap';

// A GPU that takes 8K maps, as every desktop GPU of the last decade does.
const BIG_GPU = 16384;
// A desktop by default (a fine pointer, wide layout); `phone: true` for the phone layout, `coarsePointer: true` for
// a touch screen.
const caps = (tier: LodCaps['tier'], extra: Partial<LodCaps> = {}): LodCaps => ({
  tier,
  phone: false,
  coarsePointer: false,
  saveData: false,
  maxTextureSize: BIG_GPU,
  ...extra,
});
// The human's Pixel: 412 x 880 CSS px at the medium tier's pixel ratio 1.75; the phone frames the Moon above the
// sheet, leaving out 290 px (--globe-frame-inset, phone.css), so the field of view spans 590 CSS px.
const PHONE = (590 * 1.75);
// A 1440 x 900 desktop window: the globe is 547 CSS px tall (between the header and the calendar strip, beside the
// card), at pixel ratio 1, and 2 on a Retina screen (capped at 1.75 on the medium tier).
const DESKTOP = 547;
const RETINA = 547 * 2;
const RETINA_MEDIUM = 547 * 1.75;
const view = (distance: number, frameBufferPx: number) => ({ distance, frameBufferPx });
const CLOSE_ZOOM = LIMITS.minDistance;

describe('the Moon disc on screen', () => {
  it('measures the disc across as three projects the sphere: tan(asin(1/d)) / tan(fov/2) of the frame', () => {
    // At 5 radii a 35° field of view: tan(asin(0.2)) / tan(17.5°) = 0.6474 of the frame's height.
    expect(discPixels(view(5, 900))).toBeCloseTo(582.6, 0);
    expect(discPixels(view(5, PHONE))).toBeCloseTo(668.5, 0);
    expect(discPixels(view(2, PHONE))).toBeCloseTo(1890.7, 0);
  });

  it('counts the pixels per texel at the disc centre, where the map is stretched the most', () => {
    // pi/2 x the disc's pixels over the level's 512 texels across the disc.
    expect(pxPerTexel(1, view(5, DESKTOP))).toBeCloseTo(1.09, 2);
    expect(pxPerTexel(2, view(5, PHONE))).toBeCloseTo(1.03, 2);
  });
});

describe('texture level of detail', () => {
  it('opens on 2K on the high tier and 1K on the others', () => {
    expect(startLevel('high')).toBe(2);
    expect(startLevel('medium')).toBe(1);
    expect(startLevel('low')).toBe(1);
  });

  // Literal distances: a change of the density rule must show up here.
  it('climbs a Pixel-sized phone to 2K at the opening view and to 4K once zoomed in', () => {
    const levels = [5, 4.3, 3.5, 3, 2].map((d) => wantedLevel(view(d, PHONE), caps('medium', { phone: true })));
    expect(levels).toEqual([2, 4, 4, 4, 4]);
    expect(SOUTH_POLE_VIEW.distance).toBe(5);
  });

  it('climbs a Retina desktop at the medium tier to 2K at the opening view; at ratio 1 the 1K map is sharp there', () => {
    expect([5, 3.5, 2.2].map((d) => wantedLevel(view(d, RETINA_MEDIUM), caps('medium')))).toEqual([2, 4, 8]);
    expect([5, 3.5, 2.2].map((d) => wantedLevel(view(d, DESKTOP), caps('medium')))).toEqual([1, 2, 4]);
  });

  it('reaches 8K on the high tier only where the disc needs it, a Retina desktop zoomed in', () => {
    expect([5, 3.5, 2.2].map((d) => wantedLevel(view(d, RETINA), caps('high')))).toEqual([2, 4, 8]);
    expect([5, 3.5, 2.2, CLOSE_ZOOM].map((d) => wantedLevel(view(d, DESKTOP), caps('high')))).toEqual([2, 2, 4, 4]);
  });

  it('stops a phone (medium or low tier) at 4K when its GPU takes 4K', () => {
    const phone = { phone: true, coarsePointer: true };
    expect(wantedLevel(view(CLOSE_ZOOM, PHONE), caps('medium', phone))).toBe(4);
    expect(wantedLevel(view(CLOSE_ZOOM, RETINA), caps('medium', phone))).toBe(4);
    expect(wantedLevel(view(CLOSE_ZOOM, PHONE), caps('low', phone))).toBe(4);
    expect(maxLevel(caps('low', { ...phone, maxTextureSize: 4096 }))).toBe(4);
    expect(maxLevel(caps('low', { ...phone, maxTextureSize: 2048 }))).toBe(2);
  });

  // VENT-122: Brave reports a random core count, so a capable desktop may read as medium and stopped at 4K.
  it('lets a desktop at the medium tier climb to 8K where the zoom needs it, a phone and the low tier stay at 4K', () => {
    expect(maxLevel(caps('medium'))).toBe(8);
    expect(maxLevel(caps('medium', { phone: true }))).toBe(4);
    expect(maxLevel(caps('low'))).toBe(4);
    expect(maxLevel(caps('low', { phone: true }))).toBe(4);
    expect(maxLevel(caps('medium', { saveData: true }))).toBe(1);
    expect(maxLevel(caps('medium', { maxTextureSize: 4096 }))).toBe(4);
    // A phone held sideways is wider than the phone layout, but its pointer is coarse: 4K, as before VENT-122.
    expect(maxLevel(caps('medium', { coarsePointer: true }))).toBe(4);
    expect(wantedLevel(view(CLOSE_ZOOM, RETINA), caps('medium', { coarsePointer: true }))).toBe(4);
    // The density rule is unchanged: 8K only for a Retina desktop zoomed in, as on the high tier.
    expect(wantedLevel(view(CLOSE_ZOOM, DESKTOP), caps('medium'))).toBe(4);
    expect(wantedLevel(view(CLOSE_ZOOM, RETINA), caps('medium', { phone: true }))).toBe(4);
  });

  // VENT-123: the 8K colour as KTX2 costs a phone about 22 MB of GPU memory instead of the JPEG's 179 MB, so a phone
  // or a coarse pointer at the medium tier climbs to 8K only through it, and only on a GPU that takes 8192.
  it('lets a phone or coarse pointer at the medium tier reach 8K only with KTX2 on and a GPU that takes 8192', () => {
    const phone = { phone: true, coarsePointer: true, maxTextureSize: 8192 };
    expect(maxLevel(caps('medium', { ...phone, ktx2: true }))).toBe(8);
    expect(maxLevel(caps('medium', { coarsePointer: true, ktx2: true }))).toBe(8);
    expect(maxLevel(caps('medium', { phone: true, ktx2: true }))).toBe(8);
    expect(wantedLevel(view(CLOSE_ZOOM, PHONE), caps('medium', { ...phone, ktx2: true }))).toBe(8);
    expect(maxLevel(caps('medium', { ...phone, ktx2: false }))).toBe(4);
    expect(maxLevel(caps('medium', phone))).toBe(4);
    expect(maxLevel(caps('medium', { ...phone, ktx2: true, maxTextureSize: 4096 }))).toBe(4);
    expect(maxLevel(caps('low', { ...phone, ktx2: true }))).toBe(4);
    expect(maxLevel(caps('low', { ktx2: true }))).toBe(4);
    expect(maxLevel(caps('medium', { ...phone, ktx2: true, saveData: true }))).toBe(1);
    expect(maxLevel(caps('high', { ...phone, ktx2: true, saveData: true }))).toBe(2);
  });

  it('keeps a desktop at the medium and high tiers at 8K with KTX2 on or off', () => {
    for (const ktx2 of [true, false]) {
      expect(maxLevel(caps('medium', { ktx2 }))).toBe(8);
      expect(maxLevel(caps('high', { ktx2 }))).toBe(8);
    }
  });

  // Detection never calls a coarse pointer high (lib/quality.ts), but `?quality=high` can, and the phone layout may be a
  // narrow desktop window: there too the 8K comes only as KTX2, since the 8K JPEG is never asked on them.
  it('holds a phone or coarse pointer forced to the high tier at 4K without KTX2', () => {
    expect(maxLevel(caps('high', { coarsePointer: true, ktx2: true }))).toBe(8);
    expect(maxLevel(caps('high', { coarsePointer: true, ktx2: false }))).toBe(4);
    expect(maxLevel(caps('high', { phone: true }))).toBe(4);
  });

  it('never asks below the start map, however small the disc', () => {
    expect(wantedLevel(view(LIMITS.maxDistance, 300), caps('high'))).toBe(2);
    expect(wantedLevel(view(LIMITS.maxDistance, 300), caps('medium'))).toBe(1);
  });

  it('never goes past the start map under Save-Data', () => {
    expect(maxLevel(caps('low', { saveData: true }))).toBe(1);
    expect(maxLevel(caps('high', { saveData: true }))).toBe(2);
    expect(wantedLevel(view(5, PHONE), caps('medium', { saveData: true }))).toBe(1);
    expect(wantedLevel(view(CLOSE_ZOOM, PHONE), caps('low', { saveData: true }))).toBe(1);
    expect(wantedLevel(view(CLOSE_ZOOM, RETINA), caps('high', { saveData: true }))).toBe(2);
  });

  it('never asks the GPU for a map wider than it takes', () => {
    expect(wantedLevel(view(CLOSE_ZOOM, RETINA), caps('high', { maxTextureSize: 4096 }))).toBe(4);
    expect(wantedLevel(view(CLOSE_ZOOM, RETINA), caps('high', { maxTextureSize: 2048 }))).toBe(2);
  });

  it('pairs each colour map with the relief, which stops at 4K', () => {
    expect(levelUrls(1, '/')).toEqual({ colour: '/textures/moon-lroc-1k.jpg', normal: '/textures/moon-lola-normal-1k.jpg' });
    expect(levelUrls(8, '/sub')).toEqual({
      colour: '/sub/textures/moon-lroc-8k.jpg',
      normal: '/sub/textures/moon-lola-normal-4k.jpg',
    });
  });

  it('asks the 2K, 4K and 8K colour as KTX2 when the GPU takes it, the 1K and reliefs as JPEG (VENT-101, VENT-123)', () => {
    const colours = ([1, 2, 4, 8] as const).map((level) => levelUrls(level, '/', 'etc2').colour);
    expect(colours).toEqual([
      '/textures/moon-lroc-1k.jpg',
      '/textures/moon-lroc-2k.ktx2',
      '/textures/moon-lroc-4k.ktx2',
      '/textures/moon-lroc-8k.ktx2',
    ]);
    expect(levelUrls(8, '/', 'bc1')).toEqual({
      colour: '/textures/moon-lroc-8k.ktx2',
      normal: '/textures/moon-lola-normal-4k.jpg',
    });
    expect(levelUrls(8, '/', null).colour).toBe('/textures/moon-lroc-8k.jpg');
    expect(levelUrls(4, '/', 'bc1').normal).toBe('/textures/moon-lola-normal-4k.jpg');
    expect(levelUrls(2, '/', null).colour).toBe('/textures/moon-lroc-2k.jpg');
  });
});

interface Fake {
  readonly url: string;
}

/** A swapper whose loads wait to be answered, and that logs what it does with each texture. */
function setUp(fail: readonly string[] = []) {
  const log: string[] = [];
  const pending = new Map<string, { resolve: (t: Fake) => void; reject: (e: Error) => void }>();
  const name = (url: string): string => url.replace(/^.*moon-/, '').replace('.jpg', '');
  const deps: SwapDeps<Fake> = {
    urls: (level: LodLevel) => levelUrls(level, '/'),
    load: (url) => {
      log.push(`load ${name(url)}`);
      return new Promise((resolve, reject) => pending.set(name(url), { resolve, reject }));
    },
    upload: (t) => log.push(`upload ${name(t.url)}`),
    apply: (maps) => log.push(`apply ${name(maps.colour.url)} + ${maps.normal ? name(maps.normal.url) : 'flat'}`),
    dispose: (t) => log.push(`dispose ${name(t.url)}`),
    warn: vi.fn(),
  };
  /** Answers every load in flight, then lets the swapper run on. */
  const answer = async (): Promise<void> => {
    for (const [key, p] of [...pending]) {
      pending.delete(key);
      if (fail.includes(key)) p.reject(new Error('404'));
      else p.resolve({ url: `/textures/moon-${key}.jpg` });
    }
    await new Promise((done) => setTimeout(done, 0));
  };
  return { swap: new TextureSwap(deps), log, answer, deps };
}

describe('texture swap', () => {
  it('uploads the new maps before they show, and frees the old ones only after', async () => {
    const { swap, log, answer } = setUp();
    swap.want(2);
    await answer();
    log.length = 0;
    swap.want(4);
    await answer();
    expect(log).toEqual([
      'load lola-normal-4k',
      'load lroc-4k',
      'upload lroc-4k',
      'upload lola-normal-4k',
      'apply lroc-4k + lola-normal-4k',
      'dispose lroc-2k',
      'dispose lola-normal-2k',
    ]);
    expect(swap.shown()).toBe(4);
  });

  it('keeps the 4K relief for the 8K map instead of fetching it again', async () => {
    const { swap, log, answer } = setUp();
    swap.want(4);
    await answer();
    log.length = 0;
    swap.want(8);
    await answer();
    expect(log).toEqual(['load lroc-8k', 'upload lroc-8k', 'apply lroc-8k + lola-normal-4k', 'dispose lroc-4k']);
  });

  it('fetches one level at a time and jumps to the highest asked for meanwhile', async () => {
    const { swap, log, answer } = setUp();
    swap.want(2);
    swap.want(4);
    swap.want(8);
    expect(log).toEqual(['load lola-normal-2k', 'load lroc-2k']);
    await answer();
    await answer();
    expect(log.filter((line) => line.startsWith('load'))).toEqual([
      'load lola-normal-2k',
      'load lroc-2k',
      'load lola-normal-4k',
      'load lroc-8k',
    ]);
    expect(swap.shown()).toBe(8);
  });

  it('never lowers a pending target while a fetch is busy', async () => {
    const { swap, log, answer } = setUp();
    swap.want(2);
    swap.want(8);
    swap.want(4);
    await answer();
    await answer();
    expect(log.filter((line) => line.startsWith('load lroc'))).toEqual(['load lroc-2k', 'load lroc-8k']);
    expect(swap.shown()).toBe(8);
  });

  it('still climbs to a higher target asked for while a lower level failed', async () => {
    const { swap, log, answer } = setUp(['lroc-2k']);
    swap.want(2);
    swap.want(8);
    await answer();
    await answer();
    expect(log).toContain('load lroc-8k');
    expect(swap.shown()).toBe(8);
  });

  it('never goes back down', async () => {
    const { swap, log, answer } = setUp();
    swap.want(4);
    await answer();
    log.length = 0;
    swap.want(2);
    swap.want(4);
    expect(log).toEqual([]);
  });

  it('shows the colour flat when the relief fails, and stays put when the colour fails', async () => {
    const { swap, log, answer, deps } = setUp(['lola-normal-1k', 'lroc-4k']);
    swap.want(1);
    await answer();
    expect(log).toContain('apply lroc-1k + flat');
    swap.want(4);
    await answer();
    expect(swap.shown()).toBe(1);
    // The relief that did arrive for the failed level is freed, not leaked.
    expect(log.at(-1)).toBe('dispose lola-normal-4k');
    expect(deps.warn).toHaveBeenCalledTimes(2);
  });

  it('frees what it shows on dispose, and whatever arrives afterwards', async () => {
    const { swap, log, answer } = setUp();
    swap.want(1);
    await answer();
    swap.want(2);
    swap.dispose();
    expect(log.slice(-2)).toEqual(['dispose lroc-1k', 'dispose lola-normal-1k']);
    await answer();
    expect(log.slice(-2)).toEqual(['dispose lroc-2k', 'dispose lola-normal-2k']);
    expect(log.some((line) => line.startsWith('apply lroc-2k'))).toBe(false);
  });
});

describe('texture swap lowered while the globe hides (VENT-86)', () => {
  it('fetches the lower level, shows it, and only then frees the big maps', async () => {
    const { swap, log, answer } = setUp();
    swap.want(4);
    await answer();
    log.length = 0;
    swap.lower(1);
    await answer();
    expect(log).toEqual([
      'load lola-normal-1k',
      'load lroc-1k',
      'upload lroc-1k',
      'upload lola-normal-1k',
      'apply lroc-1k + lola-normal-1k',
      'dispose lroc-4k',
      'dispose lola-normal-4k',
    ]);
    expect(swap.shown()).toBe(1);
  });

  it('climbs again when a bigger map is asked for after it', async () => {
    const { swap, log, answer } = setUp();
    swap.want(4);
    await answer();
    swap.lower(1);
    await answer();
    log.length = 0;
    swap.want(4);
    await answer();
    expect(log).toContain('apply lroc-4k + lola-normal-4k');
    expect(swap.shown()).toBe(4);
  });

  it('does nothing when the level shown is already at or under it', async () => {
    const { swap, log, answer } = setUp();
    swap.want(1);
    await answer();
    log.length = 0;
    swap.lower(1);
    swap.lower(2);
    await answer();
    expect(log).toEqual([]);
    expect(swap.shown()).toBe(1);
  });

  it('frees a bigger map that arrives after it, never showing it', async () => {
    const { swap, log, answer } = setUp();
    swap.want(1);
    await answer();
    swap.want(4);
    swap.lower(1);
    await answer();
    expect(log).toContain('dispose lroc-4k');
    expect(log.some((line) => line.startsWith('apply lroc-4k'))).toBe(false);
    expect(swap.shown()).toBe(1);
  });

  it('keeps the shown maps when the lower level fails to load', async () => {
    const { swap, log, answer } = setUp(['lroc-1k']);
    swap.want(4);
    await answer();
    log.length = 0;
    swap.lower(1);
    await answer();
    expect(log.some((line) => line.startsWith('dispose lroc-4k'))).toBe(false);
    expect(swap.shown()).toBe(4);
  });
});
