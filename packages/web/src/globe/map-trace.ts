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
 * What the globe tells about the Moon's maps (VENT-99), as events, and the
 * short line each one is in the dev tools' breadcrumbs under `?debug`: the
 * level the density rule wants and why, each map loading, landed, failed
 * and uploaded, the level on the Moon. Pure; map-crumbs.ts marks the lines,
 * and only when the dev tools are on.
 */
import type { Tier } from '../lib/quality';
import type { LodLevel } from './texture-lod';

/** Which of a level's two maps. */
export type MapKind = 'colour' | 'relief';

/** One map of one level. */
export interface MapAsk {
  readonly url: string;
  readonly map: MapKind;
  readonly level: LodLevel;
}

/** A step of one map of a level. */
export type MapStepEvent = { level: LodLevel; map: MapKind } & (
  | { kind: 'loading'; file: string }
  | { kind: 'landed'; seconds: number; size: string }
  | { kind: 'failed'; file: string; reason: string }
  | { kind: 'timedOut'; file: string; seconds: number }
  | { kind: 'uploaded'; gl: string }
  /** Came as KTX2, transcoded to `target` (VENT-101). */
  | { kind: 'ktx2'; target: string }
);

/** KTX2 turned off for the session, and why (VENT-101). */
export interface Ktx2OffEvent {
  kind: 'ktx2Off';
  reason: string;
}

/** The density rule's answer and what it read (texture-lod.ts). */
export interface RuleEvent {
  kind: 'rule';
  level: LodLevel;
  discPx: number;
  pxPerTexel: number;
  tier: Tier;
  /** The phone layout, which caps the maps at 4K. */
  phone: boolean;
  saveData: boolean;
  maxTextureSize: number;
}

/** A step of a whole level in the swapper. */
export type LevelEvent = { level: LodLevel } & (
  | { kind: 'wanted' | 'lowered' | 'gaveUp'; shown: LodLevel | 0 }
  | { kind: 'asked' | 'applied' | 'freed' }
  | { kind: 'threw'; message: string }
);

export type MapEvent = MapStepEvent | RuleEvent | LevelEvent | Ktx2OffEvent;

/** Where the globe tells its events. */
export interface MapTrace<T> {
  readonly mark: (event: MapEvent) => void;
  /** A map's size in pixels, as «4096x2048». */
  readonly size: (texture: T) => string;
  /** The GL error left after an upload, named; read under `?debug` only. */
  readonly glError?: (() => string) | undefined;
}

const named = (level: LodLevel | 0): string =>
  level === 0 ? 'none' : `${level}K`;

/** «4K colour landed in 1.4 s (4096x2048)» and the like. */
function stepLine(event: MapStepEvent): string {
  const at = `${named(event.level)} ${event.map}`;
  switch (event.kind) {
    case 'loading':
      return `${at} loading: ${event.file}`;
    case 'landed':
      return `${at} landed in ${event.seconds.toFixed(1)} s (${event.size})`;
    case 'failed':
      return `${at} failed: ${event.file} (${event.reason})`;
    case 'timedOut':
      return `${at} timed out after ${event.seconds} s: ${event.file}`;
    case 'uploaded':
      return `${at} uploaded, gl ${event.gl}`;
    case 'ktx2':
      return `${at} as KTX2 → ${event.target.toUpperCase()}`;
  }
}

/**
 * «rule wants 4K: disc 1180 px, 0.91 px/texel; medium, phone, max 8192»;
 * «phone» only in the phone layout, whose maps stop at 4K.
 */
function ruleLine(event: RuleEvent): string {
  const phone = event.phone ? ', phone' : '';
  const save = event.saveData ? ', save-data on' : '';
  return `rule wants ${named(event.level)}: disc ` +
    `${Math.round(event.discPx)} px, ${event.pxPerTexel.toFixed(2)} ` +
    `px/texel; ${event.tier}${phone}${save}, max ${event.maxTextureSize}`;
}

/** «4K on the Moon» and the like. */
function levelLine(event: LevelEvent): string {
  const at = named(event.level);
  switch (event.kind) {
    case 'wanted':
      return `${at} wanted (${named(event.shown)} shown)`;
    case 'lowered':
      return `lowered to ${at}, globe hidden (${named(event.shown)} shown)`;
    case 'gaveUp':
      return `${at} given up, ${named(event.shown)} stays`;
    case 'asked':
      return `${at} maps asked`;
    case 'applied':
      return `${at} on the Moon`;
    case 'freed':
      return `${at} freed on landing, lowered meanwhile`;
    case 'threw':
      return `${at} threw: ${event.message}`;
  }
}

/** The breadcrumb line of `event`, short enough for a phone's readout. */
export function mapLine(event: MapEvent): string {
  if (event.kind === 'rule') return ruleLine(event);
  if (event.kind === 'ktx2Off') return `KTX2 off: ${event.reason}`;
  return 'map' in event ? stepLine(event) : levelLine(event);
}
