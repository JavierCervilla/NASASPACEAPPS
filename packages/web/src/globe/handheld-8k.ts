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
 * while the session takes KTX2 and has not given the 8K up
 * (texture-lod.ts). The 8K is given up for the session, once, through the
 * gate: when its JPEG is asked (the 8K KTX2 failed over to its sibling, or
 * KTX2 turned off between the rule and the fetch: the guard sits where
 * every JPEG colour load passes, moon-textures.ts, so that JPEG is never
 * fetched there), and when the GPU context is lost while the 8K is on the
 * Moon or coming (three swallows an upload's out-of-memory, and a restored
 * context would upload the same 8K again). Pure: the canvas and the
 * swapper come in.
 */
import type { MapEvent } from './map-trace';

const EIGHT_K_JPEG = /moon-lroc-8k\.jpg$/;

/** Whether the 8K is given up for the session, and how it is. */
export interface EightKGate {
  readonly givenUp: () => boolean;
  /** Gives the 8K up, told once under `?debug` with `reason`. */
  readonly giveUp: (reason: string) => void;
}

/** A gate that tells its give-up to `mark`, if anywhere. */
export function eightKGate(
  mark?: ((event: MapEvent) => void) | undefined,
): EightKGate {
  let given = false;
  return {
    givenUp: () => given,
    giveUp: (reason) => {
      if (!given) mark?.({ kind: 'eightKGivenUp', reason });
      given = true;
    },
  };
}

/** A handheld's `jpeg`, refusing the 8K colour and giving the 8K up. */
export function handheldJpeg<T>(
  jpeg: (url: string) => Promise<T>,
  gate: EightKGate,
): (url: string) => Promise<T> {
  return (url) => {
    if (!EIGHT_K_JPEG.test(url)) return jpeg(url);
    gate.giveUp('KTX2 failed');
    return Promise.reject(
      new Error('the 8K JPEG is never asked on a phone or touch screen'));
  };
}

/** The part of the swapper a lost context moves. */
export interface EightKSwap {
  /**
   * Goes down to the 4K when the 8K is on the Moon or coming; false when
   * it is neither.
   */
  readonly capAt4: () => boolean;
}

/**
 * Gives the 8K up when `canvas` loses its GPU context while the 8K is on
 * the Moon or coming, moving the swapper to the 4K, which the frame after
 * the restore draws. Returns what unbinds it.
 */
export function giveUpOnContextLoss(
  canvas: EventTarget,
  gate: EightKGate,
  swap: EightKSwap,
): () => void {
  const lost = (): void => {
    if (!gate.givenUp() && swap.capAt4()) gate.giveUp('GPU context lost');
  };
  canvas.addEventListener('webglcontextlost', lost);
  return () => canvas.removeEventListener('webglcontextlost', lost);
}
