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
 * {@link FRAME_GAP_MS} while more waits, counted from the end of the last
 * frame that ran: a turn that starts late, because the frame ran in between,
 * is the proof that it ended (a batch that starts after rest has no frame
 * pending, so its first frame is asked at once), and a frame that costs more
 * than the gap (a software renderer, a heavy ground) would otherwise be asked
 * for after every turn.
 */
import { next, noteStall, type Pace, type Waiting } from './slicer-queue';


export interface Slicer {
  /** Queues `job` under `key`; a waiting job of that key is replaced. */
  readonly add: (
    key: string,
    priority: number,
    job: () => void,
    /** A quiet job (a bake, a hidden build) never asks for a frame alone. */
    quiet?: boolean,
  ) => void;
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
/** A turn that starts this long after the last one ended followed a frame. */
const STALL_MS = 50;

interface Core extends Pace {
  readonly queue: Map<string, Waiting>;
  readonly deps: Required<SlicerDeps>;
  timer: number | null;
}

/** One turn: runs jobs, lowest priority first, until the budget is spent. */
function turn(core: Core): void {
  const { queue, deps } = core;
  core.timer = null;
  const start = deps.now();
  noteStall(core, start, STALL_MS);
  let ran = false;
  let loud = false;
  for (let found = next(queue); found; found = next(queue)) {
    queue.delete(found[0]);
    found[1].job();
    ran = true;
    loud ||= !found[1].quiet;
    if (deps.now() - start >= deps.budgetMs) break;
  }
  core.continuing = queue.size > 0;
  if (core.continuing) core.timer = deps.schedule(() => turn(core));
  core.endedAt = deps.now();
  const due = start - core.askedAt >= deps.frameGapMs;
  if (ran && (queue.size === 0 || (due && loud))) {
    core.askedAt = start;
    core.framePending = true;
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
    askedAt: Number.NEGATIVE_INFINITY, endedAt: 0, framePending: false,
    continuing: false };
  return {
    add: (key, priority, job, quiet = false) => {
      core.queue.set(key, { priority, job, quiet });
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
