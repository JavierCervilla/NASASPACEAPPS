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
 * The marks on the DSN pictures' Earth: the antennas (the one listening
 * white with a soft glow, the others hollow), the point with the Moon
 * overhead, and the gradients and blur the sphere is drawn with. Colours
 * come from classes (styles/dsn.css), never inline.
 */
import type { PictureStation } from '../../dsn/earth-picture';

interface StationProps {
  readonly s: PictureStation;
  readonly glow: string;
  /** The marks' unit: the active antenna's dot radius. */
  readonly u: number;
}

export function Station({ s, glow, u }: StationProps) {
  if (!s.front) return null;
  const { x, y } = s;
  if (!s.active) {
    const sees = s.sees ? ' dsn-earth__station--sees' : '';
    const tone = `dsn-earth__station${sees}`;
    const size = { r: 0.9 * u, strokeWidth: 0.4 * u };
    return <circle className={tone} cx={x} cy={y} {...size} />;
  }
  return (
    <g className="dsn-earth__active">
      <circle className="dsn-earth__glow" cx={x} cy={y} r={5 * u} fill={`url(#${glow})`} />
      <circle className="dsn-earth__halo" cx={x} cy={y} r={2 * u} strokeWidth={0.35 * u} />
      <circle className="dsn-earth__dot" cx={x} cy={y} r={u} />
    </g>
  );
}

/** The Moon's mark: a ring with its centre dot, as the pin draws a point. */
export function MoonMark({ x, y, u }: { x: number; y: number; u: number }) {
  return (
    <g className="dsn-earth__moon">
      <circle cx={x} cy={y} r={1.7 * u} strokeWidth={0.35 * u} />
      <circle className="dsn-earth__moon-dot" cx={x} cy={y} r={0.5 * u} />
    </g>
  );
}

export interface EarthIds {
  readonly glow: string;
  readonly shade: string;
  readonly soft: string;
  readonly clip: string;
}

export function Defs({ ids, r }: { ids: EarthIds; r: number }) {
  return (
    <defs>
      <radialGradient id={ids.glow}>
        <stop offset="0" className="dsn-stop dsn-stop--glow" />
        <stop offset="1" className="dsn-stop dsn-stop--clear" />
      </radialGradient>
      <radialGradient id={ids.shade} cx="0.42" cy="0.38" r="0.62">
        <stop offset="0.55" className="dsn-stop dsn-stop--clear" />
        <stop offset="1" className="dsn-stop dsn-stop--limb" />
      </radialGradient>
      <filter id={ids.soft} x="-10%" y="-10%" width="120%" height="120%">
        <feGaussianBlur stdDeviation={r * 0.035} />
      </filter>
      <clipPath id={ids.clip}>
        <circle cx={r} cy={r} r={r} />
      </clipPath>
    </defs>
  );
}
