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
import { beginRun, createCore, load, type Core, type RecorderDeps }
  from './recorder-core';
import { sinkOf } from './recorder-sink';
import { reportText } from './report-text';
import type { ReportSink } from './sink';

export type { RecorderDeps } from './recorder-core';

export interface Recorder extends ReportSink {
  /** Starts a run: the one before it becomes the previous run. */
  readonly begin: (mount: Mount) => void;
  /** The report of the current and the previous run. */
  readonly text: () => string;
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
  return {
    ...sinkOf(core),
    begin: (mount) => beginRun(core, mount),
    text: () => textOf(core),
  };
}
