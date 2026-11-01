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
 * The Sun and the Earth on the horizon strip (VENT-40): where each stands
 * at the shared instant, whether the horizon hides it (the terrain's
 * where one is known, else the smooth sphere's 0°; never a Sun in
 * permanent shadow), and, for a body past the strip's scale, its dot
 * pinned inside the edge it went past. Pure.
 */
import {
  isAboveTerrain,
  type HorizonProfile,
  type HourSample,
} from '@ventana/sim';
import { xOfAz, yOfEl, type StripScale } from './strip-scale';

export type BodyId = 'sun' | 'earth';

export interface BodyAt {
  readonly id: BodyId;
  readonly azDeg: number;
  readonly elDeg: number;
  /** Above the horizon drawn under it. */
  readonly visible: boolean;
}

export interface StripMark extends BodyAt {
  readonly x: number;
  readonly y: number;
  /** Past the top or the bottom of the scale; null: on it. */
  readonly offScale: 'above' | 'below' | null;
}

/**
 * How far inside the edge a dot past the scale is pinned, px: room for
 * the caret beyond it (`StripDot`).
 */
export const EDGE_INSET = 11;

type Sky = Pick<
  HourSample,
  'sunEl' | 'sunAz' | 'earthEl' | 'earthAz' | 'sunHidden'
>;

/** The two bodies of `sky`, seen over `profile` (undefined: smooth). */
export function bodiesAt(sky: Sky, profile?: HorizonProfile): BodyAt[] {
  const above = (az: number, el: number): boolean =>
    profile ? isAboveTerrain(profile, az, el) : el > 0;
  const sunUp = sky.sunHidden !== true && above(sky.sunAz, sky.sunEl);
  return [
    { id: 'sun', azDeg: sky.sunAz, elDeg: sky.sunEl, visible: sunUp },
    {
      id: 'earth',
      azDeg: sky.earthAz,
      elDeg: sky.earthEl,
      visible: above(sky.earthAz, sky.earthEl),
    },
  ];
}

/** Which edge of `scale` the elevation `elDeg` went past, if any. */
function offScaleOf(scale: StripScale, elDeg: number): StripMark['offScale'] {
  if (elDeg > scale.hi) return 'above';
  return elDeg < scale.lo ? 'below' : null;
}

/** The mark of `body` on `scale`; past an edge, pinned inside it. */
function markOf(body: BodyAt, scale: StripScale): StripMark {
  const offScale = offScaleOf(scale, body.elDeg);
  const inset = Math.min(EDGE_INSET, scale.height / 2);
  let y = yOfEl(scale, body.elDeg);
  if (offScale === 'above') y = inset;
  if (offScale === 'below') y = scale.height - inset;
  return { ...body, x: xOfAz(body.azDeg, scale.width), y, offScale };
}

/** The marks of `bodies` on `scale`. */
export function stripMarks(
  bodies: readonly BodyAt[],
  scale: StripScale,
): StripMark[] {
  return bodies.map((body) => markOf(body, scale));
}
