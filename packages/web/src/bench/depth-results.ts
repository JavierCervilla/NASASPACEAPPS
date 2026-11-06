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
 * The depth suite's results (VENT-104): one row per run, whether it kept
 * the on-foot context or lost it and when, the depth buffer, its bits,
 * three's reversed buffer and the shadow map it drew with, and the turn's
 * frames. A run is named by its variant, and by its round as well when
 * there are more rounds than one. Pure; the panel writes the numbers
 * through Intl.
 */
import type { DepthReading, LostAt, RunResult } from './types';

export interface DepthRow {
  /** «reversed», or «reversed 2» with more than one round. */
  readonly name: string;
  readonly lostAt: LostAt | null;
  readonly depth: DepthReading | null;
  /** The turn's median frame rate, p95 and worst frame. */
  readonly fps: number | null;
  readonly p95: number | null;
  readonly worst: number | null;
}

/** One row per run of `results`, in run order. */
export function depthRows(results: readonly RunResult[]): DepthRow[] {
  const rounds = results.some((r) => r.run > 1);
  return results.map((r) => {
    const turn = r.steps.find((s) => s.id === 'turnMinute')?.frames;
    return {
      name: rounds ? `${r.variant} ${r.run}` : r.variant,
      lostAt: r.lostAt ?? null,
      depth: r.depth ?? null,
      fps: turn?.fps ?? null,
      p95: turn?.p95Ms ?? null,
      worst: turn?.worstMs ?? null,
    };
  });
}

