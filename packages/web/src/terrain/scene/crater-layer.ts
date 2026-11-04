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
 * The craters in the world (VENT-64): the raster bakes first, in slicer
 * jobs; the patch builds when the ground is there (and again when it
 * changes, swapping in only when ready); the Sun's light on it is redone
 * on every relight. The slicer clears its queue when a new ring replaces
 * the old, so {@link CraterLayer.restart} queues again what is not done.
 * Everything runs a few milliseconds at a time (slicer.ts); the work is in
 * crater-work.ts.
 */
import { Group } from 'three';
import { direction } from '../view-camera';
import type { GroundAt } from './crater-mesh';
import { craterAt } from './crater-spec';
import {
  freePatch,
  lightPatch,
  startBake,
  startBuild,
  type CraterDeps,
  type SkyAt,
  type State,
} from './crater-work';

export class CraterLayer {
  readonly group = new Group();
  private readonly s: State = { field: null, ground: null, ringLit: null,
    sun: null, patch: null, build: 0, light: 0, baking: false };

  private seed: number;

  constructor(private readonly deps: CraterDeps) {
    this.seed = deps.seed;
    this.group.name = 'craters';
  }

  /** `ground` with the craters on it, for what stands on the patch. */
  groundFor(ground: GroundAt): GroundAt {
    return (e, n) => ground(e, n) + (this.s.field
      ? craterAt({ h: this.s.field, spec: this.deps.spec }, e, -n) : 0);
  }

  /**
   * The near ground changed (or the slicer lost its work): build again. A
   * new `seed` (another point on the same renderer) first frees the old
   * patch and its raster.
   */
  setGround(
    ground: GroundAt | null = this.s.ground,
    seed: number = this.seed,
  ): void {
    const s = this.s;
    if (seed !== this.seed) {
      this.seed = seed;
      freePatch(s, this.deps);
      s.field = null;
    }
    s.ground = ground;
    s.baking = false;
    const built = (): void => startBuild(s, this.deps, this.group);
    startBake(s, { ...this.deps, seed: this.seed }, built);
    if (s.field) startBuild(s, this.deps, this.group);
  }

  /**
   * The Sun moved, or its mask did: shade the patch again. `ringLit` is the
   * near ground's mask, a grid over `sizeM`.
   */
  relight(
    sky: SkyAt,
    ringLit: { lit: Float32Array; sizeM: number } | null,
  ): void {
    const { s } = this;
    const [x, y, z] = direction(sky.sunAz, sky.sunEl);
    s.sun = { x, y, z };
    s.ringLit = ringLit;
    if (s.field) lightPatch(s, this.deps, { h: s.field, spec: this.deps.spec });
  }

  /** Stops the work and takes the patch's cut-out away. */
  dispose(): void {
    freePatch(this.s, this.deps);
    this.group.removeFromParent();
  }
}
