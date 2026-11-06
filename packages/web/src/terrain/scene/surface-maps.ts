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
 * Earth (VENT-94): its disc is some 30 device pixels wide there. The albedo
 * and the Earth come as KTX2 where the GPU takes it (VENT-101), 4 bits per
 * texel on the GPU instead of 32, with the WebP behind them; a KTX2 that
 * fails is told to `?debug` (VENT-107).
 */
import {
  ClampToEdgeWrapping,
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from 'three';
import { ktx2OrJpeg } from '../../globe/ktx2-map';
import albedoUrl from '../maps/on-foot-regolith-albedo.webp?url';
import normalUrl from '../maps/on-foot-regolith-normal.webp?url';
import earthUrl from '../maps/on-foot-earth.webp?url';
import earthPhoneUrl from '../maps/on-foot-earth-512.webp?url';
import albedoKtx2 from '../maps/on-foot-regolith-albedo.ktx2?url';
import earthKtx2 from '../maps/on-foot-earth.ktx2?url';
import earthPhoneKtx2 from '../maps/on-foot-earth-512.ktx2?url';
import { pageSurfaceLoad, type SurfaceLoad } from './surface-load';

export type { SurfaceLoad } from './surface-load';

/** Each colour map's WebP, by its KTX2. */
const WEBP_OF: ReadonlyMap<string, string> = new Map([
  [albedoKtx2, albedoUrl],
  [earthKtx2, earthUrl],
  [earthPhoneKtx2, earthPhoneUrl],
]);

/** Each colour map's name in a `?debug` line, by its KTX2. */
const NAME_OF: ReadonlyMap<string, string> = new Map([
  [albedoKtx2, 'albedo'],
  [earthKtx2, 'Earth'],
  [earthPhoneKtx2, 'Earth'],
]);

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

/** `load`'s KTX2 loader, telling each failure to its crumb, if any. */
function told(load: SurfaceLoad): SurfaceLoad['ktx2'] {
  const { crumb } = load;
  if (!crumb) return load.ktx2;
  return (url, target) => load.ktx2(url, target).catch((error: unknown) => {
    const reason = error instanceof Error ? error.message : String(error);
    const name = NAME_OF.get(url) ?? url;
    crumb(`on-foot: ${name} KTX2 failed → WebP: ${reason}`);
    throw error;
  });
}

/** The Earth's map for a phone-sized viewport or a wider one. */
export function earthMapUrl(phone: boolean): string {
  return phone ? earthPhoneUrl : earthUrl;
}

/**
 * Loads the three maps, the colour ones as KTX2 while the session takes
 * it, else (or when KTX2 fails) as WebP; rejects when any is missing.
 */
export async function loadSurfaceMaps(
  phone: boolean,
  load: SurfaceLoad = pageSurfaceLoad(),
): Promise<SurfaceMaps> {
  const colour = ktx2OrJpeg<Texture>({
    ...load,
    ktx2: told(load),
    jpeg: load.image,
    fallbackOf: (url) => WEBP_OF.get(url) ?? url,
  });
  const [albedo, normal, earth] = await Promise.all([
    colour(albedoKtx2),
    load.image(normalUrl),
    colour(phone ? earthPhoneKtx2 : earthKtx2),
  ]);
  return {
    albedo: prepared(albedo, true, true),
    normal: prepared(normal, false, true),
    earth: prepared(earth, true, false),
  };
}
