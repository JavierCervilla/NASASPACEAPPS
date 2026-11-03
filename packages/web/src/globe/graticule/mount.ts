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
 * Mounts the graticule on the globe (VENT-50): its lines in the scene and
 * its labels over the canvas, placed together after each frame. It is no
 * layer of the registry (layers/): there is no switch for it in the Layers
 * key, the grid is part of how the Moon is drawn.
 */
import type { Scene } from 'three';
import type { Vec3 } from '../geo';
import type { Mark } from '../marker-cull';
import type { LayerCover } from '../layers/registry';
import type { Projector } from '../marker-layer';
import { createGraticuleLayer } from './layer';
import { addGraticuleLines, readLook } from './scene';
import type { GraticuleText } from './text';

export interface GraticuleParts {
  readonly host: HTMLElement;
  readonly scene: Scene;
  readonly text: GraticuleText;
}

export interface Graticule {
  place(
    project: Projector,
    eye: Vec3,
    marks: readonly Mark[],
    covers?: readonly LayerCover[],
  ): void;
  dispose(): void;
}

/** The graticule over `host`, its lines in `scene`. */
export function mountGraticule(parts: GraticuleParts): Graticule {
  const { host, scene, text } = parts;
  const removeLines = addGraticuleLines(scene, readLook(host));
  const layer = createGraticuleLayer(host, text);
  return {
    place: layer.place,
    dispose: () => {
      removeLines();
      layer.dispose();
    },
  };
}
