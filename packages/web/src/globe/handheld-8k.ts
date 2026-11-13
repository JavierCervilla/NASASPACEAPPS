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
 * The 8K colour on a phone or a touch screen comes only as KTX2 (VENT-123):
 * as a JPEG it is 179 MB of GPU memory, decoded and uploaded on the main
 * thread, which has cost a phone its GPU context; as KTX2 about 22 MB,
 * transcoded in the worker. The density rule asks a handheld's 8K only
 * while the session takes KTX2 (texture-lod.ts); this guard sits where
 * every JPEG colour load passes (moon-textures.ts), so no order of events
 * (the 8K KTX2 failing over to its sibling, or KTX2 turned off between the
 * rule and the fetch) asks the 8K JPEG there. Pure.
 */
import type { MapEvent } from './map-trace';

const EIGHT_K_JPEG = /moon-lroc-8k\.jpg$/;

export interface HandheldJpegOptions {
  /** The phone layout or a coarse pointer. */
  readonly handheld: boolean;
  /** Where the 8K given up is told under `?debug`, once. */
  readonly mark?: ((event: MapEvent) => void) | undefined;
}

/** `jpeg`, refusing the 8K colour on a handheld. */
export function handheldJpeg<T>(
  jpeg: (url: string) => Promise<T>,
  options: HandheldJpegOptions,
): (url: string) => Promise<T> {
  if (!options.handheld) return jpeg;
  let told = false;
  return (url) => {
    if (!EIGHT_K_JPEG.test(url)) return jpeg(url);
    if (!told) options.mark?.({ kind: 'eightKGivenUp' });
    told = true;
    return Promise.reject(
      new Error('the 8K JPEG is never asked on a phone or touch screen'));
  };
}
