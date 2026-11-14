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
 * «Open in LROC QuickMap» (VENT-125, canvas option A): a link dressed as
 * the secondary button that opens QuickMap in a new tab, centred on the
 * selected site or point; nothing for a site without coordinates. Under
 * the desktop card's point line and after the phone sheet's head, outside
 * what the peek sheet measures.
 */
import { quickmapUrl, type MapPoint } from '../../lib/quickmap-link';
import { useI18n } from '../i18n-context';
import { Icon } from '../phone/Icon';

interface Props {
  /** The site or point; NaN coordinates for a site without them. */
  readonly point: MapPoint;
  /** Where it stands: the card's head or the phone summary. */
  readonly className: string;
}

export function QuickMapLink({ point, className }: Props) {
  const { t } = useI18n();
  const { lat, lonEast } = point;
  if (!Number.isFinite(lat) || !Number.isFinite(lonEast)) return null;
  const href = quickmapUrl({ lat, lonEast });
  return (
    <a
      className={`quickmap-link ${className}`}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('card.quickmapName')}
    >
      {t('card.quickmap')}
      <Icon name="external" className="quickmap-link__icon" />
    </a>
  );
}
