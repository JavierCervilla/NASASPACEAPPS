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
 * The box a horizon strip label takes (VENT-40): beside its dot, its
 * width estimated from its length at the strip's font size, wide enough
 * for the system font, so placing labels needs no layout. Pure.
 */

export interface Labelled {
  readonly x: number;
  readonly y: number;
  readonly label: string;
}

export interface LabelPlace {
  readonly labelX: number;
  readonly labelY: number;
  readonly anchor: 'start' | 'end';
}

export interface LabelFrame {
  readonly width: number;
  readonly height: number;
  /** The labels' font size, px. */
  readonly fontPx: number;
}

/** A label's gap from its dot, in ems, and its widest character. */
const GAP_EM = 0.9;
const CHAR_EM = 0.62;
/** Ascent, descent and the room between two labels, in ems. */
export const ASCENT_EM = 0.8;
export const DESCENT_EM = 0.25;
export const SPACE_EM = 0.2;

export interface Box {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

/** The box `item`'s label takes at `place`, in `frame`. */
export function boxOf(
  item: Labelled,
  place: LabelPlace,
  frame: LabelFrame,
): Box {
  const width = item.label.length * CHAR_EM * frame.fontPx;
  const left = place.anchor === 'start' ? place.labelX : place.labelX - width;
  const top = place.labelY - ASCENT_EM * frame.fontPx;
  const bottom = place.labelY + DESCENT_EM * frame.fontPx;
  return { left, right: left + width, top, bottom };
}

/** `item`'s label on `side` of its dot, its baseline at the dot's centre. */
export function beside(
  item: Labelled,
  side: 'start' | 'end',
  frame: LabelFrame,
): LabelPlace {
  const gap = GAP_EM * frame.fontPx;
  const labelX = side === 'start' ? item.x + gap : item.x - gap;
  const labelY = item.y + ((ASCENT_EM - DESCENT_EM) / 2) * frame.fontPx;
  return { labelX, labelY, anchor: side };
}

/** Whether `box` stays across the strip. */
export function fits(box: Box, frame: LabelFrame): boolean {
  return box.left >= 0 && box.right <= frame.width;
}

/** Whether two boxes come closer than `space`. */
export function touch(a: Box, b: Box, space: number): boolean {
  const across = a.left < b.right + space && b.left < a.right + space;
  return across && a.top < b.bottom + space && b.top < a.bottom + space;
}

