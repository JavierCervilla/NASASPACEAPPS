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
  type DeviceHints,
  type QualitySettings,
  type Tier,
} from '../lib/quality';
import type { GpuProfile } from '../lib/gpu-profile';
import { probePage, type PageDevice } from './device-probe';

export type { PageDevice } from './device-probe';

/**
 * A phone never runs the high tier: it opens on the 1K map, stops at the
 * 4K one, and holds the pixel ratio at the medium tier's cap (below 2).
 */
export function phoneTier(tier: Tier, phone: boolean): Tier {
  return phone && tier === 'high' ? 'medium' : tier;
}

/** Where a pick reads the device and the address. */
export interface PickSources {
  /** Probes the device; called once, by the first pick or read. */
  readonly probeDevice: () => PageDevice;
  /** The device's hints around that name, read on every pick. */
  readonly hints: (gpu: string) => DeviceHints;
  /** The page's address, read on every pick (`?quality=`, a hash word). */
  readonly address: () => { readonly search: string; readonly hash: string };
}

/** A pick, and the device its one probe read. */
export interface QualityPicker {
  (phone: boolean): QualitySettings;
  readonly device: () => PageDevice;
  readonly gpuProfile: () => GpuProfile;
}

/**
 * A picker that probes the device once and reads the address on every
 * call; `phone` caps the tier with {@link phoneTier}.
 */
export function qualityPicker(sources: PickSources): QualityPicker {
  let probed: PageDevice | null = null;
  const device = (): PageDevice => (probed ??= sources.probeDevice());
  return Object.assign((phone: boolean): QualitySettings => {
    const { search, hash } = sources.address();
    const hints = sources.hints(device().gpu);
    return settingsFor(phoneTier(detectTier(hints, search, hash), phone));
  }, { device, gpuProfile: () => device().profile });
}

/**
 * This page's picker: one WebGL probe for the globe, the glass and the
 * on-foot view together (VENT-91: each used to make and drop its own).
 */
export const pickQuality = qualityPicker({
  probeDevice: probePage,
  hints: (gpu) => ({ ...deviceHints(null), gpu }),
  address: () => window.location,
});
