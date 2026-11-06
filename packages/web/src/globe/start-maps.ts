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
import { pageKtx2 } from '../textures/ktx2-session';
import { fetchBytes, pageTranscoder } from '../textures/ktx2-page';
import { globeQuality } from './globe-quality';
import type { Ktx2Choice } from './ktx2-target';
import { levelUrls, startLevel } from './texture-lod';

/** Fetches and decodes an image; rejects when it does not load. */
export type ImageFetch = (url: string) => Promise<HTMLImageElement>;

/** Fetches a file's bytes; rejects when it does not come. */
export type BytesFetch = (url: string) => Promise<ArrayBuffer>;

/** The start maps on their way, each handed out once. */
export interface StartMaps {
  /** The image asked for `url`, once; null when it was not asked. */
  readonly take: (url: string) => Promise<HTMLImageElement> | null;
  /** The KTX2 bytes asked for `url`, once; null when not asked. */
  readonly takeBytes: (url: string) => Promise<ArrayBuffer> | null;
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

/** Hands each of `asked` out once, then forgets it. */
function handOut<T>(asked: Map<string, Promise<T>>) {
  return (url: string): Promise<T> | null => {
    const kept = asked.get(url) ?? null;
    asked.delete(url);
    return kept;
  };
}

/**
 * Asks `urls` now, a `.ktx2` as bytes (VENT-101); {@link StartMaps.take}
 * and {@link StartMaps.takeBytes} hand each out once.
 */
export function askStartMaps(
  urls: { colour: string; normal: string },
  fetchImage: ImageFetch,
  fetchBytes?: BytesFetch,
): StartMaps {
  const images = new Map<string, Promise<HTMLImageElement>>();
  const bytes = new Map<string, Promise<ArrayBuffer>>();
  for (const url of [urls.colour, urls.normal]) {
    const ktx2 = fetchBytes && url.endsWith('.ktx2');
    const asked = ktx2 ? fetchBytes(url) : fetchImage(url);
    // A failure is the swapper's to report; untaken, it stays quiet.
    asked.catch(() => undefined);
    if (ktx2) bytes.set(url, asked as Promise<ArrayBuffer>);
    else images.set(url, asked as Promise<HTMLImageElement>);
  }
  return { take: handOut(images), takeBytes: handOut(bytes) };
}

/** What the early start needs for a KTX2 colour map (VENT-101). */
export interface EarlyKtx2 {
  /** The page session's KTX2 decision (textures/ktx2-session.ts). */
  readonly choice: () => Ktx2Choice;
  readonly fetchBytes: BytesFetch;
  /** Starts the transcoder worker beside the chunk's download. */
  readonly warm: () => void;
}

export interface EarlyDeps {
  /** The device's quality settings (a throwaway context names the GPU). */
  readonly pick: () => QualitySettings;
  readonly fetchImage: ImageFetch;
  /** KTX2 for the start colour; without it, JPEG only. */
  readonly ktx2?: EarlyKtx2 | undefined;
}

const PAGE_DEPS: EarlyDeps = {
  pick: () => globeQuality(),
  fetchImage: loadImage,
  ktx2: { choice: pageKtx2.choice, fetchBytes, warm: pageTranscoder.warm },
};

/**
 * Reads the tier and asks its start maps under the site's `base`; a KTX2
 * start colour also starts the transcoder worker, so it loads the
 * transcoder while Three.js downloads.
 */
export function earlyStart(base: string, deps = PAGE_DEPS): EarlyStart {
  const quality = deps.pick();
  const target = deps.ktx2?.choice().target ?? null;
  const urls = levelUrls(startLevel(quality.tier), base, target);
  const ktx2 = urls.colour.endsWith('.ktx2') ? deps.ktx2 : undefined;
  ktx2?.warm();
  const maps = askStartMaps(urls, deps.fetchImage, ktx2?.fetchBytes);
  return { quality, maps };
}
