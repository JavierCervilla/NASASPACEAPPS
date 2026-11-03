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
 * The loader's plan around its tiles (VENT-60, B): the scope's soft edge
 * and rim, the view's field as a soft wedge from the point, north and the
 * real Sun and Earth on the rim at their azimuths from the heading, the
 * point as the app's pin C, and which ring of tiles the plan shows.
 */
import { useId, type CSSProperties } from 'react';
import type { PlanLayout } from '../../../terrain/loader/plan-geometry';
import { rimAt } from '../../../terrain/loader/plan-geometry';
import { ringLabel } from '../../../terrain/loader/loader-words';
import type { SkyDirs } from '../../../terrain/scene/scene-types';
import { useI18n } from '../../i18n-context';
import { LoaderBody } from './LoaderBody';

interface Props {
  readonly layout: PlanLayout;
  readonly cx: number;
  readonly yawDeg: number;
  readonly halfDeg: number;
  readonly sky: SkyDirs;
  /** The ring the plan shows: 0 (2 km) or 1 (8 km). */
  readonly level: number;
}

/** The field's wedge, from the point to the rim, as an SVG path. */
const wedgeOf = (r: number, halfDeg: number): string => {
  const [a, b] = [rimAt(-halfDeg, 0, r), rimAt(halfDeg, 0, r)];
  return `M0 0L${a[0]} ${a[1]}A${r} ${r} 0 0 1 ${b[0]} ${b[1]}Z`;
};

/** The scope's shading: its soft edge, rim and the field's wedge. */
function Scope({ r, halfDeg }: { r: number; halfDeg: number }) {
  const [edge, field] = [useId(), useId()];
  return (
    <svg className="loader-plan__rim" width="1" height="1" aria-hidden="true">
      <defs>
        <radialGradient id={edge} r={r} cx="0" cy="0" gradientUnits="userSpaceOnUse">
          <stop offset="0.72" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.92" />
        </radialGradient>
        <radialGradient id={field} r={r} cx="0" cy="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity="0.14" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle r={r + 1} fill={`url(#${edge})`} className="loader-plan__ring" />
      <path d={wedgeOf(r, halfDeg)} fill={`url(#${field})`} />
    </svg>
  );
}

interface MarksProps {
  readonly at: (azDeg: number, k?: number) => readonly [number, number];
  readonly cx: number;
  readonly sky: SkyDirs;
}

/** North, and the real Sun and Earth on the rim. */
function RimMarks({ at, cx, sky }: MarksProps) {
  const { t } = useI18n();
  const [nx, ny] = at(0, 0.91);
  const [sx, sy] = at(sky.sunAz);
  const [ex, ey] = at(sky.earthAz);
  const north: CSSProperties = { transform: `translate(${nx}px, ${ny}px)` };
  return (
    <>
      <span className="loader-plan__north" style={north}>{t('onFoot.loader.north')}</span>
      <LoaderBody body="earth" elDeg={sky.earthEl} x={ex} y={ey}
        side={ex < cx ? 'left' : 'right'} />
      <LoaderBody body="sun" elDeg={sky.sunEl} x={sx} y={sy}
        side={sx < cx - 1 ? 'left' : 'right'} />
    </>
  );
}

export function PlanRim({ layout, cx, yawDeg, halfDeg, sky, level }: Props) {
  const i18n = useI18n();
  const r = layout.box / 2;
  const at = (az: number, k = 1): [number, number] => {
    const [x, y] = rimAt(az, yawDeg, r * k);
    return [cx + x, layout.cy + y];
  };
  const centre: CSSProperties = {
    transform: `translate(${cx}px, ${layout.cy}px)` };
  const label: CSSProperties = { transform:
    `translate(${Math.max(12, cx - r + 2)}px, ${layout.cy + r - 4}px)` };
  return (
    <>
      <div className="loader-plan__centre" style={centre}>
        <Scope r={r} halfDeg={halfDeg} />
        <span className="loader-pin" />
      </div>
      <RimMarks at={at} cx={cx} sky={sky} />
      <span className="loader-plan__label" style={label}>{ringLabel(i18n, level)}</span>
    </>
  );
}
