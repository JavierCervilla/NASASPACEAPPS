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

import { describe, expect, it } from 'vitest';
import { cullZones, HIT_HALF_PX } from '../src/globe/marker-cull';

const spot = (name: string, x: number, zone: boolean, selected = false) => ({ name, at: { x, y: 100 }, zone, selected });
const names = (shown: { name: string }[]) => shown.map((s) => s.name).sort();

describe('cullZones', () => {
  it('hides a zone whose centre falls inside an exact marker hit box, whatever the order', () => {
    const shown = cullZones([spot('zone', 100 + HIT_HALF_PX - 1, true), spot('exact', 100, false)]);
    expect(names(shown)).toEqual(['exact']);
  });

  it('keeps a zone just outside the hit box', () => {
    const shown = cullZones([spot('zone', 100 + HIT_HALF_PX, true), spot('exact', 100, false)]);
    expect(names(shown)).toEqual(['exact', 'zone']);
  });

  it('hides a zone on top of an already placed zone, and never hides an exact marker', () => {
    const shown = cullZones([spot('z1', 100, true), spot('z2', 104, true), spot('e1', 300, false), spot('e2', 302, false)]);
    expect(names(shown)).toEqual(['e1', 'e2', 'z1']);
  });

  it('keeps the selected zone even over an exact marker', () => {
    const shown = cullZones([spot('exact', 100, false), spot('zone', 102, true, true), spot('other', 98, true)]);
    expect(names(shown)).toEqual(['exact', 'zone']);
  });
});
