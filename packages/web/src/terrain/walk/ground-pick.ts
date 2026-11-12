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
 * The ground under a pointer (VENT-121): a ray from the camera marched over
 * the loaded heights, in the session's frame (x east, y up, z south), with
 * steps that grow with distance and a bisection at the crossing. Not a
 * three.js Raycaster over the ring meshes: the heights the eye stands on
 * are the ones a tap aims at, and no mesh is walked. A ray that leaves the
 * loaded relief or rises past its reach is the sky. Pure.
 */
import type { Vec3 } from '../view-camera';
import type { EastNorth } from './walk-reach';

/** The frame's y of the ground `east`, `north` m away; NaN: no relief. */
export type HeightAt = (east: number, north: number) => number;

export interface Ray {
  readonly origin: Vec3;
  /** A unit vector. */
  readonly dir: Vec3;
}

/** The first step, metres, and how much each step grows with distance. */
const FIRST_STEP_M = 0.5;
const STEP_SHARE = 0.01;
const REFINE_STEPS = 12;

/** The ray's point `t` metres out, and how far over the ground it is. */
function sampleAt(ray: Ray, t: number, heightAt: HeightAt) {
  const [x, y, z] = ray.origin.map((o, i) => o + (ray.dir[i] ?? 0) * t) as
    [number, number, number];
  return { at: [x, -z] as EastNorth, over: y - heightAt(x, -z) };
}

/** Between `lo` (over the ground) and `hi` (under it), the crossing. */
function refine(ray: Ray, span: [number, number], heightAt: HeightAt) {
  let [lo, hi] = span;
  for (let i = 0; i < REFINE_STEPS; i++) {
    const mid = (lo + hi) / 2;
    if (sampleAt(ray, mid, heightAt).over > 0) lo = mid;
    else hi = mid;
  }
  return sampleAt(ray, hi, heightAt).at;
}

/**
 * Where `ray` meets the ground within `maxM` metres, east and north of the
 * point; null when it meets none there (the sky, or relief not loaded).
 */
export function pickGround(
  ray: Ray,
  heightAt: HeightAt,
  maxM: number,
): EastNorth | null {
  let t = 0;
  while (t < maxM) {
    const next = Math.min(t + FIRST_STEP_M + t * STEP_SHARE, maxM);
    const { over } = sampleAt(ray, next, heightAt);
    if (Number.isNaN(over)) return null;
    if (over <= 0) return refine(ray, [t, next], heightAt);
    t = next;
  }
  return null;
}
