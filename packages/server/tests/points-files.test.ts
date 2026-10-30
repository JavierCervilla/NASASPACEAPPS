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

import { mkdtemp, readdir, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { evictLeastRecent } from '../src/horizons/points-files.ts';

const BYTES = 100;

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'horizons-points-'));
});

/** Writes `name.json` with BYTES bytes, last used `ageSec` seconds ago. */
async function table(name: string, ageSec: number): Promise<string> {
  const path = join(dir, `${name}.json`);
  await writeFile(path, 'x'.repeat(BYTES), 'utf8');
  const at = Date.now() / 1000 - ageSec;
  await utimes(path, at, at);
  return path;
}

describe('evictLeastRecent', () => {
  it('never evicts the file just written, even when it is the oldest', async () => {
    const keep = await table('kept', 900);
    await table('older', 600);
    await table('newer', 300);
    const left = await evictLeastRecent({ dir, keep, total: 3 * BYTES, maxBytes: 2 * BYTES });
    expect((await readdir(dir)).sort()).toEqual(['kept.json', 'newer.json']);
    expect(left).toBe(2 * BYTES);
  });

  it('evicts nothing when the total is exactly the cap', async () => {
    const keep = await table('kept', 0);
    await table('older', 600);
    const left = await evictLeastRecent({ dir, keep, total: 2 * BYTES, maxBytes: 2 * BYTES });
    expect(await readdir(dir)).toHaveLength(2);
    expect(left).toBe(2 * BYTES);
  });
});
