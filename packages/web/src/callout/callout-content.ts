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
 * What the globe's callout says about the selected site at the selected
 * instant: the mission and its date, the place, its point and how exact
 * it is, the state pill, the two countdowns and the orbital image. The
 * wording is the site card's (`missionLine`, `pointLine`, `siteLabels`)
 * and the countdowns are the widgets' (`widgetsAt`), so the callout never
 * disagrees with them. The phone's compact card gets shorter mission and
 * point lines, each one line at 360 px. Pure.
 */
import type { CardSite } from '../card/site-facts';
import {
  formatStatusDate,
  missionLine,
  pointLine,
} from '../card/site-facts';
import { formatCoords } from '../phone/format';
import { siteLabels } from '../phone/phone-site';
import type { BodyWidget } from '../phone/widget-types';
import { widgetsAt, type HoursResult } from '../phone/widgets-loader';
import { calloutState, type CalloutState } from './callout-state';
import { thumbOf, type Thumb } from './thumbs';

/** The Sun's and the Earth's countdowns. */
export interface CalloutBodies {
  readonly sun: BodyWidget;
  readonly earth: BodyWidget;
}

export interface CalloutContent {
  /** The site's id, which the content is for. */
  readonly id: string;
  /** The group's accessible name: the site's full name. */
  readonly name: string;
  /** «IM-2 Athena · landed 6 Mar 2025». */
  readonly mission: string;
  /** The phone's: «IM-2 Athena · 6 Mar 2025». */
  readonly missionShort: string;
  /** «Mons Mouton». */
  readonly place: string;
  /** «84.79° S, 29.20° E · exact touchdown», wrapping only before «exact». */
  readonly point: string;
  /**
   * The phone's: «84.79° S · 29.20° E». The marker's style already says
   * how exact the point is.
   */
  readonly pointShort: string;
  /** Null: no thumbnail (north of 80° S, or unlisted). */
  readonly image: Thumb | null;
  /** Null until the hours load, or outside the data window. */
  readonly state: CalloutState | null;
  /** The «Sunset in» and «Earthset in» countdowns, when known. */
  readonly bodies: CalloutBodies | null;
}

export interface CalloutInput {
  readonly site: CardSite;
  /** The site's hours for the month of `atMs`. */
  readonly hours: HoursResult;
  /** The selected instant; null before the page's clock runs. */
  readonly atMs: number | null;
  /** The site's base path, for the image. */
  readonly base: string;
}

/** The mission line without «landed»: a landing's date speaks for it. */
function shortMissionLine(site: CardSite, lead: string): string {
  const date = formatStatusDate(site.statusDate ?? '');
  if (site.status !== 'landed' || !date) return missionLine(site, lead);
  return [lead, date].filter(Boolean).join(' · ');
}

/** The point's coordinates alone, «84.79° S · 29.20° E». */
function shortPointLine(site: CardSite): string {
  const known = Number.isFinite(site.lat) && Number.isFinite(site.lonEast);
  if (!known) return pointLine(site);
  return formatCoords(site.lat, site.lonEast).split(', ').join(' · ');
}

const NBSP = '\u00a0';

/**
 * The site card's point line, its coordinates unbreakable and the dot
 * kept with them, so a narrow card wraps it only before the precision.
 */
function widePointLine(site: CardSite): string {
  const [coords = '', ...precision] = pointLine(site).split(' · ');
  if (precision.length === 0) return coords;
  return [coords.replaceAll(' ', NBSP), ...precision].join(`${NBSP}· `);
}

/** The callout of `input.site` at `input.atMs`. */
export function calloutContent(input: CalloutInput): CalloutContent {
  const { site, hours, atMs, base } = input;
  const { title, subtitle } = siteLabels(site);
  const widgets = atMs === null ? null : widgetsAt(hours, atMs);
  const ready = widgets?.kind === 'ready' ? widgets.widgets : null;
  return {
    id: site.id,
    name: site.name,
    mission: missionLine(site, subtitle),
    missionShort: shortMissionLine(site, subtitle),
    place: title,
    point: widePointLine(site),
    pointShort: shortPointLine(site),
    image: thumbOf(site.id, title, base),
    state: calloutState(hours, atMs),
    bodies: ready && { sun: ready.sun, earth: ready.earth },
  };
}
