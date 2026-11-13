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
 * The 8K colour on a phone or a touch screen comes only as KTX2 (VENT-123):
 * the density rule asks it only while the session takes KTX2, and the one
 * place every JPEG colour load passes refuses the 8K JPEG there, so no order
 * of events (the 8K KTX2 failing over to its sibling, or KTX2 turned off
 * between the rule and the fetch) asks it, and the 8K is given up for the
 * session instead of tried again.
 */
import { describe, expect, it } from 'vitest';
import { eightKGate, giveUpOnContextLoss, handheldJpeg } from '../src/globe/handheld-8k';
import { ktx2OrJpeg } from '../src/globe/ktx2-map';
import { mapLine, type MapEvent } from '../src/globe/map-trace';
import { ruleWatch } from '../src/globe/moon-swap';
import type { SwapDeps } from '../src/globe/texture-fetch';
import { levelUrls, type LodCaps } from '../src/globe/texture-lod';
import { TextureSwap } from '../src/globe/texture-swap';
import { ktx2Switch, type Ktx2Switch } from '../src/textures/ktx2-session';

const JPEG_8K = '/textures/moon-lroc-8k.jpg';
const KTX2_8K = '/textures/moon-lroc-8k.ktx2';
// The human's Pixel 10 at the medium tier, zoomed all the way in.
const PIXEL: Omit<LodCaps, 'ktx2'> = {
  tier: 'medium', phone: true, coarsePointer: true, saveData: false,
  maxTextureSize: 8192,
};
const CLOSE = { distance: 1.6, frameBufferPx: 590 * 1.75 };

/** A colour loader as moon-textures.ts builds it, logging every request. */
function colourLoader(session: Ktx2Switch, handheld: boolean, ktx2Fails: boolean) {
  const asked: string[] = [];
  const lines: string[] = [];
  const mark = (event: MapEvent) => void lines.push(mapLine(event));
  const gate = eightKGate(mark);
  const plain = (url: string) => {
    asked.push(url);
    return Promise.resolve(url);
  };
  const jpeg = handheld ? handheldJpeg(plain, gate) : plain;
  const load = ktx2OrJpeg<string>({
    ktx2: (url) => {
      asked.push(url);
      return ktx2Fails ? Promise.reject(new Error('transcode failed'))
        : Promise.resolve(url);
    },
    jpeg, session, mark,
  });
  return { load, asked, lines, gate };
}

const etc2 = () => ktx2Switch(() => ({ target: 'etc2' }));

describe('the 8K JPEG on a phone or touch screen', () => {
  it('is refused, told once, and every other JPEG still loads', async () => {
    const lines: string[] = [];
    const asked: string[] = [];
    const jpeg = handheldJpeg((url: string) => {
      asked.push(url);
      return Promise.resolve(url);
    }, eightKGate((event) => void lines.push(mapLine(event))));
    await expect(jpeg(JPEG_8K)).rejects.toThrow(/8K JPEG/);
    await expect(jpeg(JPEG_8K)).rejects.toThrow(/8K JPEG/);
    await expect(jpeg('/textures/moon-lroc-4k.jpg')).resolves.toBe('/textures/moon-lroc-4k.jpg');
    expect(asked).toEqual(['/textures/moon-lroc-4k.jpg']);
    expect(lines).toEqual(['8K given up on this device: KTX2 failed, 4K at most']);
  });

  it('still loads on a desktop, where a failed 8K KTX2 falls back to it', async () => {
    const session = etc2();
    const h = colourLoader(session, false, true);
    await expect(h.load(KTX2_8K)).resolves.toBe(JPEG_8K);
    expect(h.asked).toEqual([KTX2_8K, JPEG_8K]);
  });

  it('is never the fallback of a failed 8K KTX2 on a phone: the load fails and KTX2 is off', async () => {
    const session = etc2();
    const h = colourLoader(session, true, true);
    await expect(h.load(KTX2_8K)).rejects.toThrow(/8K JPEG/);
    expect(h.asked).toEqual([KTX2_8K]);
    expect(session.choice().target).toBeNull();
    expect(h.lines).toEqual([
      'KTX2 off: transcode failed',
      '8K given up on this device: KTX2 failed, 4K at most',
    ]);
  });
});

/** The globe's swapper on a phone: the live rule feeds it, as a frame does. */
function phoneGlobe(session: Ktx2Switch, ktx2Fails: boolean) {
  const h = colourLoader(session, true, ktx2Fails);
  let now = 0;
  const deps: SwapDeps<string> = {
    urls: (level) => levelUrls(level, '/', session.choice().target),
    load: (url, kind) => (kind === 'colour' ? h.load(url) : Promise.resolve(url)),
    upload: () => undefined,
    apply: () => undefined,
    dispose: () => undefined,
    warn: () => undefined,
    clock: { now: () => now, after: () => () => undefined },
  };
  const swap = new TextureSwap(deps);
  const rule = ruleWatch(() => ({
    ...PIXEL, ktx2: session.choice().target !== null, eightKGivenUp: h.gate.givenUp(),
  }), undefined);
  const canvas = new EventTarget();
  const unbind = giveUpOnContextLoss(canvas, h.gate, { capAt4: () => swap.lower(4, 'capped') });
  const settle = async (): Promise<void> => {
    for (let i = 0; i < 5; i += 1) await new Promise((done) => setTimeout(done, 0));
  };
  const frame = async (ms: number, view = CLOSE): Promise<void> => {
    now += ms;
    swap.want(rule(view));
    await settle();
  };
  const loseContext = () => canvas.dispatchEvent(new Event('webglcontextlost'));
  const givenUp = () => h.lines.filter((line) => line.includes('given up'));
  return { swap, frame, settle, loseContext, unbind, givenUp, asked: h.asked };
}

