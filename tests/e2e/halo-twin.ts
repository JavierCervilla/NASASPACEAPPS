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
 * What the pure photometry twin (lunar-photometry.ts) says a view down the
 * Sun's line should draw (VENT-62): the expectation of the e2e halo check,
 * derived from the same function the GLSL is built from, never tuned to the
 * picture. Flat ground, the eye straight over its point: the first-order
 * geometry the opposition surge lives in.
 */
import { groundReflectance } from '../../packages/web/src/terrain/lunar-photometry';

const RAD = Math.PI / 180;

/** The camera and the Sun of a view that looks away from the Sun. */
export interface DownSunView {
  readonly width: number;
  readonly height: number;
  readonly fovDeg: number;
  readonly pitchDeg: number;
  readonly sunElDeg: number;
}

/** A box of the picture, in pixels. */
export interface PixelBox {
  readonly x0: number;
  readonly x1: number;
  readonly y0: number;
  readonly y1: number;
}

const SAMPLES = 12;

/** The twin's mean reflectance factor of the flat ground drawn in `box`. */
export function twinMean(view: DownSunView, box: PixelBox): number {
  const tanV = Math.tan((view.fovDeg * RAD) / 2);
  const tanH = (tanV * view.width) / view.height;
  const [sinE, cosE] = [Math.sin(view.sunElDeg * RAD), Math.cos(view.sunElDeg * RAD)];
  const [sinP, cosP] = [Math.sin(view.pitchDeg * RAD), Math.cos(view.pitchDeg * RAD)];
  let sum = 0;
  let n = 0;
  for (let i = 0; i < SAMPLES; i++) {
    for (let j = 0; j < SAMPLES; j++) {
      const x = box.x0 + ((box.x1 - box.x0) * (i + 0.5)) / SAMPLES;
      const y = box.y0 + ((box.y1 - box.y0) * (j + 0.5)) / SAMPLES;
      const cx = (x / view.width * 2 - 1) * tanH;
      const cy = (1 - (y / view.height) * 2) * tanV;
      const len = Math.hypot(cx, cy, 1);
      const [up, ahead] = [(cy * cosP + sinP) / len, (cosP - cy * sinP) / len];
      if (up >= 0) continue;
      const cosAlpha = Math.min(Math.max(-(up * sinE) + ahead * cosE, -1), 1);
      sum += groundReflectance(sinE, -up, Math.acos(cosAlpha) / RAD);
      n++;
    }
  }
  return sum / n;
}
