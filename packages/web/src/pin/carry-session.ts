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
 * One carry of the pin, from the moment it is lifted (by a finger held on
 * the Moon, a press on the pin, or the keyboard) to its drop on the Moon
 * or its spring back (VENT-10, VENT-37). The pointer and the keyboard
 * drive it alike; it writes what to show into `view`, and says how it
 * ended.
 */
import type { LatLon } from '../lib/polar-projection';
import type { WatchedValue } from '../lib/watched-value';
import { VelocityTracker } from '../globe/velocity';
import { grabOffset, heldOffset, nudged } from './carry-geometry';
import { viewAt, type CarryView, type ReadoutDeps } from './carry-view';
import type { ClientPoint } from './surfaces';
import { walkHome, type WalkDeps } from './walk-home';

export interface SessionDeps extends ReadoutDeps {
  readonly view: WatchedValue<CarryView | null>;
  readonly reducedMotion: () => boolean;
  readonly frame: WalkDeps['frame'];
  /** Dropped on the Moon at `point` (on the grid). */
  readonly onDrop: (point: LatLon) => void;
  /** Back where it came from: let go off the Moon, or cancelled. */
  readonly onBack: (cancelled: boolean) => void;
}

export interface SessionStart {
  readonly mode: CarryView['mode'];
  readonly pointer: ClientPoint;
  /** The pin's centre when lifted. */
  readonly at: ClientPoint;
  /** Where it springs back to; its centre when lifted if not given. */
  readonly home?: ClientPoint;
  readonly touch: boolean;
  /** Time of the press, ms. */
  readonly t: number;
}

const NO_OFFSET: ClientPoint = { x: 0, y: 0 };

export class CarrySession {
  /** From the pointer; null while a held pin is still under the finger. */
  private offset: ClientPoint | null;
  private readonly tracker = new VelocityTracker();
  private at: ClientPoint;
  private stopWalk: (() => void) | null = null;

  constructor(
    private readonly deps: SessionDeps,
    private readonly start: SessionStart,
  ) {
    const { pointer, at, touch } = start;
    const held = start.mode === 'hold';
    this.offset = held ? null : grabOffset(pointer, at, touch);
    const offset = this.offset ?? NO_OFFSET;
    this.at = { x: pointer.x + offset.x, y: pointer.y + offset.y };
    this.tracker.add(pointer.x, pointer.y, start.t);
    const base = { mode: start.mode, phase: 'carry' } as const;
    deps.view.set(viewAt(deps, base, this.at));
  }

  /** The pointer moved to `pointer` at `t` ms. */
  move(pointer: ClientPoint, t: number): void {
    this.tracker.add(pointer.x, pointer.y, t);
    this.offset ??= heldOffset(this.start.pointer, pointer);
    const offset = this.offset ?? NO_OFFSET;
    this.at = { x: pointer.x + offset.x, y: pointer.y + offset.y };
    const base = { mode: this.start.mode, phase: 'carry' } as const;
    this.deps.view.set(viewAt(this.deps, base, this.at));
  }

  /** An arrow key moved the pin; false for any other key. */
  nudge(key: string, big: boolean): boolean {
    const at = nudged(this.at, key, big);
    if (!at) return false;
    this.at = at;
    const base = { mode: this.start.mode, phase: 'carry' } as const;
    this.deps.view.set(viewAt(this.deps, base, at));
    return true;
  }

  /**
   * Let go at `t` ms: dropped on the Moon, or it springs back. The point
   * is read again here, not taken from the last move: the Moon may have
   * moved under a still pointer since (a zoom, the sheet re-framing it).
   */
  release(t: number): void {
    const base = { mode: this.start.mode, phase: 'carry' } as const;
    const { point } = viewAt(this.deps, base, this.at);
    if (!point) return this.cancel(false, this.tracker.velocity(t));
    this.deps.view.set(null);
    this.deps.onDrop(point);
  }

  /** Springs back to where it came from; `cancelled` by Esc or the browser. */
  cancel(cancelled = true, velocity: ClientPoint = { x: 0, y: 0 }): void {
    if (this.stopWalk) return;
    const { deps } = this;
    const base = { mode: this.start.mode, phase: 'return' } as const;
    const home = this.start.home ?? this.start.at;
    this.stopWalk = walkHome(this.at, home, velocity, {
      frame: deps.frame,
      reducedMotion: deps.reducedMotion(),
      onStep: (at) => deps.view.set(viewAt(deps, base, at)),
      onHome: () => {
        deps.view.set(null);
        deps.onBack(cancelled);
      },
    });
    deps.view.set(viewAt(deps, base, this.at));
  }
}
