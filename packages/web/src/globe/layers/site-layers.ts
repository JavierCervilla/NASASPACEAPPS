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
 * The landing sites and the approximate zones as globe layers (VENT-37).
 * Both are drawn by the one marker layer (marker-layer.ts), which culls
 * zones that would cover a marker and routes a click to the nearest dot
 * across both kinds, so they are not split: their renderers only show or
 * hide their kind of marker, and the marker layer's element stays first
 * over the canvas, under every other layer's root whatever its `z`. The
 * selected site's marker shows even when its layer is off.
 */
import type { MarkerLayer } from '../marker-layer';
import type { MarkerKind } from '../markers';
import { LAYER_IDS, LAYER_Z } from './ids';
import type { GlobeLayer, LayerRegistry } from './registry';

type Markers = Pick<MarkerLayer, 'kinds'>;

/** Shows (or hides) `kind` in `kinds`; the binder draws a frame after. */
const showing = (kinds: Set<MarkerKind>, kind: MarkerKind) =>
  (visible: boolean): void => {
    if (visible) kinds.add(kind);
    else kinds.delete(kind);
  };

/** The two layers over `markers`. */
export function siteLayers(markers: Markers): readonly GlobeLayer[] {
  const sites: GlobeLayer = {
    id: LAYER_IDS.sites,
    z: LAYER_Z.sites,
    renderer: { show: showing(markers.kinds, 'exact') },
  };
  const zones: GlobeLayer = {
    id: LAYER_IDS.zones,
    z: LAYER_Z.zones,
    renderer: { show: showing(markers.kinds, 'zone') },
  };
  return [sites, zones];
}

/** Registers both on `registry`; returns how to take them away. */
export function registerSiteLayers(
  registry: LayerRegistry,
  markers: Markers,
): () => void {
  const off = siteLayers(markers).map((layer) => registry.register(layer));
  return () => off.forEach((fn) => fn());
}