// Far enough out that the Pixel's disc wants the 4K, not the 8K.
const MID = { distance: 3, frameBufferPx: 590 * 1.75 };

describe('a phone zoomed in', () => {
  it('climbs to the 8K as KTX2', async () => {
    const globe = phoneGlobe(etc2(), false);
    await globe.frame(16);
    expect(globe.swap.shown()).toBe(8);
    expect(globe.asked).toEqual([KTX2_8K]);
  });

  it('gives the 8K up for the session when its KTX2 fails: 4K, never the JPEG, never the KTX2 again', async () => {
    const globe = phoneGlobe(etc2(), true);
    for (let frame = 0; frame < 300; frame += 1) await globe.frame(100);
    expect(globe.asked).toEqual([KTX2_8K, '/textures/moon-lroc-4k.jpg']);
    expect(globe.swap.shown()).toBe(4);
  });

  it('never asks the 8K JPEG when KTX2 goes off between the rule and the fetch', async () => {
    const session = etc2();
    const globe = phoneGlobe(session, false);
    const rule = ruleWatch(() => ({ ...PIXEL, ktx2: true }), undefined);
    expect(rule(CLOSE)).toBe(8);
    session.off('the on-foot map failed');
    globe.swap.want(8);
    for (let frame = 0; frame < 300; frame += 1) await globe.frame(100);
    expect(globe.asked).not.toContain(JPEG_8K);
    expect(globe.asked).toEqual(['/textures/moon-lroc-4k.jpg']);
    expect(globe.swap.shown()).toBe(4);
  });

  it('stops at 4K with KTX2 off from the start (?ktx2=0)', async () => {
    const globe = phoneGlobe(ktx2Switch(() => ({ target: null, reason: '?ktx2=0' })), false);
    for (let frame = 0; frame < 10; frame += 1) await globe.frame(100);
    expect(globe.asked).toEqual(['/textures/moon-lroc-4k.jpg']);
    expect(globe.swap.shown()).toBe(4);
  });
});

// VENT-123 round 2: three swallows an upload's out-of-memory, and a restored context uploads the same 8K again, so a
// lost context with the 8K in play is the Pixel's known way to fail: the 8K is given up as when its KTX2 fails.
describe('a phone that loses its GPU context', () => {
  it('with the 8K on the Moon gives the 8K up for the session and goes back to the 4K', async () => {
    const globe = phoneGlobe(etc2(), false);
    await globe.frame(16);
    expect(globe.swap.shown()).toBe(8);
    globe.loseContext();
    await globe.settle();
    expect(globe.swap.shown()).toBe(4);
    for (let frame = 0; frame < 300; frame += 1) await globe.frame(100);
    expect(globe.asked).toEqual([KTX2_8K, '/textures/moon-lroc-4k.ktx2']);
    expect(globe.swap.shown()).toBe(4);
    expect(globe.givenUp()).toEqual(['8K given up on this device: GPU context lost, 4K at most']);
  });

  it('with the 8K still coming frees it on landing and shows the 4K', async () => {
    const globe = phoneGlobe(etc2(), false);
    globe.swap.want(8);
    globe.loseContext();
    for (let frame = 0; frame < 50; frame += 1) await globe.frame(100);
    expect(globe.swap.shown()).toBe(4);
    expect(globe.asked.filter((url) => url === KTX2_8K)).toHaveLength(1);
    expect(globe.givenUp()).toEqual(['8K given up on this device: GPU context lost, 4K at most']);
  });

  it('with only the 4K in play gives nothing up: the 8K comes later', async () => {
    const globe = phoneGlobe(etc2(), false);
    await globe.frame(16, MID);
    expect(globe.swap.shown()).toBe(4);
    globe.loseContext();
    await globe.frame(16);
    expect(globe.swap.shown()).toBe(8);
    expect(globe.givenUp()).toEqual([]);
  });

  it('tells the give-up once, and stops listening once unbound', async () => {
    const globe = phoneGlobe(etc2(), false);
    await globe.frame(16);
    globe.unbind();
    globe.loseContext();
    await globe.settle();
    expect(globe.swap.shown()).toBe(8);
    const lines: string[] = [];
    const gate = eightKGate((event) => void lines.push(mapLine(event)));
    gate.giveUp('GPU context lost');
    gate.giveUp('KTX2 failed');
    expect(lines).toEqual(['8K given up on this device: GPU context lost, 4K at most']);
    expect(gate.givenUp()).toBe(true);
  });
});
