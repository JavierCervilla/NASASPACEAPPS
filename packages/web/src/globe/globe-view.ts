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
 * The globe as a place to drop the astronaut on (VENT-10): the Moon's
 * point under a pointer, by a ray from the camera through the canvas, and
 * where a point of the Moon shows on the page, or null behind the limb.
 * Both in client px, so the page can hold the globe and the polar map
 * alike. It also tells, after each drawn frame, that points have moved.
 */
import { Vector2, Vector3 } from 'three';
import type { LatLon } from '../lib/polar-projection';
import { isFacing, latLonToVector, vectorToLatLon } from './geo';
import { raySphere } from './sphere-ray';
import type { Stage } from './stage';

export interface GlobeView {
  pointAt(clientX: number, clientY: number): LatLon | null;
  place(point: LatLon): { x: number; y: number } | null;
  /** Calls `listener` after every drawn frame; returns the unsubscribe. */
  subscribe(listener: () => void): () => void;
}

/** The Moon's point under `clientX`, `clientY`, through `stage`'s camera. */
function pointUnder(stage: Stage, clientX: number, clientY: number) {
  const rect = stage.renderer.domElement.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;
  const x = ((clientX - rect.left) / rect.width) * 2 - 1;
  const y = 1 - ((clientY - rect.top) / rect.height) * 2;
  const { camera } = stage;
  const through = new Vector3(x, y, 0.5).unproject(camera);
  const hit = raySphere(camera.position, through.sub(camera.position));
  if (!hit) return null;
  const { latDeg, lonEastDeg } = vectorToLatLon(hit);
  return { lat: latDeg, lonEast: lonEastDeg };
}

/** Where `point` shows, client px; null behind the limb. */
function placeOf(stage: Stage, point: LatLon) {
  const at = latLonToVector(point.lat, point.lonEast);
  if (!isFacing(at, stage.camera.position)) return null;
  const rect = stage.renderer.domElement.getBoundingClientRect();
  const size = stage.renderer.getSize(new Vector2());
  const v = new Vector3(at.x, at.y, at.z).project(stage.camera);
  const scaleX = rect.width / Math.max(size.x, 1);
  const scaleY = rect.height / Math.max(size.y, 1);
  return {
    x: rect.left + ((v.x + 1) / 2) * size.x * scaleX,
    y: rect.top + ((1 - v.y) / 2) * size.y * scaleY,
  };
}

/** The view of `stage`, whose frames `frames` announces. */
export function globeView(
  stage: Stage,
  frames: Pick<GlobeView, 'subscribe'>,
): GlobeView {
  return {
    pointAt: (x, y) => pointUnder(stage, x, y),
    place: (point) => placeOf(stage, point),
    subscribe: frames.subscribe,
  };
}

