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
 * The renderers the benchmark measures (VENT-81): the globe's and the
 * on-foot view's, handed over by globe/dev-hook.ts as they are made and
 * taken back as they are freed. Their draws and context losses pile up
 * until the step meter drains them; a loss the benchmark caused on
 * purpose (variant B) is not counted.
 */
import {
  watchHandle, type Draw, type Pile, type RendererHandle,
} from './renderer-watch';

export interface Drained {
  readonly draws: readonly Draw[];
  readonly lost: number;
}

export interface Registry {
  /** Measures `handle` until the returned function is called. */
  attach(handle: RendererHandle): () => void;
  /** The renderers attached now. */
  handles(): readonly RendererHandle[];
  /** The draws and losses since the last drain. */
  drain(): Drained;
  /** The next loss of `canvas` is the benchmark's own. */
  expectLoss(canvas: HTMLCanvasElement): void;
}

export function createRegistry(): Registry {
  const pile: Pile = { draws: [], lost: 0, attached: new Set(),
    deliberate: new WeakSet() };
  return {
    attach: (handle) => watchHandle(handle, pile),
    handles: () => [...pile.attached],
    drain: () => {
      const out = { draws: pile.draws, lost: pile.lost };
      [pile.draws, pile.lost] = [[], 0];
      return out;
    },
    expectLoss: (canvas) => void pile.deliberate.add(canvas),
  };
}
