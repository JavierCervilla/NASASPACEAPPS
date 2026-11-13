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
 * page after a deploy, VENT-52) says `missing`, not `failed`. It also says
 * when the mounted scene has drawn its first frame, for the loader's
 * hand-over (VENT-60).
 */
import {
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { settingsFor } from '../../lib/quality';
import { pickQuality } from '../../globe/quality-pick';
import { depthChoice } from '../../terrain/depth-mode';
import { parseLeaveOut } from '../../terrain/leave-out';
import { parseRockLook } from '../../terrain/rock-look';
import type { Recorder } from '../../terrain/report/recorder';
import type { SceneInput, SceneSetup, TerrainScene }
  from '../../terrain/scene/scene-types';
import { loadTerrainScene, sceneFailure }
  from '../../terrain/scene/load-scene';
import type { ViewTier } from '../../terrain/view-tier';
import { useLatest } from '../use-latest';
import { sceneHooks, type PanelHooks } from './scene-hooks';
import { useParked } from './use-parked';

export type SceneStatus =
  'loading' | 'ready' | 'failed' | 'blocked' | 'lost' | 'missing' | 'offline';

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
  /** The mounted scene has drawn its first frame (of a point). */
  readonly onDrawn: () => void;
}

/** What this mount draws at, told to the crash report as it starts. */
function setupOf(m: Mount): SceneSetup {
  const { tier } = m.tier.get();
  const { report } = m.hooks.current;
  report.environment({ tier });
  report.step(`scene mounted at tier ${tier}`);
  const { search } = window.location;
  const leave = parseLeaveOut(search);
  const { clipControl } = pickQuality.gpuProfile();
  return { quality: settingsFor(tier), leave, report,
    rocks: parseRockLook(search),
    depth: depthChoice(search, leave, clipControl) };
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
      report: setup.report, onLost: () => m.onStatus('lost'), onDrawn: m.onDrawn });
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

interface MountParts extends Omit<Mount, 'el' | 'onDrawn'> {
  readonly host: RefObject<HTMLDivElement | null>;
  /** There is an input to mount the scene on. */
  readonly ready: boolean;
  readonly lost: boolean;
}

/**
 * Mounts the scene while there is input and no loss; whether it drew. The
 * scene keeps its one renderer (one canvas, one GPU context) for the view's
 * whole life (VENT-69): when the selected point changes and its input goes
 * away until the next point's tiles land, the mounted scene is parked (its
 * canvas hidden, `data-parked`), not freed, so the new point is built on the
 * same renderer with the programs already compiled. Only leaving the view, a
 * tier change or a lost context frees it.
 */
function useMountedScene(parts: MountParts): boolean {
  const { host, ready, lost, latest, hooks, scene, tier, onStatus } = parts;
  const [drawn, setDrawn] = useState(false);
  const [mounted, setMounted] = useState(false);
  const wanted = ready || mounted;
  useEffect(() => {
    const el = host.current;
    if (!wanted || !el || lost) return undefined;
    const unmount = mountScene({ el, latest, hooks, scene, tier,
      onStatus: (status) => {
        onStatus(status);
        if (status === 'ready') setMounted(true);
      },
      onDrawn: () => (el.removeAttribute('data-parked'), setDrawn(true)) });
    return () => {
      unmount();
      setDrawn(false);
      setMounted(false);
    };
  }, [host, wanted, lost, tier, latest, hooks, scene, onStatus]);
  const parked = useLatest(() => setDrawn(false));
  useParked({ ready, host, scene, onParked: parked });
  return drawn;
}

/**
 * The scene in `host` for `input` (null: not yet) at `tier`; its status,
 * whether it has drawn, `retry`, which mounts it again after a loss, and
 * `home`, which turns it back to where it opened (the compass, VENT-63),
 * and `back`, which glides the eye back to the point (VENT-121).
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
  const drawn = useMountedScene({ host, ready: input !== null,
    lost: status === 'lost', latest, hooks: hooksRef, scene, tier,
    onStatus: setStatus });
  useEffect(() => {
    if (input) scene.current?.update(input);
  }, [input]);
  const home = (): void => scene.current?.home();
  const back = (): void => scene.current?.back();
  return { status, drawn, retry: () => setStatus('loading'), home, back };
}
