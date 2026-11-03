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
 * Shades the plan's tiles as they land (VENT-60, B): each tile once, from
 * its own heights, as a job of the work slicer (scene/slicer.ts: a budget
 * per turn of the event loop, never a long task), into the tile's canvas,
 * which is then marked shaded so it fades in. Nearest and first come are
 * shaded first; leaving the plan forgets the work still waiting.
 */
import { useCallback, useEffect, useState } from 'react';
import { shadeTile, tileAxes } from '../../../terrain/loader/hillshade';
import type { Frame } from '../../../terrain/ring/ring-frame';
import type { ProgressTile } from '../../../terrain/ring/ring-progress';
import type { RingTile } from '../../../terrain/ring/ring-store';
import { createSlicer } from '../../../terrain/scene/slicer';

/** Paints `tile` lit from `sunAzDeg` into `canvas`, then marks it. */
function paint(canvas: HTMLCanvasElement, tile: RingTile, frame: Frame,
  sunAzDeg: number): void {
  const pixels = shadeTile(tile, tileAxes(tile.key, frame), sunAzDeg);
  canvas.getContext('2d')
    ?.putImageData(new ImageData(pixels, tile.n, tile.n), 0, 0);
  canvas.dataset['shaded'] = 'true';
}

export type ShadeTile = (tile: ProgressTile, canvas: HTMLCanvasElement) =>
  void;

/** What shades a landed tile into its canvas, lit from `sunAzDeg`. */
export function useTileShader(frame: Frame, sunAzDeg: number): ShadeTile {
  const [slicer] = useState(() =>
    createSlicer({ invalidate: () => undefined }));
  useEffect(() => () => slicer.clear(), [slicer]);
  return useCallback((t, canvas) => {
    const tile = t.tile;
    if (!tile || canvas.dataset['shaded']) return;
    slicer.add(`${t.level}/${t.x}/${t.y}`, t.order,
      () => paint(canvas, tile, frame, sunAzDeg));
  }, [slicer, frame, sunAzDeg]);
}
