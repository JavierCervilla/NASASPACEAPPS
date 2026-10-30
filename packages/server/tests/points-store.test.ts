import { mkdtemp, readdir, utimes, writeFile } from 'node:fs/promises';
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
});
