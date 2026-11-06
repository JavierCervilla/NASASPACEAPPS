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
 * The question the depth suite is run for (VENT-107): the logarithmic
 * against the reversed depth buffer, neither with the shadow map forced,
 * each variant's turn as the median of its rounds that turned; and the
 * report's line for it, in the plain English of report.ts. Pure.
 */
import { depthRows } from './depth-results';
import { num } from './report';
import { median } from './stats';
import type { RunResult } from './types';

/** A variant's turn: median frame rate, p95 and worst frame. */
export interface TurnFigures {
  readonly fps: number | null;
  readonly p95: number | null;
  readonly worst: number | null;
}

/** `variant`'s turn, the median of its rounds that turned. */
function turnOf(results: readonly RunResult[], variant: string): TurnFigures {
  const own = depthRows(results.filter((r) => r.variant === variant));
  const of = (pick: (r: TurnFigures) => number | null) =>
    median(own.map(pick).filter((v): v is number => v !== null));
  return { fps: of((r) => r.fps), p95: of((r) => r.p95),
    worst: of((r) => r.worst) };
}

/** Log against reversed, neither with the shadow map forced. */
export function logVersusReversed(results: readonly RunResult[]): {
  readonly log: TurnFigures;
  readonly reversed: TurnFigures;
} {
  return {
    log: turnOf(results, 'log'),
    reversed: turnOf(results, 'reversed'),
  };
}

/** «log vs reversed, no shadow map: fps 50 vs 40 · p95Ms … · worstMs …». */
export function versusLine(results: readonly RunResult[]): string {
  const { log, reversed } = logVersusReversed(results);
  const pair = (a: number | null, b: number | null) =>
    `${num(a)} vs ${num(b)}`;
  return `log vs reversed, no shadow map: fps ${pair(log.fps, reversed.fps)}`
    + ` · p95Ms ${pair(log.p95, reversed.p95)}`
    + ` · worstMs ${pair(log.worst, reversed.worst)}`;
}
