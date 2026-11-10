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
 * The places moon-scene can build a Moon around. A site is a target point
 * on the south polar plane and, per level of Ventana Lunar's levelled tiles
 * (docs/terrain-api.md), the half-side of the square read around it; a
 * finer real DTM (the app's fine tiles, ASSETS.md) is laid over it where it
 * covers. Add a site here to build another place; the tiles are cached by
 * key, so sites that overlap share them.
 */
import { fileURLToPath } from 'node:url';

/** The sphere the tiles' heights are measured over, metres. */
export const RADIUS_M = 1_737_400;

/** The API that serves the tiles (Ventana Lunar's own, VENT-46). */
export const API = process.env.MOON_SCENE_API ?? 'https://nasa.universelle.io';

/** Tile side and node spacing per level, metres of the polar plane. */
export const LEVEL_SIZES = [
  { level: 0, sizeM: 2000, spacingM: 15.625 },
  { level: 1, sizeM: 8000, spacingM: 62.5 },
  { level: 2, sizeM: 32000, spacingM: 250 },
  { level: 3, sizeM: 128000, spacingM: 1000 },
];

const fineTile = (place) => fileURLToPath(new URL(`../../../../web/public/fine-tiles/${place}/`, import.meta.url));

export const SITES = {
  /** IM-2 Athena's touchdown point on Mons Mouton; LROC NAC DTM NOBILE03 at 5 m just south of it. */
  im2: {
    id: 'im2',
    latDeg: -84.7906,
    lonEastDeg: 29.1957,
    /** half-side of the square read around the target, per level, metres */
    radiiM: [8000, 32000, 160000, 520000],
    /** a fine tile of the app (5 m on the polar plane), or null */
    fine: fineTile('mons-mouton'),
    /** the site's id in packages/sim/data/horizons.json (its LOLA horizon, observer 2 m), or null */
    horizonId: 'im2-athena',
  },
};

/** A CLI's `--name value`, or the fallback. */
export function argOf(name, fallback, argv = process.argv) {
  const i = argv.indexOf(`--${name}`);
  return i > 0 ? argv[i + 1] : fallback;
}

/** The site of a CLI's `--site` (im2 when left out). */
export function siteOf(argv = process.argv) {
  const id = argOf('site', 'im2', argv);
  const site = SITES[id];
  if (!site) throw new Error(`unknown site ${id}; known: ${Object.keys(SITES).join(', ')}`);
  return site;
}

/** A south-polar point's place on the polar stereographic plane, metres. */
export function polarXY(latDeg, lonEastDeg) {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonEastDeg * Math.PI) / 180;
  const k = (2 * RADIUS_M) / (1 - Math.sin(lat));
  return [k * Math.cos(lat) * Math.sin(lon), k * Math.cos(lat) * Math.cos(lon)];
}

/** The levels of a site, each with the tile keys of its square. */
export function levelsOf(site) {
  const [x, y] = polarXY(site.latDeg, site.lonEastDeg);
  return LEVEL_SIZES.map((lv, i) => {
    const radiusM = site.radiiM[i];
    const x0 = Math.floor((x - radiusM) / lv.sizeM);
    const x1 = Math.floor((x + radiusM) / lv.sizeM);
    const y0 = Math.floor((y - radiusM) / lv.sizeM);
    const y1 = Math.floor((y + radiusM) / lv.sizeM);
    const keys = [];
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) keys.push({ x: tx, y: ty });
    return { ...lv, radiusM, keys, x0, x1, y0, y1 };
  });
}
