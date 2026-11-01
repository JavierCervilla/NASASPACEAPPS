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
 * Keeps the DSN view's labels inside their Earth's picture: each label is
 * measured and moved sideways through its `--label-shift` property
 * (CSSOM, so no style attribute), again whenever the picture or a label
 * resizes (a text size change included) and when the picture changes.
 */
import { useLayoutEffect, useRef } from 'react';
import { labelShift } from '../../dsn/label-shift';

const SHIFT = '--label-shift';

/** Moves each label of `box` sideways to keep it inside `box`. */
function fitLabels(box: HTMLElement): void {
  const span = box.getBoundingClientRect();
  for (const label of box.querySelectorAll<HTMLElement>('.dsn-earth__label')) {
    const shift = parseFloat(label.style.getPropertyValue(SHIFT)) || 0;
    const rect = label.getBoundingClientRect();
    const left = rect.left - span.left - shift;
    const next = labelShift(left, rect.width, span.width);
    if (next !== shift) label.style.setProperty(SHIFT, `${next}px`);
  }
}

/** The ref for the labels' box; `picture` re-fits them when it changes. */
export function useLabelFit(picture: unknown) {
  const box = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    fitLabels(el);
    const observer = new ResizeObserver(() => fitLabels(el));
    observer.observe(el);
    el.querySelectorAll('.dsn-earth__label').forEach((l) => observer.observe(l));
    return () => observer.disconnect();
  }, [picture]);
  return box;
}
