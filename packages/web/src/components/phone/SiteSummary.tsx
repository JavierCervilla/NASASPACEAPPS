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
 * zone share a place), its coordinates, «Open in LROC QuickMap» from
 * half up (VENT-125, outside the peek head), the note when NASA's maps
 * put it in shadow (VENT-39), the horizon strip (VENT-40) and the
 * widgets; the half sheet rises to fit it all (`data-sheet-fit`) and
 * the peek sheet to show the head (`data-sheet-peek`). For the custom
 * point, «Save» and, once saved, its name field (VENT-37).
 */
import type { ReactNode } from 'react';
import { formatCoords } from '../../i18n/format';
import { siteLabels, type PhoneSite } from '../../phone/phone-site';
import type { WidgetsResult } from '../../phone/widgets-loader';
import type { Dsn } from '../dsn/use-dsn';
import { thumbOf } from '../../thumbs/thumbs';
import { useI18n } from '../i18n-context';
import { QuickMapLink } from '../quickmap/QuickMapLink';
import { SaveButton, SaveName } from '../saved/SaveControl';
import { ShadowNote } from '../shadow/ShadowNote';
import { SiteThumb } from '../SiteThumb';
import { useScrollFade } from '../use-scroll-fade';
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
  /** Over the widgets: the site's horizon strip. */
  readonly horizon?: ReactNode;
  /** The DSN at the instant, for the fourth widget. */
  readonly dsn: Dsn | null;
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

/** The thumbnail, the name with «Save» for a custom point, the meta line. */
function SummaryHead({ site, base }: Pick<Props, 'site' | 'base'>) {
  const { title, subtitle } = siteLabels(site);
  const i18n = useI18n();
  const thumb = thumbOf({ id: site.id, place: title }, base, i18n);
  return (
    <div className="summary__head" data-sheet-peek="">
      <SiteThumb thumb={thumb} sizes={THUMB_SIZES} className="summary__thumb" />
      <h2 className="summary__name">{title}</h2>
      <SaveButton site={site} />
      <p className="summary__meta">
        {!subtitle || subtitle === title ? null : (
          <span className="summary__subtitle">{subtitle}</span>
        )}
        <Coords site={site} />
      </p>
    </div>
  );
}

export function SiteSummary(props: Props) {
  const { site, result, onRetry, when, base, status, notes, dsn } = props;
  const ready = result.kind === 'ready';
  const fade = useScrollFade<HTMLDivElement>();
  return (
    <div className="summary scroll-fade" data-sheet-fit="" {...fade}>
      <SummaryHead site={site} base={base} />
      <QuickMapLink point={site} className="summary__quickmap" />
      <ShadowNote shadow={site.shadow} className="summary__shadow" />
      <SaveName site={site} />
      {ready ? status : null}
      {props.horizon}
      <Widgets result={result} onRetry={onRetry} when={when} dsn={dsn} />
      {ready ? notes : null}
    </div>
  );
}
