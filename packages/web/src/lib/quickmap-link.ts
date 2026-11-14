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
 * The address that opens LROC QuickMap centred on a point (VENT-125,
 * canvas option A): the map's own projections, read off its LAT/LON
 * readout at the centre, on the sphere of the IAU Moon. South of 60° S the
 * south polar stereographic (proj 27), north of 60° N the north one (proj
 * 26), the equidistant cylindrical (proj 16) between; the view is 40 km by
 * 25 km around the point, in whole metres. Pure.
 */

/** QuickMap's lunar radius, m. */
const MOON_RADIUS_M = 1737400;
const HALF_WIDTH_M = 20000;
const HALF_HEIGHT_M = 12500;
const POLAR_LAT_DEG = 60;
const PROJ = { south: 27, north: 26, cylindrical: 16 } as const;
const ORIGIN = 'https://quickmap.lroc.im-ldi.com/';
const RAD = Math.PI / 180;

export interface MapPoint {
  readonly lat: number;
  readonly lonEast: number;
}

interface Projected {
  readonly x: number;
  readonly y: number;
  readonly proj: number;
}

/** East longitude in (−180°, 180°]. */
export function wrapLon(lonEast: number): number {
  return 180 - ((((180 - lonEast) % 360) + 360) % 360);
}

/** The point in QuickMap's projection for its latitude, in metres. */
export function projectForQuickmap({ lat, lonEast }: MapPoint): Projected {
  const lon = lonEast * RAD;
  if (lat <= -POLAR_LAT_DEG) {
    const rho = 2 * MOON_RADIUS_M * Math.tan(((90 + lat) / 2) * RAD);
    return { x: rho * Math.sin(lon), y: rho * Math.cos(lon), proj: PROJ.south };
  }
  if (lat >= POLAR_LAT_DEG) {
    const rho = 2 * MOON_RADIUS_M * Math.tan(((90 - lat) / 2) * RAD);
    const y = -rho * Math.cos(lon);
    return { x: rho * Math.sin(lon), y, proj: PROJ.north };
  }
  return {
    x: MOON_RADIUS_M * wrapLon(lonEast) * RAD,
    y: MOON_RADIUS_M * lat * RAD,
    proj: PROJ.cylindrical,
  };
}

/** QuickMap's address with the view centred on `point`. */
export function quickmapUrl(point: MapPoint): string {
  const { x, y, proj } = projectForQuickmap(point);
  const cx = Math.round(x);
  const cy = Math.round(y);
  const extent = [
    cx - HALF_WIDTH_M,
    cy - HALF_HEIGHT_M,
    cx + HALF_WIDTH_M,
    cy + HALF_HEIGHT_M,
  ].join(',');
  return `${ORIGIN}?prjExtent=${extent}&proj=${proj}`;
}
