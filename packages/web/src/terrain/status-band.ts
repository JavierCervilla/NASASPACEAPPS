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
 * Where the on-foot view's notice goes on a phone (VENT-51): the stage
 * fills the screen under the top bar and the sheet, so the notice sits in
 * the free band between them, and when that band is too short for it
 * (200 % text lifts the sheet to the top bar) the sheet makes room. Pure.
 */

/** A band of the screen in px from the viewport's top. */
export interface ScreenBand {
  readonly top: number;
  readonly bottom: number;
}

/** A band in px from the stage's top: where it starts and how tall. */
export interface StageBand {
  readonly top: number;
  readonly height: number;
}

/** `band` in the px of a stage whose top is `stageTop`; never negative. */
export function bandInStage(band: ScreenBand, stageTop: number): StageBand {
  const top = Math.max(band.top - stageTop, 0);
  return { top, height: Math.max(band.bottom - stageTop - top, 0) };
}

/** Whether a notice `noticePx` tall, padding included, fits in `band`. */
export const noticeFits = (noticePx: number, band: StageBand): boolean =>
  noticePx <= band.height;
