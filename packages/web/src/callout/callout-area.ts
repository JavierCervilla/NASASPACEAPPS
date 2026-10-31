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
 * What the callout is placed with, measured off the frame, and the part
 * of the globe host it may use. Pure.
 */
import { holds, type Box, type Point } from './box';
import type { PlaceInput } from './callout-place';

/** Room the card keeps from the visible area's edges. */
const EDGE_GAP_PX = 8;

/** What the placement needs from the page, measured off the frame. */
export interface CalloutLayout {
  /** The host's size, px. */
  readonly width: number;
  readonly height: number;
  /** The visible area's bottom, px from the host's top; no sheet: none. */
  readonly bottom: number;
  /** The card's own size, px. */
  readonly size: { readonly width: number; readonly height: number };
  /** What the card must not cover, px in the host. */
  readonly avoid: readonly Box[];
}

/**
 * The placement's input for a marker at `at`; null with no marker or one
 * outside the visible area (behind the limb, under the phone sheet).
 */
export function placeInput(
  layout: CalloutLayout,
  at: Point | null,
): PlaceInput | null {
  const { width, height, bottom, size, avoid } = layout;
  const area = {
    left: EDGE_GAP_PX,
    top: EDGE_GAP_PX,
    right: width - EDGE_GAP_PX,
    bottom: Math.min(height, bottom) - EDGE_GAP_PX,
  };
  if (!at || !holds(area, at)) return null;
  return { at, size, area, avoid };
}
