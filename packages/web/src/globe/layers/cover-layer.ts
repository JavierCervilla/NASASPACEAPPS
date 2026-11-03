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
 * A layer that draws nothing and covers one point's disc (VENT-55, V-19):
 * how the standing pin, which is no site marker and no saved pin, tells
 * the graticule's labels to keep clear of its ring, as the saved pins do
 * through their layer (point-layer.ts). Pure.
 */
import type { LatLon } from '../../lib/polar-projection';
import type { ScreenPoint } from '../marker-cull';
import type { LayerCover, LayerRenderer } from './registry';

export interface CoverLayer extends LayerRenderer {
  /** The point covered from the next frame; null: none. */
  setPoint(point: LatLon | null): void;
}

/** A cover-only layer whose point covers a disc of `radius` px. */
export function coverLayer(radius: number): CoverLayer {
  let point: LatLon | null = null;
  let at: ScreenPoint | null = null;
  return {
    setPoint: (next) => {
      point = next;
      if (!next) at = null;
    },
    place: (frame) => {
      at = point ? frame.project(point) : null;
    },
    covers: (): LayerCover[] => (at ? [{ at, radius }] : []),
  };
}
