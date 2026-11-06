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
 * Plays the run a page load does and opens the next load (navigate.ts):
 * script v1 as the order's variant, or for the depth suite (VENT-104) its
 * own script, whose run also keeps what the view drew with and any loss.
 */
import { runDepthScript } from './depth-run';
import { nextLoad } from './navigate';
import { runScript, type RunDeps } from './run';
import type { BenchState } from './types';

/** Plays `state`'s next run, then opens the next page load. */
export async function playRun(
  state: BenchState,
  deps: RunDeps,
): Promise<void> {
  if (state.suite === 'depth') {
    const { steps, header, ...extra } = await runDepthScript(state.fast, deps);
    nextLoad(state, steps, header, extra);
    return;
  }
  const variant = state.order[state.next] ?? 'A';
  const { steps, header } = await runScript(variant, state.fast, deps);
  nextLoad(state, steps, header);
}
