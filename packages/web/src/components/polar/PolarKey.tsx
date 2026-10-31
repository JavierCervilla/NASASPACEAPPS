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
 * The polar map's key of numbered sites: the markers too crowded for a
 * label wear a number on the map (polar/badge-layout.ts), and this list
 * names them, «1 Chang'e-7». Hidden from assistive technology like the
 * labels: every marker is already a button named in full.
 */
import type { Badge } from '../../polar/badge-layout';
import { useI18n } from '../i18n-context';

export function PolarKey({ badges }: { readonly badges: readonly Badge[] }) {
  const { t } = useI18n();
  if (badges.length === 0) return null;
  return (
    <div className="polar-key" aria-hidden="true">
      <p className="polar-key__title">{t('polar.numbered')}</p>
      <ol>
        {badges.map(({ id, n, label }) => (
          <li key={id} data-site-id={id}>
            <span className="polar-key__n">{n}</span>
            {label}
          </li>
        ))}
      </ol>
    </div>
  );
}
