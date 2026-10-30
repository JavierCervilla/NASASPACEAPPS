/**
 * The disk cache of Horizons bodies. `pinned/` holds the tables the service
 * always needs and is never evicted; `points/` holds every other table under a
 * byte cap (see {@link PointsStore}). Tables cached before this layout,
 * directly in the cache root, are still read but never written.
 */
import { mkdir, readFile, rename, utimes, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { nullIfMissing } from './files.ts';
import { PointsStore } from './points-store.ts';

/** Writes through a temporary file, so a reader never sees half a body. */
async function writeAtomically(path: string, body: string): Promise<void> {
  const tmp = `${path}.${process.pid}.tmp`;
  await writeFile(tmp, body, 'utf8');
  await rename(tmp, path);
}

function readIfExists(path: string): Promise<string | null> {
  return nullIfMissing(readFile(path, 'utf8'));
}

/** Horizons bodies on disk, keyed by {@link cacheKey}. */
export class DiskCache {
  private readonly root: string;
  private readonly pinnedDir: string;
  private readonly pointsDir: string;
  private readonly points: PointsStore;

  constructor(root: string, maxPointsBytes: number) {
    this.root = root;
    this.pinnedDir = join(root, 'pinned');
    this.pointsDir = join(root, 'points');
    this.points = new PointsStore(this.pointsDir, maxPointsBytes);
  }

  /**
   * The cached body of `key`: pinned/, then points/ (refreshing its mtime,
   * for the LRU), then the legacy root.
   */
  async lookup(key: string): Promise<string | null> {
    const name = `${key}.json`;
    const pinned = await readIfExists(join(this.pinnedDir, name));
    if (pinned !== null) return pinned;
    const pointPath = join(this.pointsDir, name);
    const point = await readIfExists(pointPath);
    if (point !== null) {
      const now = new Date();
      // An eviction may have removed the file since the read; the body is
      // still good.
      await nullIfMissing(utimes(pointPath, now, now));
      return point;
    }
    return readIfExists(join(this.root, name));
  }

  /** Stores a valid body: in `pinned/` when `pinned`, else in `points/`. */
  async store(key: string, body: string, pinned: boolean): Promise<void> {
    const dir = pinned ? this.pinnedDir : this.pointsDir;
    const path = join(dir, `${key}.json`);
    await mkdir(dir, { recursive: true });
    if (!pinned) await this.points.ready();
    await writeAtomically(path, body);
    if (pinned) return;
    await this.points.added(path, Buffer.byteLength(body, 'utf8'));
  }
}
