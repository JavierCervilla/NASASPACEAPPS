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
 * Where the crash report's runs are kept between page loads (VENT-49): the
 * session's storage holds the current run and the previous one, so a
 * reload after the GPU restarted still has the last run. Storage can be
 * missing or refuse access: every access is guarded, and a run that is not
 * one is dropped alone (run-parse.ts).
 */
import { isBag } from './run-guards';
import { runOf } from './run-parse';
import type { Run } from './trail';

/** The part of `Storage` the report uses. */
export type ReportStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** The two runs kept. */
export interface Runs {
  readonly current: Run | null;
  readonly previous: Run | null;
}

export const REPORT_KEY = 'ventana.onFootReport';
const VERSION = 1;
const NONE: Runs = { current: null, previous: null };

/** The session's storage, or null when the browser refuses it. */
export function reportStorage(): ReportStorage | null {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

/** The runs kept in `storage`; none when it is empty, refused or foreign. */
export function readRuns(storage: ReportStorage | null): Runs {
  try {
    const kept: unknown = JSON.parse(storage?.getItem(REPORT_KEY) ?? 'null');
    if (!isBag(kept) || kept['v'] !== VERSION) return NONE;
    return { current: runOf(kept['current']), previous: runOf(kept['previous']) };
  } catch {
    return NONE;
  }
}

/** Keeps `runs`; a full or refused storage costs only the memory of them. */
export function writeRuns(storage: ReportStorage | null, runs: Runs): void {
  try {
    storage?.setItem(REPORT_KEY, JSON.stringify({ v: VERSION, ...runs }));
  } catch {
    // The run stays in memory; only a reload loses it.
  }
}
