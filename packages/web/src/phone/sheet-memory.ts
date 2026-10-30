/**
 * The sheet's last chosen position, kept for the browser session so a
 * reload opens it where the visitor left it (half the first time). The
 * picker (full) is not a place to come back to: it is kept as half.
 * Storage can be missing or refuse access (private modes, blocked
 * cookies): then nothing is kept and nothing breaks.
 */
import type { DetentName } from '../sheet/sheet-physics';

/** The part of `Storage` the memory uses. */
export type DetentStorage = Pick<Storage, 'getItem' | 'setItem'>;

const KEY = 'ventana.sheet-detent';
const START: DetentName = 'half';
const KEPT: readonly DetentName[] = ['closed', 'peek', 'half'];

/** The session's storage, or null when the browser refuses it. */
export function sessionStore(): DetentStorage | null {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

/** Where the sheet starts: the kept position, or half. */
export function readSheetDetent(storage: DetentStorage | null): DetentName {
  try {
    const kept = storage?.getItem(KEY);
    return KEPT.find((detent) => detent === kept) ?? START;
  } catch {
    return START;
  }
}

/** Keeps `detent` for the session (full is kept as half). */
export function saveSheetDetent(
  storage: DetentStorage | null,
  detent: DetentName,
): void {
  try {
    storage?.setItem(KEY, detent === 'full' ? 'half' : detent);
  } catch {
    // Full or refused storage: the sheet just starts at half next time.
  }
}
