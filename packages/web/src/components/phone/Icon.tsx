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
 * The phone shell's line icons, drawn from the validated canvas (the DSN
 * tab's dish, VENT-7, canvas «DsnC»; the pin,
 * VENT-37: a ring with its centre dot, canvas «Pin C»; the bookmark of
 * «Save» and the saved site's menu, canvases «Save A» and «Saved list»; the
 * gear of the Sites sheet's «Settings», VENT-57, canvas V-12). They
 * take the text colour (`currentColor`) and are hidden from assistive
 * technology: the control around them carries the name.
 */
import type { ReactElement } from 'react';

export type IconName =
  | 'globe'
  | 'calendar'
  | 'dsn'
  | 'horizon'
  | 'sites'
  | 'chevron'
  | 'search'
  | 'database'
  | 'pin'
  | 'bookmark'
  | 'bookmarkFilled'
  | 'more'
  | 'rename'
  | 'copy'
  | 'delete'
  | 'gear';

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
  dsn: [22, <g {...STROKE}><path d="M3.5 9.5a7.5 7.5 0 0 0 9 9z" /><path d="M8 14l4.5-4.5M13.5 4.5a4 4 0 0 1 4 4M13.5 1.5a7 7 0 0 1 7 7M7 20.5h6" strokeWidth="1.4" /></g>],
  horizon: [22, <g {...STROKE}><path d="M2 15h18" /><circle cx="14" cy="9" r="3" /></g>],
  sites: [22, <path {...STROKE} d="M5 6h12M5 11h12M5 16h8" />],
  chevron: [12, <path {...STROKE} d="M2 4l4 4 4-4" />],
  database: [22, <g {...STROKE}><ellipse cx="11" cy="5.5" rx="7" ry="2.5" /><path d="M4 5.5v11c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-11M4 11c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5" strokeWidth="1.4" /></g>],
  pin: [22, <g {...STROKE}><circle cx="11" cy="11" r="6.5" /><circle cx="11" cy="11" r="2.4" fill="currentColor" stroke="none" /></g>],
  search: [16, <g {...STROKE}><circle cx="7" cy="7" r="5" /><path d="M11 11l3.5 3.5" /></g>],
  bookmark: [18, <path {...STROKE} d="M5 3h8v12.5l-4-3-4 3z" />],
  bookmarkFilled: [18, <path {...STROKE} fill="currentColor" d="M5 3h8v12.5l-4-3-4 3z" />],
  more: [20, <g fill="currentColor"><circle cx="4.5" cy="10" r="1.6" /><circle cx="10" cy="10" r="1.6" /><circle cx="15.5" cy="10" r="1.6" /></g>],
  rename: [18, <path {...STROKE} d="M11.5 3.5l3 3L6 15H3v-3z" />],
  copy: [18, <g {...STROKE}><rect x="6" y="6" width="9" height="9" rx="2" /><path d="M12 3.5H5A1.5 1.5 0 0 0 3.5 5v7" /></g>],
  gear: [22, <g {...STROKE} transform="scale(0.9167)" strokeWidth="1.75"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></g>],
  delete: [18, <path {...STROKE} d="M3.5 5h11M7 5V3.5h4V5M5 5l.8 10h6.4L13 5" />],
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
