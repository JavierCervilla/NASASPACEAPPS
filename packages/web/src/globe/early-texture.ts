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
 * A start map the boot asked early (start-maps.ts, VENT-93) as the texture
 * a TextureLoader would make of it, so the swapper never fetches it twice.
 */
import { Texture, type TextureLoader } from 'three';
import type { StartMaps } from './start-maps';

/**
 * The texture at `url`: made from the image asked early when there is
 * one, else loaded.
 */
export function textureAt(
  url: string,
  loader: TextureLoader,
  startMaps: StartMaps | undefined,
): Promise<Texture> {
  const early = startMaps?.take(url);
  if (!early) return loader.loadAsync(url);
  return early.then((image) => {
    const texture = new Texture(image);
    // As TextureLoader does: the image is new, so three uploads it.
    texture.needsUpdate = true;
    return texture;
  });
}
