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
import { raySphere } from '../src/globe/sphere-ray';

describe('a ray from the camera to the Moon', () => {
  it('meets the near side of the unit sphere', () => {
    const hit = raySphere({ x: 0, y: 0, z: 5 }, { x: 0, y: 0, z: -2 });
    expect(hit).toEqual({ x: 0, y: 0, z: 1 });
  });

  it('misses past the limb, and behind the camera', () => {
    expect(raySphere({ x: 0, y: 2, z: 5 }, { x: 0, y: 0, z: -1 })).toBeNull();
    expect(raySphere({ x: 0, y: 0, z: 5 }, { x: 0, y: 0, z: 1 })).toBeNull();
    expect(raySphere({ x: 0, y: 0, z: 5 }, { x: 0, y: 0, z: 0 })).toBeNull();
  });
});
