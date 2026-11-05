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
 * The benchmark's records (VENT-81): what one step of one run measured,
 * a run's steps, the device's header, and the state kept across the
 * reloads that start each run. Plain data, so it is kept in
 * `sessionStorage` and copied into the report as it is.
 */
import type { StepId } from './script';

/** A: the app as it is; B: the hidden globe's WebGL context released. */
export type Variant = 'A' | 'B';

/** The frames the app drew while a step ran. */
export interface FrameStats {
  /** Frames per second from the median frame time; null with none. */
  readonly fps: number | null;
  readonly p95Ms: number | null;
  readonly worstMs: number | null;
  readonly drawn: number;
}

export interface StepMetrics {
  readonly id: StepId;
  /** How long the step ran, ms. */
  readonly ms: number;
  readonly frames: FrameStats;
  readonly longTasks: number;
  readonly longTaskMs: number;
  /** The most WebGL contexts alive at once (attached and not lost). */
  readonly contexts: number;
  /** The globe's map bytes while its context lives, at most. */
  readonly textureBytes: number;
  /** The on-foot renderer's texture count, at most. */
  readonly textures: number;
  /** `performance.memory.usedJSHeapSize` at the end; null without it. */
  readonly heapBytes: number | null;
  /** Median triangles and draw calls per drawn frame. */
  readonly triangles: number;
  readonly calls: number;
  readonly netBytes: number;
  readonly requests: number;
  /** Context losses other than variant B's deliberate one. */
  readonly lost: number;
  /** The step waited for the on-foot view, which never settled. */
  readonly timedOut: boolean;
}

export interface RunResult {
  readonly variant: Variant;
  /** 1-based, per variant. */
  readonly run: number;
  /** The on-foot view's tier this run ran at (its host's `data-tier`). */
  readonly tier: string;
  readonly steps: readonly StepMetrics[];
}

export interface BenchHeader {
  readonly gpu: string;
  readonly userAgent: string;
  /** The page's CSS pixels and pixel ratio, «412 × 839 @ 2.625». */
  readonly viewport: string;
  /** The device's screen, CSS pixels, «412 × 915». */
  readonly screen: string;
  /** The tier of the run that read the header; each run keeps its own. */
  readonly tier: string;
  readonly script: number;
  readonly build: string;
  readonly instant: string;
}

export interface BenchState {
  readonly v: 1;
  readonly runs: RunCount;
  readonly fast: boolean;
  readonly order: readonly Variant[];
  /** The index in `order` of the run the next page load does. */
  readonly next: number;
  readonly results: readonly RunResult[];
  readonly header: BenchHeader | null;
  /** Why a run stopped short, when one did. */
  readonly error?: string;
}

export type RunCount = 1 | 3;
