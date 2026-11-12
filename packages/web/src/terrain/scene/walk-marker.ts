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
 * Where a tap would take the eye (VENT-121, Street View's ellipse): a faint
 * ring lying on the ground under the pointer with the distance beside it.
 * On a fine pointer it follows the pointer; on touch it shows at the tap
 * and fades as the glide starts. Never a signal colour.
 */
import {
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  Vector3,
  type BufferGeometry,
  type PerspectiveCamera,
} from 'three';
import { geometryOf } from './mesh-of';
import type { EastNorth } from '../walk/walk-reach';
import { inFront } from './in-front';
import type { Ground } from './world-ground';

/** The ring's radius over its distance from the eye, and its bounds, m. */
const SIZE_SHARE = 0.03;
const SIZE_M = [0.35, 30] as const;
/** Its opacity, and how fast a fade takes it away, per second. */
const OPACITY = 0.55;
const FADE_PER_S = 4;
/** Over the ground, metres, so it never sinks into it. */
const LIFT_M = 0.06;
/** The annulus: its inner radius over the outer, and its segments. */
const INNER = 0.8;
const SEGMENTS = 48;

export interface WalkMarker {
  readonly mesh: Mesh<BufferGeometry, MeshBasicMaterial>;
  readonly label: HTMLElement;
  /** Shows it at `at`, its distance written beside it; null hides it. */
  show(at: EastNorth | null): void;
  /** Fades it `dt` seconds on; true while it still shows. */
  fade(dt: number): boolean;
  /** Places the label over the ring for the frame. */
  place(camera: PerspectiveCamera, host: HTMLElement): void;
  /** Takes the label out of the host and frees the ring. */
  dispose(): void;
}

/**
 * The ring's mesh: a flat annulus of radius 1 lying on y = 0, built from
 * its own buffers (three's RingGeometry would join the start chunk).
 */
function ringMesh(): Mesh<BufferGeometry, MeshBasicMaterial> {
  const positions = new Float32Array((SEGMENTS + 1) * 6);
  const index = new Uint32Array(SEGMENTS * 6);
  for (let i = 0; i <= SEGMENTS; i++) {
    const a = (i / SEGMENTS) * 2 * Math.PI;
    const [s, c] = [Math.sin(a), Math.cos(a)];
    positions.set([s * INNER, 0, c * INNER, s, 0, c], i * 6);
    const k = i * 2;
    if (i < SEGMENTS) index.set([k, k + 2, k + 1, k + 1, k + 2, k + 3], i * 6);
  }
  const normals = new Float32Array(positions.length).map((_, i) =>
    (i % 3 === 1 ? 1 : 0));
  const material = new MeshBasicMaterial({ color: 0xffffff,
    transparent: true, opacity: OPACITY, depthWrite: false,
    toneMapped: false, side: DoubleSide });
  const mesh = new Mesh(geometryOf({ positions, normals, index }), material);
  mesh.visible = false;
  mesh.renderOrder = 2;
  return mesh;
}

/** What the marker stands on and measures from. */
export interface MarkerParts {
  readonly ground: () => Ground;
  readonly eye: () => EastNorth;
  /** «180 m», the distance's words. */
  readonly words: (metres: number) => string;
  readonly host: HTMLElement;
}

/** Lays the ring on the ground at `at`, sized by its distance; metres. */
function layRing(mesh: WalkMarker['mesh'], at: EastNorth, parts: MarkerParts) {
  const [e, n] = parts.eye();
  const d = Math.hypot(at[0] - e, at[1] - n);
  mesh.scale.setScalar(Math.min(Math.max(d * SIZE_SHARE, SIZE_M[0]),
    SIZE_M[1]));
  mesh.position.set(at[0], parts.ground()(at[0], at[1]) + LIFT_M, -at[1]);
  return d;
}

/** The distance's label, hidden, in `host`. */
function labelIn(host: HTMLElement): HTMLElement {
  const label = Object.assign(document.createElement('div'),
    { className: 'on-foot__label on-foot__label--walk', hidden: true });
  label.setAttribute('aria-hidden', 'true');
  host.append(label);
  return label;
}

/** The marker, its label in the host. */
export function createWalkMarker(parts: MarkerParts): WalkMarker {
  const mesh = ringMesh();
  const label = labelIn(parts.host);
  const marker: WalkMarker = { mesh, label,
    show: (at) => {
      mesh.visible = at !== null;
      mesh.material.opacity = OPACITY;
      label.textContent = at ? parts.words(layRing(mesh, at, parts)) : '';
    },
    fade: (dt) => {
      if (!mesh.visible) return false;
      mesh.material.opacity -= dt * FADE_PER_S * OPACITY;
      mesh.visible = mesh.material.opacity > 0;
      return mesh.visible;
    },
    place: (camera, box) => placeLabel(marker, camera, box),
    dispose: () => {
      label.remove();
      mesh.geometry.dispose();
      mesh.material.dispose();
    } };
  return marker;
}

/** The label just over the ring, hidden with it or off screen. */
function placeLabel(
  marker: WalkMarker,
  camera: PerspectiveCamera,
  host: HTMLElement,
): void {
  const { mesh, label } = marker;
  const point = new Vector3().copy(mesh.position);
  point.y += mesh.scale.x * 0.6;
  const q = point.clone().project(camera);
  const shown = mesh.visible && label.textContent !== '' &&
    inFront(camera, point) && Math.abs(q.x) < 1 && Math.abs(q.y) < 1;
  label.hidden = !shown;
  label.style.opacity = String(mesh.material.opacity / OPACITY);
  if (!shown) return;
  const x = ((q.x + 1) / 2) * host.clientWidth;
  const y = ((1 - q.y) / 2) * host.clientHeight;
  label.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
}
