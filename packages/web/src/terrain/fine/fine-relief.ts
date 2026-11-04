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
 * The fine real relief of one view (VENT-62): the tile that holds the
 * selected point, loaded before the ring's tiles arrive, applied to ring
 * level 0 (fine-apply.ts) and handed to the scene as slope texels. Only a
 * point inside a tile asks for anything; a tile that cannot be had leaves
 * the view with LOLA's relief and no error.
 */
import type { Frame } from '../ring/ring-frame';
import { fineSiteAt, type FineSite } from './fine-catalog';
import { newOffset, type FineOffset } from './fine-apply';
import { loadFine, type FineDeps, type FineGrid } from './fine-load';
import { planeAffine, slopeTexels, type PlaneAffine } from './fine-slope';

export type { FineDeps } from './fine-load';

/** What the ring session holds while tiles arrive. */
export interface FineRelief {
  readonly grid: FineGrid;
  readonly offset: FineOffset;
  readonly texels: Uint8Array;
}

/** What the scene and the caption read of it. */
export interface FineView {
  readonly site: FineSite;
  readonly size: number;
  readonly texels: Uint8Array;
  readonly affine: PlaneAffine;
}

/** The relief at `point`, or null when no tile holds it or it fails. */
export async function prepareFine(
  point: { readonly lat: number; readonly lonEast: number },
  deps: FineDeps,
): Promise<FineRelief | null> {
  const site = fineSiteAt(point.lat, point.lonEast);
  if (!site) return null;
  const grid = await loadFine(site, deps);
  if (!grid) return null;
  await deps.breathe?.();
  return { grid, offset: newOffset(), texels: slopeTexels(grid) };
}

/** `relief` as the scene reads it, in the view's `frame`. */
export const viewOf = (relief: FineRelief, frame: Frame): FineView => ({
  site: relief.grid.site, size: relief.grid.size, texels: relief.texels,
  affine: planeAffine(frame) });
