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
 * The on-foot view and the card agree on IM-2's recorded LOLA relief
 * (VENT-59): every hour of November 2026, the view's verdict on the Sun and
 * the Earth (seenBodies) is the card's (isAboveTerrain on the shipped
 * profile). The tiles were recorded from the production API, levels 0 and 1
 * from LOLA's 20 m tier as the profile's near band. Recorded earlier from
 * the 80 m tier, a bump 383 m out at 252° stood 0.07° over the profile's
 * skyline and hid a Sun the card showed; at 20 m it is 1.47 m high at 359 m,
 * under the Sun. The rule that the profile decides is held on its own by
 * terrain-view.test.ts.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { decodeProfile, isAboveTerrain, skyAt } from '@ventana/sim';
import { describe, expect, it } from 'vitest';
import shipped from '../../sim/data/horizons.json';
import { seenBodies } from '../src/terrain/on-foot-model';
import { parseTile } from '../src/terrain/ring/ring-answer';
import { frameAt, unitOf } from '../src/terrain/ring/ring-frame';
import { LOCAL_N, fillRows, heightAtDir, localSize } from '../src/terrain/ring/ring-local';
import { finest } from '../src/terrain/ring/ring-nodes';
import { fillGaps } from '../src/terrain/ring/ring-read';
import { RingStore } from '../src/terrain/ring/ring-store';

const FIXTURES = new URL('../../../tests/e2e/fixtures/terrain-ring-im2/', import.meta.url);
const SITE = { lat: -84.79, lonEast: 29.2 };
const REACH = { from: 0, levels: 4 };
const HOUR_MS = 3_600_000;

function recordedStore(): RingStore {
  const store = new RingStore('polar-south');
  for (const file of readdirSync(FIXTURES)) {
    const m = /^tile-polar-south-(\d+)-(-?\d+)-(-?\d+)\.json$/.exec(file);
    if (!m) continue;
    const key = { level: Number(m[1]), x: Number(m[2]), y: Number(m[3]), url: '' };
    const tile = parseTile(JSON.parse(readFileSync(new URL(file, FIXTURES), 'utf8')) as unknown, key, 'polar-south');
    if (tile) store.add(tile);
  }
  return store;
}

/** The near ground the view stands on (ring-near.ts `nearOf`), from the recorded rings. */
function nearGround() {
  const store = recordedStore();
  const frame = frameAt(SITE, heightAtDir(store, REACH, unitOf(SITE.lat, SITE.lonEast)));
  const ys = new Float32Array(LOCAL_N * LOCAL_N);
  fillRows(ys, { store, frame, reach: REACH }, localSize(0), [0, LOCAL_N]);
  fillGaps(ys);
  const tile = { key: 'near', originEast: 0, originNorth: 0, n: LOCAL_N, sizeM: localSize(0), heights: ys, resolutionM: finest(store) };
  return { tile, ys };
}

function im2Profile() {
  const point = shipped.points.find((p) => p.ids.includes('im2-athena'));
  if (!point) throw new Error('IM-2 has no shipped profile');
  return decodeProfile(point.profile);
}

describe('IM-2 on its recorded relief', () => {
  const placed = nearGround();
  const profile = im2Profile();
  const verdicts = (ms: number) => {
    const sky = skyAt({ latDeg: SITE.lat, lonEastDeg: SITE.lonEast }, ms);
    const view = seenBodies(placed, profile, sky);
    const card = [isAboveTerrain(profile, sky.sunAz, sky.sunEl), isAboveTerrain(profile, sky.earthAz, sky.earthEl)];
    return { view: view.map((b) => b.visible), card };
  };

  it('reads the near ground from LOLA’s 20 m tier, as production and the profile’s near band do', () => {
    expect(placed.tile.resolutionM).toBe(20);
  });

  it('shows the Sun over the ridge on 30 November 2026 at 20:00 UTC, as the card does', () => {
    expect(verdicts(Date.parse('2026-11-30T20:00:00Z'))).toEqual({ view: [true, true], card: [true, true] });
  });

  it('agrees with the card on the Sun and the Earth every hour of November 2026', () => {
    const disagree: string[] = [];
    for (let ms = Date.parse('2026-11-01T00:00:00Z'); ms < Date.parse('2026-12-01T00:00:00Z'); ms += HOUR_MS) {
      const { view, card } = verdicts(ms);
      if (view.some((v, i) => v !== card[i])) disagree.push(new Date(ms).toISOString());
    }
    expect(disagree).toEqual([]);
  });
});
