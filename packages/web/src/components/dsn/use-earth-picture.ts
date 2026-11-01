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
 * The Earth's picture at an instant, worked out again only when the instant
 * or the antennas change. The small Earth draws a dot every 3°, the DSN
 * view's every 2°.
 */
import type { DsnState } from '@ventana/sim';
import { useMemo } from 'react';
import { earthPicture, type EarthPicture } from '../../dsn/earth-picture';
import { landDots } from '../../dsn/land-dots';

const LOOKS = {
  small: { r: 60, stride: 3 },
  wide: { r: 180, stride: 2 },
} as const;

export function useEarthPicture(
  atMs: number,
  state: DsnState,
  wide: boolean,
): EarthPicture {
  const { r, stride } = LOOKS[wide ? 'wide' : 'small'];
  const dots = useMemo(() => landDots(stride), [stride]);
  const { active } = state;
  const above = state.above.join(',');
  return useMemo(
    () => earthPicture({
      atMs,
      r,
      dots,
      wide,
      state: { active, above: above ? (above.split(',') as DsnState['above']) : [] },
    }),
    [atMs, r, dots, wide, active, above],
  );
}
