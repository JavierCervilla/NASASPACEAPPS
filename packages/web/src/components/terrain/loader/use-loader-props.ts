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
 * Whether the on-foot loader shows, and with what (VENT-60): while the
 * relief or the scene loads, and through the hand-over once the scene has
 * drawn, until the fades are done ({@link HANDOVER_MS}); dimmed under a
 * failure's words; nothing for a site with no coordinates.
 */
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { seedOf } from '../../../terrain/seeded';
import { wordsOf } from '../OnFootStatus';
import type { PanelProps } from '../TerrainPanel';
import type { useOnFoot } from '../use-on-foot';
import type { SceneStatus } from '../use-terrain-scene';
import type { LoaderProps } from './OnFootLoader';

/** The hand-over's fades, the longest included: then the loader goes. */
export const HANDOVER_MS = 1200;

/** Whether `drawn` has held long enough for the hand-over to be done. */
function useHandedOver(drawn: boolean): boolean {
  // A new token each time `drawn` changes: a hand-over done for an earlier
  // frame does not count for a scene mounted again.
  const token = useMemo(() => ({ drawn }), [drawn]);
  const [doneFor, setDoneFor] = useState<object | null>(null);
  useEffect(() => {
    if (!token.drawn) return undefined;
    const timer = window.setTimeout(() => setDoneFor(token), HANDOVER_MS);
    return () => window.clearTimeout(timer);
  }, [token]);
  return token.drawn && doneFor === token;
}

interface Parts {
  readonly panel: PanelProps;
  readonly view: ReturnType<typeof useOnFoot>;
  readonly scene: { readonly status: SceneStatus; readonly drawn: boolean };
}

/** The loader's props, or null when it does not show. */
export function useLoaderProps({ panel, view, scene }: Parts):
  LoaderProps | null {
  const { lat, lonEast } = panel.site;
  const point = useMemo(() => ({ lat, lonEast }), [lat, lonEast]);
  const { tier } = useSyncExternalStore(panel.viewTier.subscribe,
    panel.viewTier.get, panel.viewTier.get);
  const handedOver = useHandedOver(scene.drawn);
  const key = wordsOf({ located: view.located, tile: view.tile.state,
    scene: scene.status });
  const failed = key !== null && key !== 'onFoot.loading';
  if (!view.sky || !view.located || (handedOver && !failed)) return null;
  return { progress: view.tile.progress, point, sky: view.sky,
    profile: view.profile, seed: seedOf(point), tier,
    ready: view.tile.state.kind === 'ready', drawn: scene.drawn && !failed,
    failed };
}
