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
 * What the globe draws on its stage (VENT-50 split it out of globe.ts): the
 * graticule, the site markers, the Moon and the registry's layers, in the
 * order they stack over the canvas.
 */
import type { GlobeOptions } from './globe';
import { mountGraticule } from './graticule/mount';
import { mountGlobeLayers } from './layers/globe-layers';
import { MarkerLayer } from './marker-layer';
import { addMoon } from './moon';
import { globeQuality } from './globe-quality';
import type { Stage } from './stage';
import { isPhoneViewport } from '../lib/viewport';

/**
 * How the contents ask for a frame, whether the globe shows, and how a
 * new look's programs are compiled before it draws (compile-gate.ts).
 */
export interface ContentsFrames {
  readonly invalidate: () => void;
  readonly shown: () => boolean;
  readonly compile: () => Promise<void>;
}

/** The Moon, the graticule, the markers and the layers on `stage`. */
export function addContents(
  host: HTMLElement,
  options: GlobeOptions,
  stage: Stage,
  { invalidate, shown, compile }: ContentsFrames,
) {
  const { store } = options;
  const pick = (id: string): void => store.select(id, 'globe');
  // The graticule's labels are mounted first: they paint under the markers.
  const text = options.graticuleText;
  const graticule = mountGraticule({ host, scene: stage.scene, text });
  const markers = new MarkerLayer(host, store.get().id, invalidate, pick);
  // The Moon takes its tier from the quality settings, its cap the layout.
  const quality = globeQuality(options.early);
  const moon = addMoon(stage, { ...options, ...quality,
    phone: isPhoneViewport(), onChange: invalidate, shown, compile });
  const layers = mountGlobeLayers(
    { host, scene: stage.scene, invalidate, markers }, options.layers);
  return { graticule, markers, moon, layers };
}
