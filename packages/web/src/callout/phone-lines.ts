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
 * The phone's compact callout: its mission and place lines, short enough
 * to fit whole on one line of its 196 px text column at 360 px and up.
 * The mission line is its name and when, «Artemis · 2028»; the place is
 * its head, «Shackleton ridge». The budgets are in characters, measured
 * in Chromium: the real lines run at most 7.1 px a character on the
 * mission row and 9.2 on the place row, so 26 and 20 leave a margin for
 * the phone's own system font. Pure.
 */
import { formatStatusDate, type CardSite } from '../card/site-facts';

/** Mission lines up to this many characters fit the phone's row. */
export const PHONE_MISSION_CHARS = 26;
/** Place lines up to this many characters fit the phone's row. */
export const PHONE_PLACE_CHARS = 20;
/** Mission names up to this long are said as they are: «Chandrayaan-3». */
const NAME_CHARS = 14;

/** A parenthesised detail: «2027 (launch NET)». */
const DETAIL = /\s*\([^()]*\)/g;
/** Words before a date: «landing planned 2028». */
const LEAD_WORDS = /^(?:[a-z]+\s+)+(?=\d)/;
/** Where a place's head ends: «Nobile region near Mons Mouton». */
const PLACE_TAIL = /\s+(?:near|north of|south of)\s.*$|,.*$/;

/**
 * The mission's name: the mission when short (IM-2), else the first two
 * capitalised words of `subtitle`'s first clause («Blue Moon», «Artemis»).
 */
export function phoneMissionName(site: CardSite, subtitle: string): string {
  if (site.mission.length <= NAME_CHARS) return site.mission;
  const [first = '', ...rest] = (subtitle.split(',')[0] ?? '').split(' ');
  const end = rest.findIndex((word) => /^[a-z]/.test(word));
  const words = [first, ...(end < 0 ? rest : rest.slice(0, end))];
  return words.slice(0, 2).join(' ');
}

/** When, without a landing or a crash: «2028», «NET Q1 2027». */
export function phoneWhen(site: CardSite): string {
  const clause = (site.statusDate ?? '').split(';').at(-1) ?? '';
  const plain = clause.replace(DETAIL, '').trim().replace(LEAD_WORDS, '');
  return formatStatusDate(plain);
}

/**
 * `name` and `when` on one line. When it would not fit the day goes
 * («Aug 2023»), and then the name keeps only its first word («ispace»).
 */
export function phoneMissionLine(name: string, when: string): string {
  const line = (lead: string, date: string): string =>
    [lead, date].filter(Boolean).join(' · ');
  const month = when.replace(/\b\d{1,2} (?=[A-Z][a-z]{2} \d{4}$)/, '');
  const tries = [line(name, when), line(name, month)];
  const fit = tries.find((t) => t.length <= PHONE_MISSION_CHARS);
  return fit ?? line(name.split(' ')[0] ?? name, month);
}

/**
 * The place without its parenthesis; if still too long, without its
 * «near …» clause, and then only its first and last words
 * («Shackleton ridge»).
 */
export function placeShort(place: string): string {
  const fits = (text: string) => text.length <= PHONE_PLACE_CHARS;
  const whole = place.replace(DETAIL, '').trim();
  if (fits(whole)) return whole;
  const head = whole.replace(PLACE_TAIL, '').trim();
  const words = head.split(' ');
  if (fits(head) || words.length < 3) return head;
  return `${words[0] ?? ''} ${words.at(-1) ?? ''}`;
}
