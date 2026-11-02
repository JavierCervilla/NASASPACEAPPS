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
 * Work off the critical path (VENT-46): the ring's tiles are decoded,
 * placed and meshed in jobs of a few milliseconds, run one after another
 * within a budget per turn of the page's event loop, so no turn takes more
 * than about 12 ms plus its last job (a tile's mesh, under 20 ms) and input
 * and frames stay smooth. A job is named: adding a name that is waiting
 * replaces it (a tile asked to rebuild twice rebuilds once), and the lowest
 * priority runs first (the finest level, nearest the viewer). Finished work
 * asks for a frame, since it changed what is drawn, but at most one per
 * {@link FRAME_GAP_MS} while more waits.
 */
import { next, type Waiting } from './slicer-queue';


export interface Slicer {
  /** Queues `job` under `key`; a waiting job of that key is replaced. */
  readonly add: (key: string, priority: number, job: () => void) => void;
  /** Forgets every waiting job. */
  readonly clear: () => void;
  /** Whether work waits or a turn is queued. */
  readonly busy: () => boolean;
}

export interface SlicerDeps {
  readonly invalidate: () => void;
  readonly now?: () => number;
  /** Runs `fn` soon, off this turn; returns what `cancel` takes. */
  readonly schedule?: (fn: () => void) => number;
  readonly cancel?: (id: number) => void;
  readonly budgetMs?: number;
  /** The least time between two frames asked for while work waits. */
  readonly frameGapMs?: number;
}

/** The turn's budget: a frame at 60 Hz is 16 ms. */
const BUDGET_MS = 12;
/**
 * A frame draws every ring tile built so far: on a slow renderer one costs
 * far more than the slice that asked for it, so work in flight asks for at
 * most one frame in this long, and the last slice always asks.
 */
const FRAME_GAP_MS = 1500;

interface Core {
  readonly queue: Map<string, Waiting>;
  readonly deps: Required<SlicerDeps>;
  timer: number | null;
  askedAt: number;
}

/** One turn: runs jobs, lowest priority first, until the budget is spent. */
function turn(core: Core): void {
  const { queue, deps } = core;
  core.timer = null;
  const start = deps.now();
  let ran = false;
  for (let found = next(queue); found; found = next(queue)) {
    queue.delete(found[0]);
    found[1].job();
    ran = true;
    if (deps.now() - start >= deps.budgetMs) break;
  }
  if (queue.size > 0) core.timer = deps.schedule(() => turn(core));
  const due = start - core.askedAt >= deps.frameGapMs;
  if (ran && (queue.size === 0 || due)) {
    core.askedAt = start;
    deps.invalidate();
  }
}

/** A slicer that runs its jobs a budget at a time. */
export function createSlicer(given: SlicerDeps): Slicer {
  const deps: Required<SlicerDeps> = {
    now: () => performance.now(),
    schedule: (fn) => window.setTimeout(fn, 0),
    cancel: (id) => window.clearTimeout(id),
    budgetMs: BUDGET_MS,
    frameGapMs: FRAME_GAP_MS,
    ...given,
  };
  const core: Core = { queue: new Map(), deps, timer: null,
    askedAt: Number.NEGATIVE_INFINITY };
  return {
    add: (key, priority, job) => {
      core.queue.set(key, { priority, job });
      core.timer ??= deps.schedule(() => turn(core));
    },
    busy: () => core.queue.size > 0 || core.timer !== null,
    clear: () => {
      core.queue.clear();
      if (core.timer !== null) deps.cancel(core.timer);
      core.timer = null;
    },
  };
}
