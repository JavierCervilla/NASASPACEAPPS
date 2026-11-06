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
import {
  fetchLevel,
  release,
  type FetchedLevel,
  type HeldLevel,
  type SwapDeps,
} from './texture-fetch';
import { failedAt, NO_BACKOFF, type Backoff } from './level-backoff';
import { messageOf } from './map-failure';
import { PAGE_CLOCK } from './texture-load';
import type { LodLevel } from './texture-lod';

/** What the swapper holds and aims at; the loop updates it. */
export interface SwapState<T> {
  held: HeldLevel<T>;
  target: LodLevel | 0;
  busy: boolean;
  disposed: boolean;
  /** The last failed level's wait (level-backoff.ts). */
  backoff: Backoff;
}

/** Takes in a level just fetched, or frees it when it is not wanted. */
function settle<T>(
  state: SwapState<T>,
  next: FetchedLevel<T>,
  deps: SwapDeps<T>,
): void {
  if (state.disposed || next.level > state.target) {
    // Lowered while it was in flight: not wanted any more.
    release(next.maps, state.held.maps, deps);
    if (!state.disposed) deps.trace?.mark({ kind: 'freed', level: next.level });
    return;
  }
  deps.apply(next.maps);
  release(state.held.maps, next.maps, deps);
  state.held = next;
  if (next.level >= state.backoff.level) state.backoff = NO_BACKOFF;
  deps.trace?.mark({ kind: 'applied', level: next.level });
}

/** Leaves a level that failed for the one shown, for a while. */
function giveUp<T>(
  state: SwapState<T>,
  level: LodLevel,
  deps: SwapDeps<T>,
): void {
  const shown = state.held.level;
  deps.trace?.mark({ kind: 'gaveUp', level, shown });
  const now = (deps.clock ?? PAGE_CLOCK).now();
  state.backoff = failedAt(state.backoff, level, now);
  // Give up on the failed level only: a higher one asked for
  // meanwhile is still wanted, and is fetched next.
  if (state.target === level) state.target = shown;
}

/**
 * Fetches `level` and swaps it in. A throw on the way (an upload the
 * driver refuses) fails the level like a map that did not load, so the
 * swapper is never left busy.
 */
async function step<T>(
  state: SwapState<T>,
  level: LodLevel,
  deps: SwapDeps<T>,
): Promise<void> {
  try {
    const next = await fetchLevel(level, state.held, deps);
    if (next) return settle(state, next, deps);
  } catch (error) {
    deps.trace?.mark({ kind: 'threw', level, message: messageOf(error) });
  }
  giveUp(state, level, deps);
}

/** Fetches and swaps in levels until the target is on screen. */
export async function climb<T>(
  state: SwapState<T>,
  deps: SwapDeps<T>,
): Promise<void> {
  state.busy = true;
  while (!state.disposed && state.target !== state.held.level) {
    const level = state.target as LodLevel;
    deps.trace?.mark({ kind: 'asked', level });
    await step(state, level, deps);
  }
  state.busy = false;
}
