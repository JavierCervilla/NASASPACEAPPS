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
 * Steps the Moon up through its maps without a flash: a level is fetched
 * and uploaded to the GPU while the old one stays on screen, then swapped
 * in, and only then is the old one freed (texture-climb.ts). Asked levels
 * only go up (a map already downloaded is never traded for a worse one
 * while it shows), one fetch at a time; the highest level asked for
 * meanwhile is fetched next. A hidden globe is lowered on purpose
 * (VENT-86): its big maps are freed for the view that shows, and the next
 * frame drawn climbs back.
 */
import { climb, type SwapState } from './texture-climb';
import { heldBack, NO_BACKOFF } from './level-backoff';
import { NO_LEVEL, release, type SwapDeps } from './texture-fetch';
import { PAGE_CLOCK } from './texture-load';
import type { LodLevel } from './texture-lod';

export class TextureSwap<T> {
  private readonly state: SwapState<T> = {
    held: NO_LEVEL,
    target: 0,
    busy: false,
    disposed: false,
    backoff: NO_BACKOFF,
  };

  constructor(private readonly deps: SwapDeps<T>) {}

  /**
   * Asks for `level`; a no-op at or below what is shown or coming, and for
   * a level that failed until its wait has passed (level-backoff.ts).
   */
  want(level: LodLevel): void {
    const { state } = this;
    if (state.disposed || level <= Math.max(state.target, state.held.level)) {
      return;
    }
    const now = (this.deps.clock ?? PAGE_CLOCK).now();
    if (heldBack(state.backoff, level, now)) return;
    const shown = state.held.level;
    this.deps.trace?.mark({ kind: 'wanted', level, shown });
    state.target = level;
    if (!state.busy) void climb(state, this.deps);
  }

  /**
   * Goes down to `level` when more is shown or coming: `level` is fetched
   * and shown first, then the bigger maps are freed; a bigger level still
   * in flight is freed when it lands, never shown.
   */
  lower(level: LodLevel): void {
    const { state } = this;
    if (state.disposed || level >= Math.max(state.target, state.held.level)) {
      return;
    }
    const shown = state.held.level;
    this.deps.trace?.mark({ kind: 'lowered', level, shown });
    state.target = level;
    if (!state.busy) void climb(state, this.deps);
  }

  /** The level on screen; 0 until the first map arrives. */
  shown(): LodLevel | 0 {
    return this.state.held.level;
  }

  /** Frees what is shown, and whatever arrives afterwards. */
  dispose(): void {
    this.state.disposed = true;
    release(this.state.held.maps, null, this.deps);
  }
}
