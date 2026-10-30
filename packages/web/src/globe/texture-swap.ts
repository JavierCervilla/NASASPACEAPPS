/**
 * Steps the Moon up through its maps without a flash: a level is fetched
 * and uploaded to the GPU while the old one stays on screen, then swapped
 * in, and only then is the old one freed. Levels only go up (a map already
 * downloaded is never traded for a worse one), one fetch at a time; the
 * highest level asked for meanwhile is fetched next.
 */
import {
  fetchLevel,
  NO_LEVEL,
  release,
  type HeldLevel,
  type SwapDeps,
} from './texture-fetch';
import type { LodLevel } from './texture-lod';

export class TextureSwap<T> {
  private held: HeldLevel<T> = NO_LEVEL;
  private target: LodLevel | 0 = 0;
  private busy = false;
  private disposed = false;

  constructor(private readonly deps: SwapDeps<T>) {}

  /** Asks for `level`; at or below what is shown or coming, a no-op. */
  want(level: LodLevel): void {
    if (this.disposed || level <= Math.max(this.target, this.held.level)) {
      return;
    }
    this.target = level;
    if (!this.busy) void this.climb();
  }

  /** The level on screen; 0 until the first map arrives. */
  shown(): LodLevel | 0 {
    return this.held.level;
  }

  /** Frees what is shown, and whatever arrives afterwards. */
  dispose(): void {
    this.disposed = true;
    release(this.held.maps, null, this.deps);
  }

  /** Fetches and swaps in levels until the target is on screen. */
  private async climb(): Promise<void> {
    this.busy = true;
    while (!this.disposed && this.target > this.held.level) {
      const level = this.target as LodLevel;
      const next = await fetchLevel(level, this.held, this.deps);
      if (!next) {
        this.target = this.held.level;
      } else if (this.disposed) {
        release(next.maps, this.held.maps, this.deps);
      } else {
        this.deps.apply(next.maps);
        release(this.held.maps, next.maps, this.deps);
        this.held = next;
      }
    }
    this.busy = false;
  }
}
