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
 * The site card's head: who flies the mission and when, and how far the
 * coordinates can be trusted. Pure, so the wording is tested without a
 * page.
 */
import type { Site } from '@ventana/sim';
import { dataText } from '../i18n/data-text';
import { formatCoords } from '../i18n/format';
import type { I18n } from '../i18n/translate';
import { toPhoneSite, type PhoneSite } from '../phone/phone-site';

/**
 * A site as the card shows it: the list's fields, and the mission's
 * agency and status when the page has them (an unlisted site has none).
 */
export type CardSite = PhoneSite &
  Partial<Pick<Site, 'agency' | 'status' | 'statusDate'>>;

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * «6 Mar 2025» for an ISO day; anything else as the source wrote it, in
 * the visitor's language when the catalogue knows it.
 */
export function formatStatusDate(i18n: I18n, date: string): string {
  if (!ISO_DAY.test(date)) return dataText(i18n, date);
  const options = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  } as const;
  return new Intl.DateTimeFormat(i18n.tag, options).format(new Date(date));
}

/**
 * «Intuitive Machines / NASA CLPS · landed 6 Mar 2025», or the status and
 * its date apart when it is not a landing: «NASA · candidate region · list
 * announced 2024-10-28; landing planned 2028».
 */
export function missionLine(i18n: I18n, site: CardSite): string {
  const date = formatStatusDate(i18n, site.statusDate ?? '');
  const landed = site.status === 'landed' && date;
  const status = landed
    ? [i18n.t('mission.landed', { date })]
    : [dataText(i18n, site.status ?? ''), date];
  return [site.agency, ...status].filter(Boolean).join(' · ');
}

/** A site's point line: its coordinates and how exact they are. */
export interface PointLine {
  readonly coords: string;
  readonly note: string;
}

/**
 * How exact a site's point is, from its kind and its mission's status;
 * the custom point is where the astronaut was dropped.
 */
function precision(i18n: I18n, site: CardSite): string {
  if (site.custom) return i18n.t('precision.dropped');
  if (site.approximate) return i18n.t('precision.zone');
  const status = site.status ?? '';
  if (status.startsWith('landed')) return i18n.t('precision.exact');
  return i18n.t(
    status.startsWith('crashed') ? 'precision.impact' : 'precision.target',
  );
}

/**
 * «84.79° S, 29.20° E» and «exact touchdown», apart so only the
 * coordinates are selectable (VENT-38); no point: no coordinates, and
 * the note says so.
 */
export function pointLine(i18n: I18n, site: CardSite): PointLine {
  const known = Number.isFinite(site.lat) && Number.isFinite(site.lonEast);
  if (!known) return { coords: '', note: i18n.t('card.noCoords') };
  const coords = formatCoords(i18n, site.lat, site.lonEast);
  return { coords, note: precision(i18n, site) };
}

/** The slim card site of a full one, as the page passes it to the island. */
export function toCardSite(site: Required<Omit<CardSite, 'custom'>>): CardSite {
  const { agency, status, statusDate } = site;
  return { ...toPhoneSite(site), agency, status, statusDate };
}
