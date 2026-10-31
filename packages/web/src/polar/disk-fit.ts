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
 * The polar disk's size and place in its panel, clear of the keys that
 * float in the panel's corners (VENT-10: the Layers key covered part of
 * the disk at 1440 x 900, where the astronaut could not be dropped). The
 * disk stays vertically centred and as large as the panel allows; it
 * moves sideways, away from the keys, before it shrinks. Its edge labels
 * («90° W») need a strip beside it, clear of a key at their height. Pure.
 */

/** A key's box in the panel, px from its top left. */
export interface KeyBox {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

export interface DiskFit {
  /** The disk's side, px. */
  readonly size: number;
  /** Its centre's x, px from the panel's left. */
  readonly centreX: number;
}

/** Room for an edge label beside the disk, and the gap to a key, px. */
export const LABEL_PX = 52;
const GAP_PX = 12;
/** Room above and below for the 0° and 180° labels, px. */
const LABEL_ROWS_PX = 64;
const MAX_SIZE = 720;
const MIN_RADIUS = 60;

/**
 * How far the centre must stay from `key` (on the left when `left`) for a
 * disk of radius `r` centred at height `cy`.
 */
function clearance(key: KeyBox, r: number, cy: number): number {
  const beside = cy >= key.top - GAP_PX && cy <= key.bottom + GAP_PX;
  if (beside) return r + LABEL_PX + GAP_PX;
  const dy = cy < key.top ? key.top - cy : cy - key.bottom;
  return Math.sqrt(Math.max(0, (r + GAP_PX) ** 2 - dy ** 2));
}

/** The centre's allowed range for radius `r`, or null when there is none. */
function centreRange(
  panel: { width: number; height: number },
  keys: readonly KeyBox[],
  r: number,
): [number, number] | null {
  const cy = panel.height / 2;
  let lo = r + LABEL_PX;
  let hi = panel.width - r - LABEL_PX;
  for (const key of keys) {
    const leftSide = key.left + key.right < panel.width;
    const room = clearance(key, r, cy);
    if (leftSide) lo = Math.max(lo, key.right + room);
    else hi = Math.min(hi, key.left - room);
  }
  return lo <= hi ? [lo, hi] : null;
}

/** The largest disk clear of `keys`, centred as near the middle as it can. */
export function fitDisk(
  panel: { width: number; height: number },
  keys: readonly KeyBox[],
): DiskFit {
  const top = Math.min(
    (panel.height - LABEL_ROWS_PX) / 2, MAX_SIZE / 2,
  );
  for (let r = Math.floor(top); r >= MIN_RADIUS; r -= 2) {
    const range = centreRange(panel, keys, r);
    if (!range) continue;
    const middle = panel.width / 2;
    const centreX = Math.min(Math.max(middle, range[0]), range[1]);
    return { size: 2 * r, centreX };
  }
  return { size: 2 * MIN_RADIUS, centreX: panel.width / 2 };
}
