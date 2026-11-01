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
 * The terrain's line on the horizon strip (VENT-40), on the strip's
 * scale. Pure.
 */
import {
  CENTIDEG_PER_DEG,
  type HorizonProfile,
} from '@ventana/sim';
import { yOfEl, type StripScale } from './strip-scale';

/**
 * The terrain's skyline from south to south through north, as SVG
 * points «x,y x,y …», one per bin and the first again at the end.
 */
export function skyline(profile: HorizonProfile, scale: StripScale): string {
  const values = profile.centiDeg;
  const n = values.length;
  const points: string[] = [];
  for (let k = 0; k <= n; k++) {
    const bin = (k + n / 2) % n;
    const el = (values[bin] ?? 0) / CENTIDEG_PER_DEG;
    const x = (k / n) * scale.width;
    points.push(`${x.toFixed(1)},${yOfEl(scale, el).toFixed(1)}`);
  }
  return points.join(' ');
}
