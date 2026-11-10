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
 * Where the hero film reads relief: the touchdown point and, for each of the
 * four levels of Ventana Lunar's levelled tiles (docs/terrain-api.md), the
 * square of polar-south tiles it fetches around that point. Shared by the
 * tile fetcher and the terrain builder so both read the same tiles.
 */

/** IM-2 Athena's touchdown point on Mons Mouton (east longitude). */
export const TARGET = { latDeg: -84.7906, lonEastDeg: 29.1957 };

/** The sphere the tiles' heights are measured over, metres. */
export const RADIUS_M = 1_737_400;

/** The API that serves the tiles (Ventana Lunar's own, VENT-46). */
export const API = process.env.HERO_TERRAIN_API ?? 'https://nasa.universelle.io';

/**
 * Per level: its tile side and node spacing (metres of the polar plane) and
 * the half-side of the square fetched around the target. Level 2 reaches
 * past the pole so Shackleton is real relief; level 3 covers what the camera
 * sees from a few hundred kilometres up.
 */
export const LEVELS = [
  { level: 0, sizeM: 2000, spacingM: 15.625, radiusM: 8000 },
  { level: 1, sizeM: 8000, spacingM: 62.5, radiusM: 32000 },
  { level: 2, sizeM: 32000, spacingM: 250, radiusM: 160000 },
  { level: 3, sizeM: 128000, spacingM: 1000, radiusM: 520000 },
];

/** A south-polar point's place on the polar stereographic plane, metres. */
export function polarXY(latDeg, lonEastDeg) {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonEastDeg * Math.PI) / 180;
  const z = Math.sin(lat);
  const k = (2 * RADIUS_M) / (1 - z);
  return [k * Math.cos(lat) * Math.sin(lon), k * Math.cos(lat) * Math.cos(lon)];
}

/** The tile keys of one level's square around the target. */
export function tilesOf({ sizeM, radiusM }) {
  const [x, y] = polarXY(TARGET.latDeg, TARGET.lonEastDeg);
  const keys = [];
  const x0 = Math.floor((x - radiusM) / sizeM);
  const x1 = Math.floor((x + radiusM) / sizeM);
  const y0 = Math.floor((y - radiusM) / sizeM);
  const y1 = Math.floor((y + radiusM) / sizeM);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) keys.push({ x: tx, y: ty });
  }
  return { keys, x0, x1, y0, y1 };
}
