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
 * The sky at the shared instant (VENT-34): black, faint stars drawn by a
 * shader on a far sphere (illustrative, seeded), the Sun's disc at its
 * true size and direction with a small glare, the key light with hard
 * shadows near the point, and the Earth at its true size
 * wearing the Blue Marble, its phase from the Sun's direction. The fill
 * (sky-light.ts) is the Earth's light, the ground's bounce and a dim floor.
 */
import {
  AdditiveBlending,
  BackSide,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  type ShaderMaterial,
} from 'three';
import { earthMaterial, glareMaterial, starsMaterial } from './sky-materials';

/** How far the bodies are drawn, metres: past the rings and the backdrop. */
export const SUN_M = 500_000;
export const EARTH_M = 450_000;
const STARS_M = 900_000;
const RAD = Math.PI / 180;
/** Apparent radii, degrees: the Sun's mean, the Earth's from the Moon. */
const SUN_R_DEG = 0.2666;
const EARTH_R_DEG = 0.95;
const GLARE_R_DEG = 2.5;
/**
 * The legibility fill, indirect: near neutral with a cool hint of
 * earthshine from above, darker from below, so slopes and rocks keep
 * their form where the Sun does not reach. Three.js divides
 * indirect light by pi: this is a dim grey on level ground.
 */
export const FILL = {
  sky: 0x9097a8, ground: 0x8a857d, intensity: 1.1,
} as const;
/** The ground's bounce by day, warm as the sunlit regolith. */
export const BOUNCE_COLOUR = 0xe8e0d2;
/** The Sun's key light, relative to which the fill is set. */
export const KEY_INTENSITY = 4;

export interface SkyParts {
  readonly group: Group;
  readonly sun: Group;
  readonly earth: Mesh<SphereGeometry, ShaderMaterial>;
  readonly light: DirectionalLight;
  readonly earthshine: DirectionalLight;
  /**
   * The ground's bounce by day; at night, when there is no bounce, the
   * low reading light (night-light.ts), so the night adds no light the
   * day's shaders would pay for.
   */
  readonly bounce: DirectionalLight;
  /** The hemisphere floor: lowered at night (night-light.ts). */
  readonly fill: HemisphereLight;
}

/** A sphere `distance` away that looks `radiusDeg` across. */
const ball = (distance: number, radiusDeg: number, segments: number) =>
  new SphereGeometry(distance * Math.tan(radiusDeg * RAD), segments,
    segments / 2);

/** The Sun's disc and its glare, as a group placed by its direction. */
function sunGroup(): Group {
  const sun = new Group();
  const disc = new Mesh(ball(SUN_M, SUN_R_DEG, 24),
    new MeshBasicMaterial({ color: 0xfff6e0, toneMapped: false }));
  const glare = new Mesh(ball(SUN_M * 0.99, GLARE_R_DEG, 24),
    glareMaterial(AdditiveBlending));
  sun.add(disc, glare);
  return sun;
}

/** The key light, its shadows over the near field only. */
function sunLight(shadowPx: number): DirectionalLight {
  const light = new DirectionalLight(0xfff3e4, KEY_INTENSITY);
  light.castShadow = true;
  light.shadow.mapSize.set(shadowPx, shadowPx);
  Object.assign(light.shadow.camera, { left: -60, right: 60, top: 60,
    bottom: -60, near: 1, far: 1400 });
  light.shadow.bias = -0.0012;
  light.shadow.normalBias = 0.14;
  light.shadow.radius = 2;
  return light;
}

/** The sky's objects and lights, in a group. */
export function createSky(seed: number, shadowPx: number): SkyParts {
  const group = new Group();
  const sun = sunGroup();
  const earth = new Mesh(ball(EARTH_M, EARTH_R_DEG, 48), earthMaterial());
  const stars = new Mesh(new SphereGeometry(STARS_M, 32, 16),
    starsMaterial(seed, BackSide));
  stars.renderOrder = -1;
  const light = sunLight(shadowPx);
  // Earthshine, the ground's bounce and a floor lifted for legibility.
  const fill = new HemisphereLight(FILL.sky, FILL.ground, FILL.intensity);
  const earthshine = new DirectionalLight(0xbfd2ff, 0);
  const bounce = new DirectionalLight(BOUNCE_COLOUR, 0);
  group.add(stars, sun, earth, light, light.target, fill, earthshine, bounce);
  return { group, sun, earth, light, earthshine, bounce, fill };
}
