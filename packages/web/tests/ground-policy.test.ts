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
 * What the ground costs per tier (VENT-69): the four parts VENT-62 added to
 * the ground's fragment shader and the fine relief are the high tier's; the
 * rocks are capped at medium and off at low; `?onfoot=` leaves a part out
 * at any tier.
 */
import { describe, expect, it } from 'vitest';
import {
  MEDIUM_ROCKS,
  groundKey,
  groundPolicy,
} from '../src/terrain/ground-policy';
import { parseLeaveOut } from '../src/terrain/leave-out';
import { MEASURED } from '../src/terrain/rock-law';

const none = new Set<never>();
const at = (tier: 'low' | 'medium' | 'high', search = '') =>
  groundPolicy(tier, parseLeaveOut(search));

describe('the ground at each tier', () => {
  it('draws everything at high', () => {
    expect(at('high')).toEqual({ photometry: true, antitile: true,
      footprint: true, fine: true, rocksCap: MEASURED.cap });
  });

  it('goes back to the pre-VENT-62 cost at medium', () => {
    expect(at('medium')).toEqual({ photometry: false, antitile: false,
      footprint: false, fine: false, rocksCap: 420 });
    expect(MEDIUM_ROCKS).toBe(420);
  });

  it('does the same at low and draws no measured rocks', () => {
    expect(at('low')).toEqual({ photometry: false, antitile: false,
      footprint: false, fine: false, rocksCap: 0 });
  });

  it('never gives a lower tier a part the higher one lacks', () => {
    const rank = (p: ReturnType<typeof at>): number =>
      [p.photometry, p.antitile, p.footprint, p.fine].filter(Boolean).length;
    expect(rank(at('low'))).toBeLessThanOrEqual(rank(at('medium')));
    expect(rank(at('medium'))).toBeLessThanOrEqual(rank(at('high')));
    expect(at('low').rocksCap).toBeLessThanOrEqual(at('medium').rocksCap);
    expect(at('medium').rocksCap).toBeLessThanOrEqual(at('high').rocksCap);
  });
});

describe('?onfoot= on the ground', () => {
  it('knows the five words, in the list\'s order', () => {
    expect([...parseLeaveOut('?onfoot=rocks,fine,footprint,antitile,photometry')])
      .toEqual(['photometry', 'antitile', 'footprint', 'fine', 'rocks']);
  });

  it('leaves each part out of the high tier by itself', () => {
    expect(at('high', '?onfoot=photometry').photometry).toBe(false);
    expect(at('high', '?onfoot=photometry').antitile).toBe(true);
    expect(at('high', '?onfoot=antitile').antitile).toBe(false);
    expect(at('high', '?onfoot=footprint').footprint).toBe(false);
    expect(at('high', '?onfoot=fine').fine).toBe(false);
    expect(at('high', '?onfoot=rocks').rocksCap).toBe(0);
    expect(at('high', '?onfoot=rocks').fine).toBe(true);
  });

  it('never adds a part to a tier that lacks it', () => {
    expect(groundPolicy('medium', none).photometry).toBe(false);
    expect(at('medium', '?onfoot=shadows').fine).toBe(false);
  });
});

describe('the material\'s program key', () => {
  it('differs whenever the shader text does', () => {
    const keys = new Set([
      groundKey(at('high')),
      groundKey(at('medium')),
      groundKey(at('high', '?onfoot=photometry')),
      groundKey(at('high', '?onfoot=antitile')),
      groundKey(at('high', '?onfoot=footprint')),
      groundKey(at('high', '?onfoot=fine')),
    ]);
    expect(keys.size).toBe(6);
  });

  it('is shared by tiers that make the same shader', () => {
    expect(groundKey(at('low'))).toBe(groundKey(at('medium')));
    expect(groundKey(at('high', '?onfoot=rocks'))).toBe(groundKey(at('high')));
  });
});
