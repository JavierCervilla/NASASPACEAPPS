/**
 * A trail of what the page was doing, kept in localStorage so it survives a crash of the GPU process and the reload
 * after it. On the next load the performance readout shows the previous session's trail, whose last line points at
 * the step that broke the driver. Marking costs one small write and never throws.
 *
 * Ported from GAMESTUDIO's Web starter (`studio/engines/web/scaffold/packages/client/src/engine/breadcrumbs.ts`),
 * where it was written after a game lost its WebGL context on every load on one phone and was bisected blind.
 */

/** The part of `Storage` the trail uses, so a test can pass an in-memory one. */
export interface TrailStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface BreadcrumbOptions {
  /** Where the trail is kept; `null` keeps it in memory only. Defaults to `localStorage` when the page may use it. */
  readonly storage?: TrailStorage | null;
  /** Milliseconds clock; defaults to `performance.now`. */
  readonly now?: () => number;
  /** Storage key: one per app, so two apps on one origin do not mix trails. */
  readonly key?: string;
  /** Steps kept, newest last. */
  readonly keep?: number;
}

/** The storage key; also the marker the production build check looks for (scripts/check-no-devtools.mjs). */
export const BREADCRUMBS_KEY = 'ventana.devtools.breadcrumbs';
const DEFAULT_KEEP = 30;

function defaultStorage(): TrailStorage | null {
  try {
    // Reading `localStorage` itself throws where site data is blocked.
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export class Breadcrumbs {
  /** The trail the previous session left, read once when this one starts. */
  readonly previous: readonly string[];
  private trail: string[] = [];
  private readonly storage: TrailStorage | null;
  private readonly now: () => number;
  private readonly key: string;
  private readonly keep: number;
  private readonly started: number;

  /** Reads the previous session's trail, then starts this session's own, empty one. */
  constructor(options: BreadcrumbOptions = {}) {
    this.storage = options.storage === undefined ? defaultStorage() : options.storage;
    this.now = options.now ?? (() => performance.now());
    this.key = options.key ?? BREADCRUMBS_KEY;
    this.keep = options.keep ?? DEFAULT_KEEP;
    this.started = this.now();
    this.previous = this.read();
    this.save();
  }

  /** This session's trail so far, newest last. */
  get current(): readonly string[] {
    return this.trail;
  }

  /** Records a step, with the seconds since this session started. */
  mark(step: string): void {
    this.trail.push(`${((this.now() - this.started) / 1000).toFixed(1)}s ${step}`);
    if (this.trail.length > this.keep) this.trail = this.trail.slice(-this.keep);
    this.save();
  }

  private read(): string[] {
    try {
      const stored = JSON.parse(this.storage?.getItem(this.key) ?? '[]') as unknown;
      return Array.isArray(stored) ? stored.map(String) : [];
    } catch {
      return [];
    }
  }

  private save(): void {
    try {
      this.storage?.setItem(this.key, JSON.stringify(this.trail));
    } catch {
      // Storage can be blocked or full; the trail is a debugging aid, never required.
    }
  }
}

export type ContextEvent = 'lost' | 'restored';

/**
 * Marks when the browser takes the WebGL context away (a GPU crash, or the page over its GPU memory budget) and when
 * it gives it back. The renderer is expected to call `preventDefault` on the loss (Three.js does), which
 * asks for the restore.
 */
export function watchContext(canvas: EventTarget, crumbs: Breadcrumbs, onEvent?: (event: ContextEvent) => void): void {
  canvas.addEventListener('webglcontextlost', () => {
    crumbs.mark('context lost');
    onEvent?.('lost');
  });
  canvas.addEventListener('webglcontextrestored', () => {
    crumbs.mark('context restored');
    onEvent?.('restored');
  });
}
