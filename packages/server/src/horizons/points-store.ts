/** The byte-capped `points/` directory: its size and its LRU eviction. */
import {
  evictLeastRecent,
  listPointFiles,
  sweepStaleTemp,
  totalBytes,
} from './points-files.ts';

// A temporary file older than this at the first scan was left by a crash: a
// write takes milliseconds.
const STALE_TEMP_MS = 60_000;

/** How full `points/` is, for the health answer: two numbers, no paths. */
export interface PointsUsage {
  readonly pointsBytes: number;
  readonly pointsCapBytes: number;
}

/** What the health route reads from the store. */
export interface PointsUsageSource {
  usage(): Promise<PointsUsage>;
}

/** Tracks the size of `points/` and evicts the least recently used files. */
export class PointsStore implements PointsUsageSource {
  private readonly dir: string;
  private readonly maxBytes: number;
  private readonly now: () => number;
  // Initialised by a scan of the directory on first use (which also sweeps the
  // stale temporary files), then kept in memory.
  private size: Promise<number> | null = null;
  // Evictions run one at a time, so two of them never count the same file.
  private evicting: Promise<void> = Promise.resolve();

  /** `now` is the clock of the stale-temp cutoff; tests inject a fake one. */
  constructor(dir: string, maxBytes: number, now: () => number = Date.now) {
    this.dir = dir;
    this.maxBytes = maxBytes;
    this.now = now;
  }

  /**
   * Scans the directory if it was not scanned yet, and gives the tracked size;
   * call it before writing a file, so the scan does not count it.
   */
  ready(): Promise<number> {
    this.size ??= sweepStaleTemp(this.dir, this.now() - STALE_TEMP_MS)
      .then(() => listPointFiles(this.dir))
      .then(totalBytes);
    return this.size;
  }

  /**
   * The tracked size and the cap. Never scans the directory: before the first
   * scan (started by the first write of a custom point) the size is 0, and a
   * scan already running is awaited rather than repeated.
   */
  async usage(): Promise<PointsUsage> {
    const pointsBytes = this.size === null ? 0 : await this.size;
    return { pointsBytes, pointsCapBytes: this.maxBytes };
  }

  /** Counts a file just written, and evicts the oldest others past the cap. */
  async added(path: string, bytes: number): Promise<void> {
    const before = await this.ready();
    this.size = Promise.resolve(before + bytes);
    this.evicting = this.evicting.then(() => this.evict(path));
    await this.evicting;
  }

  private async evict(keep: string): Promise<void> {
    const total = await this.ready();
    if (total <= this.maxBytes) return;
    const { dir, maxBytes } = this;
    const left = await evictLeastRecent({ dir, keep, total, maxBytes });
    this.size = Promise.resolve(left);
  }
}
