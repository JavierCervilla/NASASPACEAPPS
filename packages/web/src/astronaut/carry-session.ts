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
 * One carry of the astronaut, from the moment it is lifted (from the dock
 * or from the point it stands on) to its drop on the Moon or its walk
 * back (VENT-10). The pointer and the keyboard drive it alike; it writes
 * what to show into `view`, and says how it ended.
 */
import type { LatLon } from '../lib/polar-projection';
import type { WatchedValue } from '../lib/watched-value';
import { VelocityTracker } from '../globe/velocity';
import { grabOffset, leanFor, nudged } from './carry-geometry';
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
  /** The figure's feet when lifted. */
  readonly feet: ClientPoint;
  /** Where it walks back to; the feet when lifted if not given. */
  readonly home?: ClientPoint;
  readonly touch: boolean;
  /** Time of the press, ms. */
  readonly t: number;
}

export class CarrySession {
  private readonly offset: ClientPoint;
  private readonly tracker = new VelocityTracker();
  private feet: ClientPoint;
  private stopWalk: (() => void) | null = null;

  constructor(
    private readonly deps: SessionDeps,
    private readonly start: SessionStart,
  ) {
    this.offset = grabOffset(start.pointer, start.feet, start.touch);
    const { pointer } = start;
    this.feet = { x: pointer.x + this.offset.x, y: pointer.y + this.offset.y };
    this.tracker.add(start.pointer.x, start.pointer.y, start.t);
    const base = { mode: start.mode, phase: 'carry', lean: 0 } as const;
    deps.view.set(viewAt(deps, base, this.feet));
  }

  /** The pointer moved to `pointer` at `t` ms. */
  move(pointer: ClientPoint, t: number): void {
    this.tracker.add(pointer.x, pointer.y, t);
    this.feet = { x: pointer.x + this.offset.x, y: pointer.y + this.offset.y };
    const lean = leanFor(this.tracker.velocity(t).x, this.deps.reducedMotion());
    const base = { mode: this.start.mode, phase: 'carry', lean } as const;
    this.deps.view.set(viewAt(this.deps, base, this.feet));
  }

  /** An arrow key moved the feet; false for any other key. */
  nudge(key: string, big: boolean): boolean {
    const feet = nudged(this.feet, key, big);
    if (!feet) return false;
    this.feet = feet;
    const base = { mode: this.start.mode, phase: 'carry', lean: 0 } as const;
    this.deps.view.set(viewAt(this.deps, base, feet));
    return true;
  }

  /** Let go at `t` ms: dropped on the Moon, or it walks back. */
  release(t: number): void {
    const point = this.deps.view.get()?.point ?? null;
    if (!point) return this.cancel(false, this.tracker.velocity(t));
    this.deps.view.set(null);
    this.deps.onDrop(point);
  }

  /** Walks back to where it came from; `cancelled` by Esc or the browser. */
  cancel(cancelled = true, velocity: ClientPoint = { x: 0, y: 0 }): void {
    if (this.stopWalk) return;
    const { deps } = this;
    const base = { mode: this.start.mode, phase: 'return', lean: 0 } as const;
    const home = this.start.home ?? this.start.feet;
    this.stopWalk = walkHome(this.feet, home, velocity, {
      frame: deps.frame,
      reducedMotion: deps.reducedMotion(),
      onStep: (feet) => deps.view.set(viewAt(deps, base, feet)),
      onHome: () => {
        deps.view.set(null);
        deps.onBack(cancelled);
      },
    });
    deps.view.set(viewAt(deps, base, this.feet));
  }
}
