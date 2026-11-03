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
 * The graticule's lines in the globe's scene (VENT-50): one set of segments,
 * a thin grey that lets the Moon show through, tested against the sphere's
 * depth so the lines vanish behind the limb. They are lines of one device
 * pixel, whatever the zoom.
 */
import {
  BufferAttribute,
  BufferGeometry,
  LineBasicMaterial,
  LineSegments,
  type Scene,
} from 'three';
import { graticuleGeometry } from './lines';

/** How the lines look; the tokens of styles/tokens.css, read at mount. */
export interface GraticuleLook {
  /** Any CSS colour. */
  readonly color: string;
  /** 0 to 1. */
  readonly opacity: number;
}

/** The look the page's tokens give, read off `host`. */
export function readLook(host: Element): GraticuleLook {
  const style = getComputedStyle(host);
  return {
    color: style.getPropertyValue('--graticule-line').trim(),
    opacity: Number.parseFloat(style.getPropertyValue('--graticule-line-alpha')),
  };
}

/** Adds the lines to `scene`; returns how to take them off and free them. */
export function addGraticuleLines(
  scene: Scene,
  look: GraticuleLook,
): () => void {
  const { positions, index } = graticuleGeometry();
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setIndex(new BufferAttribute(index, 1));
  // No depth write: a line is a film on the Moon, never in front of a marker.
  const material = new LineBasicMaterial({
    color: look.color,
    transparent: true,
    opacity: look.opacity,
    depthWrite: false,
  });
  const lines = new LineSegments(geometry, material);
  scene.add(lines);
  return () => {
    scene.remove(lines);
    geometry.dispose();
    material.dispose();
  };
}
