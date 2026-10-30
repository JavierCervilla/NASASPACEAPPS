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
 * Which glass the page's floating surfaces wear (VENT-27): «liquid», the
 * refracting material of the approved prototype, or «frosted», the blur
 * every browser draws. Liquid needs `backdrop-filter: url(#…)`, which only
 * Chromium renders: Safari and Firefox parse it (so `CSS.supports` says
 * yes) and then draw no backdrop at all, so the feature test is paired
 * with a Chromium engine check (the `Chromium` brand of
 * `navigator.userAgentData`, which neither of them exposes). It also needs
 * a device with power (quality tier medium or high) and a visitor who
 * asked for none of: less transparency, more contrast, or saving data.
 * `?glass=liquid|frosted` forces a mode for testing, as `?quality=` does.
 * Pure.
 */
import type { Tier } from '../lib/quality';

export type GlassMode = 'liquid' | 'frosted';

/** What the choice reads; `tier` is read last, only when it matters. */
export interface GlassEnv {
  /** The page's query string. */
  readonly search: string;
  /** The mode kept for this session after a failed frame probe. */
  readonly kept: GlassMode | null;
  /** A Chromium engine (see the module comment). */
  readonly chromium: boolean;
  /** `CSS.supports('backdrop-filter', 'url(#x)')`. */
  readonly refracts: boolean;
  readonly saveData: boolean;
  readonly reducedTransparency: boolean;
  readonly moreContrast: boolean;
  /** The device's quality tier (it probes the GPU: asked for last). */
  readonly tier: () => Tier;
}

export interface GlassChoice {
  readonly mode: GlassMode;
  /** Why, for the dev tools and the tests. */
  readonly reason: string;
  /** Liquid on trial: watch the frame time and fall back if it is slow. */
  readonly probe: boolean;
}

/** The mode `?glass=` forces, if any. */
export function forcedGlass(search: string): GlassMode | null {
  const value = new URLSearchParams(search).get('glass');
  return value === 'liquid' || value === 'frosted' ? value : null;
}

/** A brand of `navigator.userAgentData`. */
export interface UaBrand {
  readonly brand: string;
}

/** Whether the brands name the Chromium engine (Chrome, Edge, Brave…). */
export function chromiumEngine(
  brands: readonly UaBrand[] | undefined,
): boolean {
  return brands?.some(({ brand }) => brand === 'Chromium') ?? false;
}

/** The first rule that rules liquid out, or null when none does. */
function frostedBecause(env: GlassEnv): string | null {
  if (env.kept === 'frosted') return 'kept';
  if (!env.chromium || !env.refracts) return 'no-refraction';
  if (env.saveData) return 'save-data';
  if (env.reducedTransparency) return 'reduced-transparency';
  if (env.moreContrast) return 'more-contrast';
  if (env.tier() === 'low') return 'low-tier';
  return null;
}

/** The glass for this page load. */
export function chooseGlass(env: GlassEnv): GlassChoice {
  const forced = forcedGlass(env.search);
  if (forced) return { mode: forced, reason: 'forced', probe: false };
  const reason = frostedBecause(env);
  if (reason) return { mode: 'frosted', reason, probe: false };
  return { mode: 'liquid', reason: 'capable', probe: true };
}
