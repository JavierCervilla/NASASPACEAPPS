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
 * The scanned rocks' share of a scatter (VENT-124): while the stones'
 * bands are built, the rocks within reach of the eye are held back; when
 * the last band is in, the nearest of them become scans (rock-look.ts) and
 * the others go back to the stones. The scans show once their files have
 * loaded, in a slicer job, so the Sun's shadow is drawn again with them.
 */
import { Group, type Object3D } from 'three';
import type { Rock } from '../rocks';
import {
  SCAN_REACH_M,
  scansDrawn,
  splitNearest,
  type RockLook,
} from '../rock-look';
import type { GroundAt } from '../stones';
import type { EastNorth } from '../walk/walk-reach';
import {
  loadScanAssets,
  scanRocksGroup,
  type ScanAssets,
} from './scan-rocks';
import type { Slicer } from './slicer';
import type { SunMask } from './sun-mask';

/** What a scatter needs to draw scans: the look and the files' promise. */
export interface ScanRequest {
  readonly look: RockLook;
  readonly assets: Promise<ScanAssets>;
}

/**
 * The scans `look` asks for, their files asked now; none for the stones or
 * where the tier keeps no rocks (`rocksCap` 0, ground-policy.ts).
 */
export function scanRequest(
  look: RockLook,
  { policy, mask }: { policy: { rocksCap: number }; mask: SunMask },
  load: typeof loadScanAssets = loadScanAssets,
): ScanRequest | null {
  if (!scansDrawn(policy.rocksCap, look)) return null;
  return { look, assets: load(mask) };
}

/** Behind the ring's near tiles in the slicer's queue, as the stones. */
const PRIORITY = 150;

export interface ScanShow {
  readonly request: ScanRequest;
  readonly ground: GroundAt;
  readonly slicer: Slicer;
}

/** A group that takes the scans of `rocks` once their files are in. */
function scansWhenLoaded(rocks: readonly Rock[], s: ScanShow): Group {
  const group = new Group();
  if (rocks.length === 0) return group;
  void s.request.assets.then((assets) => {
    s.slicer.add('rocks:scan', PRIORITY, () => {
      group.add(scanRocksGroup(rocks, assets, s.ground));
    });
  }, (error: unknown) => {
    console.warn(`Ventana Lunar: scanned rocks missing (${String(error)}).`);
  });
  return group;
}

export interface ScanSorter {
  /** `band` without the rocks within reach of the eye, held back. */
  readonly take: (band: readonly Rock[]) => readonly Rock[];
  /**
   * Once the last band is in: the nearest held rocks become scans, in a
   * group added to `under`; the rest are returned, to be built as stones.
   */
  readonly finish: (under: Object3D) => readonly Rock[];
}

/** Holds back the rocks within `SCAN_REACH_M` of `eye`, for `show`. */
export function scanSorter(eye: EastNorth, show: ScanShow): ScanSorter {
  const held: Rock[] = [];
  const isNear = (r: Rock): boolean =>
    Math.hypot(r.east - eye[0], r.north - eye[1]) <= SCAN_REACH_M;
  return {
    take: (band) => {
      held.push(...band.filter(isNear));
      return band.filter((r) => !isNear(r));
    },
    finish: (under) => {
      const { near, rest } = splitNearest(held, eye);
      under.add(scansWhenLoaded(near, show));
      return rest;
    },
  };
}
