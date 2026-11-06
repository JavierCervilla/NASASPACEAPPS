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
import { depthChoice } from '../src/terrain/depth-mode';
import { parseLeaveOut } from '../src/terrain/leave-out';

/** The choice for an address, on a GPU with or without EXT_clip_control. */
const choose = (search: string, clipControl = true) =>
  depthChoice(search, parseLeaveOut(search), clipControl);

describe('depth mode (VENT-103)', () => {
  it('draws with the logarithmic depth and the usual shadows by default', () => {
    expect(choose('?site=im2-athena')).toEqual({ mode: 'log', asked: null, forceShadows: false });
  });

  it('keeps ?onfoot=logdepth meaning a linear depth', () => {
    expect(choose('?onfoot=logdepth').mode).toBe('linear');
  });

  it.each(['log', 'linear', 'reversed'] as const)('takes ?depth=%s', (mode) => {
    expect(choose(`?depth=${mode}`)).toMatchObject({ mode, asked: mode });
  });

  it('lets ?depth= win over ?onfoot=logdepth', () => {
    expect(choose('?onfoot=logdepth&depth=reversed').mode).toBe('reversed');
  });

  it('falls back to the logarithmic depth when the GPU has no EXT_clip_control', () => {
    expect(choose('?depth=reversed', false)).toEqual({ mode: 'log', asked: 'reversed', forceShadows: false });
  });

  it('reads the words in any case and ignores an unknown one', () => {
    expect(choose('?depth=%20Reversed%20').mode).toBe('reversed');
    expect(choose('?depth=zbuffer')).toMatchObject({ mode: 'log', asked: null });
  });

  it('forces the shadow map only for ?shadows=force', () => {
    expect(choose('?shadows=force').forceShadows).toBe(true);
    expect(choose('?shadows=FORCE').forceShadows).toBe(true);
    expect(choose('?shadows=on').forceShadows).toBe(false);
  });
});
