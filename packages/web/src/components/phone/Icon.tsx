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
 * The phone shell's line icons, drawn from the validated canvas. They
 * take the text colour (`currentColor`) and are hidden from assistive
 * technology: the control around them carries the name.
 */
import type { ReactElement } from 'react';

export type IconName =
  | 'globe'
  | 'calendar'
  | 'horizon'
  | 'sites'
  | 'chevron'
  | 'search'
  | 'database';

const STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

const SHAPES: Readonly<Record<IconName, [number, ReactElement]>> = {
  globe: [22, <g {...STROKE}><circle cx="11" cy="11" r="8" /><path d="M3 11h16M11 3c3 3 3 13 0 16M11 3c-3 3-3 13 0 16" strokeWidth="1.4" /></g>],
  calendar: [22, <g {...STROKE}><rect x="3" y="4" width="16" height="15" rx="3" /><path d="M3 9h16M8 4v15" strokeWidth="1.4" /></g>],
  horizon: [22, <g {...STROKE}><path d="M2 15h18" /><circle cx="14" cy="9" r="3" /></g>],
  sites: [22, <path {...STROKE} d="M5 6h12M5 11h12M5 16h8" />],
  chevron: [12, <path {...STROKE} d="M2 4l4 4 4-4" />],
  database: [22, <g {...STROKE}><ellipse cx="11" cy="5.5" rx="7" ry="2.5" /><path d="M4 5.5v11c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-11M4 11c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5" strokeWidth="1.4" /></g>],
  search: [16, <g {...STROKE}><circle cx="7" cy="7" r="5" /><path d="M11 11l3.5 3.5" /></g>],
};

/** The icon `name` at its canvas size. */
export function Icon({ name }: { readonly name: IconName }) {
  const [size, shape] = SHAPES[name];
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      focusable="false"
    >
      {shape}
    </svg>
  );
}
