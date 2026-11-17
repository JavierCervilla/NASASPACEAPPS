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
 * The credits (VENT-126): «Source code on GitHub», opened in a new tab
 * with its arrow an SVG (never the arrow character, which a phone may draw
 * as an emoji), the AI used to write the code, and the Space Apps
 * disclaimer. The desktop Layers key's last block and the end of the
 * phone's Settings page.
 */
import { SOURCE_CODE_URL } from '../../lib/source-code';
import { useI18n } from '../i18n-context';
import { Icon } from '../phone/Icon';

export function Credits() {
  const { t } = useI18n();
  return (
    <div className="credits">
      <a
        className="credits__source"
        href={SOURCE_CODE_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t('credits.sourceName')}
      >
        {t('credits.source')}
        <Icon name="external" className="credits__icon" />
      </a>
      <p>{t('credits.ai')}</p>
      <p>{t('credits.disclaimer')}</p>
    </div>
  );
}
