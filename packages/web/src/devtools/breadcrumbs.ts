/**
 * A trail of what the page was doing, kept in localStorage so it survives a
 * crash of the GPU process and the reload after it. On the next load the
 * performance readout shows the previous session's trail, whose last line
 * points at the step that broke the driver. Marking costs one small write and
 * never throws.
 *
 * Ported from GAMESTUDIO's Web starter
 * (`studio/engines/web/scaffold/packages/client/src/engine/breadcrumbs.ts`),
 * where it was written after a game lost its WebGL context on every load on
 * one phone and was bisected blind.
 */
import {
  defaultStorage,
  readTrail,
  writeTrail,
  type TrailStorage,
} from './trail-storage';

export interface BreadcrumbOptions {
  /**
   * Where the trail is kept; `null` keeps it in memory only. Defaults to
   * `localStorage` when the page may use it.
   */
  readonly storage?: TrailStorage | null;
  /** Milliseconds clock; defaults to `performance.now`. */
  readonly now?: () => number;
  /** Storage key: one per app, so two apps on one origin do not mix trails. */
  readonly key?: string;
  /** Steps kept, newest last. */
  readonly keep?: number;
}

/**
 * The storage key; also a marker the production build check looks for
 * (scripts/check-no-devtools.mjs).
 */
export const BREADCRUMBS_KEY = 'ventana.devtools.breadcrumbs';
const DEFAULT_KEEP = 30;

export class Breadcrumbs {
  /** The trail the previous session left, read once when this one starts. */
  readonly previous: readonly string[];
  private trail: string[] = [];
  private readonly storage: TrailStorage | null;
  private readonly now: () => number;
  private readonly key: string;
  private readonly keep: number;
  private readonly started: number;

  /** Reads the previous session's trail, then starts this one's, empty. */
  constructor(options: BreadcrumbOptions = {}) {
    this.storage =
      options.storage === undefined ? defaultStorage() : options.storage;
    this.now = options.now ?? (() => performance.now());
    this.key = options.key ?? BREADCRUMBS_KEY;
    this.keep = options.keep ?? DEFAULT_KEEP;
    this.started = this.now();
    this.previous = readTrail(this.storage, this.key);
    writeTrail(this.storage, this.key, this.trail);
  }

  /** This session's trail so far, newest last. */
  get current(): readonly string[] {
    return this.trail;
  }

  /** Records a step, with the seconds since this session started. */
  mark(step: string): void {
    const seconds = ((this.now() - this.started) / 1000).toFixed(1);
    this.trail.push(`${seconds}s ${step}`);
    if (this.trail.length > this.keep) {
      this.trail = this.trail.slice(-this.keep);
    }
    writeTrail(this.storage, this.key, this.trail);
  }
}
