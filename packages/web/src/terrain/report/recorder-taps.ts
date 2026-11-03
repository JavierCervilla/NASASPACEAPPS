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
 * Who hears the crash report's steps besides the report (VENT-49): the dev
 * tools' breadcrumbs, when `?debug` has them on. Each step the current run
 * keeps, a mount's first one included, is told to every tap; a tap added
 * late first hears the steps the run already has.
 */
import type { Mount } from './environment';
import { beginRun, type Core } from './recorder-core';
import type { ReportSink } from './sink';
import type { Step } from './trail';

/** Hears a step the report kept. */
export type StepTap = (step: Step) => void;

export interface Tapped {
  readonly step: ReportSink['step'];
  readonly begin: (mount: Mount) => void;
  readonly tap: (listener: StepTap) => () => void;
}

/** `sink`'s step and the run's begin, each told to the taps. */
export function tapped(core: Core, sink: ReportSink): Tapped {
  const taps = new Set<StepTap>();
  const tell = (): void => {
    const step = core.current?.steps.at(-1);
    if (step) for (const listener of taps) listener(step);
  };
  return {
    step: (text, repeat) => {
      sink.step(text, repeat);
      tell();
    },
    begin: (mount) => {
      beginRun(core, mount);
      tell();
    },
    tap: (listener) => {
      for (const step of core.current?.steps ?? []) listener(step);
      taps.add(listener);
      return () => void taps.delete(listener);
    },
  };
}
