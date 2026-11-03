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
 * A press on a globe still turning from a flick stops it where it is, like
 * Maps (VENT-37); the press is then the globe's and drops no pin
 * (drag.ts, pin/place-gesture.ts).
 */
import type { ControlDeps } from './control-deps';
import type { Orbit } from './orbit';
import { settleOrbit } from './orbit-band';

/** Stops the turn where it is; true when it was turning. Zoom goes on. */
function haltTurn(orbit: Orbit): boolean {
  const axes = [orbit.lat, orbit.lon];
  const turning = axes.some((a) => a.velocity !== 0 || a.value !== a.target);
  for (const axis of axes) {
    Object.assign(axis, { target: axis.value, velocity: 0 });
  }
  return turning;
}

/** The turn's targets, to tell the flick's coast from any later move. */
function turnTargets(orbit: Orbit): string {
  return [orbit.lat.target, orbit.lon.target].join();
}

/**
 * The coast of a flick, which a press stops where it is (like Maps). Only
 * a flick's: once it settles or another move (a framing, a key) sets new
 * targets, a site being framed goes on.
 */
export function flickCoast(orbit: Orbit, deps: ControlDeps) {
  let flung: string | null = null;
  const press = (): boolean => {
    const ours = flung === turnTargets(orbit);
    const stopped = ours && haltTurn(orbit);
    flung = null;
    // Stopped past a limit (a flick from a stretch), it settles back on it.
    if (stopped) settleOrbit(orbit, deps.reducedMotion());
    if (stopped) deps.invalidate();
    return stopped;
  };
  const fling = (): void => void (flung = turnTargets(orbit));
  return { press, flung: fling };
}
