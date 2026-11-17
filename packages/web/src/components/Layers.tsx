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
import { Credits } from './credits/Credits';
import { DropPin } from './pin/DropPin';
import { LayerToggles } from './saved/LayerToggles';
import { useI18n } from './i18n-context';
import { useScrollFade } from './use-scroll-fade';
import { SourceRow } from './source/SourceSwitch';

/**
 * The layers on the globe and on the polar map, each a switch with its key
 * mark (VENT-37): a solid dot is an exact touchdown, a dashed ring an
 * approximate zone, a silver pin a site saved on this device. Under a
 * hairline, the data source switch (VENT-36), and under another «Drop a
 * pin» (VENT-37). Last, under a hairline, the credits (VENT-126), inside
 * the key's scroll, so the key never grows past its view.
 */
export function Layers({ source }: { readonly source: SourceStore }) {
  const { t } = useI18n();
  const fade = useScrollFade<HTMLDivElement>();
  return (
    <aside className="globe-layers" aria-label={t('layers.title')}>
      <div className="globe-layers__scroll scroll-fade" {...fade}>
        <h2>{t('layers.title')}</h2>
        <LayerToggles />
        <SourceRow source={source} />
        <DropPin variant="key" />
        <Credits />
      </div>
    </aside>
  );
}
