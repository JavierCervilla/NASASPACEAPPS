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
 * Runs the per-surface lenses (lens-surfaces.ts) only while the glass
 * gate's `data-glass` is «liquid», and takes them down when the page
 * switches to frosted (a failed frame probe, a changed setting).
 */
import { lensSet } from './lens-set';

/** Watches the root's `data-glass` and keeps the lenses in step with it. */
export function startLenses(doc: Document): void {
  const defs = doc.querySelector('.glass-defs');
  if (!defs) return;
  let lenses: { stop(): void } | null = null;
  const sync = (): void => {
    const liquid = doc.documentElement.dataset['glass'] === 'liquid';
    if (liquid && !lenses) lenses = lensSet({ doc, defs });
    if (!liquid && lenses) {
      lenses.stop();
      lenses = null;
    }
  };
  new MutationObserver(sync).observe(doc.documentElement,
    { attributes: true, attributeFilter: ['data-glass'] });
  sync();
}
