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
 * The pin let go off the Moon, or cancelled, springs back to where it
 * was lifted (the point it stood on, or was pressed): two critically damped
 * springs, x and y apart (apple-design §3), starting at the hand's
 * velocity (§5). Under reduced motion it does not travel: it fades where
 * it is and shows at home. Pure but for the injected frame clock.
 */
import { stepDampedSpring } from '../sheet/damped-spring';
import type { ClientPoint } from './surfaces';

/** Apple's «move» spring: critically damped, 0.4 s response. */
const HOME_SPRING = { response: 0.4, damping: 1 };
/** The reduced-motion fade, ms. */
export const FADE_MS = 160;
/** The longest frame step counted, s, so a stalled tab does not jump. */
const MAX_STEP_S = 1 / 20;

export interface WalkDeps {
  /** Calls `fn` on the next frame with its time, ms; returns a cancel. */
  readonly frame: (fn: (ms: number) => void) => () => void;
  readonly reducedMotion: boolean;
  /** The pin's centre on each frame. */
  readonly onStep: (at: ClientPoint) => void;
  /** It is home: the walk is over. */
  readonly onHome: () => void;
}

/** Waits out the reduced-motion fade, then calls `onHome`. */
function fadeOut(deps: WalkDeps): () => void {
  let start: number | null = null;
  let cancel = (): void => undefined;
  const tick = (ms: number): void => {
    start ??= ms;
    if (ms - start >= FADE_MS) deps.onHome();
    else cancel = deps.frame(tick);
  };
  cancel = deps.frame(tick);
  return () => cancel();
}

/**
 * Walks from `from` (moving at `velocity`, px/s) to `to`; returns how to
 * stop it.
 */
export function walkHome(
  from: ClientPoint,
  to: ClientPoint,
  velocity: ClientPoint,
  deps: WalkDeps,
): () => void {
  if (deps.reducedMotion) return fadeOut(deps);
  const x = { value: from.x, velocity: velocity.x, target: to.x };
  const y = { value: from.y, velocity: velocity.y, target: to.y };
  let last: number | null = null;
  let cancel = (): void => undefined;
  const tick = (ms: number): void => {
    const dt = last === null ? 1 / 60 : (ms - last) / 1000;
    const seconds = Math.min(dt, MAX_STEP_S);
    last = ms;
    const moving = [x, y].map((axis) =>
      stepDampedSpring(axis, seconds, HOME_SPRING),
    );
    deps.onStep({ x: x.value, y: y.value });
    if (moving.some(Boolean)) cancel = deps.frame(tick);
    else deps.onHome();
  };
  cancel = deps.frame(tick);
  return () => cancel();
}
