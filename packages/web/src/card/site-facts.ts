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
import { formatCoords } from '../phone/format';
import { toPhoneSite, type PhoneSite } from '../phone/phone-site';
import { MONTHS } from '../phone/widget-range';

/**
 * A site as the card shows it: the list's fields, and the mission's
 * agency and status when the page has them (an unlisted site has none).
 */
export type CardSite = PhoneSite &
  Partial<Pick<Site, 'agency' | 'status' | 'statusDate'>>;

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** «6 Mar 2025» for an ISO day; anything else as the source wrote it. */
export function formatStatusDate(date: string): string {
  const day = ISO_DAY.exec(date);
  if (!day) return date;
  const month = (MONTHS[Number(day[2]) - 1] ?? '').slice(0, 3);
  return `${Number(day[3])} ${month} ${day[1]}`;
}

/**
 * «Intuitive Machines / NASA CLPS · landed 6 Mar 2025», or the status and
 * its date apart when it is not a landing: «NASA · candidate region · list
 * announced 2024-10-28; landing planned 2028».
 */
export function missionLine(site: CardSite): string {
  const date = formatStatusDate(site.statusDate ?? '');
  const landed = site.status === 'landed' && date;
  const status = landed ? [`landed ${date}`] : [site.status, date];
  return [site.agency, ...status].filter(Boolean).join(' · ');
}

/** How exact a site's point is, from its kind and its mission's status. */
function precision(site: CardSite): string {
  if (site.approximate) return 'approximate zone, not a landing point';
  const status = site.status ?? '';
  if (status.startsWith('landed')) return 'exact touchdown';
  return status.startsWith('crashed') ? 'impact point' : 'published target';
}

/** «84.79° S, 29.20° E · exact touchdown»; no point: the precision alone. */
export function pointLine(site: CardSite): string {
  const known = Number.isFinite(site.lat) && Number.isFinite(site.lonEast);
  if (!known) return 'Coordinates not in this build';
  return `${formatCoords(site.lat, site.lonEast)} · ${precision(site)}`;
}

/** The slim card site of a full one, as the page passes it to the island. */
export function toCardSite(site: Required<CardSite>): CardSite {
  const { agency, status, statusDate } = site;
  return { ...toPhoneSite(site), agency, status, statusDate };
}
