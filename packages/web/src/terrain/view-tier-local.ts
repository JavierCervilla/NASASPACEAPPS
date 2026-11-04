/*
 *   _   _       _                         _ _
 *  | | | |_ __ (_)_   _____ _ __ ___  ___| | | ___
 *  | | | | '_ \| \ \ / / _ \ '__/ __|/ _ \ | |/ _ \
 *  | |_| | | | | |\ V /  __/ |  \__ \  __/ | |  __/
 *   \___/|_| |_|_| \_/ \___|_|  |___/\___|_|_|\___|
 *
 *             =++==--::.
 *         %%%%##**++=--:..  .
 *      ##**#%@%%#***+=--::.   .
 *    #**=+*#*#**#++++=-:::.. .  .
 *   #++-====*@%+*++==--::...   .  .    Ventana Lunar
 *  #+=-=--++==+===-+==--:..   .  .  .  Sun, Earth and landing
 * #----====-------=-=---:..  .  .  .   windows at the lunar
 * #+---+=====--=---==-::..     .  .  . south pole
 * #*----==---==-=-=-:-....    .  .  .
 * *#----===+*===--:-::...    .  .  .   Built for the NASA Space
 *  *----=*-+*%*+=-:::....   .  .  .    Apps Challenge 2026,
 *   *------=+*=--:::-:::.. .  .  .     Madrid. Not endorsed
 *    %*===-=-==--==-:::.  .  .  .      by NASA.
 *      *+:--+:--::::::.  .  .  .
 *         -=:::...:..   .  .           (c) 2026 Universelle
 *             :::.. .  .               SPDX-License-Identifier: MIT
 */

/**
 * The on-foot view's open mark in `localStorage` (VENT-69): a browser that
 * blocks WebGL after a GPU reset needs a restart, which empties the
 * session's storage and with it view-tier-memory's mark, so the page that
 * died is forgotten. This one outlives the restart, and is kept per tab:
 * `{ [tabId]: time of its last beat }`, so one tab's leaving never clears
 * another's. A page that is open beats every {@link BEAT_MS}; a mark of
 * another tab counts as a death when its beat is older than
 * {@link LIVE_GRACE_MS} (the page is gone, or frozen) and under
 * {@link OPEN_TTL_MS}, and is taken away once counted, so one death lowers
 * one next start. A hidden tab's mark (its time stored negative) never counts:
 * the browser slows a hidden page's timers, so its beat is no sign of life.
 * Marks older than the TTL are dropped on every write. A normal close or
 * navigation clears the tab's own mark (`pagehide`, view-tier-open.ts); a
 * GPU reset fires none.
 */
import { OPEN_KEY, type TierStorage } from './view-tier-memory';

/** How long a mark left in `localStorage` says the page died: 24 hours. */
export const OPEN_TTL_MS = 24 * 60 * 60 * 1000;
/** How often an open view says it is alive. */
export const BEAT_MS = 5000;
/** A beat older than this is of a page that is gone: four beats. */
export const LIVE_GRACE_MS = 4 * BEAT_MS;

type Marks = Record<string, number>;

/** The marks `local` holds; a value that is no map of times is none. */
function readMarks(local: TierStorage | null): Marks {
  try {
    const parsed: unknown = JSON.parse(local?.getItem(OPEN_KEY) || '{}');
    if (typeof parsed !== 'object' || parsed === null) return {};
    if (Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed)
      .filter(([, since]) => Number.isFinite(since) && since !== 0));
  } catch {
    return {};
  }
}

const TAB_KEY = 'ventana.tabId';
/** A tab id for a session whose storage is refused. */
const fallbackTab = `t${Math.random().toString(36).slice(2)}`;

/** This tab's id: made once and kept in its session's storage. */
export function tabIdOf(session: TierStorage | null): string {
  try {
    const kept = session?.getItem(TAB_KEY);
    if (kept) return kept;
    const made = `t${Math.random().toString(36).slice(2)}`;
    session?.setItem(TAB_KEY, made);
    return session ? made : fallbackTab;
  } catch {
    return fallbackTab;
  }
}

/** The marks not older than the TTL at `nowMs`. */
const fresh = (marks: Marks, nowMs: number): Marks =>
  Object.fromEntries(Object.entries(marks)
    .filter(([, beat]) => nowMs - Math.abs(beat) < OPEN_TTL_MS));

/**
 * Sets or clears `tabId`'s mark: its last beat is `nowMs`, or, for a page
 * that is `hidden`, minus it.
 */
export function keepOpenSince(
  local: TierStorage | null,
  mark: {
    readonly tabId: string;
    readonly open: boolean;
    readonly hidden?: boolean;
  },
  nowMs: number,
): void {
  try {
    const next = fresh(readMarks(local), nowMs);
    if (mark.open) next[mark.tabId] = mark.hidden ? -nowMs : nowMs;
    else delete next[mark.tabId];
    local?.setItem(OPEN_KEY, JSON.stringify(next));
  } catch {
    // Refused storage: only the session's mark tells the next page.
  }
}

/**
 * Whether `local` holds a mark that no longer beats: older than
 * {@link LIVE_GRACE_MS} and younger than {@link OPEN_TTL_MS} at `nowMs`, of
 * a page that was not hidden. A tab's own stale mark is a death as well (a
 * hung page the person reloads). The dead marks are taken away, so the
 * death is counted once.
 */
export function takeDeath(local: TierStorage | null, nowMs: number): boolean {
  const marks = readMarks(local);
  const dead = Object.entries(marks).filter(([, beat]) => {
    const age = nowMs - beat;
    return beat > 0 && age > LIVE_GRACE_MS && age < OPEN_TTL_MS;
  });
  if (dead.length === 0) return false;
  for (const [tab] of dead) delete marks[tab];
  try {
    local?.setItem(OPEN_KEY, JSON.stringify(fresh(marks, nowMs)));
  } catch {
    // Refused storage: the mark stays, and counts again.
  }
  return true;
}
