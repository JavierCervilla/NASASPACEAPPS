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
 * The view's photographed surfaces (VENT-34), loaded when the scene starts
 * and never in the first load (their file names carry `on-foot`, which the
 * service worker leaves out of the precache): the regolith's albedo and
 * normal map (Poly Haven «Moon 02», CC0) and the Earth (NASA Blue Marble
 * Next Generation, public domain), ASSETS.md. A phone takes the 512 px
 * Earth (VENT-94): its disc is some 30 device pixels wide there.
 */
import {
  ClampToEdgeWrapping,
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
  type Texture,
} from 'three';
import albedoUrl from '../maps/on-foot-regolith-albedo.webp?url';
import normalUrl from '../maps/on-foot-regolith-normal.webp?url';
import earthUrl from '../maps/on-foot-earth.webp?url';
import earthPhoneUrl from '../maps/on-foot-earth-512.webp?url';

export interface SurfaceMaps {
  readonly albedo: Texture;
  readonly normal: Texture;
  readonly earth: Texture;
}

/** `texture` as a colour map or data, tiling or not, sharp at a slant. */
function prepared(texture: Texture, colour: boolean, tiling: boolean): Texture {
  texture.colorSpace = colour ? SRGBColorSpace : NoColorSpace;
  texture.wrapS = tiling ? RepeatWrapping : ClampToEdgeWrapping;
  texture.wrapT = tiling ? RepeatWrapping : ClampToEdgeWrapping;
  texture.anisotropy = 8;
  return texture;
}

/** The Earth's map for a phone-sized viewport or a wider one. */
export function earthMapUrl(phone: boolean): string {
  return phone ? earthPhoneUrl : earthUrl;
}

/** Loads the three maps; rejects when any is missing. */
export async function loadSurfaceMaps(phone: boolean): Promise<SurfaceMaps> {
  const loader = new TextureLoader();
  const [albedo, normal, earth] = await Promise.all(
    [albedoUrl, normalUrl, earthMapUrl(phone)]
      .map((url) => loader.loadAsync(url)));
  return {
    albedo: prepared(albedo as Texture, true, true),
    normal: prepared(normal as Texture, false, true),
    earth: prepared(earth as Texture, true, false),
  };
}
