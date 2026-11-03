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
 * A, the skyline while the ground is shaped (VENT-60): the site's horizon
 * profile (shipped, or `/api/v1/horizon` for a custom point; the level
 * where there is none) drawn with the scene's own camera over a dark mass
 * of ground, the dashed level, faint seeded stars, and the real Sun and
 * Earth where the scene will draw them. The scene then fades in under it
 * and the line goes after (on-foot-loader.css); on a failure it stays,
 * dimmed, under the words.
 */
import { horizonAt, type HorizonProfile } from '@ventana/sim';
import { useId, useMemo } from 'react';
import type { Point, Size } from '../../../terrain/loader/band-types';
import { seededStars } from '../../../terrain/loader/loader-stars';
import {
  bodyPlace, skylinePoints, type LoaderCamera,
} from '../../../terrain/loader/skyline-camera';
import type { SkyDirs } from '../../../terrain/scene/scene-types';
import { useI18n } from '../../i18n-context';
import { LoaderBody } from './LoaderBody';
import { SkylineGlint } from './SkylineGlint';

interface Props {
  readonly cam: LoaderCamera;
  readonly profile: HorizonProfile | null;
  readonly sky: SkyDirs;
  readonly seed: number;
}

/** `points` as an SVG path. */
const pathOf = (points: readonly Point[]): string =>
  points.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
    .join('');

/** The ground's mass and the stars over it. */
function Ground({ size, ridge, seed }: { size: Size; ridge: string;
  seed: number }) {
  const id = useId();
  const stars = useMemo(() => seededStars(seed, size, size.h / 2),
    [seed, size]);
  return (
    <svg className="loader-sky" viewBox={`0 0 ${size.w} ${size.h}`} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1={size.h / 2 - 20} x2="0" y2={size.h} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#15161b" />
          <stop offset="0.35" stopColor="#0b0c10" />
          <stop offset="1" stopColor="#000" />
        </linearGradient>
      </defs>
      <g className="loader-sky__stars">
        {stars.map((s) => <rect key={`${s.x},${s.y}`} x={s.x} y={s.y} width={s.size} height={s.size} opacity={s.opacity} />)}
      </g>
      <path className="loader-sky__ground" d={`${ridge}L${size.w} ${size.h}L0 ${size.h}Z`} fill={`url(#${id})`} />
    </svg>
  );
}

/** The real Sun and Earth where the scene will draw them. */
function SkyBodies({ cam, sky }: { cam: LoaderCamera; sky: SkyDirs }) {
  const sun = bodyPlace(cam, sky.sunAz, sky.sunEl);
  const earth = bodyPlace(cam, sky.earthAz, sky.earthEl);
  return (
    <div className="loader-skyline__bodies">
      <LoaderBody body="earth" elDeg={sky.earthEl} x={earth.x} y={earth.y}
        side={earth.pinned === 1 ? 'left' : 'right'} pinned={earth.pinned} />
      <LoaderBody body="sun" elDeg={sky.sunEl} x={sun.x} y={sun.y}
        side={sun.pinned === 1 ? 'left' : 'right'} pinned={sun.pinned} />
    </div>
  );
}

export function LoaderSkyline({ cam, profile, sky, seed }: Props) {
  const i18n = useI18n();
  const size = useMemo(() => ({ w: cam.w, h: cam.h }), [cam]);
  const ridge = useMemo(() => pathOf(skylinePoints(cam,
    (az) => (profile ? horizonAt(profile, az) : 0))), [cam, profile]);
  const level = useMemo(() => skylinePoints(cam, () => 0), [cam]);
  const zero = { transform:
    `translate(12px, ${(level[0]?.[1] ?? cam.h / 2) - 3}px)` };
  return (
    <div className="loader-skyline">
      <Ground size={size} ridge={ridge} seed={seed} />
      <div className="loader-skyline__line">
        <svg className="loader-skyline__svg" viewBox={`0 0 ${size.w} ${size.h}`} aria-hidden="true">
          <path className="loader-skyline__level" d={pathOf(level)} />
          <path className="loader-skyline__ridge" d={ridge} />
        </svg>
        <span className="loader-skyline__zero" style={zero}>{`${i18n.number(0)}°`}</span>
        <SkylineGlint size={size} ridge={ridge} />
      </div>
      <SkyBodies cam={cam} sky={sky} />
    </div>
  );
}
