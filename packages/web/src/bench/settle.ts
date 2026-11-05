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
 * When the on-foot view has settled (VENT-81): its host says the scene
 * stands (`data-ready`, ready-mark.ts), is not parked on a point change
 * (`data-parked`, use-parked.ts), has drawn since the wait began
 * (`data-frames`) and has no more work coming (`data-working`, written by
 * every frame, scene-frame.ts), with no far tile still coming (the far
 * relief's chip, loader/FarChip.tsx) and no frame drawn for {@link QUIET_MS}:
 * a tile that lands rebuilds its rings, which the next frame says. The
 * wait polls those marks.
 */

/** The on-foot view's host (components/terrain/OnFootStageArea.tsx). */
export const ON_FOOT_HOST = '.on-foot__host';
const POLL_MS = 100;
/** How long the marks must hold, with no new frame, ms. */
export const QUIET_MS = 1000;
const FAR_PENDING = '.on-foot__far[data-done="false"]';
/** How long a point change may take to park the scene. */
const PARK_MS = 5000;

/** What the host's marks say, as plain values. */
export interface HostMarks {
  readonly ready: string | undefined;
  readonly working: string | undefined;
  readonly frames: string | undefined;
  readonly parked: boolean;
  /** The far relief's tiles are still landing. */
  readonly farPending: boolean;
}

export type Sleep = (ms: number) => Promise<void>;

/** Whether `marks` say the view settled after `since` frames. */
export const isSettled = (marks: HostMarks, since: number): boolean =>
  marks.ready === 'true' && marks.working === 'false' && !marks.parked
  && !marks.farPending && Number(marks.frames ?? 0) > since;

/** The host's marks now; null while no view is open. */
export function hostMarks(doc: Document): HostMarks | null {
  const host = doc.querySelector<HTMLElement>(ON_FOOT_HOST);
  if (!host) return null;
  const { ready, working, frames } = host.dataset;
  return { ready, working, frames, parked: host.hasAttribute('data-parked'),
    farPending: doc.querySelector(FAR_PENDING) !== null };
}

/** Polls `test` until true or `timeoutMs`; false on the timeout. */
async function until(
  test: () => boolean,
  timeoutMs: number,
  sleep: Sleep,
): Promise<boolean> {
  const end = performance.now() + timeoutMs;
  while (!test()) {
    if (performance.now() >= end) return false;
    await sleep(POLL_MS);
  }
  return true;
}

/** A test true once the view has been settled, drawing nothing, a while. */
function quietly(doc: Document, since: number): () => boolean {
  let held: { frames: string | undefined; at: number } | null = null;
  return () => {
    const marks = hostMarks(doc);
    if (!marks || !isSettled(marks, since)) held = null;
    else if (held?.frames !== marks.frames) {
      held = { frames: marks.frames, at: performance.now() };
    }
    return held !== null && performance.now() - held.at >= QUIET_MS;
  };
}

/**
 * Waits for the view to settle, after a point change first for it to park;
 * true when it timed out.
 */
export async function waitSettled(
  doc: Document,
  { timeoutMs, park }: { timeoutMs: number; park: boolean },
  sleep: Sleep,
): Promise<boolean> {
  const since = Number(hostMarks(doc)?.frames ?? 0);
  if (park) await until(() => hostMarks(doc)?.parked === true, PARK_MS, sleep);
  return !(await until(quietly(doc, since), timeoutMs, sleep));
}
