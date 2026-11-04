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

/** The waiting jobs of the slicer (slicer.ts), by key. */
export interface Waiting {
  readonly priority: number;
  readonly job: () => void;
  /** Changes nothing drawn until the queue is run out. */
  readonly quiet: boolean;
}

/** The lowest priority waiting, as `[key, job]`. */
export function next(
  queue: Map<string, Waiting>,
): [string, Waiting] | undefined {
  let best: [string, Waiting] | undefined;
  for (const entry of queue) {
    if (!best || entry[1].priority < best[1].priority) best = entry;
  }
  return best;
}


/** What the slicer knows about when it last asked for a frame. */
export interface Pace {
  /** When the last frame was asked for, or when its end was seen. */
  askedAt: number;
  /** When the last turn ended. */
  endedAt: number;
  /** A frame was asked for and its end not seen yet. */
  framePending: boolean;
}

/**
 * Counts a turn that starts late as the end of the frame asked for before
 * it: the page runs the frame between two turns, so on a slow renderer the
 * gap between frames starts when that frame is over.
 */
export function noteStall(pace: Pace, start: number, stallMs: number): void {
  if (pace.framePending && start - pace.endedAt >= stallMs) {
    pace.askedAt = start;
    pace.framePending = false;
  }
}
