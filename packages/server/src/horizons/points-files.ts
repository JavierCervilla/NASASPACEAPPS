/**
 * Listing and eviction of the files in the byte-capped `points/` directory,
 * and the sweep of the temporary files a crash leaves in it.
 */
import { readdir, stat, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { nullIfMissing } from './files.ts';

/** One cached table in `points/`. */
export interface PointFile {
  readonly path: string;
  readonly bytes: number;
  readonly mtimeMs: number;
}

async function describe(path: string): Promise<PointFile | null> {
  const info = await nullIfMissing(stat(path));
  return info && { path, bytes: info.size, mtimeMs: info.mtimeMs };
}

/** The cached tables in `dir`; none when the directory does not exist yet. */
export async function listPointFiles(dir: string): Promise<PointFile[]> {
  const names = (await nullIfMissing(readdir(dir))) ?? [];
  const files = await Promise.all(
    names
      .filter((name) => name.endsWith('.json'))
      .map((name) => describe(join(dir, name))),
  );
  return files.filter((file) => file !== null);
}

/**
 * Deletes the `*.tmp` files in `dir` last written before `cutoffMs` (ms since
 * the epoch): a write that crashed between the temporary file and its rename.
 * A younger one may still be on its way to its rename, so it stays.
 */
export async function sweepStaleTemp(
  dir: string,
  cutoffMs: number,
): Promise<void> {
  const names = (await nullIfMissing(readdir(dir))) ?? [];
  const temps = names.filter((name) => name.endsWith('.tmp'));
  const files = await Promise.all(
    temps.map((name) => describe(join(dir, name))),
  );
  for (const file of files) {
    if (file && file.mtimeMs < cutoffMs) await nullIfMissing(unlink(file.path));
  }
}

/** The bytes the files take together. */
export function totalBytes(files: readonly PointFile[]): number {
  return files.reduce((sum, file) => sum + file.bytes, 0);
}

/** What {@link evictLeastRecent} works on. */
export interface Eviction {
  readonly dir: string;
  /** The file just written, which is never evicted. */
  readonly keep: string;
  readonly total: number;
  readonly maxBytes: number;
}

/**
 * Deletes the least recently used files until the total fits `maxBytes`, and
 * returns the new total.
 */
export async function evictLeastRecent(eviction: Eviction): Promise<number> {
  let total = eviction.total;
  const files = (await listPointFiles(eviction.dir))
    .filter((file) => file.path !== eviction.keep)
    .sort((a, b) => a.mtimeMs - b.mtimeMs);
  for (const file of files) {
    if (total <= eviction.maxBytes) break;
    await nullIfMissing(unlink(file.path));
    total -= file.bytes;
  }
  return Math.max(total, 0);
}
