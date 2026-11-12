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

/** The benchmark's script v1 (VENT-81): its steps, its keys and what the fast script keeps. */
import { describe, expect, it } from 'vitest';
import { wantedLevel } from '../src/globe/texture-lod';
import { SOUTH_POLE_VIEW, zoomedDistance } from '../src/globe/framing';
import { keyLook } from '../src/terrain/look-input';
import { NEXT_SITE, SCRIPT_VERSION, benchScript, turnKeyCount, type Action } from '../src/bench/script';

const keysOf = (actions: readonly Action[], target: string): string[] =>
  actions.flatMap((a) => (a.kind === 'keys' && a.target === target ? a.keys : []));
const waitOf = (actions: readonly Action[]): number =>
  actions.reduce((sum, a) => sum + (a.kind === 'wait' ? a.ms : 0), 0);

describe('script v1', () => {
  const script = benchScript(false);

  it('is version 1 with its six steps in order', () => {
    expect(SCRIPT_VERSION).toBe(1);
    expect(script.map((s) => s.id)).toEqual(['globeIdle', 'globeMoves', 'openView', 'turn', 'changePoint', 'backToGlobe']);
  });

  it('idles the globe 5 s and waits 3 s after its moves and back on it', () => {
    expect(script[0]?.actions).toEqual([{ kind: 'view', view: 'globe' }, { kind: 'wait', ms: 5000 }]);
    expect(waitOf(script[1]?.actions ?? [])).toBe(3000);
    expect(waitOf(script[5]?.actions ?? [])).toBe(3000);
  });

  it('zooms the globe from its opening view close enough for the 4K map on a 1440 x 900 desktop', () => {
    const zooms = keysOf(script[1]?.actions ?? [], 'globe').filter((k) => k === '+').length;
    const distance = zoomedDistance(SOUTH_POLE_VIEW.distance, -2 * zooms);
    const caps = { tier: 'medium', phone: false, coarsePointer: false, saveData: false, maxTextureSize: 16384 } as const;
    // The globe of a 1440 x 900 window is 547 px tall, beside the site card.
    expect(wantedLevel({ distance, frameBufferPx: 547 }, caps)).toBe(4);
  });

  it('turns the on-foot view a full turn by ArrowRight, as many keys as 360° takes', () => {
    const keys = keysOf(script[3]?.actions ?? [], 'onFoot');
    expect(turnKeyCount(360)).toBe(72);
    expect(keys).toHaveLength(72);
    let look = { yawDeg: 0, pitchDeg: 0 };
    for (const key of keys) look = keyLook(look, { key, shiftKey: false }) ?? look;
    expect(((look.yawDeg % 360) + 360) % 360).toBeCloseTo(0, 6);
  });

  it('opens the view and waits for it, then changes the point and waits for it to park and settle', () => {
    expect(script[2]?.actions).toEqual([{ kind: 'view', view: 'horizon' }, { kind: 'settle', timeoutMs: 60_000, park: false }]);
    expect(script[4]?.actions.slice(0, 2)).toEqual([{ kind: 'site', id: NEXT_SITE }, { kind: 'settle', timeoutMs: 60_000, park: true }]);
    expect(NEXT_SITE).toBe('artemis-malapert-massif');
  });
});

describe('the fast script (benchFast)', () => {
  it('keeps the steps, a fifth of every wait and a quarter turn, and the same settle timeout', () => {
    const fast = benchScript(true);
    expect(fast.map((s) => s.id)).toEqual(benchScript(false).map((s) => s.id));
    expect(waitOf(fast[0]?.actions ?? [])).toBe(1000);
    expect(keysOf(fast[3]?.actions ?? [], 'onFoot')).toHaveLength(18);
    expect(fast[2]?.actions[1]).toEqual({ kind: 'settle', timeoutMs: 60_000, park: false });
  });
});
