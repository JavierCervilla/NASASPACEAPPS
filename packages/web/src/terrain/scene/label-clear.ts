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
 * What the on-foot labels keep clear of (VENT-106): the elements of the
 * view's stage marked `data-label-clear`, the night's notice while it
 * shows. They are React's and come, go and change size without a frame
 * of the scene, so the labels are placed again when they do.
 */
import type { Box } from '../../polar/layout-geometry';

/** The mark of an element the labels keep clear of. */
export const LABEL_CLEAR = 'data-label-clear';

/** The boxes of `stage`'s marked elements, in viewport px. */
export function clearBoxes(stage: Element | null): Box[] {
  if (!stage) return [];
  return [...stage.querySelectorAll(`[${LABEL_CLEAR}]`)]
    .map((el) => el.getBoundingClientRect());
}

/**
 * Calls `onChange` when a marked element of `stage` comes, goes or
 * changes size; changes inside `own` (the labels' layer) are not one.
 * Returns what stops it.
 */
export function watchClear(
  stage: Element,
  own: Node,
  onChange: () => void,
): () => void {
  const sizes = new ResizeObserver(onChange);
  const watch = (): void => {
    sizes.disconnect();
    for (const el of stage.querySelectorAll(`[${LABEL_CLEAR}]`)) {
      sizes.observe(el);
    }
    onChange();
  };
  const marks = new MutationObserver((records) => {
    if (records.some((record) => !own.contains(record.target))) watch();
  });
  marks.observe(stage, { subtree: true, childList: true, attributes: true,
    attributeFilter: [LABEL_CLEAR] });
  watch();
  return () => {
    sizes.disconnect();
    marks.disconnect();
  };
}
