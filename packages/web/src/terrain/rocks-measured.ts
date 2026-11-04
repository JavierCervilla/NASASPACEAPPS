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
 * Rocks by a measured size law (VENT-62). Golombek & Rapp (1997, JGR 102,
 * 4117): the cumulative fractional area covered by rocks of diameter ≥ D is
 * F(D) = k e^(−q(k) D), with q(k) = 1.79 + 0.152 / k (D in metres), the
 * model Bandfield et al. (2011, JGR 116, E00H02, LRO Diviner) apply to
 * the Moon. VERIFIED (VENT-68, read in the paper): q's two constants, 1.79
 * and 0.152, and the law's form. OURS, not in the papers: the plains' k from
 * Diviner's median, the rise of k with slope and convexity, the 0.05 maximum
 * and the hold of q below k 0.02 (ASSETS.md says so too). The
 * number per m² per metre of diameter is n(D) = −F'(D) / (πD²/4).
 *
 * k rises with the real near grid's slope and convexity: regolith creeps
 * off slopes and rims, exposing blocks (an assumption). The plains
 * calibrate on the Apollo frames, a few decimetre rocks in each frame
 * (calibration.md). A rock of diameter D is drawn only to the range where
 * it is still about two pixels across, and the count is capped at 520, near
 * the first cut's 420: every rock costs 160 triangles and the paired frame
 * bench (SwiftShader) held the cost to that budget;
 * every rock is 20 to 50 % buried. The work is split in diameter bands,
 * largest first, so the page can run it in slices. Pure.
 */
import type { Rock } from './rocks';
import {
  MEASURED,
  density,
  kAt,
  type Ground,
  type MeasuredScatter,
} from './rock-law';
import { generator } from './seeded';

/** The rocks of one diameter step `d`, appended to `rocks` while room. */
function addStep(
  rocks: Rock[],
  at: { d: number; next: () => number; ground: Ground; s: MeasuredScatter },
): void {
  const { d, next, ground, s } = at;
  const outer = Math.min(s.outerM, Math.max(s.innerM, d * s.rangePerD));
  const area = Math.PI * (outer * outer - s.innerM * s.innerM);
  const dens = (k: number, at: number): number => density(k, at, s.kFitMin);
  const expect = dens(s.kMax, d + s.stepD / 2) * s.stepD * area;
  let count = Math.floor(expect) + (next() < expect % 1 ? 1 : 0);
  while (count-- > 0 && rocks.length < s.cap) {
    const r = Math.sqrt(s.innerM ** 2 + next() * (outer ** 2 - s.innerM ** 2));
    const az = next() * 2 * Math.PI;
    const [east, north] = [Math.sin(az) * r, Math.cos(az) * r];
    const dd = d + next() * s.stepD;
    const keep = dens(kAt(ground, east, north, s), dd) / dens(s.kMax, dd);
    if (next() > keep) continue;
    const buried = s.buried[0] + (s.buried[1] - s.buried[0]) * next();
    rocks.push({ east, north, radius: dd / 2, squash: 0.45 + next() * 0.35,
      yawRad: next() * 2 * Math.PI, lift: 1 - 2 * buried, rough: 0.45 });
  }
}

export interface RockBands {
  readonly count: number;
  /** The rocks of band `i`, largest bands first; call in order. */
  readonly band: (i: number) => Rock[];
}

/** The rocks of `seed` on `ground`, in bands: the same every time. */
export function measuredBands(
  seed: number,
  ground: Ground,
  s: MeasuredScatter = MEASURED,
): RockBands {
  const next = generator(seed ^ 0x5a17);
  const steps = Math.round((s.maxD - s.minD) / s.stepD);
  const count = Math.ceil(steps / s.bandSteps);
  let held = 0;
  const band = (i: number): Rock[] => {
    const rocks: Rock[] = [];
    const first = i * s.bandSteps;
    for (let k = first; k < Math.min(first + s.bandSteps, steps); k++) {
      const d = s.maxD - (k + 1) * s.stepD;
      const room = { ...s, cap: s.cap - held };
      if (held + rocks.length >= s.cap) continue;
      addStep(rocks, { d, next, ground, s: room });
    }
    held += rocks.length;
    return rocks;
  };
  return { count, band };
}

/** All the rocks of `seed` on `ground` at once. */
export function measuredRocks(
  seed: number,
  ground: Ground,
  s: MeasuredScatter = MEASURED,
): Rock[] {
  const bands = measuredBands(seed, ground, s);
  return Array.from({ length: bands.count }, (_, i) => bands.band(i)).flat();
}
