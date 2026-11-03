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
 * The Earth as the Moon sees it (VENT-7, canvases «DsnA» and «DsnC»):
 * graphite oceans, silver land dots, the night side from the real
 * terminator, the three DSN antennas with the one listening white and
 * glowing; in the DSN view also the point with the Moon overhead, the ring
 * where the Moon stands above 10° and the labels. Never a signal colour:
 * the DSN is not Sun, Earth or window. One image for assistive technology,
 * named by `label`; the words beside it say the same.
 */
import { DSN_MIN_ELEVATION_DEG } from '@ventana/sim';
import { useId } from 'react';
import { degText } from '../../dsn/clock-text';
import type { EarthPicture } from '../../dsn/earth-picture';
import { useI18n } from '../i18n-context';
import { EarthLabels } from './EarthLabels';
import { Defs, LandMask, MoonMark, Station, type EarthIds } from './EarthMarks';

interface Props {
  readonly picture: EarthPicture;
  /** The DSN view's look: the Moon's mark, the ring and the labels. */
  readonly wide: boolean;
  readonly label: string;
}

/** The marks' unit as a share of the radius: bigger on the small Earth. */
const MARK_SHARE = { small: 0.065, wide: 0.026 } as const;
/** The land dots' width as a share of the radius: about half their spacing. */
const DOT_SHARE = { small: 0.042, wide: 0.022 } as const;

/** The sphere: air, ocean, land, night and the limb's shade. */
interface SphereProps {
  readonly picture: EarthPicture;
  readonly ids: EarthIds;
  readonly dot: number;
  /** The marks' unit, which sizes the moats of the land mask. */
  readonly u: number;
}

function Sphere({ picture, ids, dot, u }: SphereProps) {
  const { r } = picture;
  return (
    <>
      <circle className="dsn-earth__air" cx={r} cy={r} r={r * 1.015} />
      <circle className="dsn-earth__ocean" cx={r} cy={r} r={r} />
      <LandMask id={ids.moat} r={r} stations={picture.stations} u={u} />
      <path className="dsn-earth__land" d={picture.land} strokeWidth={dot}
        mask={`url(#${ids.moat})`} />
      <path
        className="dsn-earth__night"
        d={picture.night}
        filter={`url(#${ids.soft})`}
        clipPath={`url(#${ids.clip})`}
      />
      <circle cx={r} cy={r} r={r} fill={`url(#${ids.shade})`} />
    </>
  );
}

function useIds(): EarthIds {
  const base = useId().replace(/:/g, '');
  return { glow: `${base}g`, shade: `${base}s`, soft: `${base}n`,
    clip: `${base}c`, moat: `${base}m` };
}

interface DrawingProps {
  readonly picture: EarthPicture;
  readonly wide: boolean;
  readonly ids: EarthIds;
}

/** The SVG: the sphere, and the ring, the Moon's mark and the antennas. */
function Drawing({ picture, wide, ids }: DrawingProps) {
  const { r, moon } = picture;
  const look = wide ? 'wide' : 'small';
  const [u, dot] = [MARK_SHARE[look] * r, DOT_SHARE[look] * r];
  const side = 2 * r;
  return (
    <svg viewBox={`0 0 ${side} ${side}`} overflow="visible" aria-hidden="true">
      <Defs ids={ids} r={r} />
      <Sphere picture={picture} ids={ids} dot={dot} u={u} />
      {wide ? <path className="dsn-earth__ring" d={picture.ring.d} /> : null}
      {wide && moon.front ? <MoonMark x={moon.x} y={moon.y} u={u} /> : null}
      {picture.stations.map((s) => (
        <Station key={s.complex} s={s} glow={ids.glow} u={u} />
      ))}
    </svg>
  );
}

export function EarthFigure({ picture, wide, label }: Props) {
  const ids = useIds();
  const i18n = useI18n();
  const deg = degText(i18n, DSN_MIN_ELEVATION_DEG);
  const texts = {
    moonText: i18n.t('dsn.moonOverhead'),
    ringText: i18n.t('dsn.moonAbove', { deg }),
  };
  return (
    <div className="dsn-earth" data-wide={wide} role="img" aria-label={label}>
      <Drawing picture={picture} wide={wide} ids={ids} />
      {wide ? <EarthLabels picture={picture} {...texts} /> : null}
    </div>
  );
}
