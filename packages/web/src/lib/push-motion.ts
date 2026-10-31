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
 * The push between a sheet's list and the page it opens (the iOS
 * navigation push): one critically damped spring from 0, the list, to 1,
 * the page (apple-design §4: damping 1, response 0.4 s). It starts from
 * wherever it is, so a Back pressed mid-push turns it around without a
 * jump. The frame clock is injected.
 */
import { stepDampedSpring } from '../sheet/damped-spring';

const PUSH = { damping: 1, response: 0.4 } as const;
/** The spring runs in percent: its rest thresholds are in whole units. */
const SCALE = 100;
const MAX_STEP_S = 1 / 30;

export interface PushDeps {
  readonly frame: (callback: (timeMs: number) => void) => number;
  readonly cancel: (id: number) => void;
  /** Each frame, how far the page is pushed in, 0 to 1. */
  readonly onValue: (value: number) => void;
}

export interface PushMotion {
  /** Springs to the page (1) or back to the list (0). */
  readonly to: (target: 0 | 1) => void;
  readonly dispose: () => void;
}

/** A push spring at rest on the list. */
export function createPush(deps: PushDeps): PushMotion {
  const axis = { value: 0, target: 0, velocity: 0 };
  let id: number | null = null;
  let last: number | null = null;
  const tick = (timeMs: number): void => {
    const dt = last === null ? 0 : Math.min(MAX_STEP_S, (timeMs - last) / 1000);
    last = timeMs;
    const moving = stepDampedSpring(axis, dt, PUSH);
    deps.onValue(axis.value / SCALE);
    id = moving ? deps.frame(tick) : null;
  };
  const to = (target: 0 | 1): void => {
    axis.target = target * SCALE;
    if (id === null) {
      last = null;
      id = deps.frame(tick);
    }
  };
  const dispose = (): void => {
    if (id !== null) deps.cancel(id);
  };
  return { to, dispose };
}
