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
 * The «Horizon» view's place in the page (VENT-34): a lazy boundary, so
 * the panel, its styles and (lazily again) the Three.js scene download
 * only when the view opens, never in the first load or the precache.
 * An old page after a deploy may find the panel's chunk gone: its place
 * then asks for the update (VENT-52) instead of emptying the app.
 */
import { lazy, Suspense, useEffect, useState } from 'react';
import { loadChunk } from '../../pwa/missing-chunk';
import { ChunkBoundary } from '../ChunkBoundary';
import { useI18n } from '../i18n-context';
import type { PanelProps } from './TerrainPanel';

/**
 * A new lazy panel: React.lazy keeps its import's failure for good, so a
 * try after an offline failure needs a new one (VENT-59).
 */
const lazyPanel = () => lazy(() =>
  loadChunk(() => import('./TerrainPanel'), window));

/** Shown while the panel downloads. */
function Waiting({ layout }: { readonly layout: PanelProps['layout'] }) {
  const { t } = useI18n();
  return (
    <section className={`on-foot-wait on-foot-wait--${layout}`} aria-busy="true">
      <p role="status">{t('onFoot.loading')}</p>
    </section>
  );
}

interface NeedsProps {
  readonly layout: PanelProps['layout'];
  readonly offline: boolean;
  /** Tries the panel again; called when the browser is back online. */
  readonly retry: () => void;
}

/**
 * Shown when the panel's chunk could not load: gone after a deploy
 * («New version ready» says why), or not fetched while offline, when the
 * browser coming back online tries it again.
 */
function NeedsUpdate({ layout, offline, retry }: NeedsProps) {
  const { t } = useI18n();
  useEffect(() => {
    if (!offline) return undefined;
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, [offline, retry]);
  return (
    <section className={`on-foot-wait on-foot-wait--${layout}`}>
      <p>{t(offline ? 'update.offline' : 'update.view')}</p>
    </section>
  );
}

export function OnFootView(props: PanelProps) {
  const [{ Panel, attempt }, setTry] = useState(() =>
    ({ Panel: lazyPanel(), attempt: 0 }));
  const retry = () =>
    setTry((was) => ({ Panel: lazyPanel(), attempt: was.attempt + 1 }));
  return (
    <ChunkBoundary
      key={attempt}
      fallback={(error) => (
        <NeedsUpdate layout={props.layout} offline={error.offline}
          retry={retry} />
      )}
    >
      <Suspense fallback={<Waiting layout={props.layout} />}>
        <Panel {...props} />
      </Suspense>
    </ChunkBoundary>
  );
}
