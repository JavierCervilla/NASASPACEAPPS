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
 * «Open in LROC QuickMap» (VENT-125): links that open QuickMap in a new
 * tab, centred on the selected site or point; nothing for a site without
 * coordinates. On desktop a link dressed as the secondary button, the
 * site card's last item; on a phone a «QuickMap ↗» pill beside the Sites
 * sheet's «Done», named for the site, since the half sheet has no room
 * for it.
 */
import { quickmapUrl, type MapPoint } from '../../lib/quickmap-link';
import { siteLabels, type PhoneSite } from '../../phone/phone-site';
import { useI18n } from '../i18n-context';
import { Icon } from '../phone/Icon';

interface Props {
  /** The site or point; NaN coordinates for a site without them. */
  readonly point: MapPoint;
  /** Where it stands in the card. */
  readonly className: string;
}

/** QuickMap's address for `point`; null without coordinates. */
function hrefOf({ lat, lonEast }: MapPoint): string | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lonEast)) return null;
  return quickmapUrl({ lat, lonEast });
}

export function QuickMapLink({ point, className }: Props) {
  const { t } = useI18n();
  const href = hrefOf(point);
  if (href === null) return null;
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

/**
 * The phone's «QuickMap ↗» pill in the Sites sheet's head, its name
 * saying which site it opens.
 */
export function QuickMapPill({ site }: { readonly site: PhoneSite }) {
  const { t } = useI18n();
  const href = hrefOf(site);
  if (href === null) return null;
  const name = siteLabels(site).pill;
  return (
    <a
      className="quickmap-pill"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('picker.quickmapName', { site: name })}
    >
      {t('picker.quickmap')}
      <Icon name="external" className="quickmap-link__icon" />
    </a>
  );
}
