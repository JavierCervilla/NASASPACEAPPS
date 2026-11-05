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
 * The Moon's start maps, asked as soon as the tier is known (VENT-93): the
 * boot asks them before it imports the globe's chunk, so they download
 * while Three.js arrives and the scene is built, instead of after it (the
 * VENT-80 baseline measured them asked 3.7 s after the chunk landed on a
 * phone profile). Only the start level of the tier is asked: the device
 * may never use another one. The swapper takes each image once
 * (moon-textures.ts), so nothing is fetched twice. No Three.js here: this
 * module is in the page's start chunk.
 */
import type { QualitySettings } from '../lib/quality';
import { globeQuality } from './quality-pick';
import { levelUrls, startLevel } from './texture-lod';

/** Fetches and decodes an image; rejects when it does not load. */
export type ImageFetch = (url: string) => Promise<HTMLImageElement>;

/** The start maps on their way, each handed out once. */
export interface StartMaps {
  /** The image asked for `url`, once; null when it was not asked. */
  readonly take: (url: string) => Promise<HTMLImageElement> | null;
}

/** What the boot knows before the globe's chunk: tier and start maps. */
export interface EarlyStart {
  readonly quality: QualitySettings;
  readonly maps: StartMaps;
}

/**
 * An image as Three.js's ImageLoader asks it (an `<img>` with
 * `crossOrigin` set to anonymous), so the texture made from it is the one
 * a TextureLoader would make.
 */
export const loadImage: ImageFetch = (url) =>
  new Promise((resolve, reject) => {
    const image = document.createElement('img');
    image.addEventListener('load', () => resolve(image), { once: true });
    image.addEventListener('error', reject, { once: true });
    image.crossOrigin = 'anonymous';
    image.src = url;
  });

/** Asks `urls` now; {@link StartMaps.take} hands each image out once. */
export function askStartMaps(
  urls: { colour: string; normal: string },
  fetchImage: ImageFetch,
): StartMaps {
  const asked = new Map<string, Promise<HTMLImageElement>>();
  for (const url of [urls.colour, urls.normal]) {
    const image = fetchImage(url);
    // A failure is the swapper's to report; untaken, it stays quiet.
    image.catch(() => undefined);
    asked.set(url, image);
  }
  return {
    take: (url) => {
      const image = asked.get(url) ?? null;
      asked.delete(url);
      return image;
    },
  };
}

export interface EarlyDeps {
  /** The device's quality settings (a throwaway context names the GPU). */
  readonly pick: () => QualitySettings;
  readonly fetchImage: ImageFetch;
}

const PAGE_DEPS: EarlyDeps = {
  pick: () => globeQuality(),
  fetchImage: loadImage,
};

/** Reads the tier and asks its start maps under the site's `base`. */
export function earlyStart(base: string, deps = PAGE_DEPS): EarlyStart {
  const quality = deps.pick();
  const urls = levelUrls(startLevel(quality.tier), base);
  return { quality, maps: askStartMaps(urls, deps.fetchImage) };
}
