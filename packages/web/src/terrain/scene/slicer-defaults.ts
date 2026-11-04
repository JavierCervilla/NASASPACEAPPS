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

/** The slicer's defaults (slicer.ts): its budget, frame gap and clocks. */
import type { SlicerDeps } from './slicer';

/** The turn's budget: a frame at 60 Hz is 16 ms. */
const BUDGET_MS = 12;
/**
 * A frame draws every ring tile built so far: on a slow renderer one costs
 * far more than the slice that asked for it, so work in flight asks for at
 * most one frame in this long, and the last slice always asks.
 */
const FRAME_GAP_MS = 1500;
/** What a slicer runs with unless a dependency is given. */
export const DEFAULTS: Required<Omit<SlicerDeps, 'invalidate'>> = {
  now: () => performance.now(),
  schedule: (fn) => window.setTimeout(fn, 0),
  cancel: (id) => window.clearTimeout(id),
  budgetMs: BUDGET_MS,
  frameGapMs: FRAME_GAP_MS,
  onJob: () => undefined,
};

