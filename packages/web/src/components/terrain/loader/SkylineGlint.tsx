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
 * The glint that runs out from the heading along the skyline while the
 * ground is shaped (VENT-60, A): two narrow windows, one each way, each
 * holding a bright copy of the line held still while the window travels,
 * so the whole run is two transform animations on the compositor and the
 * main thread is left to the slicer. None under reduced motion.
 */
import type { CSSProperties } from 'react';
import type { Size } from '../../../terrain/loader/band-types';

/** How far past the band's side the glint runs, px. */
const PAST_PX = 40;

interface Props {
  readonly size: Size;
  /** The skyline as an SVG path. */
  readonly ridge: string;
}

export function SkylineGlint({ size, ridge }: Props) {
  const run = size.w / 2 + PAST_PX;
  return (
    <>
      {[-1, 1].map((side) => {
        const style = { '--glint-run': `${side * run}px`,
          '--glint-w': `${size.w}px` } as CSSProperties;
        return (
          <div key={side} className="loader-glint" style={style} aria-hidden="true">
            <svg className="loader-glint__line" viewBox={`0 0 ${size.w} ${size.h}`} width={size.w} height={size.h}>
              <path d={ridge} />
            </svg>
          </div>
        );
      })}
    </>
  );
}
