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
 * What the transcoder worker and the page say to each other (VENT-101): a
 * map's bytes and the GPU format asked for, then its levels in that format,
 * or why not. Plain data, transferred, so no copy crosses the thread.
 */
import type { Ktx2Target } from '../globe/ktx2-target';

/** One mip level in the GPU's format. */
export interface Ktx2Level {
  readonly data: Uint8Array;
  readonly width: number;
  readonly height: number;
}

/** A map's levels, the full size first. */
export interface Ktx2Image {
  readonly width: number;
  readonly height: number;
  readonly levels: readonly Ktx2Level[];
}

/** The page asks: transcode `buffer` to `target`. */
export interface TranscodeAsk {
  readonly id: number;
  readonly buffer: ArrayBuffer;
  readonly target: Ktx2Target;
}

/** The worker answers, under the ask's id. */
export type TranscodeAnswer =
  | { readonly id: number; readonly ok: true; readonly image: Ktx2Image }
  | { readonly id: number; readonly ok: false; readonly error: string };
