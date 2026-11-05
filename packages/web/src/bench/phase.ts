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
 * What the panel shows on a page load (VENT-81): the results once every
 * run is kept, the running panel on the load the kept state names for its
 * next run (`benchRun=k`), and otherwise the first state with «Start».
 * Pure.
 */
import type { BenchOptions } from './params';
import { finished } from './run-state';
import type { BenchState, RunCount } from './types';

export type Phase =
  | { readonly kind: 'ready'; readonly runs: RunCount }
  | { readonly kind: 'running'; readonly state: BenchState;
      /** The step under way, 0-based; the script's length when done. */
      readonly step: number;
      /** How long each step before it took, ms. */
      readonly times: readonly number[] }
  | { readonly kind: 'results'; readonly state: BenchState };

/** The panel's phase for the kept `state` and the address's `options`. */
export function initialPhase(
  state: BenchState | null,
  options: BenchOptions,
): Phase {
  if (state && finished(state)) return { kind: 'results', state };
  if (state && options.run !== null && state.next === options.run) {
    return { kind: 'running', state, step: 0, times: [] };
  }
  return { kind: 'ready', runs: options.runs };
}
