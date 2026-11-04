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
 * Where the near ground carries craters (VENT-64): a polar patch of mesh
 * around the eye whose vertices lie on the ground plus the craters' relief
 * (crater-relief.ts). Its cells follow the screen, since the ground
 * foreshortens as 1 / r² seen from 2 m: a tangential step of r 2π / n and
 * a radial step of k r², never under `minStep`. A scale of craters is
 * drawn only while its typical crater spans a few cells (a smaller one
 * would alias into noise), and the whole relief fades out toward the
 * patch's edge, where the rings' ground takes over at the same height.
 * Pure.
 */
import type { Tier } from '../../lib/quality';
import { SCALE_D_MIN_M, reliefAt } from '../crater-relief';

export interface PatchSpec {
  /** Segments around, radius (m), closest radial step (m), its r² factor. */
  readonly n: number;
  readonly r: number;
  readonly minStep: number;
  readonly k: number;
}

/** Per quality tier: halved from the first cut, +14 % of a frame on high. */
export const PATCH_SPECS: Record<Tier, PatchSpec | null> = {
  high: { n: 512, r: 48, minStep: 0.03, k: 0.003 },
  medium: { n: 320, r: 34, minStep: 0.045, k: 0.005 },
  low: null,
};

/** A scale's typical crater is this many times its smallest. */
const TYPICAL_OVER_MIN = 2;
/** Cells a typical crater spans: fully drawn from, gone under. */
const CELLS_FULL = 2;
const CELLS_GONE = 0.5;
/** The relief fades out over the patch's last share of its radius. */
const EDGE_FROM = 0.8;

/** The radii of the patch's rings, 0 first, `spec.r` last. */
export function patchRadii(spec: PatchSpec): number[] {
  const out = [0, 0.04];
  for (let r = 0.04; r < spec.r;) {
    r = Math.min(spec.r, r + Math.max(spec.minStep, spec.k * r * r));
    out.push(r);
  }
  return out;
}

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** How much of each scale of craters is drawn at radius `r` (0 to 1). */
export function scaleWeights(spec: PatchSpec, r: number): [number, number] {
  const step = Math.max(spec.minStep, spec.k * r * r,
    (r * 2 * Math.PI) / spec.n);
  const edge = 1 - smooth(EDGE_FROM * spec.r, spec.r, r);
  const weigh = (dMin: number): number =>
    edge * smooth(CELLS_GONE, CELLS_FULL, (dMin * TYPICAL_OVER_MIN) / step);
  return [weigh(SCALE_D_MIN_M[0]), weigh(SCALE_D_MIN_M[1])];
}

export interface Relief {
  readonly h: Float32Array;
  readonly spec: PatchSpec;
}

/** Metres of crater relief at world `x` east, `z` south. */
export function craterAt(rel: Relief, x: number, z: number): number {
  const weights = scaleWeights(rel.spec, Math.hypot(x, z));
  return weights[0] + weights[1] > 0 ? reliefAt(rel.h, x, z, weights) : 0;
}
