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
 * One frame of the globe: advance the springs, ask for the map the zoom
 * needs, aim the camera, draw, and move the HTML markers to match.
 */
import { Vector2, Vector3 } from 'three';
import { cameraPosition } from './framing';
import type { Vec3 } from './geo';
import type { Mark } from './marker-cull';
import type { LayerCover } from './layers/registry';
import type { Projector, MarkerLayer } from './marker-layer';
import type { Moon } from './moon';
import { poseOf, stepOrbit, type Orbit } from './orbit';
import { aimCamera, type Stage } from './stage';

export interface FrameParts {
  readonly stage: Stage;
  readonly orbit: Orbit;
  readonly markers: MarkerLayer;
  /** Fetches sharper maps as the zoom heads in. */
  readonly moon: Pick<Moon, 'track'>;
  /**
   * The registry's layers (layers/bind.ts), placed after the markers;
   * they hand back what they cover.
   */
  readonly layers?: {
    place(project: Projector, eye: Vec3): readonly LayerCover[];
  };
  /**
   * The graticule's labels (graticule/), placed clear of the markers and
   * of what the layers cover.
   */
  readonly graticule?: {
    place(
      project: Projector,
      eye: Vec3,
      marks: readonly Mark[],
      covers: readonly LayerCover[],
    ): void;
  };
  /** Hears that a frame was drawn (the standing pin follows it). */
  readonly drawn?: () => void;
}

/** Maps a globe point to CSS px in the canvas, through the camera. */
function projector(stage: Stage): Projector {
  const size = stage.renderer.getSize(new Vector2());
  const v = new Vector3();
  return (point) => {
    v.set(point.x, point.y, point.z).project(stage.camera);
    return { x: ((v.x + 1) / 2) * size.x, y: ((1 - v.y) / 2) * size.y };
  };
}

/**
 * Drawing-buffer px the camera's field of view spans: the view offset's
 * full height when the Moon is framed (stage.ts, frameCamera), else the
 * canvas's, times the pixel ratio.
 */
export function frameBufferPx(
  stage: Pick<Stage, 'camera' | 'renderer'>,
): number {
  const { camera, renderer } = stage;
  const view = camera.view?.enabled === true ? camera.view : null;
  const css = view?.fullHeight ?? renderer.getSize(new Vector2()).y;
  return css * renderer.getPixelRatio();
}

/** Draws one frame `dt` seconds on; true while the springs still move. */
export function drawFrame(parts: FrameParts, dt: number): boolean {
  const { stage, orbit, markers, moon } = parts;
  const moving = stepOrbit(orbit, dt);
  // The target, not the live value: the map starts loading as the zoom
  // starts, not once it lands.
  const distance = orbit.distance.target;
  moon.track({ distance, frameBufferPx: frameBufferPx(stage) });
  const pose = poseOf(orbit);
  aimCamera(stage.camera, pose);
  stage.renderer.render(stage.scene, stage.camera);
  const project = projector(stage);
  const eye = cameraPosition(pose);
  const marks = markers.place(project, eye);
  const covers = parts.layers?.place(project, eye) ?? [];
  if (markers.loaded) parts.graticule?.place(project, eye, marks, covers);
  parts.drawn?.();
  return moving;
}
