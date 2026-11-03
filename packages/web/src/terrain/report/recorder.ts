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
 * The on-foot view's crash recorder (VENT-49): a bounded trail of what the
 * view did since it mounted (steps, the last frames, the renderer's memory,
 * the device), kept in memory and in the session's storage, and the plain
 * text report a person copies from the lost state. Nothing leaves the page.
 */
import type { Mount } from './environment';
import { createCore, load, type Core, type RecorderDeps }
  from './recorder-core';
import { sinkOf } from './recorder-sink';
import { tapped, type StepTap } from './recorder-taps';
import { reportText } from './report-text';
import type { ReportSink } from './sink';

export type { RecorderDeps } from './recorder-core';
export type { StepTap } from './recorder-taps';

export interface Recorder extends ReportSink {
  /** Starts a run: the one before it becomes the previous run. */
  readonly begin: (mount: Mount) => void;
  /** The report of the current and the previous run. */
  readonly text: () => string;
  /**
   * Hears every step the run keeps: the current run's so far at once, then
   * each new one (a step folded into a repeat comes again, its count
   * raised). Returns what stops it. The dev tools' breadcrumbs listen here.
   */
  readonly tap: (listener: StepTap) => () => void;
}

/** The report's text; it reads what a page before this one left. */
function textOf(core: Core): string {
  load(core);
  return reportText({ current: core.current, previous: core.previous },
    core.deps.date().toISOString());
}

/** A recorder over `deps`. */
export function createRecorder(deps: RecorderDeps): Recorder {
  const core = createCore(deps);
  const sink = sinkOf(core);
  return { ...sink, ...tapped(core, sink), text: () => textOf(core) };
}
