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
 * The on-foot labels never cover each other (VENT-52): at 200 % text the
 * ridge's label and a ring's can land on the same pixels. Each label is
 * kept in the order given unless it overlaps one already kept; a label
 * left out is hidden for the frame, as the globe's graticule does. None
 * stands under what the view keeps clear (VENT-106: the night's notice
 * over the caption, at 200 % text as wide as a phone).
 */
import { overlaps, type Box } from '../../polar/layout-geometry';

/** Which of `boxes` stay shown, none over `clear`; null: hidden already. */
export function keptLabels(
  boxes: readonly (Box | null)[],
  clear: readonly Box[] = [],
): boolean[] {
  const taken: Box[] = [...clear];
  return boxes.map((box) => {
    if (!box || taken.some((kept) => overlaps(kept, box))) return false;
    taken.push(box);
    return true;
  });
}

/** Hides each of `labels` over one before it or over a `clear` box. */
export function declutter(
  labels: readonly HTMLElement[],
  clear: readonly Box[] = [],
): void {
  const boxes = labels.map((el) =>
    el.hidden ? null : el.getBoundingClientRect());
  keptLabels(boxes, clear).forEach((kept, i) => {
    const el = labels[i];
    if (!kept && el) el.hidden = true;
  });
}
