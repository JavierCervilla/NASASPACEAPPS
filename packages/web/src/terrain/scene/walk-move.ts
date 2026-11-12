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
 * How the eye moves in the on-foot view (VENT-121): sent to a place held to
 * the reach (walk/walk-reach.ts), it glides on the frames the view draws
 * anyway (walk/glide.ts), at once under reduced motion; the camera, the sky
 * with the Sun's shadow box and the host's `data-eye` follow it on each
 * frame, and when it arrives the rocks are seeded around it and the Sun's
 * mask and the bodies' sight are read from there (walk-sight.ts), which the
 * panel hears.
 */
import { startGlide, stepGlide } from '../walk/glide';
import { clampReach, type EastNorth } from '../walk/walk-reach';
import type { ViewState } from './scene-frame';
import type { WalkMarker } from './walk-marker';
import { lightEye } from './world-light';
import { rebuildNear, type World } from './world';

export interface WalkParts {
  readonly world: World;
  readonly view: ViewState;
  readonly host: HTMLElement;
  readonly reducedMotion: () => boolean;
}

/** Puts the sky (and the Sun's shadow box) over the eye, marks the host. */
export function followEye(parts: WalkParts): void {
  const { world, view, host } = parts;
  const [e, n] = view.eye;
  const { position } = world.sky.group;
  const y = world.ground(e, n);
  if (position.x !== e || position.y !== y || position.z !== 0 - n) {
    position.set(e, y, 0 - n);
    world.sky.group.updateMatrixWorld();
    world.stage.shadow.mark();
  }
  host.dataset['eye'] = `${e.toFixed(1)},${n.toFixed(1)}`;
}

/** Stands the eye back on the point at once, as a new point opens. */
export function resetEye(parts: WalkParts): void {
  Object.assign(parts.view, { eye: [0, 0], glide: null, edge: false });
  parts.world.eye = [0, 0];
  parts.world.sight = null;
  followEye(parts);
  parts.world.tellEye();
}

/** The eye stands where it went: rocks, mask and sight from there. */
function arrive(parts: WalkParts): void {
  const { world, view } = parts;
  world.eye = view.eye;
  world.setup.report.step(`walked to ${parts.host.dataset['eye'] ?? ''}`);
  if (!world.input) return;
  rebuildNear(world, world.input);
  lightEye(world, world.input);
  world.invalidate();
}

/** Sends the eye to `target`, held to the reach. */
export function goTo(parts: WalkParts, target: EastNorth): void {
  const { view, world } = parts;
  const { at, edge } = clampReach(target);
  view.edge = edge;
  if (parts.reducedMotion()) {
    view.glide = null;
    view.eye = at;
    followEye(parts);
    arrive(parts);
  } else {
    view.glide = startGlide(view.eye, at);
  }
  world.invalidate();
}

/** One frame of the glide and the marker's fade; true while either lasts. */
export function glideFrame(parts: WalkParts, marker: WalkMarker, dt: number) {
  const { view } = parts;
  if (view.fading) view.fading = marker.fade(dt);
  if (!view.glide) return view.fading;
  const next = stepGlide(view.glide, dt);
  view.eye = next.at;
  view.glide = next.glide;
  followEye(parts);
  if (!next.glide) arrive(parts);
  return next.glide !== null || view.fading;
}
