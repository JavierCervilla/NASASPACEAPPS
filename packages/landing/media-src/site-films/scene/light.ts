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
 * Three cases, decided at the eye (2 m over the target):
 * - `sunlit`: some of the Sun's disc clears the terrain. The hero film's
 *   light: its exposure curve, the Earth's light and 3 % of the sunlit
 *   ground's light scattered into shadows.
 * - `earthlit`: the Sun is under the terrain, the Earth over it. No Sun is
 *   faked: the camera opens up as it descends into the shadow, as a camera
 *   set for the dark would, until the Earth-lit ground reads; everything in
 *   the frame is brightened by the same factor, so sunlit peaks clip.
 * - `dim`: neither clears the terrain. The exposure opens up only a
 *   little (DIM_GAIN), so the terrain the low Sun reaches reads and the
 *   floor stays near black (only the scattered share lights it); a faint
 *   starfield.
 *
 * The Earth's light is not shadowed by the terrain in the shader, so it is
 * left out wherever the target does not see the Earth.
 */
import type { WorldFile } from '../../moon-scene/scene/frame.ts';

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
}

/** A body this far under the level still opens the app's view, degrees (on-foot-model.ts, NEAR_SKY_DEG). */
const NEAR_SKY_DEG = -2;
/** moon-scene's Earth light, relative to the Sun's key (MoonScene's default) */
const FILL = 0.002;
/** moon-scene's scattered share (MoonScene's default) */
const BOUNCE = 0.03;
/**
 * Earth-lit ground is brought to this exposure-weighted light: FILL x the
 * gain x the sine of the Earth's elevation (flat ground). Set by eye on
 * the first Earth-lit site so the ground reads as night, well under day.
 */
const NIGHT_KEY = 0.03;
/** the camera opens up over this stretch of altitude, metres: Earth-lit films (the frame is in shadow late) */
const EARTHLIT_ADAPT: Stretch = [80, 3];
/** the dim films open up a little, so the floor's scattered light reads near black, not as nothing */
const DIM_GAIN = 1.5;
const DIM_ADAPT: Stretch = [20_000, 200];
/** the faint starfield of the dim films, moon-scene's `stars` */
const DIM_STARS = 1;

/** From and to, metres of altitude. */
type Stretch = readonly [number, number];

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

/** The Earth-lit films' gain at the eye over the sunlit exposure. */
export function nightGain(sky: SiteSky): number {
  const flat = Math.sin(Math.max(sky.earth.elDeg, 1) * (Math.PI / 180));
  return NIGHT_KEY / (FILL * flat * sunlitExposure(2));
}

/** 0 over the stretch, 1 under it, smooth in the log altitude between. */
function adaptation(altitude: number, [from, to]: Stretch): number {
  const x = Math.min(1, Math.max(0, (Math.log(from) - Math.log(altitude)) / (Math.log(from) - Math.log(to))));
  return x * x * x * (x * (x * 6 - 15) + 10);
}

/** The light of a frame `altitude` metres over the target. */
export function lightAt(sky: SiteSky, altitude: number): Light {
  const base = sunlitExposure(altitude);
  const fill = seesEarth(sky) ? FILL : 0;
  const lightCase = lightCaseOf(sky);
  if (lightCase === 'sunlit') return { exposure: base, fill, bounce: BOUNCE, stars: 0 };
  if (lightCase === 'dim') {
    return { exposure: base * DIM_GAIN ** adaptation(altitude, DIM_ADAPT), fill, bounce: BOUNCE, stars: DIM_STARS };
  }
  const gain = nightGain(sky) ** adaptation(altitude, EARTHLIT_ADAPT);
  // the scattered light keeps its brightness as the camera opens up (the
  // shadows of sunlit ground high up) down to a tenth of the Earth's light
  // on flat ground (the light scattered off Earth-lit ground at the eye)
  const flat = Math.sin(Math.max(sky.earth.elDeg, 1) * (Math.PI / 180));
  const night = (0.1 * FILL * flat) / (0.08 * sunlitExposure(2));
  return { exposure: base * gain, fill: fill * gain, bounce: Math.max(night, BOUNCE / gain), stars: 0 };
}
