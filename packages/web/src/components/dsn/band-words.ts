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
 * The DSN band in words: its day, «Sun 22 Nov · UTC»; the group's name for
 * a screen reader; each row as «Robledo de Chavela: listening 16:10–24:00»;
 * the playhead's chip and the hour ticks.
 */
import type { DayBand, DayPart } from '../../dsn/day-band';
import { clockText } from '../../dsn/clock-text';
import { STATIONS } from '../../dsn/stations';
import type { I18n } from '../../i18n/translate';

const DAY_MS = 86_400_000;
const HOURS_PER_DAY = 24;

const DAY_FORMAT = {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
} as const;

const pad = (n: number): string => String(n).padStart(2, '0');

/** «16:48», or «24:00» for the day's end. */
function edge(i18n: I18n, band: DayBand, fraction: number): string {
  if (fraction >= 1) return `${HOURS_PER_DAY}:00`;
  return clockText(i18n, band.dayStartMs + fraction * DAY_MS);
}

export type Words = ReturnType<typeof bandWords>;

export function bandWords(i18n: I18n, band: DayBand, atMs: number) {
  const format = new Intl.DateTimeFormat(i18n.tag, DAY_FORMAT);
  const date = format.format(band.dayStartMs);
  const range = (p: DayPart): string => i18n.t('dsn.range', {
    from: edge(i18n, band, p.from),
    to: edge(i18n, band, p.to),
  });
  const rows = band.rows.map(({ complex, active }) => {
    const name = STATIONS[complex].full;
    if (active.length === 0) return i18n.t('dsn.rowSilent', { name });
    return i18n.t('dsn.rowListening', { name, ranges: active.map(range).join(', ') });
  });
  return {
    day: i18n.t('dsn.dayUtc', { day: date }),
    label: i18n.t('dsn.bandLabel', { day: date }),
    rows,
    chip: clockText(i18n, atMs),
    tick: (h: number): string => `${pad(h)}:00`,
  };
}
