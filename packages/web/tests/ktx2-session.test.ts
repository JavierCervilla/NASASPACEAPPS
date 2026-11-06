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
 * KTX2 for the page session (VENT-101): decided once, from the probe's
 * profile and the address, and turned off for the rest of the session the
 * first time the worker or a map fails, so the next maps go straight to JPEG.
 */
import { describe, expect, it } from 'vitest';
import { ktx2Switch } from '../src/textures/ktx2-session';

describe('the KTX2 switch', () => {
  it('decides once, on the first read', () => {
    let decisions = 0;
    const ktx2 = ktx2Switch(() => {
      decisions++;
      return { target: 'etc2' };
    });
    expect(decisions).toBe(0);
    expect(ktx2.choice()).toEqual({ target: 'etc2' });
    expect(ktx2.choice()).toEqual({ target: 'etc2' });
    expect(decisions).toBe(1);
  });

  it('stays off for the session once turned off, keeping the first reason', () => {
    const ktx2 = ktx2Switch(() => ({ target: 'bc1' }));
    ktx2.off('worker failed to start');
    ktx2.off('2K colour failed');
    expect(ktx2.choice()).toEqual({
      target: null, reason: 'worker failed to start',
    });
  });

  it('keeps the decision\'s own reason when it was never on', () => {
    const ktx2 = ktx2Switch(() => ({ target: null, reason: '?ktx2=0' }));
    ktx2.off('worker failed to start');
    expect(ktx2.choice()).toEqual({ target: null, reason: '?ktx2=0' });
  });
});
