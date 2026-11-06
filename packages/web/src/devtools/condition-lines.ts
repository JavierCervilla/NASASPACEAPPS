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
 * The readout's lines of the conditions of what it shows (VENT-105): what
 * the on-foot view draws with, the shared instant with the Sun at the
 * selected point, and each lost WebGL context. Pure: the readings come in.
 */
import { PERF_TEXT } from './perf-text';
import type { SceneMarks, ShadowMapState } from '../terrain/scene-marks';

/** A renderer the dev tools watch (globe/dev-hook.ts). */
export type RendererKind = 'globe' | 'onFoot';

export const KIND_NAMES: Record<RendererKind, string> = {
  globe: 'globe',
  onFoot: 'on-foot',
};

const SHADOW_TEXT: Record<ShadowMapState, string> = {
  'on': 'on',
  'forced': 'on (forced)',
  'left-out': 'off (?onfoot=shadows)',
  'unsafe-gpu': 'off (unsafe GPU)',
};

/** «on-foot: depth linear · 24 bits · reversed off · shadow map on …». */
export function sceneLine(marks: SceneMarks): string {
  return [
    `on-foot: depth ${marks.depth}`,
    `${marks.bits} bits`,
    `reversed ${marks.reversed ? 'on' : 'off'}`,
    `shadow map ${SHADOW_TEXT[marks.shadows]}`,
    `tier ${marks.tier}`,
  ].join(' · ');
}

/** The Sun at the selected point at the instant. */
export interface SunReading {
  readonly elDeg: number;
  readonly night: boolean;
  /** Whether day or night was read against the terrain, not the level. */
  readonly terrain: boolean;
}

export interface InstantReading {
  readonly atMs: number;
  readonly live: boolean;
  /** Null without a selected point that has coordinates. */
  readonly sun: SunReading | null;
}

/** «Sun +6.7° · day (terrain)», the minus a true minus sign. */
function sunText(sun: SunReading): string {
  const sign = sun.elDeg < 0 ? '−' : '+';
  const deg = Math.abs(sun.elDeg).toFixed(1);
  const time = sun.night ? 'night' : 'day';
  return `Sun ${sign}${deg}° · ${time} (${sun.terrain ? 'terrain' : 'level'})`;
}

/** «instant live · 2026-11-30 20:00 UTC · Sun +6.7° · day (terrain)». */
export function instantLine(reading: InstantReading): string {
  const iso = new Date(reading.atMs).toISOString();
  const minute = `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
  const head = `instant ${reading.live ? 'live' : 'set'} · ${minute}`;
  return reading.sun ? `${head} · ${sunText(reading.sun)}` : head;
}

export interface ContextLoss {
  readonly kind: RendererKind;
  /** Seconds since the trail started, as the breadcrumbs count. */
  readonly seconds: number;
}

/** «WebGL context lost: on-foot at 115.2 s». */
export function lossLine(loss: ContextLoss): string {
  const at = loss.seconds.toFixed(1);
  return `${PERF_TEXT.contextLost}: ${KIND_NAMES[loss.kind]} at ${at} s`;
}
