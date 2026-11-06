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
 * The globe's colour map as KTX2 with its JPEG sibling behind it (VENT-101):
 * a `.ktx2` address comes through the transcoder worker, and any failure
 * (no worker, a transcoder that would not load under the browser's CSP, a
 * fetch or transcode error) turns KTX2 off for the page session and answers
 * the same load with the JPEG, so the swapper's contract holds: a load
 * rejects only when both fail. Both outcomes are told to the `?debug` trace.
 * Generic over the texture, so it is tested without a GPU.
 */
import type { Ktx2Target } from './ktx2-target';
import type { LodLevel } from './texture-lod';
import type { MapEvent } from './map-trace';
import type { Ktx2Switch } from '../textures/ktx2-session';

export interface Ktx2MapDeps<T> {
  /** Loads a `.ktx2` map in `target`; rejects why not. */
  readonly ktx2: (url: string, target: Ktx2Target) => Promise<T>;
  /** Loads a JPEG map. */
  readonly jpeg: (url: string) => Promise<T>;
  readonly session: Ktx2Switch;
  readonly mark?: ((event: MapEvent) => void) | undefined;
  /** The fallback of a `.ktx2` address; its JPEG sibling by default. */
  readonly fallbackOf?: ((url: string) => string) | undefined;
}

/** The JPEG that ships beside a KTX2 map. */
export const jpegSibling = (url: string): string =>
  url.replace(/\.ktx2$/, '.jpg');

/** The level a colour map's address names (`moon-lroc-2k.ktx2`). */
const levelOf = (url: string): LodLevel =>
  Number(/-(\d)k\.ktx2$/.exec(url)?.[1] ?? 1) as LodLevel;

/** Loads a colour map: KTX2 while the session takes it, else its JPEG. */
export function ktx2OrJpeg<T>(
  deps: Ktx2MapDeps<T>,
): (url: string) => Promise<T> {
  const fallbackOf = deps.fallbackOf ?? jpegSibling;
  return async (url) => {
    const { target } = deps.session.choice();
    if (!url.endsWith('.ktx2')) return deps.jpeg(url);
    if (!target) return deps.jpeg(fallbackOf(url));
    try {
      const texture = await deps.ktx2(url, target);
      deps.mark?.({ kind: 'ktx2', level: levelOf(url), map: 'colour',
        target });
      return texture;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      if (deps.session.choice().target) {
        deps.session.off(reason);
        deps.mark?.({ kind: 'ktx2Off', reason });
      }
      return deps.jpeg(fallbackOf(url));
    }
  };
}
