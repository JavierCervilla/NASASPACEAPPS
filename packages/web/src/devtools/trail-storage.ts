/**
 * Where the breadcrumb trail is kept between sessions. Reading and writing
 * never throw: the trail is a debugging aid, never required.
 *
 * Split out of breadcrumbs.ts, ported from GAMESTUDIO's Web starter
 * (`studio/engines/web/scaffold/packages/client/src/engine/breadcrumbs.ts`).
 */

/** The part of `Storage` the trail uses; a test passes an in-memory one. */
export interface TrailStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** `localStorage` when the page may use it, otherwise `null`. */
export function defaultStorage(): TrailStorage | null {
  try {
    // Reading `localStorage` itself throws where site data is blocked.
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** The trail stored under `key`; empty when missing or unreadable. */
export function readTrail(
  storage: TrailStorage | null,
  key: string,
): string[] {
  try {
    const stored = JSON.parse(storage?.getItem(key) ?? '[]') as unknown;
    return Array.isArray(stored) ? stored.map(String) : [];
  } catch {
    return [];
  }
}

/** Stores the trail under `key`; a blocked or full storage is ignored. */
export function writeTrail(
  storage: TrailStorage | null,
  key: string,
  trail: readonly string[],
): void {
  try {
    storage?.setItem(key, JSON.stringify(trail));
  } catch {
    // Storage can be blocked or full; the trail is not worth an error.
  }
}
