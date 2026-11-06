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
 * Whether the page takes its maps as KTX2 (VENT-101), for the whole page
 * session: decided once from the probe's profile, the address and the
 * Save-Data hint, and off for good the first time the transcoder worker or
 * a map fails, so later maps go straight to their JPEG or WebP sibling.
 */
import { ktx2Choice, pagePlatform, type Ktx2Choice } from '../globe/ktx2-target';
import { pickQuality } from '../globe/quality-pick';
import { prefersSaveData } from '../lib/viewport';

export interface Ktx2Switch {
  /** The decision now: a target, or off with the reason. */
  readonly choice: () => Ktx2Choice;
  /** Turns KTX2 off for the session; the first reason stays. */
  readonly off: (reason: string) => void;
}

/** A switch over `decide`, asked once, on the first read. */
export function ktx2Switch(decide: () => Ktx2Choice): Ktx2Switch {
  let decided: Ktx2Choice | null = null;
  return {
    choice: () => (decided ??= decide()),
    off: (reason) => {
      const now = (decided ??= decide());
      if (now.target) decided = { target: null, reason };
    },
  };
}

/** This page's switch, from the page probe (globe/quality-pick.ts). */
export const pageKtx2 = ktx2Switch(() =>
  ktx2Choice(pickQuality.gpuProfile(), pagePlatform(navigator),
    window.location.search, prefersSaveData()));
