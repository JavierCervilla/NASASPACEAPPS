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
import { groupBlocks, longestBlock } from '../src/blocks.ts';
import { hasSun } from '../src/visibility.ts';
import { series } from './factories.ts';

describe('groupBlocks', () => {
  it('groups consecutive hours with start, exclusive end and length', () => {
    const samples = series([[1, 0], [1, 0], [-1, 0], [1, 0]]);
    expect(groupBlocks(samples, hasSun)).toEqual([
      { start: '2026-11-01T00:00:00Z', end: '2026-11-01T02:00:00Z', hours: 2 },
      { start: '2026-11-01T03:00:00Z', end: '2026-11-01T04:00:00Z', hours: 1 },
    ]);
  });

  it('returns no blocks when the condition never holds, or for no samples', () => {
    expect(groupBlocks(series([[-1, 0]]), hasSun)).toEqual([]);
    expect(groupBlocks([], hasSun)).toEqual([]);
  });

  it('ends a block at a gap in the samples', () => {
    const [a, b, c] = series([[1, 0], [1, 0], [1, 0]]);
    if (!a || !b || !c) throw new Error('fixture');
    expect(groupBlocks([a, c], hasSun)).toHaveLength(2);
    expect(groupBlocks([a, b, c], hasSun)).toHaveLength(1);
  });
});

describe('longestBlock', () => {
  it('keeps the earliest of equally long blocks, and is null for none', () => {
    const blocks = groupBlocks(series([[1, 0], [-1, 0], [1, 0], [-1, 0], [1, 0], [1, 0]]), hasSun);
    expect(longestBlock(blocks)?.start).toBe('2026-11-01T04:00:00Z');
    expect(longestBlock(blocks.slice(0, 2))?.start).toBe('2026-11-01T00:00:00Z');
    expect(longestBlock([])).toBeNull();
  });
});
