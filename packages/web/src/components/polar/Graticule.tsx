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
 * The polar map's grid (validated canvas «Polar map»): a meridian every
 * 30°, the 85° S parallel dashed, the rim at 80° S, and the labels 0°,
 * 90° E, 180°, 90° W and 85° S. Drawn on the map's unit disk, so it lines
 * up with the image and the markers at any size. Decorative: the map's
 * name says what it shows.
 */
import { toPolarMap } from '../../lib/polar-projection';

const MERIDIANS = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
/** The 85° S parallel's radius on the unit disk. */
const PARALLEL_R = -toPolarMap({ lat: -85, lonEast: 0 }).y;

function Lines() {
  return (
    <svg className="graticule" viewBox="-1 -1 2 2" aria-hidden="true">
      {MERIDIANS.map((lon) => {
        const { x, y } = toPolarMap({ lat: -80, lonEast: lon });
        return <line key={lon} x1={0} y1={0} x2={x} y2={y} />;
      })}
      <circle className="graticule__parallel" r={PARALLEL_R} />
      <circle className="graticule__rim" r={1} />
    </svg>
  );
}

export function Graticule() {
  // On the 180° meridian, where no site's label runs.
  const parallelTop = `${50 + 50 * PARALLEL_R}%`;
  return (
    <>
      <Lines />
      <span className="graticule-label graticule-label--top" aria-hidden="true">0°</span>
      <span className="graticule-label graticule-label--right" aria-hidden="true">90° E</span>
      <span className="graticule-label graticule-label--bottom" aria-hidden="true">180°</span>
      <span className="graticule-label graticule-label--left" aria-hidden="true">90° W</span>
      <span
        className="graticule-label graticule-label--parallel"
        style={{ top: parallelTop }}
        aria-hidden="true"
      >
        85° S
      </span>
    </>
  );
}
