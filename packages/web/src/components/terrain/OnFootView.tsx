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
 */
import { lazy, Suspense } from 'react';
import { useI18n } from '../i18n-context';
import type { PanelProps } from './TerrainPanel';

const TerrainPanel = lazy(() => import('./TerrainPanel'));

/** Shown while the panel downloads. */
function Waiting({ layout }: { readonly layout: PanelProps['layout'] }) {
  const { t } = useI18n();
  return (
    <section className={`on-foot-wait on-foot-wait--${layout}`} aria-busy="true">
      <p role="status">{t('onFoot.loading')}</p>
    </section>
  );
}

export function OnFootView(props: PanelProps) {
  return (
    <Suspense fallback={<Waiting layout={props.layout} />}>
      <TerrainPanel {...props} />
    </Suspense>
  );
}
