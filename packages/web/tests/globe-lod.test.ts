import { describe, expect, it, vi } from 'vitest';
import { SOUTH_POLE_VIEW, LIMITS } from '../src/globe/framing';
import type { SwapDeps } from '../src/globe/texture-fetch';
import { levelUrls, LOD_DISTANCE, maxLevel, startLevel, wantedLevel, type LodCaps, type LodLevel } from '../src/globe/texture-lod';
import { TextureSwap } from '../src/globe/texture-swap';

// A GPU that takes 8K maps, as every desktop GPU of the last decade does.
const BIG_GPU = 16384;
const caps = (tier: LodCaps['tier'], extra: Partial<LodCaps> = {}): LodCaps => ({
  tier,
  saveData: false,
  maxTextureSize: BIG_GPU,
  ...extra,
});
// Just past each threshold, and the closest zoom the orbit allows.
const MEDIUM_ZOOM = LOD_DISTANCE.level4 - 0.1;
const CLOSE_ZOOM = LIMITS.minDistance;

describe('texture level of detail', () => {
  it('opens on 2K on the high tier and 1K on the others', () => {
    expect(startLevel('high')).toBe(2);
    expect(startLevel('medium')).toBe(1);
    expect(startLevel('low')).toBe(1);
  });

  it('keeps the start map at the opening view', () => {
    expect(wantedLevel(SOUTH_POLE_VIEW.distance, caps('high'))).toBe(2);
    expect(wantedLevel(SOUTH_POLE_VIEW.distance, caps('medium'))).toBe(1);
  });

  it('asks for 4K at a medium zoom and 8K at a close zoom on a desktop at the high tier', () => {
    expect(wantedLevel(MEDIUM_ZOOM, caps('high'))).toBe(4);
    expect(wantedLevel(LOD_DISTANCE.level8, caps('high'))).toBe(8);
    expect(wantedLevel(CLOSE_ZOOM, caps('high'))).toBe(8);
  });

  it('stops a phone (medium tier) at 4K, and the low tier at 2K', () => {
    expect(wantedLevel(MEDIUM_ZOOM, caps('medium'))).toBe(4);
    expect(wantedLevel(CLOSE_ZOOM, caps('medium'))).toBe(4);
    expect(wantedLevel(CLOSE_ZOOM, caps('low'))).toBe(2);
  });

  it('never goes past the start map under Save-Data', () => {
    expect(maxLevel(caps('high', { saveData: true }))).toBe(2);
    expect(wantedLevel(CLOSE_ZOOM, caps('high', { saveData: true }))).toBe(2);
    expect(wantedLevel(CLOSE_ZOOM, caps('medium', { saveData: true }))).toBe(1);
  });

  it('never asks the GPU for a map wider than it takes', () => {
    expect(wantedLevel(CLOSE_ZOOM, caps('high', { maxTextureSize: 4096 }))).toBe(4);
    expect(wantedLevel(CLOSE_ZOOM, caps('high', { maxTextureSize: 2048 }))).toBe(2);
  });

  it('pairs each colour map with the relief, which stops at 4K', () => {
    expect(levelUrls(1, '/')).toEqual({ colour: '/textures/moon-lroc-1k.jpg', normal: '/textures/moon-lola-normal-1k.jpg' });
    expect(levelUrls(8, '/sub')).toEqual({
      colour: '/sub/textures/moon-lroc-8k.jpg',
      normal: '/sub/textures/moon-lola-normal-4k.jpg',
    });
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
