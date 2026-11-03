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
import { isPhoneViewport } from '../lib/viewport';
import type { GlobeOptions } from './globe';
import { mountGraticule } from './graticule/mount';
import { mountGlobeLayers } from './layers/globe-layers';
import { MarkerLayer } from './marker-layer';
import { addMoon } from './moon';
import { pickQuality } from './quality-pick';
import type { Stage } from './stage';

/** The Moon, the graticule, the markers and the layers on `stage`. */
export function addContents(
  host: HTMLElement,
  options: GlobeOptions,
  stage: Stage,
  invalidate: () => void,
) {
  const { store } = options;
  const pick = (id: string): void => store.select(id, 'globe');
  // The graticule's labels are mounted first: they paint under the markers.
  const text = options.graticuleText;
  const graticule = mountGraticule({ host, scene: stage.scene, text });
  const markers = new MarkerLayer(host, store.get().id, invalidate, pick);
  // The Moon takes its tier from the quality settings.
  const quality = pickQuality(isPhoneViewport());
  const moon = addMoon(stage, { ...options, ...quality, onChange: invalidate });
  const layers = mountGlobeLayers(
    { host, scene: stage.scene, invalidate, markers }, options.layers);
  return { graticule, markers, moon, layers };
}
