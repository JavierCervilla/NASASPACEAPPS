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
 * What the address's hash asks the dev tools for: `#stats-low-spector` forces
 * the low quality tier and turns Spector.js on. The flags are read at boot,
 * so changing one reloads the page. Spector.js is only in the dev server and
 * a PUBLIC_PERF_HUD=1 build: elsewhere (a production build opened with
 * `?debug`) its word is not even in the code, which
 * scripts/check-no-devtools.mjs checks, and `capture` is always off.
 *
 * Split out of perf-hud.ts, ported from GAMESTUDIO's Web starter
 * (`studio/engines/web/scaffold/packages/client/src/engine/perf-hud.ts`).
 */
import { TIERS, type Tier } from '../lib/quality';

const STATS_WORD = 'stats';
/** The word that turns Spector.js on; none in a build without it. */
export const CAPTURE_WORD =
  import.meta.env.DEV || import.meta.env.PUBLIC_PERF_HUD === '1'
    ? 'spector'
    : null;

export interface DebugFlags {
  readonly tier: Tier | null;
  /** Spector.js captures frames. */
  readonly capture: boolean;
}

export function parseDebugHash(hash: string): DebugFlags {
  const words = hash.replace(/^#/, '').split('-');
  const tier = TIERS.find((option) => words.includes(option)) ?? null;
  const capture = CAPTURE_WORD !== null && words.includes(CAPTURE_WORD);
  return { tier, capture };
}

export function debugHash(flags: DebugFlags): string {
  const capture = flags.capture ? CAPTURE_WORD : null;
  return [STATS_WORD, flags.tier, capture].filter(Boolean).join('-');
}
