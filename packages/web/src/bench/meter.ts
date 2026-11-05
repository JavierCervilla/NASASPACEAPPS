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
 * One step's measures (VENT-81). An animation-frame loop runs while the
 * step does: a frame in which the app drew (a wrapped `render` of either
 * renderer, registry.ts) adds the time since the previous animation frame,
 * so a frame the app spent long on shows whole and idle frames, where
 * nothing is drawn, are not counted. Each frame also samples the
 * renderers (sample.ts); at the end the long tasks, resources and heap.
 */
import type { StepId } from './script';
import { heapBytes, resourcesSince, watchLongTasks } from './probes';
import type { Registry } from './registry';
import type { Draw } from './renderer-watch';
import { maxSample, NO_SAMPLE, sampleRenderers, type Sample } from './sample';
import { frameStats, median } from './stats';
import type { StepMetrics } from './types';

interface Tally {
  readonly intervals: number[];
  readonly draws: Draw[];
  lost: number;
  most: Sample;
  last: number | null;
}

/** Folds what the registry piled up since the last frame into `tally`. */
function tick(tally: Tally, registry: Registry, at: number): void {
  const { draws, lost } = registry.drain();
  if (draws.length > 0 && tally.last !== null) {
    tally.intervals.push(at - tally.last);
  }
  tally.draws.push(...draws);
  tally.lost += lost;
  tally.most = maxSample(tally.most, sampleRenderers(registry.handles()));
  tally.last = at;
}

/** The step's metrics from its tally. */
function metricsOf(tally: Tally, step: StepMeta): StepMetrics {
  const net = resourcesSince(step.t0);
  const tasks = step.longTasks();
  const per = (pick: (d: Draw) => number) =>
    median(tally.draws.map(pick)) ?? 0;
  return {
    id: step.id, ms: performance.now() - step.t0,
    frames: frameStats(tally.intervals), longTasks: tasks.count,
    longTaskMs: tasks.ms, ...tally.most, heapBytes: heapBytes(),
    triangles: per((d) => d.triangles), calls: per((d) => d.calls),
    netBytes: net.bytes, requests: net.count, lost: tally.lost,
    timedOut: step.timedOut(),
  };
}

interface StepMeta {
  readonly id: StepId;
  readonly t0: number;
  readonly longTasks: () => { count: number; ms: number };
  readonly timedOut: () => boolean;
}

/** Starts measuring step `id`; the returned function ends it. */
export function startMeter(
  id: StepId,
  registry: Registry,
): (timedOut: boolean) => StepMetrics {
  registry.drain();
  const tally: Tally = { intervals: [], draws: [], lost: 0,
    most: NO_SAMPLE, last: null };
  let frame = 0;
  const loop = (at: number): void => {
    tick(tally, registry, at);
    frame = requestAnimationFrame(loop);
  };
  frame = requestAnimationFrame(loop);
  const t0 = performance.now();
  const longTasks = watchLongTasks();
  return (timedOut) => {
    cancelAnimationFrame(frame);
    tick(tally, registry, performance.now());
    return metricsOf(tally, { id, t0, longTasks, timedOut: () => timedOut });
  };
}
