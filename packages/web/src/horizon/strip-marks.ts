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
 * permanent shadow), and where its label goes: beside the dot, to the
 * left near the right edge, two close labels pulled apart. Pure.
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
  readonly labelX: number;
  readonly labelY: number;
  readonly anchor: 'start' | 'end';
}

/** Room a label needs from the right edge, and between two labels. */
const LABEL_ROOM = { right: 72, across: 76, up: 12 } as const;
/** The label's gap from its dot, and its baseline under the centre. */
const LABEL_GAP = 9;
const BASELINE = 3.5;

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

/** The mark of `body` on `scale`, its label beside it. */
function markOf(body: BodyAt, scale: StripScale): StripMark {
  const x = xOfAz(body.azDeg, scale.width);
  const y = yOfEl(scale, body.elDeg);
  const right = x < scale.width - LABEL_ROOM.right;
  const labelX = right ? x + LABEL_GAP : x - LABEL_GAP;
  const anchor = right ? 'start' : 'end';
  return { ...body, x, y, labelX, labelY: y + BASELINE, anchor };
}

/** `a` and `b` with their labels moved apart when they would touch. */
function apart(a: StripMark, b: StripMark): [StripMark, StripMark] {
  const near = Math.abs(a.labelX - b.labelX) < LABEL_ROOM.across;
  const short = LABEL_ROOM.up - Math.abs(a.labelY - b.labelY);
  if (!near || short <= 0) return [a, b];
  const shift = a.labelY <= b.labelY ? short / 2 : -short / 2;
  return [
    { ...a, labelY: a.labelY - shift },
    { ...b, labelY: b.labelY + shift },
  ];
}

/** The marks of `bodies` on `scale`, labels clear of each other. */
export function stripMarks(
  bodies: readonly BodyAt[],
  scale: StripScale,
): StripMark[] {
  const marks = bodies.map((body) => markOf(body, scale));
  const [first, second] = marks;
  if (!first || !second) return marks;
  return apart(first, second);
}
