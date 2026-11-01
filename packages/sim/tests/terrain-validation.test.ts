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
 * The shipped terrain horizons (packages/sim/data/horizons.json, VENT-40)
 * against NASA's own illumination map: at every curated site south of
 * 80° S, the share of time some of the Sun's disc stands above our
 * horizon, over an 18.6-year lunar nodal cycle, against AVGVISIB_75S_120M
 * at the point (packages/sim/data/psr-flags.json, Mazarico et al. 2011:
 * the same definition, any fraction of the disc, over the same cycle).
 *
 * The cycle is sampled every 7 hours from 2026-11-01 (23 293 samples; 7 is
 * prime to 24, so every hour of the day comes up). Hourly sampling moves
 * the shares by at most 0.12 points. The sky beyond Nov-Dec 2026 is the
 * simulator's extrapolation (accuracy.ts); its error, a fraction of a
 * degree at worst, is small against the terrain's.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { skyAt } from '../src/sky.ts';
import { sunDiscVisible } from '../src/sun-disc.ts';
import { decodeProfile } from '../src/terrain-codec.ts';

interface Point {
  readonly ids: readonly string[];
  readonly lat: number;
  readonly lonEast: number;
  readonly profile: string;
}

const read = <T>(name: string): T =>
  JSON.parse(readFileSync(new URL(`../data/${name}`, import.meta.url), 'utf8')) as T;
const POINTS = read<{ points: Point[] }>('horizons.json').points;
const FLAGS = read<{ sites: { id: string; avgSun: number }[] }>('psr-flags.json').sites;

const START_MS = Date.parse('2026-11-01T00:00:00Z');
const CYCLE_MS = 18.6 * 365.25 * 24 * 3_600_000;
const STEP_MS = 7 * 3_600_000;

/** Our agreement with NASA's map, in percentage points. */
const TOLERANCE_PTS = 1;

/**
 * Sites where our 20 m near field and NASA's 120 m grid disagree for a
 * reason we can name, with the difference we measured (ours minus NASA's,
 * points). They are documented, not tuned: the test holds each to its
 * measured value within 0.5 points, so a change to the method shows.
 */
const KNOWN: Record<string, { diffPts: number; why: string }> = {
  'bluemoon-mk1-pathfinder': {
    diffPts: 14.3,
    why: 'a narrow ridge, smoothed in the 120 m grid; NASA gives 89.6 % within 1 km of the point',
  },
  'artemis-malapert-massif': {
    diffPts: -8.3,
    why: 'a 7° local slope the 20 m grid sees and the 120 m one does not; the 80 m grid alone gives 42.1 %',
  },
  'im1-odysseus': {
    diffPts: 4.0,
    why: "a steep gradient in NASA's map itself: 33 to 40 % in the next 120 m pixels",
  },
};

/** Percentage of the cycle with some of the Sun's disc above the terrain. */
function sunShare(point: Point): number {
  const profile = decodeProfile(point.profile);
  const site = { latDeg: point.lat, lonEastDeg: point.lonEast };
  let lit = 0;
  let n = 0;
  for (let ms = START_MS; ms < START_MS + CYCLE_MS; ms += STEP_MS) {
    const sky = skyAt(site, ms);
    if (sunDiscVisible(profile, sky.sunAz, sky.sunEl) > 0) lit++;
    n++;
  }
  return (100 * lit) / n;
}

describe('terrain horizons against NASA AVGVISIB_75S_120M', () => {
  it('cover every site of psr-flags.json', () => {
    const ids = POINTS.flatMap((p) => p.ids).sort();
    expect(ids).toEqual(FLAGS.map((f) => f.id).sort());
  });

  it.each(POINTS.map((p) => [p.ids[0] as string, p] as const))(
    '%s',
    (id, point) => {
      const nasa = 100 * (FLAGS.find((f) => f.id === id)?.avgSun ?? NaN);
      const diff = sunShare(point) - nasa;
      const known = KNOWN[id];
      if (known) expect(Math.abs(diff - known.diffPts)).toBeLessThan(0.5);
      else expect(Math.abs(diff)).toBeLessThanOrEqual(TOLERANCE_PTS);
    },
  );
});
