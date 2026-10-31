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

import type { SourceStore } from '../source/data-source';
import { useI18n } from './i18n-context';
import { SourceRow } from './source/SourceSwitch';

/**
 * The key to the site markers, on the globe and on the polar map: a solid
 * dot is an exact touchdown, a dashed ring an approximate zone. Under a
 * hairline, the data source switch (VENT-36).
 */
export function Layers({ source }: { readonly source: SourceStore }) {
  const { t } = useI18n();
  return (
    <aside className="globe-layers" aria-label={t('layers.title')}>
      <h2>{t('layers.title')}</h2>
      <ul>
        <li><span className="layer-key layer-key--exact" aria-hidden="true"></span>{t('layers.sites')}</li>
        <li><span className="layer-key layer-key--zone" aria-hidden="true"></span>{t('layers.zones')}</li>
        <li className="soon"><span className="layer-key layer-key--rover" aria-hidden="true"></span>{t('layers.rovers')}</li>
      </ul>
      <SourceRow source={source} />
    </aside>
  );
}
