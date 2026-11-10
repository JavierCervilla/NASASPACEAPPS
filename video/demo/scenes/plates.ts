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
 * The opening's shots as specs for the terrain pipeline of the hero film
 * (VENT-112): for each, the instant (or the span of a time-lapse), the target
 * point, the camera's move and what must be in frame, with the sky the sim
 * computes for it (@ventana/sim skyAt and the curated sites' terrain
 * horizons, packages/sim/data/horizons.json). Until a shot's plate exists
 * (`plate`, a file in media/plates/), the cuts fall back to the raea 3D Moon
 * of scenes/shots.tsx (`fallback`).
 */
import type { ShotName } from "./shots";

export type OpeningId = "dive" | "artemis" | "skim" | "earthset" | "pullback" | "reveal" | "drift";

export interface Target {
  name: string;
  /** selenographic latitude and east longitude, degrees */
  latDeg: number;
  lonEastDeg: number;
}

export interface PlateSpec {
  id: OpeningId;
  /** UTC; a time-lapse runs from `instant` to `until` over the shot */
  instant: string;
  until?: string;
  target: Target;
  /** the camera's move, in words for the pipeline's camera path */
  camera: string;
  /** seconds in each cut (0: not in that cut) */
  seconds: { hero: number; submission: number };
  /** what has to be visible, and where the type needs dark sky or ground */
  mustShow: string;
  /** the plate per cut, a file in media/plates/, once rendered; null until then */
  plate: { hero: string | null; submission: string | null };
  /** the raea 3D shot used meanwhile */
  fallback: ShotName;
}

const RIDGE: Target = { name: "Shackleton connecting ridge (Blue Moon MK1)", latDeg: -89.684, lonEastDeg: -163.261 };
const IM2: Target = { name: "Mons Mouton, IM-2 landing site", latDeg: -84.7906, lonEastDeg: 29.1957 };
const POLE: Target = { name: "the lunar south pole", latDeg: -90, lonEastDeg: 0 };

export const PLATES: Record<OpeningId, PlateSpec> = {
  dive: {
    id: "dive", instant: "2026-11-14T13:00:00Z", target: RIDGE,
    camera: "from about 2 500 km (the whole south polar cap, south up) diving to about 3 km over the ridge, ending low and looking along azimuth 283° toward the Sun",
    seconds: { hero: 4, submission: 3 },
    mustShow: "the long polar shadows and the terminator from orbit; at the end the Sun (1.61° up, az 283.4°) low over a real horizon; dark ground in the lower half for the question",
    plate: { hero: null, submission: null }, fallback: "dive",
  },
  artemis: {
    id: "artemis", instant: "2026-11-20T16:00:00Z", target: POLE,
    camera: "high orbit (about 2 500 km), a slow 50° arc around the pole, the cap in the right half of the frame",
    seconds: { hero: 4, submission: 0 },
    mustShow: "the south polar cap with its real crater shadows (Shackleton, de Gerlache, the Artemis III regions); the left half dark for the type",
    plate: { hero: null, submission: null }, fallback: "artemis",
  },
  skim: {
    id: "skim", instant: "2026-11-15T09:00:00Z", until: "2026-11-15T14:00:00Z", target: IM2,
    camera: "2 m above the ground (eye height), looking toward azimuth 80°, a slow pan of a few degrees; time-lapse of 5 h",
    seconds: { hero: 4, submission: 2.5 },
    mustShow: "the Sun's disc sliding along the ridge line: its centre on the terrain horizon for hours (2.37° to 2.59° up, az 81.0° to 78.5°, 0.00° to 0.14° above the terrain); long shadows across the ground; the lower third dark enough for the line",
    plate: { hero: null, submission: null }, fallback: "skim",
  },
  earthset: {
    id: "earthset", instant: "2026-11-01T12:00:00Z", until: "2026-11-03T12:00:00Z", target: RIDGE,
    camera: "2 m above the ground, looking toward azimuth 168°, a long lens (about 15° of field), static or a slow push; time-lapse of 48 h",
    seconds: { hero: 4, submission: 2.5 },
    mustShow: "the Earth sinking behind the real horizon: 1.64° above the terrain at the start, setting at 2026-11-02 13:50 UTC, 1.44° below at the end (gone); it stays below the horizon until 2026-11-18 06:30 UTC (15.7 days); the Sun lights it from the left (az 82° to 58°, 1.5° up); sky above for the line",
    plate: { hero: null, submission: null }, fallback: "earthset",
  },
  pullback: {
    id: "pullback", instant: "2026-11-20T16:00:00Z", target: RIDGE,
    camera: "from 2 m at the ridge straight up to about 5 000 km, accelerating, into the reveal's framing",
    seconds: { hero: 2, submission: 0 },
    mustShow: "a seamless climb from the ground to the whole Moon, under the riser",
    plate: { hero: null, submission: null }, fallback: "pullback",
  },
  reveal: {
    id: "reveal", instant: "2026-11-20T16:00:00Z", target: POLE,
    camera: "about 5 000 km, the south polar cap at the top of the frame (south up), a slow drift",
    seconds: { hero: 4, submission: 3 },
    mustShow: "the Moon at the landing window of the app footage (at the ridge: Sun 1.26° at az 208.9°, Earth 3.73° at az 156.1°); the lower 45 % of the frame dark for the name and the tagline",
    plate: { hero: null, submission: null }, fallback: "reveal",
  },
  drift: {
    id: "drift", instant: "2026-11-22T20:00:00Z", target: POLE,
    camera: "far (about 10 000 km), the Moon small in the lower right, a slow drift",
    seconds: { hero: 6, submission: 2.5 },
    mustShow: "a quiet background for the proof's type, nothing bright behind the left two thirds",
    plate: { hero: null, submission: null }, fallback: "drift",
  },
};
