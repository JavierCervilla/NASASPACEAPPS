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
 * The film's world: metres, origin on the ground at IM-2's touchdown point,
 * +X east, +Y up and +Z south there (Bevy's y-up, right-handed). This module
 * turns the instant's sky (sky.json, from @ventana/sim) and the terrain's
 * frame (media/mesh/terrain.json, from build-terrain.mjs) into world
 * vectors: the Moon's centre, the Sun's direction, the Earth's centre and the
 * Earth's own axes, so its face and phase are those of the instant. Pure.
 */

export type V3 = [number, number, number];

/** What sky.json holds that the film uses. */
export interface SkyFile {
  readonly sun: { readonly elDeg: number; readonly azDeg: number };
  readonly earth: { readonly elDeg: number; readonly azDeg: number; readonly distanceKm: number; readonly radiusKm: number };
  readonly subSolar: { readonly latDeg: number; readonly lonEastDeg: number };
  readonly subEarth: { readonly latDeg: number; readonly lonEastDeg: number };
  readonly subLunar: { readonly latDeg: number; readonly lonEastDeg: number };
  readonly earthPole: { readonly latDeg: number; readonly lonEastDeg: number };
}

/** What terrain.json holds: the target's ground height and local axes. */
export interface TerrainFile {
  readonly groundHeightM: number;
  readonly radiusM: number;
  readonly east: V3;
  readonly up: V3;
  readonly north: V3;
}

export interface Frame {
  /** Moon radius of the heights' sphere, and the target's ground height over it, m */
  readonly radiusM: number;
  readonly groundM: number;
  /** the Moon's centre, world */
  readonly centre: V3;
  /** the target's east, up and north as Moon-frame vectors (x 0° E, y 90° E, z north) */
  readonly east: V3;
  readonly up: V3;
  readonly north: V3;
  /** unit vector toward the Sun, world */
  readonly sun: V3;
  /** the Earth's centre, world, m; its radius, m; its own axes (x to 0° E, z north), world */
  readonly earth: V3;
  readonly earthRadiusM: number;
  readonly earthAxes: readonly [V3, V3, V3];
}

const DEG = Math.PI / 180;

export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const norm = (a: V3): V3 => scale(a, 1 / Math.hypot(a[0], a[1], a[2]));

/** The unit vector of a selenographic (or geographic) point, x to 0° E, z north. */
export function unit(latDeg: number, lonDeg: number): V3 {
  const a = latDeg * DEG;
  const o = lonDeg * DEG;
  return [Math.cos(a) * Math.cos(o), Math.cos(a) * Math.sin(o), Math.sin(a)];
}

/** The film's world frame from the instant's sky and the terrain's frame. */
export function frameOf(sky: SkyFile, terrain: TerrainFile): Frame {
  const { east, up, north, radiusM, groundHeightM } = terrain;
  const toWorld = (m: V3): V3 => [dot(m, east), dot(m, up), -dot(m, north)];
  const ground = scale(up, radiusM + groundHeightM);
  const earthMoon = scale(unit(sky.subEarth.latDeg, sky.subEarth.lonEastDeg), sky.earth.distanceKm * 1000);
  // The Earth's axes: its pole from sky.json, and its longitude 0 placed so
  // the Moon stands over the sub-lunar point.
  const z = toWorld(unit(sky.earthPole.latDeg, sky.earthPole.lonEastDeg));
  const toMoon = norm(toWorld(scale(earthMoon, -1)));
  const a = norm(sub(toMoon, scale(z, dot(toMoon, z))));
  const b = cross(z, a);
  const lon = sky.subLunar.lonEastDeg * DEG;
  const x = sub(scale(a, Math.cos(lon)), scale(b, Math.sin(lon)));
  return {
    radiusM,
    groundM: groundHeightM,
    centre: [0, -(radiusM + groundHeightM), 0],
    east,
    up,
    north,
    sun: norm(toWorld(unit(sky.subSolar.latDeg, sky.subSolar.lonEastDeg))),
    earth: toWorld(sub(earthMoon, ground)),
    earthRadiusM: sky.earth.radiusKm * 1000,
    earthAxes: [x, cross(z, x), z],
  };
}

/** A world direction's elevation and azimuth (clockwise from north) at the target, degrees. */
export function horizontal(d: V3): { elDeg: number; azDeg: number } {
  const n = norm(d);
  const az = Math.atan2(n[0], -n[2]) / DEG;
  return { elDeg: Math.asin(n[1]) / DEG, azDeg: (az + 360) % 360 };
}
