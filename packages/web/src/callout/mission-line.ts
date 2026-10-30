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
 * The callout's mission line: the mission (`lead`, «IM-2 Athena»), what
 * happened or is planned, and when, each said once. The list's status
 * and date fields were written for the site card and repeat each other
 * and the lead («candidate region» twice for an Artemis region, «2027»
 * twice for Chang'e-7), so here a status keeps only its head, a date only
 * its last clause, and a segment already said is dropped. A landing or a
 * crash, wherever the status mentions it, is told with its own date. The
 * phone's line is the mission's short name and when (phone-lines.ts), and
 * drops «landed»: a landing's date speaks for it. Pure.
 */
import { formatStatusDate, type CardSite } from '../card/site-facts';
import { phoneMissionLine, phoneMissionName, phoneWhen } from './phone-lines';

/** The desktop's line and the phone's shorter one. */
export interface MissionLines {
  readonly wide: string;
  readonly short: string;
}

/** «landed» or «crashed», with its ISO day when the status gives one. */
const EVENT = /\b(landed|crashed)\b(?:\s+(\d{4}-\d{2}-\d{2}))?/;
/** A trailing parenthesised detail: «planned (launch slipped …)». */
const DETAIL = /\s*\(.*\)\s*$/;

/**
 * The segment after `lead` for a landing or a crash, «landed 6 Mar 2025»;
 * null if the status tells neither. The word goes when the lead or, for
 * a landing, the phone already says it.
 */
function eventSegment(site: CardSite, lead: string, short: boolean) {
  const match = EVENT.exec(site.status ?? '');
  if (!match?.[1]) return null;
  const date = formatStatusDate(match[2] ?? site.statusDate ?? '');
  const said = lead.toLowerCase().includes(match[1]);
  const word = said || (short && match[1] === 'landed') ? '' : match[1];
  return [word, date].filter(Boolean).join(' ');
}

/** The status's head and the date's last clause: «planned», «2028». */
function plainSegments(site: CardSite): string[] {
  const status = (site.status ?? '').replace(DETAIL, '');
  const clauses = (site.statusDate ?? '').split(';');
  const date = formatStatusDate((clauses.at(-1) ?? '').trim());
  return [status.trim(), date];
}

/** `segments` joined, each dropped when an earlier one already says it. */
function joinOnce(segments: readonly string[]): string {
  const kept: string[] = [];
  for (const segment of segments) {
    const low = segment.toLowerCase();
    const said = kept.some((k) => k.toLowerCase().includes(low));
    if (segment && !said) kept.push(segment);
  }
  return kept.join(' · ');
}

/** The mission lines of `site`, led by `lead` (its subtitle). */
export function missionLines(site: CardSite, lead: string): MissionLines {
  const event = eventSegment(site, lead, false);
  const rest = event === null ? plainSegments(site) : [event];
  const name = phoneMissionName(site, lead);
  const when = eventSegment(site, name, true) ?? phoneWhen(site);
  return {
    wide: joinOnce([lead, ...rest]),
    short: phoneMissionLine(name, when),
  };
}
