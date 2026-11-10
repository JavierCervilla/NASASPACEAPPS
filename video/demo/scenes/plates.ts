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
 * The opening's shots, rendered on the real Moon of the hero film's terrain
 * module (packages/landing/media-src/moon-scene, VENT-112; scenes/terrain.tsx
 * has the camera paths, plates.tsx the compositions, capture/plates.mjs the
 * loop). The module builds one site, IM-2 on Mons Mouton, so every shot is
 * there, at one of two instants chosen with @ventana/sim (skyAt and the
 * site's LOLA horizon in packages/sim/data/horizons.json). Each instant is
 * one build (about 20 s of shadows and a 180 to 370 MB mesh), so the
 * time-lapses of the first spec became single instants with a moving camera:
 * no shadow stepping. `plate` names the rendered file in media/plates/; a
 * shot without one falls back to the raea 3D Moon of scenes/shots.tsx.
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

const IM2: Target = { name: "Mons Mouton, IM-2 landing site", latDeg: -84.7906, lonEastDeg: 29.1957 };
/** The Sun's disc half on the ridge at 80°, the Earth 69 % lit 2.9° over the terrain at 328°. */
const SKIM_INSTANT = "2026-11-15T11:00:00Z";
/** The Earth's centre on the terrain at 338°, 30 % lit; the Sun 0.5° up at 272°. */
const EARTHSET_INSTANT = "2027-01-27T11:40:00Z";
const both = (id: OpeningId) => ({ hero: `${id}-hero.mp4`, submission: `${id}-submission.mp4` });

export const PLATES: Record<OpeningId, PlateSpec> = {
  dive: {
    id: "dive", instant: SKIM_INSTANT, target: IM2,
    camera: "from 1 500 km (the lit polar cap) down to 600 m, coming in from azimuth 148° and pitching up to the horizon at 328°; the arc behind the target is 30 % of the altitude near the ground",
    seconds: { hero: 4, submission: 3 },
    mustShow: "the lit Moon from orbit, then the polar relief in raking light, ending on the Earth (1.43° up, 69 % lit) over the real horizon; dark ground in the lower half for the question",
    plate: both("dive"), fallback: "dive",
  },
  artemis: {
    id: "artemis", instant: SKIM_INSTANT, target: IM2,
    camera: "1 400 km up, a slow 50° arc around the target, the cap in the right half",
    seconds: { hero: 4, submission: 0 },
    mustShow: "the south polar cap on the terminator, with its real relief; the left half dark for the type",
    plate: { hero: "artemis-hero.mp4", submission: null }, fallback: "artemis",
  },
  skim: {
    id: "skim", instant: SKIM_INSTANT, target: IM2,
    camera: "2 m above the ground, looking toward azimuth 76° to 82° (a slow pan), 30° of vertical field",
    seconds: { hero: 4, submission: 2.5 },
    mustShow: "the Sun's disc half hidden by the ridge at 80° (its centre on the terrain, 2.46° up), the ground backlit; the sky above for the line",
    plate: both("skim"), fallback: "skim",
  },
  earthset: {
    id: "earthset", instant: EARTHSET_INSTANT, target: IM2,
    camera: "2 m above the ground, looking toward azimuth 338°, 22° to 19° of vertical field (a gentle push)",
    seconds: { hero: 4, submission: 2.5 },
    mustShow: "the Earth half behind the real horizon (its centre on the terrain, 0.88° below level, 30 % lit); the sky above for the line",
    plate: both("earthset"), fallback: "earthset",
  },
  pullback: {
    id: "pullback", instant: SKIM_INSTANT, target: IM2,
    camera: "from 2 m, the Earth on the horizon, up to 8 000 km, the arc behind the target 30 % of the altitude near the ground, into the reveal's framing",
    seconds: { hero: 2, submission: 0 },
    mustShow: "a seamless climb from the ground to the whole Moon, under the riser",
    plate: { hero: "pullback-hero.mp4", submission: null }, fallback: "pullback",
  },
  reveal: {
    id: "reveal", instant: SKIM_INSTANT, target: IM2,
    camera: "8 000 km out, the whole Moon in the upper half, a slow drift",
    seconds: { hero: 4, submission: 3 },
    mustShow: "the half-lit Moon with the polar cap on the terminator; the lower half dark for the name and the tagline",
    plate: both("reveal"), fallback: "reveal",
  },
  drift: {
    id: "drift", instant: SKIM_INSTANT, target: IM2,
    camera: "9 000 km out, the Moon small in the lower right, a slow drift",
    seconds: { hero: 6, submission: 2.5 },
    mustShow: "a quiet background for the proof's type, nothing bright behind the left two thirds",
    plate: both("drift"), fallback: "drift",
  },
};

/**
 * The end card's backdrop, a still in media/: the hero film's hold frame (the
 * Mons Mouton horizon with the Earth, 2026-12-15 05:00 UTC), the poster of
 * its pre-release hero-film-preview-p3. The Earth sits at 50.6 % x 35.6 % of
 * the frame and the horizon at 58.5 to 64.4 %; parts/endcard.tsx keeps the
 * type and the code clear of both. backdrop.tsx renders a raea stand-in.
 */
export const END_BACKDROP = "plates/hero-desktop-poster.png";
