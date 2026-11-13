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
 * The wiring of the Moon's swapper to the page (moon-swap.ts, VENT-123): the
 * density rule reads the session's KTX2 and the handheld's 8K give-up on
 * every call, not once at construction, and only a phone or a coarse
 * pointer listens for a lost GPU context. The page's KTX2 switch, its
 * transcoder, the dev tools and the swapper are stood in for.
 */
import { MeshLambertMaterial, type WebGLRenderer } from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MoonOptions } from '../src/globe/moon';

const page = vi.hoisted(() => {
  const state = { target: 'etc2' as 'etc2' | null, lowered: [] as unknown[], lowers: true };
  return {
    state,
    pageKtx2: {
      choice: () => (state.target ? { target: state.target } : { target: null, reason: 'off' }),
      off: () => void (state.target = null),
    },
  };
});

vi.mock('../src/textures/ktx2-session', () => ({ pageKtx2: page.pageKtx2 }));
vi.mock('../src/textures/ktx2-page', () => ({ pageKtx2Deps: () => ({}) }));
vi.mock('../src/lib/dev-tools-loader', () => ({ devToolsModule: () => null }));
vi.mock('../src/globe/texture-swap', () => ({
  TextureSwap: class {
    lower(...args: unknown[]): boolean {
      page.state.lowered.push(args);
      return page.state.lowers;
    }
  },
}));

const { moonSwap } = await import('../src/globe/moon-swap');

// The Pixel's disc zoomed all the way in wants the 8K.
const CLOSE = { distance: 1.6, frameBufferPx: 590 * 1.75 };

function renderer(): WebGLRenderer {
  return {
    getContext: () => ({ getError: () => 0 }),
    capabilities: { maxTextureSize: 8192, getMaxAnisotropy: () => 4 },
    domElement: new EventTarget(),
  } as unknown as WebGLRenderer;
}

function options(handheld: boolean): MoonOptions {
  return {
    base: '/', tier: 'medium', phone: handheld, coarsePointer: handheld, saveData: false,
    onChange: () => undefined, shown: () => true, warn: () => undefined,
  };
}

const lose = (r: WebGLRenderer) => r.domElement.dispatchEvent(new Event('webglcontextlost'));

beforeEach(() => {
  page.state.target = 'etc2';
  page.state.lowered = [];
  page.state.lowers = true;
});

describe('the Moon swapper\'s live caps', () => {
  it('reads the session\'s KTX2 on every rule call: a phone drops to 4K once KTX2 turns off', () => {
    const moon = moonSwap(renderer(), new MeshLambertMaterial(), options(true));
    expect(moon.want(CLOSE)).toBe(8);
    page.pageKtx2.off();
    expect(moon.want(CLOSE)).toBe(4);
  });

  it('gives a phone\'s 8K up on a lost context with the 8K in play, and keeps it at 4K with KTX2 still on', () => {
    const r = renderer();
    const moon = moonSwap(r, new MeshLambertMaterial(), options(true));
    expect(moon.want(CLOSE)).toBe(8);
    lose(r);
    expect(page.state.lowered).toEqual([[4, 'capped']]);
    expect(moon.want(CLOSE)).toBe(4);
    lose(r);
    expect(page.state.lowered).toHaveLength(1);
  });

  it('gives nothing up when the 8K is not in play, and stops listening once unbound', () => {
    page.state.lowers = false;
    const r = renderer();
    const moon = moonSwap(r, new MeshLambertMaterial(), options(true));
    lose(r);
    expect(moon.want(CLOSE)).toBe(8);
    page.state.lowers = true;
    moon.unbind();
    lose(r);
    expect(page.state.lowered).toHaveLength(1);
    expect(moon.want(CLOSE)).toBe(8);
  });

  it('leaves a desktop alone: 8K with KTX2 off, and a lost context lowers nothing', () => {
    const r = renderer();
    const moon = moonSwap(r, new MeshLambertMaterial(), options(false));
    page.pageKtx2.off();
    lose(r);
    expect(page.state.lowered).toEqual([]);
    expect(moon.want({ distance: 1.6, frameBufferPx: 547 * 2 })).toBe(8);
  });
});
