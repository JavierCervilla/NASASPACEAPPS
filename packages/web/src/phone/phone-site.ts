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
 * What the phone list knows of a site, and how it names it. Pure, so the
 * names are tested without a page.
 */
import type { Site } from '@ventana/sim';
import type { TextKey } from '../i18n/catalogue';
import type { I18n } from '../i18n/translate';
import type { NowState } from './widget-types';

/**
 * What names the custom point where the pin stands (VENT-10, VENT-37): the
 * listed site nearest it, «Near Nobile Rim 1», and how far, «26 km»; and
 * whether it is saved on this device (its name is then the saved one).
 */
export interface CustomFacts {
  readonly near: string;
  readonly distance: string;
  readonly saved?: boolean;
}

/** The part of a site the phone sheet shows; `custom` for the point. */
export type PhoneSite = Pick<
  Site,
  'id' | 'name' | 'mission' | 'group' | 'lat' | 'lonEast' | 'approximate'
> & { readonly custom?: CustomFacts };

/** Pill names longer than this fall back to the place name. */
const SHORT_MAX_CHARS = 14;
/** A name ending in one parenthesised part: «Place (Mission)». */
const TRAILING_PART = /^(.*\S)\s*\(([^()]+)\)$/;

/**
 * A site name split into its place and the trailing parenthesised detail:
 * «Mons Mouton (IM-2 Athena)» gives «Mons Mouton» and «IM-2 Athena».
 */
export function splitName(name: string): { title: string; detail: string } {
  const match = TRAILING_PART.exec(name);
  if (!match?.[1] || !match[2]) return { title: name, detail: '' };
  return { title: match[1], detail: match[2] };
}

/** The pill's name: the mission when short (IM-2), else the place. */
export function shortName(site: Pick<Site, 'name' | 'mission'>): string {
  if (site.mission.length <= SHORT_MAX_CHARS) return site.mission;
  return splitName(site.name).title;
}

/** How a site is named in the pill, the sheet title and the list. */
export interface SiteLabels {
  /** The place: «Mons Mouton». */
  readonly title: string;
  /** What tells it apart: «IM-2 Athena», «Artemis candidate region». */
  readonly subtitle: string;
  /** The pill's name: «IM-2», or the place for a long mission. */
  readonly pill: string;
  /** The pill's second line: the other of place and subtitle. */
  readonly pillDetail: string;
}

/**
 * The names of a site. Co-located sites share a place («Mons Mouton»), so
 * the title always comes with a subtitle and the pill with a second line.
 * The custom point is «Custom point», near its nearest site (no
 * subtitle when there is none).
 */
export function siteLabels(
  site: Pick<PhoneSite, 'name' | 'mission' | 'custom'>,
): SiteLabels {
  if (site.custom) {
    const { near, distance } = site.custom;
    const subtitle = [near, distance].filter(Boolean).join(' · ');
    return { title: site.name, subtitle, pill: site.name, pillDetail: '' };
  }
  const { title, detail } = splitName(site.name);
  const subtitle = detail || site.mission;
  const pill = shortName(site);
  const other = pill === site.mission ? title : subtitle;
  return { title, subtitle, pill, pillDetail: other === pill ? '' : other };
}

/** The slim site of a full one, as the page passes it to the island. */
export function toPhoneSite(site: PhoneSite): PhoneSite {
  const { id, name, mission, group, lat, lonEast, approximate } = site;
  return { id, name, mission, group, lat, lonEast, approximate };
}

const NOW_WORDS: Readonly<Record<NowState, TextKey>> = {
  window: 'row.window',
  sun: 'row.sun',
  earth: 'row.earth',
  none: 'row.none',
};

/**
 * The second line of a list row: the region (`region`, while a search spans
 * every region), the mission detail, the state right now when it is known
 * (the selected site), and whether it is approximate.
 */
export function rowDetail(
  i18n: I18n,
  site: PhoneSite,
  state: NowState | null,
  region = '',
): string {
  const parts = [splitName(site.name).detail || site.mission];
  if (region) parts.unshift(region);
  if (state) parts.push(i18n.t(NOW_WORDS[state]));
  if (site.approximate) parts.push(i18n.t('row.approximate'));
  return parts.join(' · ');
}
