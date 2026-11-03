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
 * «Load the 3D globe» under Save-Data (VENT-57, V-09, variant B, the
 * human's choice): a row in the «New version ready» look (update.css), a
 * globe in front of «Load the 3D globe» over «Data saver is on», and the
 * whole row is the one button, as the update row is. Its name is the
 * title; the second line describes it.
 */
import { useId } from 'react';
import { useI18n } from './i18n-context';
import { Icon } from './phone/Icon';

export function LoadButton({ onLoad }: { readonly onLoad: () => void }) {
  const { t } = useI18n();
  const how = useId();
  return (
    <button
      type="button"
      className="globe-load"
      aria-label={t('globe.load')}
      aria-describedby={how}
      onClick={onLoad}
    >
      <Icon name="globe" className="notice-row__mark" />
      <span className="notice-row__lines">
        <span className="notice-row__title">{t('globe.load')}</span>
        <span id={how} className="notice-row__how">
          {t('globe.dataSaver')}
        </span>
      </span>
    </button>
  );
}
