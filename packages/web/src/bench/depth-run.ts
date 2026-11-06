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
 * One run of the depth suite (VENT-104), each step measured as run.ts
 * measures them. A lost context is a result here, not a stop: when the
 * host says the view lost it (`data-status="lost"`, while the view settles
 * or turns), the step ends there, the run keeps when (seconds since the
 * step began) and ends, and the next run's page load goes on. The loss is
 * counted once, in that step's `lost` (registry.ts), and the reload leaves
 * on purpose (leave.ts), so the next run starts at the device's tier and
 * counts no death. Any other failure stops the benchmark as in the A/B
 * suite. A loss while the view opens comes before the readings, so the
 * header takes the tier the view had when its context went (loss-tier.ts,
 * VENT-107), not the `low` the view drops to.
 */
import { readDepth } from './depth-reading';
import { depthScript } from './depth-script';
import { act } from './driver';
import { readHeader } from './environment';
import { startMeter } from './meter';
import type { RunDeps, RunOutcome } from './run';
import type { Step } from './script';
import { tierAtLoss, type LossTier } from './loss-tier';
import { hostMarks, ON_FOOT_HOST } from './settle';
import type { DepthReading, LostAt, StepMetrics } from './types';

export interface DepthOutcome extends RunOutcome {
  readonly depth: DepthReading;
  readonly lostAt?: LostAt;
}

interface Played {
  readonly metrics: StepMetrics;
  readonly lostAt: LostAt | null;
}

/** Plays and measures `step`; a lost context ends it with when. */
async function played(step: Step, deps: RunDeps): Promise<Played> {
  const end = startMeter(step.id, deps.registry);
  const t0 = performance.now();
  let timedOut = false;
  try {
    for (const action of step.actions) {
      timedOut = (await act(action, deps)) || timedOut;
    }
  } catch (error) {
    const metrics = end(timedOut);
    if (hostMarks(deps.doc)?.status !== 'lost') throw error;
    const seconds = (performance.now() - t0) / 1000;
    return { metrics, lostAt: { step: step.id, seconds } };
  }
  return { metrics: end(timedOut), lostAt: null };
}

/** Plays the depth script once, as the page's address asks. */
export async function runDepthScript(
  fast: boolean,
  deps: RunDeps,
): Promise<DepthOutcome> {
  const loss = tierAtLoss(deps.doc, () => deps.doc
    .querySelector<HTMLElement>(ON_FOOT_HOST)?.dataset['tier'] ?? null);
  try {
    return await playScript(fast, deps, loss);
  } finally {
    loss.stop();
  }
}

/** The depth script's steps, then what the view drew with. */
async function playScript(
  fast: boolean,
  deps: RunDeps,
  loss: LossTier,
): Promise<DepthOutcome> {
  const script = depthScript(fast);
  const steps: StepMetrics[] = [];
  let read: Pick<DepthOutcome, 'depth' | 'header'> | null = null;
  let lostAt: LostAt | null = null;
  for (const [index, step] of script.entries()) {
    deps.onStep(index);
    const done = await played(step, deps);
    steps.push(done.metrics);
    // Read once the view has opened, before a turn can take it down.
    read ??= await readings(deps, loss);
    lostAt = done.lostAt;
    if (lostAt) break;
  }
  deps.onStep(script.length);
  return { steps, ...(read ?? await readings(deps, loss)),
    ...(lostAt ? { lostAt } : {}) };
}

/** What the view draws with, and the report's header, read now. */
async function readings(
  deps: RunDeps,
  loss: LossTier,
): Promise<Pick<DepthOutcome, 'depth' | 'header'>> {
  return { depth: readDepth(deps.registry, deps.doc),
    header: await readHeader(deps.registry, deps.doc, loss.tier()) };
}
