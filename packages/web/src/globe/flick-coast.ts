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

/** Stops the turn where it is; true when it was turning. Zoom goes on. */
function haltTurn(orbit: Orbit): boolean {
  const axes = [orbit.lat, orbit.lon];
  const turning = axes.some((a) => a.velocity !== 0 || a.value !== a.target);
  for (const axis of axes) {
    Object.assign(axis, { target: axis.value, velocity: 0 });
  }
  return turning;
}

/**
 * The coast of a flick, which a press stops where it is (like Maps). Only
 * a flick's: a site being framed goes on.
 */
export function flickCoast(orbit: Orbit, deps: ControlDeps) {
  let flung = false;
  const press = (): boolean => {
    const stopped = flung && haltTurn(orbit);
    flung = false;
    if (stopped) deps.invalidate();
    return stopped;
  };
  return { press, flung: (): void => void (flung = true) };
}
