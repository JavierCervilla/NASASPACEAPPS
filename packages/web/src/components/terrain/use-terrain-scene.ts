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
 * Mounts the on-foot scene (VENT-34) in a host once its input exists:
 * the scene's code is a dynamic import, so it downloads only when the view
 * opens; later inputs update it, the band's moves draw it again, and
 * leaving the view frees it. It draws at the view's tier (view-tier.ts); a
 * lost GPU context frees the scene, drops the tier to low and says `lost`,
 * and the scene mounts again only when asked (`retry`): a loop of lost
 * contexts is worse than one tap. A scene chunk that is gone (an old
 * page after a deploy, VENT-52) says `missing`, not `failed`.
 */
import {
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { settingsFor } from '../../lib/quality';
import { parseLeaveOut } from '../../terrain/leave-out';
import type { Recorder } from '../../terrain/report/recorder';
import type { SceneInput, SceneSetup, TerrainScene }
  from '../../terrain/scene/scene-types';
import { loadTerrainScene, sceneFailure }
  from '../../terrain/scene/load-scene';
import type { ViewTier } from '../../terrain/view-tier';
import { sceneHooks, type PanelHooks } from './scene-hooks';

export type SceneStatus =
  'loading' | 'ready' | 'failed' | 'lost' | 'missing' | 'offline';

/** Subscribes to the moves of the view's band; returns the unsubscribe. */
export type BandMoves = (listener: () => void) => () => void;

/**
 * What the panel gives the scene, the band's moves it listens to and the
 * crash report it tells what the scene does.
 */
type Hooks = PanelHooks & {
  readonly bandMoves?: BandMoves | undefined;
  readonly report: Recorder;
};

interface Mount {
  readonly el: HTMLElement;
  readonly latest: RefObject<SceneInput | null>;
  readonly hooks: RefObject<Hooks>;
  readonly scene: RefObject<TerrainScene | null>;
  readonly tier: ViewTier;
  readonly onStatus: (status: SceneStatus) => void;
}

/** What this mount draws at, told to the crash report as it starts. */
function setupOf(m: Mount): SceneSetup {
  const { tier } = m.tier.get();
  const { report } = m.hooks.current;
  report.environment({ tier });
  report.step(`scene mounted at tier ${tier}`);
  return { quality: settingsFor(tier),
    leave: parseLeaveOut(window.location.search), report };
}

/** Loads and mounts the scene; returns what undoes it. */
function mountScene(m: Mount): () => void {
  let live = true;
  let off: (() => void) | undefined;
  m.onStatus('loading');
  void loadTerrainScene(window).then((module) => {
    const input = m.latest.current;
    if (!live || !input) return;
    const setup = setupOf(m);
    const hooks = sceneHooks({ panel: m.hooks, tier: m.tier,
      report: setup.report, onLost: () => m.onStatus('lost') });
    m.scene.current = module.mountTerrainScene(m.el, input, hooks, setup);
    off = m.hooks.current.bandMoves?.(() => m.scene.current?.invalidate());
    m.onStatus('ready');
  }).catch((error: unknown) => {
    console.warn(`Ventana Lunar: the 3D view could not start (${String(error)}).`);
    m.hooks.current.report.step(`scene failed to start: ${String(error)}`);
    if (live) m.onStatus(sceneFailure(error));
  });
  return () => {
    live = false;
    off?.();
    m.scene.current?.dispose();
    m.scene.current = null;
  };
}

/** `value` as of the latest render, for callbacks that outlive it. */
function useLatest<T>(value: T): RefObject<T> {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

/**
 * The scene in `host` for `input` (null: not yet) at `tier`; its status, and
 * `retry`, which mounts it again after a loss.
 */
export function useTerrainScene(
  host: RefObject<HTMLDivElement | null>,
  input: SceneInput | null,
  hooks: Hooks,
  tier: ViewTier,
) {
  const scene = useRef<TerrainScene | null>(null);
  const latest = useLatest(input);
  const hooksRef = useLatest(hooks);
  const [status, setStatus] = useState<SceneStatus>('loading');
  const lost = status === 'lost';
  const ready = input !== null;
  useEffect(() => {
    const el = host.current;
    if (!ready || !el || lost) return undefined;
    const m = { el, latest, hooks: hooksRef, scene, tier,
      onStatus: setStatus };
    return mountScene(m);
  }, [host, ready, lost, tier, latest, hooksRef]);
  useEffect(() => {
    if (input) scene.current?.update(input);
  }, [input]);
  return { status, retry: () => setStatus('loading') };
}
