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
 * The transcoder worker's work (basis-worker.ts, VENT-101): every level of
 * an ETC1S KTX2 map into the GPU's format, through three's Basis Universal
 * transcoder. Pure over the module, so a test runs it on a fake one. Based on
 * the BasisWorker of three's KTX2Loader (MIT), cut to what we ship: one 2D
 * image, no alpha, ETC1S.
 */
import type { Ktx2Target } from '../globe/ktx2-target';
import type { Ktx2Image, Ktx2Level } from './ktx2-image';

/**
 * Basis transcoder formats: cTFETC1_RGB, whose blocks are valid ETC2 RGB,
 * and cTFBC1_RGB. Both 4 bits per texel and lossless from ETC1S.
 */
export const TRANSCODER_FORMAT: Readonly<Record<Ktx2Target, number>> = {
  etc2: 0,
  bc1: 2,
};

/** The part of a KTX2File the transcode reads. */
interface Ktx2File {
  isValid(): boolean;
  isETC1S(): boolean;
  getWidth(): number;
  getHeight(): number;
  getLevels(): number;
  startTranscoding(): boolean;
  getImageLevelInfo(
    mip: number, layer: number, face: number,
  ): { origWidth: number; origHeight: number };
  getImageTranscodedSizeInBytes(
    mip: number, layer: number, face: number, format: number,
  ): number;
  transcodeImage(
    dst: Uint8Array, mip: number, layer: number, face: number,
    format: number, decodeFlags: number, channel0: number, channel1: number,
  ): number | boolean;
  close(): void;
  delete(): void;
}

/** The part of three's Basis module the transcode uses. */
export interface BasisModule {
  readonly KTX2File: new (bytes: Uint8Array) => Ktx2File;
}

function opened(file: Ktx2File): void {
  if (!file.isValid()) throw new Error('not a valid KTX2 file');
  if (!file.isETC1S()) throw new Error('not ETC1S');
  if (!file.startTranscoding()) throw new Error('startTranscoding failed');
}

function level(file: Ktx2File, mip: number, format: number): Ktx2Level {
  const { origWidth, origHeight } = file.getImageLevelInfo(mip, 0, 0);
  const size = file.getImageTranscodedSizeInBytes(mip, 0, 0, format);
  const data = new Uint8Array(size);
  if (!file.transcodeImage(data, mip, 0, 0, format, 0, -1, -1)) {
    throw new Error(`level ${mip} failed`);
  }
  return { data, width: origWidth, height: origHeight };
}

/** `bytes`, a KTX2 ETC1S map, as `target` levels; throws why not. */
export function transcodeKtx2(
  basis: BasisModule,
  bytes: Uint8Array,
  target: Ktx2Target,
): Ktx2Image {
  const file = new basis.KTX2File(bytes);
  try {
    opened(file);
    const format = TRANSCODER_FORMAT[target];
    const levels = Array.from({ length: file.getLevels() },
      (_, mip) => level(file, mip, format));
    return { width: file.getWidth(), height: file.getHeight(), levels };
  } finally {
    file.close();
    file.delete();
  }
}
