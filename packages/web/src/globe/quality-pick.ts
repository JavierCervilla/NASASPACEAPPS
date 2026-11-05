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
  gpuName,
  settingsFor,
  type DeviceHints,
  type QualitySettings,
  type Tier,
} from '../lib/quality';

/**
 * A phone never runs the high tier: it opens on the 1K map, stops at the
 * 4K one, and holds the pixel ratio at the medium tier's cap (below 2).
 */
export function phoneTier(tier: Tier, phone: boolean): Tier {
  return phone && tier === 'high' ? 'medium' : tier;
}

/** Where a pick reads the device and the address. */
export interface PickSources {
  /** Names the GPU; called once, by the first pick. */
  readonly probeGpu: () => string;
  /** The device's hints around that name, read on every pick. */
  readonly hints: (gpu: string) => DeviceHints;
  /** The page's address, read on every pick (`?quality=`, a hash word). */
  readonly address: () => { readonly search: string; readonly hash: string };
}

/**
 * A picker that probes the device once and reads the address on every
 * call; `phone` caps the tier with {@link phoneTier}.
 */
export function qualityPicker(
  sources: PickSources,
): (phone: boolean) => QualitySettings {
  let gpu: string | null = null;
  return (phone) => {
    gpu ??= sources.probeGpu();
    const { search, hash } = sources.address();
    const tier = detectTier(sources.hints(gpu), search, hash);
    return settingsFor(phoneTier(tier, phone));
  };
}

/** The GPU's name, from a throwaway WebGL context. */
function probePageGpu(): string {
  const probe = document.createElement('canvas').getContext('webgl2');
  const name = gpuName(probe);
  // A device allows few contexts: give the probe back at once.
  probe?.getExtension('WEBGL_lose_context')?.loseContext();
  return name;
}

/**
 * This page's picker: one WebGL probe for the globe, the glass and the
 * on-foot view together (VENT-91: each used to make and drop its own).
 */
export const pickQuality = qualityPicker({
  probeGpu: probePageGpu,
  hints: (gpu) => ({ ...deviceHints(null), gpu }),
  address: () => window.location,
});
