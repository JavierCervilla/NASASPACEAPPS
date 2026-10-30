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

/** Tracks the size of `points/` and evicts the least recently used files. */
export class PointsStore {
  private readonly dir: string;
  private readonly maxBytes: number;
  // Initialised by a scan of the directory on first use (which also sweeps the
  // stale temporary files), then kept in memory.
  private size: Promise<number> | null = null;
  // Evictions run one at a time, so two of them never count the same file.
  private evicting: Promise<void> = Promise.resolve();

  constructor(dir: string, maxBytes: number) {
    this.dir = dir;
    this.maxBytes = maxBytes;
  }

  /**
   * Scans the directory if it was not scanned yet; call it before writing a
   * file, so the scan does not count it.
   */
  async ready(): Promise<void> {
    await this.currentSize();
  }

  /** Counts a file just written, and evicts the oldest others past the cap. */
  async added(path: string, bytes: number): Promise<void> {
    const before = await this.currentSize();
    this.size = Promise.resolve(before + bytes);
    this.evicting = this.evicting.then(() => this.evict(path));
    await this.evicting;
  }

  private currentSize(): Promise<number> {
    this.size ??= sweepStaleTemp(this.dir, Date.now() - STALE_TEMP_MS)
      .then(() => listPointFiles(this.dir))
      .then(totalBytes);
    return this.size;
  }

  private async evict(keep: string): Promise<void> {
    const total = await this.currentSize();
    if (total <= this.maxBytes) return;
    const { dir, maxBytes } = this;
    const left = await evictLeastRecent({ dir, keep, total, maxBytes });
    this.size = Promise.resolve(left);
  }
}
