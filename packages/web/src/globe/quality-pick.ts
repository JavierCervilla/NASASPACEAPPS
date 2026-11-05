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
 * The quality tier for this device. The Moon maps that go with each tier
 * are chosen in texture-lod.ts.
 */
import {
  detectTier,
  deviceHints,
  settingsFor,
  type QualitySettings,
  type Tier,
} from '../lib/quality';
import { isPhoneViewport } from '../lib/viewport';

/**
 * A phone never runs the high tier: it opens on the 1K map, stops at the
 * 4K one, and holds the pixel ratio at the medium tier's cap (below 2).
 */
export function phoneTier(tier: Tier, phone: boolean): Tier {
  return phone && tier === 'high' ? 'medium' : tier;
}

/**
 * Reads the device (a throwaway WebGL context names the GPU); `phone` caps
 * the tier with {@link phoneTier}.
 */
export function pickQuality(phone: boolean): QualitySettings {
  const probe = document.createElement('canvas').getContext('webgl2');
  const device = deviceHints(probe);
  // A device allows few contexts: give the probe back at once.
  probe?.getExtension('WEBGL_lose_context')?.loseContext();
  const { search, hash } = window.location;
  return settingsFor(phoneTier(detectTier(device, search, hash), phone));
}

/**
 * The globe's settings: the ones the boot read before the chunk loaded
 * (start-maps.ts), else read now.
 */
export const globeQuality = (
  early?: { readonly quality: QualitySettings } | undefined,
): QualitySettings => early?.quality ?? pickQuality(isPhoneViewport());
