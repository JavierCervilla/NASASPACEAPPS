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
 * Frame pacing while the person turns the view on a phone (VENT-73): a drag
 * or a coast draws at most about 30 frames a second, so the GPU rests
 * between frames. It wraps the loop's scheduler, so a frame held back keeps
 * its place and the loop's `dt` still covers the whole wait; the held frame
 * draws as soon as the turn ends, so the view ends exact.
 */

/** Least gap between two turning frames: 30 fps, less vsync jitter. */
export const TURN_GAP_MS = 30;

export interface PaceDeps {
  /** Whether the person is turning it now (and the pace applies). */
  readonly turning: () => boolean;
  readonly raf: (fn: (now: number) => void) => number;
  readonly cancel: (id: number) => void;
  readonly minGapMs?: number;
}

export interface Pace {
  readonly schedule: (fn: (now: number) => void) => number;
  readonly cancel: (id: number) => void;
}

interface Pacing {
  readonly deps: PaceDeps;
  readonly handles: Map<number, number>;
  lastDraw: number;
}

/** Asks the display for frame `id`, holding it back while turning too soon. */
function ask(p: Pacing, id: number, fn: (now: number) => void): void {
  p.handles.set(id, p.deps.raf((now) => {
    const gap = p.deps.minGapMs ?? TURN_GAP_MS;
    if (p.deps.turning() && now - p.lastDraw < gap) {
      ask(p, id, fn);
      return;
    }
    p.handles.delete(id);
    p.lastDraw = now;
    fn(now);
  }));
}

/** A scheduler for `createLoop` that spaces turning frames. */
export function pacedSchedule(deps: PaceDeps): Pace {
  const p: Pacing = { deps, handles: new Map(), lastDraw: -Infinity };
  let ids = 0;
  return {
    schedule: (fn) => {
      ids += 1;
      ask(p, ids, fn);
      return ids;
    },
    cancel: (id) => {
      deps.cancel(p.handles.get(id) ?? -1);
      p.handles.delete(id);
    },
  };
}
