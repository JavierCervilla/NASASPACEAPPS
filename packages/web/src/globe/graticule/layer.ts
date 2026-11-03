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
 * The graticule's HTML over the canvas (VENT-50): the labels and the small
 * cross on the south pole, moved after every drawn frame like the markers
 * (marker-layer.ts) and hidden behind the limb. Labels and cross are for
 * the eye only: they let every click through and no assistive technology
 * hears them. The root sits under the markers' (globe.ts mounts it first).
 */
import { isFacing, latLonToVector, type Vec3 } from '../geo';
import type { Projector } from '../marker-layer';
import type { Mark } from '../marker-cull';
import { graticuleLabels, type GraticuleLabel } from './labels';
import { labelFrame, placeLabels } from './place';
import type { GraticuleText } from './text';

/** The south pole, where the cross stands. */
const SOUTH_POLE = latLonToVector(-90, 0);

export interface GraticuleLayer {
  /**
   * Moves the labels and the cross to where `project` puts them, clear of
   * the site markers `marks` as the marker layer placed them.
   */
  place(project: Projector, eye: Vec3, marks: readonly Mark[]): void;
  dispose(): void;
}

/** A hidden element of `className` at `root`'s end. */
function hiddenPart(root: HTMLElement, className: string): HTMLElement {
  const el = document.createElement('span');
  el.className = className;
  el.hidden = true;
  root.append(el);
  return el;
}

/** Shows `el` at `at`, or hides it when there is no `at`. */
function putAt(el: HTMLElement, at: { x: number; y: number } | null): void {
  if (el.hidden !== !at) el.hidden = !at;
  if (at) el.style.transform = `translate3d(${at.x}px, ${at.y}px, 0)`;
}

function labelPart(
  root: HTMLElement,
  label: GraticuleLabel,
  text: GraticuleText,
): HTMLElement {
  const el = hiddenPart(root, 'graticule-label');
  el.textContent =
    label.kind === 'parallel'
      ? text.parallel(label.lat)
      : text.meridian(label.lonEasts[0] ?? 0);
  return el;
}

/** The labels and the pole cross, in a new root appended to `host`. */
export function createGraticuleLayer(
  host: HTMLElement,
  text: GraticuleText,
): GraticuleLayer {
  const root = document.createElement('div');
  root.className = 'globe-graticule';
  root.setAttribute('aria-hidden', 'true');
  host.append(root);
  const labels = graticuleLabels();
  const parts = new Map(
    labels.map((label) => [label.id, labelPart(root, label, text)]),
  );
  const pole = hiddenPart(root, 'graticule-pole');
  const memory = new Map<string, number>();
  const place = (project: Projector, eye: Vec3, marks: readonly Mark[]) => {
    const frame = labelFrame(project, eye, marks);
    const shown = new Map(
      placeLabels(labels, frame, memory).map(({ id, at }) => [id, at]),
    );
    for (const [id, el] of parts) putAt(el, shown.get(id) ?? null);
    putAt(pole, isFacing(SOUTH_POLE, eye) ? project(SOUTH_POLE) : null);
  };
  return { place, dispose: () => root.remove() };
}
