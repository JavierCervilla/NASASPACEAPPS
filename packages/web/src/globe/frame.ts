/**
 * One frame of the globe: advance the springs, ask for the map the zoom
 * needs, aim the camera, draw, and move the HTML markers to match.
 */
import { Vector2, Vector3 } from 'three';
import { cameraPosition } from './framing';
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

/** Draws one frame `dt` seconds on; true while the springs still move. */
export function drawFrame(parts: FrameParts, dt: number): boolean {
  const { stage, orbit, markers, moon } = parts;
  const moving = stepOrbit(orbit, dt);
  // The target, not the live value: the map starts loading as the zoom
  // starts, not once it lands.
  moon.track(orbit.distance.target);
  const pose = poseOf(orbit);
  aimCamera(stage.camera, pose);
  stage.renderer.render(stage.scene, stage.camera);
  markers.place(projector(stage), cameraPosition(pose));
  return moving;
}
