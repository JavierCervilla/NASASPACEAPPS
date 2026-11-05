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
 * One run of the script (VENT-81): each step measured from its first
 * action to its last (meter.ts); in variant B the globe's context is
 * released as step c starts (release.ts). The header is read once the
 * on-foot view has opened, when its tier is known.
 */
import { act, type DriverDeps } from './driver';
import { readHeader } from './environment';
import { startMeter } from './meter';
import type { Registry } from './registry';
import { releaseGlobe } from './release';
import { benchScript, type Step } from './script';
import type { BenchHeader, StepMetrics, Variant } from './types';

export interface RunDeps extends DriverDeps {
  readonly registry: Registry;
  /** Where the app keeps its WebGL marks (lib/gl-marks.ts). */
  readonly local: Storage | null;
  /** Step `index` (0-based) begins; the script's length when all ended. */
  readonly onStep: (index: number) => void;
}

export interface RunOutcome {
  readonly steps: readonly StepMetrics[];
  readonly header: BenchHeader;
}

/** Plays and measures `step`. */
async function measured(
  step: Step,
  variant: Variant,
  deps: RunDeps,
): Promise<StepMetrics> {
  const end = startMeter(step.id, deps.registry);
  if (variant === 'B' && step.id === 'openView' && deps.local) {
    releaseGlobe(deps.registry, deps.local);
  }
  let timedOut = false;
  for (const action of step.actions) {
    timedOut = (await act(action, deps)) || timedOut;
  }
  return end(timedOut);
}

/** Plays the script once as `variant`. */
export async function runScript(
  variant: Variant,
  fast: boolean,
  deps: RunDeps,
): Promise<RunOutcome> {
  const script = benchScript(fast);
  const steps: StepMetrics[] = [];
  let header: BenchHeader | null = null;
  for (const [index, step] of script.entries()) {
    deps.onStep(index);
    steps.push(await measured(step, variant, deps));
    if (step.id === 'openView') header = await readHeader(deps.registry,
      deps.doc);
  }
  deps.onStep(script.length);
  return { steps, header: header ?? await readHeader(deps.registry, deps.doc) };
}
