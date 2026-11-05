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
 * The swapper's fetch loop (texture-swap.ts): fetches the target level,
 * shows it and frees what it replaces, until the target is on screen. The
 * target moves meanwhile: up as the zoom asks, or down when the globe hides
 * (VENT-86), so a level that lands above it is freed, never shown.
 */
import { fetchLevel, release, type HeldLevel, type SwapDeps } from './texture-fetch';
import type { LodLevel } from './texture-lod';

/** What the swapper holds and aims at; the loop updates it. */
export interface SwapState<T> {
  held: HeldLevel<T>;
  target: LodLevel | 0;
  busy: boolean;
  disposed: boolean;
}

/** Fetches and swaps in levels until the target is on screen. */
export async function climb<T>(
  state: SwapState<T>,
  deps: SwapDeps<T>,
): Promise<void> {
  state.busy = true;
  while (!state.disposed && state.target !== state.held.level) {
    const level = state.target as LodLevel;
    const next = await fetchLevel(level, state.held, deps);
    if (!next) {
      // Give up on the failed level only: a higher one asked for
      // meanwhile is still wanted, and is fetched next.
      if (state.target === level) state.target = state.held.level;
    } else if (state.disposed || next.level > state.target) {
      // Lowered while it was in flight: not wanted any more.
      release(next.maps, state.held.maps, deps);
    } else {
      deps.apply(next.maps);
      release(state.held.maps, next.maps, deps);
      state.held = next;
    }
  }
  state.busy = false;
}
