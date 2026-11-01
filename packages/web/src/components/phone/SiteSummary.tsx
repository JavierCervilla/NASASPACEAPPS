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
 * The sheet at peek and half: the site's LOLA relief thumbnail (south of
 * 80° S), its name with what tells it apart (IM-2 and the Mons Mouton
 * zone share a place), its coordinates and the widgets.
 */
import type { ReactNode } from 'react';
import { formatCoords } from '../../i18n/format';
import { siteLabels, type PhoneSite } from '../../phone/phone-site';
import type { WidgetsResult } from '../../phone/widgets-loader';
import { thumbOf } from '../../thumbs/thumbs';
import { useI18n } from '../i18n-context';
import { SiteThumb } from '../SiteThumb';
import { Widgets } from './Widgets';

interface Props {
  readonly site: PhoneSite;
  readonly result: WidgetsResult;
  readonly onRetry: () => void;
  /** The chosen instant, written out; null: live. */
  readonly when: string | null;
  /** The site's base path, for the thumbnail. */
  readonly base: string;
  /** Over the widgets: that Horizons is down, with its retry. */
  readonly status?: ReactNode;
  /** Under the widgets: the computed caption. */
  readonly notes?: ReactNode;
}

/** Drawn at 40 px: the 320 px file covers any phone's density. */
const THUMB_SIZES = '40px';

/** «84.79° S, 29.20° E», or nothing for a site without coordinates. */
function Coords({ site }: { readonly site: PhoneSite }) {
  const i18n = useI18n();
  if (!Number.isFinite(site.lat) || !Number.isFinite(site.lonEast)) {
    return null;
  }
  return (
    <span className="summary__coords">
      {formatCoords(i18n, site.lat, site.lonEast)}
    </span>
  );
}

export function SiteSummary(props: Props) {
  const { site, result, onRetry, when, base, status, notes } = props;
  const ready = result.kind === 'ready';
  const { title, subtitle } = siteLabels(site);
  const i18n = useI18n();
  const thumb = thumbOf({ id: site.id, place: title }, base, i18n);
  return (
    <div className="summary">
      <div className="summary__head">
        <SiteThumb thumb={thumb} sizes={THUMB_SIZES} className="summary__thumb" />
        <h2 className="summary__name">{title}</h2>
        <p className="summary__meta">
          {!subtitle || subtitle === title ? null : (
            <span className="summary__subtitle">{subtitle}</span>
          )}
          <Coords site={site} />
        </p>
      </div>
      {ready ? status : null}
      <Widgets result={result} onRetry={onRetry} when={when} />
      {ready ? notes : null}
    </div>
  );
}
