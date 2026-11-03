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
 * The performance readout's labels and its marker.
 *
 * Split out of perf-hud.ts, ported from GAMESTUDIO's Web starter
 * (`studio/engines/web/scaffold/packages/client/src/engine/perf-hud.ts`).
 */
import type { Tier } from '../lib/quality';

/**
 * The panel's class and data attribute; also a marker the production build
 * check looks for (scripts/check-no-devtools.mjs).
 */
export const HUD_MARKER = 'ventana-perf-hud';

/** Labels the readout shows. */
export const PERF_TEXT = {
  tiers: {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
  } satisfies Record<Tier, string>,
  slowest: 'slowest',
  quality: 'quality',
  scale: 'scale',
  triangles: 'triangles',
  textures: 'textures',
  noRenderer: 'no renderer attached',
  capture: 'Spector',
  previousTrail: 'Previous session:',
  currentTrail: 'This session:',
  contextLost: 'WebGL context lost',
  contextRestored: 'WebGL context restored',
  noGpu: 'unknown GPU',
  label: 'Performance readout',
  /** The folded readout's count of the errors it holds under the fold. */
  errors: (count: number) => `${count} ${count === 1 ? 'error' : 'errors'}`,
} as const;
