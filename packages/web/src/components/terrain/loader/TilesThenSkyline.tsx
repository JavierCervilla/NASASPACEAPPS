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
 * The loader's picture B→A (VENT-60, the human's verdict): the plan of the
 * near tiles while they land, then the site's skyline with the scene's
 * camera while the ground is shaped, under which the scene fades in. On a
 * failure only the skyline stays, dimmed.
 */
import type { HorizonProfile } from '@ventana/sim';
import type { LatLon } from '../../../lib/polar-projection';
import type { LoaderPhase } from '../../../terrain/loader/loader-phase';
import type { LoaderCamera } from '../../../terrain/loader/skyline-camera';
import type { RingProgress } from '../../../terrain/ring/ring-progress';
import type { SkyDirs } from '../../../terrain/scene/scene-types';
import { LoaderPlan } from './LoaderPlan';
import { LoaderSkyline } from './LoaderSkyline';

export interface PictureProps {
  readonly phase: LoaderPhase | 'failed';
  readonly progress: RingProgress;
  readonly cam: LoaderCamera;
  readonly phone: boolean;
  readonly point: LatLon;
  readonly sky: SkyDirs;
  readonly profile: HorizonProfile | null;
  readonly seed: number;
}

const PLAN: ReadonlySet<PictureProps['phase']> =
  new Set(['list', 'near', 'shaping']);
const SKYLINE: ReadonlySet<PictureProps['phase']> =
  new Set(['shaping', 'handover', 'failed']);

export function TilesThenSkyline(props: PictureProps) {
  const { phase, cam, sky } = props;
  const size = { w: cam.w, h: cam.h };
  return (
    <>
      {SKYLINE.has(phase) ? (
        <LoaderSkyline cam={cam} profile={props.profile} sky={sky}
          seed={props.seed} />
      ) : null}
      {PLAN.has(phase) ? (
        <LoaderPlan progress={props.progress} size={size}
          phone={props.phone} point={props.point} sky={sky}
          yawDeg={cam.look.yawDeg} halfDeg={cam.halfDeg} />
      ) : null}
    </>
  );
}
