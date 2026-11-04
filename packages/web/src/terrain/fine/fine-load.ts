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
 * Loads one fine tile (VENT-62): its 16-bit heights and its 1-bit mask,
 * decoded to metres over the sphere and to the feather's weights (0 to 1).
 * The decode runs in stages with a breath between them, so no turn of the
 * page takes more than a few milliseconds. A tile that cannot be had is
 * null: the view then has LOLA's relief, as anywhere else.
 */
import type { FineSite } from './fine-catalog';
import { featherWeights } from './fine-feather';
import { decodeGreyPng } from './png-grey';

/** A decoded tile, row-major from the north, `size` x `size`. */
export interface FineGrid {
  readonly site: FineSite;
  readonly size: number;
  /** Metres over the sphere. */
  readonly heights: Float32Array;
  /** The share of the fine relief to show, 0 to 1. */
  readonly weights: Float32Array;
}

export interface FineDeps {
  readonly fetch: (url: string) => Promise<Response>;
  /** The app's base path, with its trailing slash. */
  readonly base: string;
  readonly breathe?: () => Promise<void>;
}

const bytesOf = async (deps: FineDeps, url: string): Promise<Uint8Array> => {
  const response = await deps.fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
};

/** `site`'s grid, or null when it cannot be loaded or does not decode. */
export async function loadFine(
  site: FineSite,
  deps: FineDeps,
): Promise<FineGrid | null> {
  const breathe = deps.breathe ?? (async () => undefined);
  const dir = `${deps.base}fine-tiles/${site.folder}/`;
  try {
    const [heightsPng, maskPng] = await Promise.all([
      bytesOf(deps, `${dir}heights.png`), bytesOf(deps, `${dir}mask.png`)]);
    const dn = await decodeGreyPng(heightsPng);
    await breathe();
    const mask = await decodeGreyPng(maskPng);
    await breathe();
    const heights = Float32Array.from(dn.samples,
      (v) => site.offsetM + v * site.stepM);
    const weights = Float32Array.from(
      featherWeights(mask.samples, mask.width, mask.height), (w) => w / 255);
    return { site, size: dn.width, heights, weights };
  } catch {
    return null;
  }
}
