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
 * The scale's labels (VENT-34): each distance ring (rings.ts) labelled at
 * its own bearing off the look (scene-types.ts), and the ridge that hides
 * a body labelled with its height and distance. The labels are HTML over
 * the canvas, so they follow the text size; placed after every frame
 * through the CSSOM (no style attribute: CSP), hidden behind the ground.
 */
import { Vector3, type PerspectiveCamera } from 'three';
import { direction } from '../view-camera';
import {
  RING_BEARINGS_DEG,
  RING_DISTANCES_M,
  type SceneWords,
} from './scene-types';
import type { Ground } from './world-ground';

/** Whether the ground hides `point` from the camera. */
function behindGround(
  camera: PerspectiveCamera,
  point: Vector3,
  ground: Ground,
): boolean {
  const from = camera.position;
  for (let t = 0.04; t < 0.97; t += 0.03) {
    const x = from.x + (point.x - from.x) * t;
    const z = from.z + (point.z - from.z) * t;
    const y = from.y + (point.y - from.y) * t;
    if (ground(x, -z) > y) return true;
  }
  return false;
}

/** Shows `el` at `point`'s place on the host, or hides it. */
function place(
  el: HTMLElement,
  point: Vector3,
  view: { camera: PerspectiveCamera; ground: Ground; host: HTMLElement },
): void {
  const q = point.clone().project(view.camera);
  const shown = q.z < 1 && Math.abs(q.x) < 0.95 && Math.abs(q.y) < 0.95 &&
    !behindGround(view.camera, point, view.ground);
  el.hidden = !shown;
  if (!shown) return;
  const x = ((q.x + 1) / 2) * view.host.clientWidth;
  const y = ((1 - q.y) / 2) * view.host.clientHeight;
  el.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
}

export interface LabelLayer {
  readonly root: HTMLElement;
  /** Writes the words and places every label for the frame. */
  readonly draw: (words: SceneWords, yawDeg: number) => void;
}

interface Spots {
  readonly rings: readonly HTMLElement[];
  readonly ridge: HTMLElement;
}

type View = Parameters<typeof place>[2];

/** Writes and places the rings' labels along the look, and the ridge's. */
function drawLabels(
  spots: Spots,
  view: View,
  { words, yawDeg }: { words: SceneWords; yawDeg: number },
): void {
  RING_DISTANCES_M.forEach((r, i) => {
    const [x, , z] = direction(yawDeg + (RING_BEARINGS_DEG[i] ?? 0), 0);
    const el = spots.rings[i] as HTMLElement;
    el.textContent = words.rings[i] ?? '';
    const y = view.ground(x * r, -z * r) + 0.4;
    place(el, new Vector3(x * r, y, z * r), view);
  });
  spots.ridge.textContent = words.ridge?.text ?? '';
  spots.ridge.hidden = !words.ridge;
  if (!words.ridge) return;
  const [rx, , rz] = direction(words.ridge.azDeg, 0);
  const d = words.ridge.distanceM;
  const top = view.ground(rx * d, -rz * d) + 3;
  place(spots.ridge, new Vector3(rx * d, top, rz * d), view);
}

/** The labels' layer in `host`, placed by `camera` over `ground`. */
export function labelLayer(
  host: HTMLElement,
  camera: PerspectiveCamera,
  ground: () => Ground,
): LabelLayer {
  const root = document.createElement('div');
  root.className = 'on-foot__labels';
  root.setAttribute('aria-hidden', 'true');
  const make = (kind: string): HTMLElement =>
    root.appendChild(Object.assign(document.createElement('span'),
      { className: `on-foot__label on-foot__label--${kind}` }));
  const spots = { rings: RING_DISTANCES_M.map(() => make('ring')),
    ridge: make('ridge') };
  host.append(root);
  return { root, draw: (words, yawDeg) =>
    drawLabels(spots, { camera, ground: ground(), host }, { words, yawDeg }) };
}
