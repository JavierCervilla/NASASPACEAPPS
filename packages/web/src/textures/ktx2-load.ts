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
 * A KTX2 map as the GPU's texture (VENT-101): its bytes (taken from the
 * early start or fetched), transcoded in the worker (ktx2-transcoder.ts) to
 * ETC2 or BC1, and made into a CompressedTexture with the levels the file
 * carries: sRGB, trilinear, nothing generated on the main thread. Any
 * failure is a Ktx2Unavailable, so the caller loads the JPEG instead.
 */
import {
  CompressedTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  RGB_ETC2_Format,
  RGB_S3TC_DXT1_Format,
  SRGBColorSpace,
  UnsignedByteType,
  type CompressedPixelFormat,
} from 'three';
import type { Ktx2Target } from '../globe/ktx2-target';
import type { Ktx2Image } from './ktx2-image';
import { Ktx2Unavailable, type Transcoder } from './ktx2-transcoder';

const FORMAT: Readonly<Record<Ktx2Target, CompressedPixelFormat>> = {
  etc2: RGB_ETC2_Format,
  bc1: RGB_S3TC_DXT1_Format,
};

/** `image`'s levels as a colour texture, ready to upload. */
export function compressedTexture(
  image: Ktx2Image,
  target: Ktx2Target,
): CompressedTexture {
  const mipmaps = image.levels.map(({ data, width, height }) =>
    ({ data, width, height }));
  const texture = new CompressedTexture(mipmaps, image.width, image.height,
    FORMAT[target], UnsignedByteType);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

export interface Ktx2LoadDeps {
  readonly transcoder: Transcoder;
  /** Fetches a file's bytes; rejects when it does not come. */
  readonly bytes: (url: string) => Promise<ArrayBuffer>;
  /** The bytes the early start asked for `url`, once; else null. */
  readonly early: (url: string) => Promise<ArrayBuffer> | null;
}

/** The map at `url` as a `target` texture; rejects Ktx2Unavailable. */
export async function loadKtx2(
  url: string,
  target: Ktx2Target,
  deps: Ktx2LoadDeps,
): Promise<CompressedTexture> {
  let buffer: ArrayBuffer;
  try {
    buffer = await (deps.early(url) ?? deps.bytes(url));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Ktx2Unavailable(`fetch failed: ${reason}`);
  }
  return compressedTexture(await deps.transcoder.transcode(buffer, target),
    target);
}
