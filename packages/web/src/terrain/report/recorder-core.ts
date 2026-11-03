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
 * What the crash report's recorder keeps (VENT-49): the current run and the
 * previous one, loaded from the session's storage when first touched, and
 * the few operations on them. The clock, the storage and the device are
 * injected, so none of it needs a browser.
 */
import type { Environment, Mount } from './environment';
import { readRuns, writeRuns, type ReportStorage } from './run-store';
import { addStep, startRun, type Run } from './trail';

export interface RecorderDeps {
  readonly storage: () => ReportStorage | null;
  /** Milliseconds on a monotonic clock. */
  readonly now: () => number;
  /** The wall clock. */
  readonly date: () => Date;
  /** The device and the mount, the GPU and the battery still unknown. */
  readonly environment: (mount: Mount) => Environment;
  /** Asks the battery once; `hear` gets its words if it answers. */
  readonly battery: (hear: (text: string) => void) => void;
}

export interface Core {
  readonly deps: RecorderDeps;
  current: Run | null;
  previous: Run | null;
  /** Whether the storage was read: it is, on the first touch. */
  loaded: boolean;
  /** When the current run began, on the monotonic clock. */
  startedMs: number;
  /** Which run is current: a late answer for an older one is dropped. */
  runs: number;
}

/** A recorder with no run yet. */
export const createCore = (deps: RecorderDeps): Core => ({ deps,
  current: null, previous: null, loaded: false, startedMs: 0, runs: 0 });

/** Reads what a page before this one left, as the previous run. */
export function load(core: Core): void {
  if (core.loaded) return;
  core.loaded = true;
  core.previous = readRuns(core.deps.storage()).current;
}

/** Applies `edit` to the current run, storing it when `keep` is set. */
export function change(
  core: Core,
  edit: (run: Run) => Run,
  keep: boolean,
): void {
  if (!core.current) return;
  core.current = edit(core.current);
  if (keep) {
    writeRuns(core.deps.storage(),
      { current: core.current, previous: core.previous });
  }
}

/** Starts a run for `mount`; the run before it becomes the previous one. */
export function beginRun(core: Core, mount: Mount): void {
  load(core);
  core.previous = core.current ?? core.previous;
  core.runs += 1;
  const id = core.runs;
  core.startedMs = core.deps.now();
  core.current = startRun(core.deps.date().toISOString(),
    core.deps.environment(mount));
  const left = mount.leftOut === '' ? '' : `, left out: ${mount.leftOut}`;
  change(core, (run) => addStep(run, { t: 0, repeat: null,
    text: `mount at tier ${mount.tier}${left}` }), true);
  core.deps.battery((battery) => {
    if (core.runs === id) {
      change(core, (run) => ({ ...run, env: { ...run.env, battery } }), false);
    }
  });
}
