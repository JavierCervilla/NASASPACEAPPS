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
import { lazy, Suspense } from 'react';
import { loadChunk } from '../../pwa/missing-chunk';
import { ChunkBoundary } from '../ChunkBoundary';
import { useI18n } from '../i18n-context';
import type { PanelProps } from './TerrainPanel';

const TerrainPanel = lazy(() =>
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

/** Shown when the panel's chunk is gone: «New version ready» says why. */
function NeedsUpdate({ layout }: { readonly layout: PanelProps['layout'] }) {
  const { t } = useI18n();
  return (
    <section className={`on-foot-wait on-foot-wait--${layout}`}>
      <p>{t('update.view')}</p>
    </section>
  );
}

export function OnFootView(props: PanelProps) {
  return (
    <ChunkBoundary fallback={<NeedsUpdate layout={props.layout} />}>
      <Suspense fallback={<Waiting layout={props.layout} />}>
        <TerrainPanel {...props} />
      </Suspense>
    </ChunkBoundary>
  );
}
