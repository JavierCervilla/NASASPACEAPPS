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
 * B, the plan while the near tiles land (VENT-60): a round scope over the
 * point from above, the heading up, each tile of 2 and 8 km shaded as it
 * comes in its real order, zoomed out once the 8 km tiles start. When the
 * near tiles are in it lies down toward the heading (a CSS tilt) and
 * fades, as the skyline takes over (on-foot-loader.css).
 */
import { useMemo, type CSSProperties } from 'react';
import type { LatLon } from '../../../lib/polar-projection';
import type { Size } from '../../../terrain/loader/band-types';
import { planLayout } from '../../../terrain/loader/plan-geometry';
import { NEAR_LEVELS } from '../../../terrain/loader/loader-phase';
import { frameAt } from '../../../terrain/ring/ring-frame';
import type { RingProgress } from '../../../terrain/ring/ring-progress';
import type { SkyDirs } from '../../../terrain/scene/scene-types';
import { PlanRim } from './PlanRim';
import { PlanTiles } from './PlanTiles';
import { useTileShader } from './use-tile-shader';

export interface PlanProps {
  readonly progress: RingProgress;
  readonly size: Size;
  readonly phone: boolean;
  readonly point: LatLon;
  readonly sky: SkyDirs;
  readonly yawDeg: number;
  /** Half the scene's field across, degrees: the wedge. */
  readonly halfDeg: number;
}

/** The plan's measures as custom properties, for its CSS and its tilt. */
function planStyle(size: Size, box: number, cy: number): CSSProperties {
  return {
    '--plan-box': `${box}px`, '--plan-cy': `${cy}px`,
    '--plan-dy': `${size.h * 0.86 - cy}px`,
    '--plan-depth': `${Math.round(size.h * 0.55)}px`,
    '--plan-eye': `${Math.round(size.h / 2 + 10)}px`,
  } as CSSProperties;
}

export function LoaderPlan(props: PlanProps) {
  const { progress, size, phone, point, sky, yawDeg, halfDeg } = props;
  const layout = planLayout(size, phone);
  const frame = useMemo(() => frameAt(point, 0), [point]);
  const shade = useTileShader(frame, sky.sunAz);
  const near = progress.tiles.filter((t) => t.level < NEAR_LEVELS);
  const zoomed = near.some((t) => t.level === 1 && t.fate === 'landed');
  return (
    <div className="loader-plan" data-zoom={zoomed ? 'out' : 'near'} style={planStyle(size, layout.box, layout.cy)}>
      <div className="loader-plan__tilt">
        <div className="loader-plan__scope">
          {progress.scheme ? (
            <PlanTiles tiles={near} scheme={progress.scheme} frame={frame}
              yawDeg={yawDeg} pxPerM={layout.pxPerM} shade={shade} />
          ) : null}
        </div>
        <PlanRim layout={layout} cx={size.w / 2} yawDeg={yawDeg}
          halfDeg={halfDeg} sky={sky} level={zoomed ? 1 : 0} />
      </div>
    </div>
  );
}
