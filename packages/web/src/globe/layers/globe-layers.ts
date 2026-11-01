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
 * The globe's side of its layers (VENT-37): the page's registry mounted
 * over the canvas (bind.ts) with the site markers' two layers registered
 * on it (site-layers.ts), both undone when the globe goes.
 */
import type { MarkerLayer } from '../marker-layer';
import { bindLayers, type LayerHost } from './bind';
import { createLayerRegistry, type LayerRegistry } from './registry';
import { registerSiteLayers } from './site-layers';

interface GlobeLayerHost extends LayerHost {
  readonly markers: Pick<MarkerLayer, 'kinds'>;
}

/**
 * Mounts `registry` (one of its own when the page passes none) on the
 * globe; returns how to place its layers each frame and the teardown.
 */
export function mountGlobeLayers(
  parts: GlobeLayerHost,
  registry: LayerRegistry = createLayerRegistry(),
) {
  const { markers, ...host } = parts;
  const bound = bindLayers(registry, host);
  const unregister = registerSiteLayers(registry, markers);
  const dispose = (): void => {
    bound.dispose();
    unregister();
  };
  return { place: bound.place, dispose };
}
