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
 * The scanned rocks (VENT-124): the rocks nearest the eye are drawn as NASA
 * Astromaterials 3D scans of Apollo 17 samples, with their own colour; the
 * diagnostic `?rocks=stones` brings back the round stones everywhere. Where
 * each scan stands follows the stone it replaces: the same spot, yaw,
 * radius, squash and lift (stones.ts). Pure.
 */
import type { Rock } from './rocks';
import type { GroundAt } from './stones';
import type { EastNorth } from './walk/walk-reach';

export type RockLook = 'scan' | 'stones';

/** The look `search`'s `rocks` names: the scans unless it says stones. */
export function parseRockLook(search: string): RockLook {
  const word = (new URLSearchParams(search).get('rocks') ?? '')
    .trim().toLowerCase();
  return word === 'stones' ? 'stones' : 'scan';
}

/**
 * Whether the scans are drawn: the tier keeps rocks (`rocksCap`,
 * ground-policy.ts: none at low or under `?onfoot=rocks`) and the address
 * does not ask for the stones. The caption credits them only then.
 */
export const scansDrawn = (rocksCap: number, look: RockLook): boolean =>
  rocksCap > 0 && look === 'scan';

/** How many rocks become scans, and how far from the eye at most. */
export const SCAN_COUNT = 40;
export const SCAN_REACH_M = 15;

export interface NearSplit {
  /** The rocks drawn as scans, nearest the eye first. */
  readonly near: readonly Rock[];
  /** The rest, in their order: today's stones. */
  readonly rest: readonly Rock[];
}

/** The `SCAN_COUNT` rocks nearest `eye` within `SCAN_REACH_M`, and the rest. */
export function splitNearest(
  rocks: readonly Rock[],
  eye: EastNorth,
): NearSplit {
  const away = (r: Rock) => Math.hypot(r.east - eye[0], r.north - eye[1]);
  const near = rocks.filter((r) => away(r) <= SCAN_REACH_M)
    .sort((a, b) => away(a) - away(b)).slice(0, SCAN_COUNT);
  const taken = new Set(near);
  return { near, rest: rocks.filter((r) => !taken.has(r)) };
}

/** Which of `shapes` scans a rock wears: a fixed hash of its spot and yaw. */
export function shapeIndex(rock: Rock, shapes: number): number {
  const v = Math.sin(rock.east * 12.9898 + rock.north * 78.233
    + rock.yawRad * 37.719) * 43_758.5453;
  return Math.min(Math.floor((v - Math.floor(v)) * shapes), shapes - 1);
}

/** Where a scan stands: the three.js frame (x east, z minus north). */
export interface ScanPose {
  readonly position: readonly [number, number, number];
  /** Three's rotation about y. */
  readonly turnY: number;
  readonly scale: readonly [number, number, number];
}

/** Where a rock's centre stands over the ground, in half-heights. */
const LIFT = 0.35;

/**
 * The pose of `rock`'s scan on `ground`: the plan scaled as the stone's
 * long axis (1.15 radii, the scan's own plan kept), the height scaled to
 * the stone's half-height (`halfHeight` is the scan's own, in its unit
 * frame), sunk by the rock's lift and turned by its yaw as stones.ts does.
 */
export function scanPose(
  rock: Rock,
  ground: GroundAt,
  halfHeight: number,
): ScanPose {
  const across = rock.radius * 1.15;
  const up = rock.radius * rock.squash;
  const y = ground(rock.east, rock.north) + up * (rock.lift ?? LIFT);
  return { position: [rock.east, y, -rock.north], turnY: -rock.yawRad,
    scale: [across, up / halfHeight, across] };
}
