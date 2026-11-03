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
 * The on-foot view's state (VENT-34): the selected point's tile and mesh
 * heights, its horizon profile for the far horizon (useSiteHorizon), the
 * sky at the shared instant (`skyAt`), and from them
 * the scene's input and what the text alternative says.
 */
import { useCallback, useMemo, useRef } from 'react';
import { skyAt, type SiteShadow } from '@ventana/sim';
import type { TimeStore } from '../../calendar/time-store';
import type { HorizonStore } from '../../horizon/horizon-store';
import { useTime } from '../calendar/hooks';
import { useSiteHorizon } from '../horizon/use-horizon';
import { useI18n } from '../i18n-context';
import { sceneWords, seenBodies, spinOf, startYaw } from '../../terrain/on-foot-model';
import type { PlacedTile, SceneInput,
  SkyDirs } from '../../terrain/scene/scene-types';
import { seedOf } from '../../terrain/seeded';
import type { Recorder } from '../../terrain/report/recorder';
import type { RingSource } from '../../terrain/ring/ring-source';
import type { ViewTier } from '../../terrain/view-tier';
import { useRing } from './use-ring';

export interface OnFootSite {
  readonly id: string;
  readonly lat: number;
  readonly lonEast: number;
  readonly shadow?: SiteShadow | undefined;
}

export interface OnFootParts {
  readonly site: OnFootSite;
  readonly time: TimeStore;
  readonly horizons: HorizonStore;
  /** Where the relief rings come from (the page's, ring-source.ts). */
  readonly tiles: RingSource;
  /** The view's tier, shared by its scene and its rings (VENT-49). */
  readonly viewTier: ViewTier;
}

/** The point's tile, placed, and the sky over it at the instant. */
function useGround(parts: OnFootParts, report: Recorder) {
  const { site, time, tiles, viewTier } = parts;
  const { lat, lonEast } = site;
  const located = Number.isFinite(lat) && Number.isFinite(lonEast);
  const note = useCallback((text: string) => report.step(text), [report]);
  const tile = useRing(tiles, located ? { lat, lonEast } : null, viewTier,
    note);
  const { state } = tile;
  const ring = state.kind === 'ready' ? state.ring : null;
  const placed = ring?.near ?? null;
  const atMs = useTime(time)?.atMs ?? null;
  const sky = useMemo<SkyDirs | null>(() => {
    if (!located || atMs === null) return null;
    return skyAt({ latDeg: lat, lonEastDeg: lonEast }, atMs);
  }, [located, lat, lonEast, atMs]);
  return { located, tile, ring, placed, sky, atMs };
}

/** Where the view opens for `placed`: kept until the ground changes. */
function useOpening(placed: PlacedTile | null, sky: SkyDirs | null): number {
  const kept = useRef<{ placed: PlacedTile | null; yaw: number } | null>(null);
  if (sky && placed && kept.current?.placed !== placed) {
    kept.current = { placed, yaw: startYaw(sky) };
  }
  return kept.current?.yaw ?? 0;
}

/** Everything the panel shows; the ring tells `report` how it comes. */
export function useOnFoot(parts: OnFootParts, report: Recorder) {
  const i18n = useI18n();
  const ground = useGround(parts, report);
  const { placed, ring, sky } = ground;
  const horizon = useSiteHorizon(parts.horizons, parts.site.id);
  const profile = horizon.kind === 'terrain' ? horizon.profile : null;
  const startYawDeg = useOpening(placed, sky);
  const bodies = useMemo(() => (placed && sky
    ? seenBodies(placed, profile, sky) : []), [placed, profile, sky]);
  const seed = seedOf(parts.site);
  const input = useMemo<SceneInput | null>(() => {
    if (!placed || !ring || !sky) return null;
    const words = sceneWords(i18n, bodies);
    const earthSpin = spinOf(parts.site.lat, sky, ground.atMs ?? 0);
    return { tiles: [placed], ring, profile, seed, sky, earthSpin,
      startYawDeg, words };
  }, [placed, ring, sky, profile, seed, startYawDeg, bodies, i18n,
    parts.site.lat, ground.atMs]);
  return { ...ground, input, bodies, startYawDeg, profile };
}
