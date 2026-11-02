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
 * The diagnostic switch `?onfoot=` (VENT-49): a comma list of parts of the
 * on-foot view to leave out, so a phone can bisect a crash; unknown words
 * are ignored, never an error.
 */
import { describe, expect, it } from 'vitest';
import { parseLeaveOut } from '../src/terrain/leave-out';

const parts = (search: string): string[] => [...parseLeaveOut(search)];

describe('?onfoot=', () => {
  it('leaves nothing out by default', () => {
    expect(parts('')).toEqual([]);
    expect(parts('?site=im2-athena&quality=low')).toEqual([]);
    expect(parts('?onfoot=')).toEqual([]);
  });

  it('names each part the view can do without', () => {
    expect(parts('?onfoot=astronaut,lander,shadows,far,shade,logdepth')).toEqual([
      'astronaut', 'lander', 'shadows', 'far', 'shade', 'logdepth',
    ]);
  });

  it('lists them in one order whatever the address says, each once', () => {
    expect(parts('?onfoot=far,astronaut,far,lander')).toEqual(['astronaut', 'lander', 'far']);
  });

  it('ignores unknown words, spaces, case and empty items', () => {
    expect(parts('?onfoot=%20Shadows%20,,nonsense,LANDER,far=1,constructor,__proto__')).toEqual(['lander', 'shadows']);
  });

  it('reads it among the other parameters, and never throws on a broken query', () => {
    expect(parts('?quality=low&onfoot=shade&site=x')).toEqual(['shade']);
    expect(parts('?onfoot=%E0%A4%A&a=%')).toEqual([]);
  });

  it('answers a set to ask by name', () => {
    const left = parseLeaveOut('?onfoot=far');
    expect(left.has('far')).toBe(true);
    expect(left.has('lander')).toBe(false);
  });
});
