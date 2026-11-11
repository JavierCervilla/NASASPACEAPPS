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
 * The light of a site film (VENT-115), from the sky of the instant at the
 * target and its LOLA horizon (moon-scene's sky.mjs, written into the built
 * world's JSON). Pure.
 *
 * Three cases, decided at the eye (2 m over the target) from the same
 * profile the app decides day and night with (night-light.ts `isNight`):
 * - `sunlit`: some of the Sun's disc clears the terrain. The hero film's
 *   light all the way: its exposure curve, the Earth's light and 3 % of the
 *   sunlit ground's light scattered into shadows.
 * - `earthlit`: the Sun is under the terrain, the Earth over it.
 * - `dim`: neither clears the terrain.
 *
 * The two night cases end on the app's lunar night (VENT-100), so the
 * loader's crossfade into the live view neither brightens nor darkens: the
 * app's dark exposure (stage.ts, DARK_EXPOSURE over the day's EXPOSURE,
 * applied to the hero's day exposure at the eye), its hemisphere floor at a
 * quarter of the day's, the Earth's light as a directional light of half
 * the key by its lit share and by how far it stands over the horizon, and
 * the cool reading light from 300° at 10°. No Sun is faked: the Sun term
 * stays the baked one. High up the film has the hero's light; from 3 km
 * down to 20 m every value blends smoothly into the app's, and a faint
 * starfield fades in (the app's night sky has stars too).
 */
import type { WorldFile } from '../../moon-scene/scene/frame.ts';
import type { NightLights } from '../../moon-scene/scene/MoonScene.tsx';
import { direction } from '../../../../web/src/terrain/view-camera.ts';

export type LightCase = 'sunlit' | 'earthlit' | 'dim';

/** The sky of the instant at the target, as sky.mjs writes it into the world file. */
export interface SiteSky {
  readonly sun: { readonly elDeg: number; readonly azDeg: number };
  readonly earth: { readonly elDeg: number; readonly azDeg: number };
  readonly terrain: { readonly sunDisc: number; readonly sunHorizonDeg: number; readonly earthHorizonDeg: number } | null;
}

/** What MoonScene takes for one frame's light. */
export interface Light {
  readonly exposure: number;
  readonly fill: number;
  readonly bounce: number;
  readonly stars: number;
  readonly night?: NightLights;
}

/** A body this far under the level still opens the app's view, degrees (on-foot-model.ts, NEAR_SKY_DEG). */
const NEAR_SKY_DEG = -2;
/** moon-scene's Earth light, relative to the Sun's key (MoonScene's default) */
const FILL = 0.002;
/** moon-scene's scattered share (MoonScene's default) */
const BOUNCE = 0.03;
/**
 * The app's lunar night, relative to the Sun's key light, as the app has
 * it (packages/web/src/terrain/night-light.ts NIGHT_LIGHT and its Earth
 * rise; scene/sky.ts FILL.intensity 1.1 and KEY_INTENSITY 4; scene/stage.ts
 * EXPOSURE 1.35 x 1.2 and DARK_EXPOSURE 2.8).
 * packages/landing/tests/site-films-light.test.ts holds these to the app.
 */
export const APP_NIGHT = {
  /** the hemisphere floor: a quarter of the day's 1.1, over the key's 4 */
  floor: (0.25 * 1.1) / 4,
  earthMax: 0.5,
  earthFromDeg: -0.5,
  earthRiseDeg: 2,
  reading: 0.15,
  readingAzDeg: 300,
  readingElDeg: 10,
  /** the dark exposure over the day's */
  exposureRatio: 2.8 / (1.35 * 1.2),
} as const;
/**
 * The night lights' level in the film over the app's, measured: with the
 * app's values the films' night ground came out about twice as bright (in
 * sRGB) as the app's live view at the same point and instant (IM-2's sunlit
 * ground matched), from the renderers' different maps, photometry and tone
 * curves (the app's ACES toe). This brings the Earth-lit and dim ground to
 * the app's, checked against screenshots of the live app at Malapert Massif
 * and Haworth; the exposure, and with it the sunlit terrain, stays the app's.
 */
export const APP_MATCH = 0.3;
/** the night lights blend in over this stretch of altitude, metres */
const NIGHT_FROM_M = 3000;
const NIGHT_TO_M = 20;
/** the starfield at the end of a night film, moon-scene's `stars` */
const NIGHT_STARS = 0.5;

/** The heading the app's 3D view opens on: the Sun's azimuth while it is near the sky, else the Earth's. */
export function startHeading(sky: SiteSky): number {
  return sky.sun.elDeg > NEAR_SKY_DEG ? sky.sun.azDeg : sky.earth.azDeg;
}

/** Whether the target (2 m up) sees the Earth's centre over its LOLA horizon. */
export function seesEarth(sky: SiteSky): boolean {
  return sky.terrain ? sky.earth.elDeg > sky.terrain.earthHorizonDeg : sky.earth.elDeg > 0;
}

/** Which of the three lights the site's film has. */
export function lightCaseOf(sky: SiteSky): LightCase {
  const sunDisc = sky.terrain ? sky.terrain.sunDisc : Number(sky.sun.elDeg > 0);
  if (sunDisc > 0) return 'sunlit';
  return seesEarth(sky) ? 'earthlit' : 'dim';
}

/** The sky of a built world. */
export const skyOf = (world: WorldFile): SiteSky => world.sky as unknown as SiteSky;

/** The hero's exposure: one slow curve of the log altitude, from 2.4 high up to 1.9 at the eye. */
function sunlitExposure(altitude: number): number {
  const s = Math.min(1, Math.max(0, (Math.log(altitude) - Math.log(3)) / (Math.log(3e4) - Math.log(3))));
  return 1.9 + 0.5 * s * s * (3 - 2 * s);
}

/** The night films' exposure at the eye: the hero's day exposure there, opened as the app opens it. */
export const NIGHT_EXPOSURE = sunlitExposure(2) * APP_NIGHT.exposureRatio;

/** The Earth's lit share seen from the site, as the app reckons it (sky-light.ts `earthPhase`). */
export function earthPhase(sky: SiteSky): number {
  const s = direction(sky.sun.azDeg, sky.sun.elDeg);
  const e = direction(sky.earth.azDeg, sky.earth.elDeg);
  return (1 - (s[0] * e[0] + s[1] * e[1] + s[2] * e[2])) / 2;
}

/** The app's night Earth light, relative to the key: half of it, by the lit share and the rise over the horizon. */
export function nightEarth(sky: SiteSky): number {
  const horizon = sky.terrain ? sky.terrain.earthHorizonDeg : 0;
  const rise = Math.min(Math.max((sky.earth.elDeg - horizon - APP_NIGHT.earthFromDeg) / APP_NIGHT.earthRiseDeg, 0), 1);
  return APP_NIGHT.earthMax * earthPhase(sky) * rise;
}

/** 0 over the stretch, 1 under it, smooth in the log altitude between. */
function nightShare(altitude: number): number {
  const x = Math.min(1, Math.max(0, (Math.log(NIGHT_FROM_M) - Math.log(altitude)) / (Math.log(NIGHT_FROM_M) - Math.log(NIGHT_TO_M))));
  return x * x * x * (x * (x * 6 - 15) + 10);
}

const READING_DIR = direction(APP_NIGHT.readingAzDeg, APP_NIGHT.readingElDeg) as [number, number, number];

/** The light of a frame `altitude` metres over the target. */
export function lightAt(sky: SiteSky, altitude: number): Light {
  const base = sunlitExposure(altitude);
  const fill = seesEarth(sky) ? FILL : 0;
  if (lightCaseOf(sky) === 'sunlit') return { exposure: base, fill, bounce: BOUNCE, stars: 0 };
  const w = nightShare(altitude);
  const exposure = Math.exp(Math.log(base) + (Math.log(NIGHT_EXPOSURE) - Math.log(base)) * w);
  // moon-scene's `fill` is not scaled by the exposure; the app's night Earth is
  const earth = fill + (APP_MATCH * nightEarth(sky) * exposure - fill) * w;
  return {
    exposure,
    fill: earth,
    bounce: BOUNCE * (1 - w),
    stars: NIGHT_STARS * w,
    night: { floor: APP_MATCH * APP_NIGHT.floor * w, reading: APP_MATCH * APP_NIGHT.reading * w, readingDir: READING_DIR },
  };
}
