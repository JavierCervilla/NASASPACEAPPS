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

import { mkdir, mkdtemp, readdir, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { PointsStore } from '../src/horizons/points-store.ts';

// A fixed instant far from the real clock, so only the injected one can decide the cutoff.
const NOW_MS = Date.UTC(2030, 0, 1);
const STALE_TEMP_MS = 60_000;

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'horizons-store-'));
});

/** Writes a temporary file last modified `ageMs` before NOW_MS. */
async function temp(name: string, ageMs: number): Promise<void> {
  const path = join(dir, `${name}.tmp`);
  await writeFile(path, 'x', 'utf8');
  const at = (NOW_MS - ageMs) / 1000;
  await utimes(path, at, at);
}

describe('PointsStore', () => {
  it('sweeps temporary files older than 60 s on the injected clock, and keeps younger ones', async () => {
    await temp('crashed', STALE_TEMP_MS + 1000);
    await temp('writing', STALE_TEMP_MS - 1000);
    await new PointsStore(dir, 1_000_000, () => NOW_MS).ready();
    expect(await readdir(dir)).toEqual(['writing.tmp']);
  });

  it('reports 0 bytes and its cap before the first scan, without scanning', async () => {
    await temp('crashed', STALE_TEMP_MS + 1000);
    const store = new PointsStore(dir, 4096, () => NOW_MS);
    expect(await store.usage()).toEqual({ pointsBytes: 0, pointsCapBytes: 4096 });
    // No scan ran, so the stale file is still there.
    expect(await readdir(dir)).toEqual(['crashed.tmp']);
  });

  it('reads a failed scan as 0 bytes and scans again on the next call', async () => {
    const points = join(dir, 'points');
    await writeFile(points, 'x', 'utf8');
    const store = new PointsStore(points, 4096, () => NOW_MS);
    await expect(store.ready()).rejects.toThrow();
    expect(await store.usage()).toEqual({ pointsBytes: 0, pointsCapBytes: 4096 });
    // Once the directory is fixed, the next call scans it again.
    await rm(points);
    await mkdir(points);
    await writeFile(join(points, 'a.json'), 'abc', 'utf8');
    await expect(store.ready()).resolves.toBe(3);
  });

  it('reports the tracked size once a file is added', async () => {
    const store = new PointsStore(dir, 4096, () => NOW_MS);
    await store.ready();
    const path = join(dir, 'a.json');
    await writeFile(path, 'x'.repeat(300), 'utf8');
    await store.added(path, 300);
    expect(await store.usage()).toEqual({ pointsBytes: 300, pointsCapBytes: 4096 });
  });
});
