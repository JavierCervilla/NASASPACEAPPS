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
 * The recorder's side the scene writes to (VENT-49): each call is dropped
 * before a run begins, and only a step is stored at once; frames, memory
 * and the device's facts wait in memory for the next step, so a frame costs
 * no storage write.
 */
import { change, type Core } from './recorder-core';
import type { ReportSink } from './sink';
import { addFrame, addStep } from './trail';

/** The sink over `core`. */
export function sinkOf(core: Core): ReportSink {
  const seconds = (): number => (core.deps.now() - core.startedMs) / 1000;
  return {
    step: (text, repeat) => change(core, (run) =>
      addStep(run, { t: seconds(), text, repeat: repeat ?? null }), true),
    frame: (frame) => change(core, (run) =>
      addFrame(run, { t: seconds(), ...frame }), false),
    memory: (memory) => change(core, (run) => ({ ...run, memory }), false),
    environment: (patch) => change(core, (run) =>
      ({ ...run, env: { ...run.env, ...patch } }), false),
  };
}
