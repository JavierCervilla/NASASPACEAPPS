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
 * so changing one reloads the page.
 *
 * Split out of perf-hud.ts, ported from GAMESTUDIO's Web starter
 * (`studio/engines/web/scaffold/packages/client/src/engine/perf-hud.ts`).
 */
import { TIERS, type Tier } from '../lib/quality';

const STATS_WORD = 'stats';
const SPECTOR_WORD = 'spector';

export interface DebugFlags {
  readonly tier: Tier | null;
  readonly spector: boolean;
}

export function parseDebugHash(hash: string): DebugFlags {
  const words = hash.replace(/^#/, '').split('-');
  const tier = TIERS.find((option) => words.includes(option)) ?? null;
  return { tier, spector: words.includes(SPECTOR_WORD) };
}

export function debugHash(flags: DebugFlags): string {
  const spector = flags.spector ? SPECTOR_WORD : '';
  return [STATS_WORD, flags.tier ?? '', spector].filter(Boolean).join('-');
}
