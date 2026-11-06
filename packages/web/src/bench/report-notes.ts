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
 * The report's notes under its header (VENT-81): each run's view tier, a
 * warning when the runs ran at different tiers (their figures do not
 * compare), and the error a run stopped on, if any; and the device's lines
 * over them, which every suite's report heads (VENT-104). Pure.
 */
import { tierSummary } from './results';
import type { BenchState } from './types';

/** The tier of each run, a warning when they differ, and any error. */
export function noteLines(state: BenchState): string[] {
  const tiers = tierSummary(state.results);
  return [
    `View tier per run: ${tiers.list || 'none'}`,
    ...(tiers.mixed ? ['Warning: the runs ran at different view tiers, so'
      + ' their figures do not compare.'] : []),
    ...(state.error ? [`Error: ${state.error}`] : []),
  ];
}

/** The device's lines and the notes, which every suite's report heads. */
export function deviceLines(state: BenchState): string[] {
  const h = state.header;
  return [
    'Ventana Lunar benchmark report',
    `Script v${h?.script ?? '?'} · instant ${h?.instant ?? '?'}`,
    `GPU: ${h?.gpu ?? '?'}`, `Browser: ${h?.userAgent ?? '?'}`,
    `Viewport: ${h?.viewport ?? '?'}`, `Screen: ${h?.screen ?? '?'}`,
    `Build: ${h?.build ?? '?'}`, ...noteLines(state),
  ];
}
