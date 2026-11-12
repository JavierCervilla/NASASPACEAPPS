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
 * The rocks around an eye that walked away from the point (VENT-121): the
 * same measured law as at the point (rocks-measured.ts: each diameter only
 * out to where it is about two pixels across, denser on slopes and rims,
 * capped), but seeded per cell of a fixed grid of the session's frame and
 * per diameter step, so a place shows the same rocks every time the eye
 * comes back, whatever way it came. At the point itself the point's
 * scatter stays, byte for byte (rocks-measured.ts). Pure.
 */
import { density, kAt, type Ground, type MeasuredScatter } from '../rock-law';
import type { RockBands } from '../rocks-measured';
import type { Rock } from '../rocks';
import { generator } from '../seeded';
import type { EastNorth } from './walk-reach';

/** The seeding grid's cell, metres. */
export const ROCK_CELL_M = 40;

/** A seed for cell `(cx, cy)` and diameter step `step` of `seed`. */
function cellSeed(seed: number, cx: number, cy: number, step: number) {
  let h = Math.imul(cx, 374_761_393) ^ Math.imul(cy, 668_265_263);
  h = (h + Math.imul(step, 2_246_822_519) + seed) | 0;
  h = Math.imul(h ^ (h >>> 13), 1_274_126_177);
  return (h ^ (h >>> 16)) >>> 0;
}

interface Step {
  readonly seed: number;
  readonly d: number;
  readonly index: number;
  readonly ground: Ground;
  readonly s: MeasuredScatter;
  readonly eye: EastNorth;
}

/** The rocks of cell `(cx, cy)` at one diameter step, by the law. */
function cellStep(at: Step, cx: number, cy: number, outer: number): Rock[] {
  const { d, s, eye } = at;
  const next = generator(cellSeed(at.seed, cx, cy, at.index));
  const dens = (k: number, dd: number): number => density(k, dd, s.kFitMin);
  const expect = dens(s.kMax, d + s.stepD / 2) * s.stepD * ROCK_CELL_M ** 2;
  const count = Math.floor(expect) + (next() < expect % 1 ? 1 : 0);
  const rocks: Rock[] = [];
  for (let i = 0; i < count; i++) {
    const [u, v, w, keep, b, sq, yaw] = Array.from({ length: 7 }, next) as
      [number, number, number, number, number, number, number];
    const [east, north] = [(cx + u) * ROCK_CELL_M, (cy + v) * ROCK_CELL_M];
    const r = Math.hypot(east - eye[0], north - eye[1]);
    if (r < s.innerM || r > outer) continue;
    const dd = d + w * s.stepD;
    const k = kAt(at.ground, east, north, s);
    if (keep > dens(k, dd) / dens(s.kMax, dd)) continue;
    const buried = s.buried[0] + (s.buried[1] - s.buried[0]) * b;
    rocks.push({ east, north, radius: dd / 2, squash: 0.45 + sq * 0.35,
      yawRad: yaw * 2 * Math.PI, lift: 1 - 2 * buried, rough: 0.45 });
  }
  return rocks;
}

/** Every rock of one diameter step around the eye, nearest first. */
function stepRocks(at: Step): Rock[] {
  const { s, d, eye } = at;
  const outer = Math.min(s.outerM, Math.max(s.innerM, d * s.rangePerD));
  const lo = eye.map((c) => Math.floor((c - outer) / ROCK_CELL_M));
  const hi = eye.map((c) => Math.floor((c + outer) / ROCK_CELL_M));
  const rocks: Rock[] = [];
  for (let cy = lo[1] ?? 0; cy <= (hi[1] ?? 0); cy++) {
    for (let cx = lo[0] ?? 0; cx <= (hi[0] ?? 0); cx++) {
      rocks.push(...cellStep(at, cx, cy, outer));
    }
  }
  const away = (r: Rock): number => Math.hypot(r.east - eye[0],
    r.north - eye[1]);
  return rocks.sort((a, b) => away(a) - away(b));
}

/** The rocks of `seed` around `eye` on `ground`, in bands, largest first. */
export function cellBands(
  seed: number,
  ground: Ground,
  s: MeasuredScatter,
  eye: EastNorth,
): RockBands {
  const steps = Math.round((s.maxD - s.minD) / s.stepD);
  const count = Math.ceil(steps / s.bandSteps);
  let held = 0;
  const band = (i: number): Rock[] => {
    const rocks: Rock[] = [];
    const first = i * s.bandSteps;
    for (let k = first; k < Math.min(first + s.bandSteps, steps); k++) {
      const d = s.maxD - (k + 1) * s.stepD;
      const room = s.cap - held - rocks.length;
      if (room <= 0) break;
      const at = { seed, d, index: k, ground, s, eye };
      rocks.push(...stepRocks(at).slice(0, room));
    }
    held += rocks.length;
    return rocks;
  };
  return { count, band };
}
