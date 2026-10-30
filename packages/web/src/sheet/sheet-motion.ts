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
 * The sheet's gestures and moves on top of its state: what a drag, a
 * release or a button does, with the clock and the viewport injected.
 */
import {
  detentsFor,
  releaseDetent,
  type DetentName,
  type SheetLayout,
} from './sheet-physics';
import {
  dragSheet,
  grabSheet,
  settleSheet,
  type SheetState,
} from './sheet-state';

export interface SheetMotionDeps {
  /** The viewport's height in px, read at each move (it can change). */
  readonly heightPx: () => number;
  /**
   * The detents' layout, read at each move: the full sheet stays under
   * the top bar, which grows with large text. Default: the canvas's.
   */
  readonly layout?: () => SheetLayout;
  /** Read at each move, so a change of the setting applies at once. */
  readonly reducedMotion: () => boolean;
  /** Asks the frame loop for a frame. */
  readonly invalidate: () => void;
  /** The detent each release or move settles on. */
  readonly onDetent: (detent: DetentName) => void;
}

export class SheetMotion {
  constructor(
    private readonly state: SheetState,
    private readonly deps: SheetMotionDeps,
  ) {}

  /** A finger lands on the sheet: it stops, ready to follow. */
  grab(): void {
    grabSheet(this.state, this.deps.heightPx());
    this.deps.invalidate();
  }

  /** The finger moved `dy` px (positive down). */
  drag(dy: number): void {
    dragSheet(this.state, dy, this.deps.heightPx());
    this.deps.invalidate();
  }

  /** The finger lifts at `vy` px/s: on to the detent it was thrown at. */
  release(vy: number): void {
    const { detents, axis } = this.state;
    this.moveTo(releaseDetent(detents, axis.value, vy), vy);
  }

  /**
   * Moves to `detent` from wherever the sheet is, with the viewport's
   * current detents (so it also answers a resize).
   */
  moveTo(detent: DetentName, vy = 0): void {
    const layout = this.deps.layout?.();
    this.state.detents = detentsFor(this.deps.heightPx(), layout);
    settleSheet(this.state, detent, vy, this.deps.reducedMotion());
    this.deps.onDetent(detent);
    this.deps.invalidate();
  }
}
