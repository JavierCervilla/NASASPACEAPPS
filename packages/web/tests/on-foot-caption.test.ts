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
 * The on-foot caption's second line (VENT-51, VENT-54): the Earth's map and
 * the lifted shadows; the view draws no lander or astronaut, so it names
 * none.
 */
import { describe, expect, it } from 'vitest';
import { FINE_SITES } from '../src/terrain/fine/fine-catalog';
import { fineCaption } from '../src/terrain/fine/fine-caption';
import { captionNote } from '../src/terrain/view-text';
import { EXPOSURE, EXPOSURE_GAIN, exposureFor } from '../src/terrain/scene/stage';
import { EN } from './i18n-factories';

describe('the caption note', () => {
  it('credits the Earth and names no lander or astronaut', () => {
    expect(captionNote(EN)).toBe('Earth: NASA Blue Marble · shadows lifted and exposure raised 20 % for legibility');
    expect(captionNote(EN)).not.toMatch(/lander|Apollo|astronaut/i);
  });
});

describe('the exposure the caption names', () => {
  it('is raised 20 % over the first cut\'s 1.35, as the caption says', () => {
    expect(EXPOSURE_GAIN).toBe(1.2);
    expect(exposureFor(true)).toBeCloseTo(1.35 * 1.2, 12);
    expect(EXPOSURE).toBe(exposureFor(true));
  });
});

describe('the fine relief\'s caption', () => {
  it('names the NAC DTM and LOLA beyond it', () => {
    expect(fineCaption(EN, FINE_SITES[0]!, 20)).toBe(
      'Fine detail illustrative · relief LROC NAC DTM 4 m · LOLA 20 m beyond');
  });

  it('names PGDA for Malapert Massif', () => {
    const massif = FINE_SITES.find((s) => s.kind === 'pgda')!;
    expect(fineCaption(EN, massif, 20)).toContain('relief PGDA 5 m · LOLA 20 m');
  });
});
