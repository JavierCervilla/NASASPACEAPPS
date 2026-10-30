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
 * Parser of the observer table JPL Horizons prints with `QUANTITIES='4'` and
 * `CSV_FORMAT='YES'`. Pure text work: the server fetches the response, the
 * simulation and its tests read it.
 */

/**
 * One row of a Horizons observer table: where the target sits on the observer's
 * sky at one instant.
 */
export interface HorizonsRow {
  /**
   * Instant of the row, ISO 8601 in UTC without milliseconds (for example
   * `2026-11-01T00:00:00Z`).
   */
  readonly t: string;
  /** Apparent azimuth, in degrees clockwise from north. */
  readonly azimuth: number;
  /** Apparent elevation above the local horizon, in degrees. */
  readonly elevation: number;
}

/** The text of a Horizons response could not be read as an observer table. */
export class HorizonsParseError extends Error {
  override readonly name = 'HorizonsParseError';
}

const START_MARKER = '$$SOE';
const END_MARKER = '$$EOE';

const MONTHS: Readonly<Record<string, string>> = {
  Jan: '01',
  Feb: '02',
  Mar: '03',
  Apr: '04',
  May: '05',
  Jun: '06',
  Jul: '07',
  Aug: '08',
  Sep: '09',
  Oct: '10',
  Nov: '11',
  Dec: '12',
};

// Horizons calendar date, for example `2026-Nov-01 00:00` or `2026-Nov-01
// 00:00:30`.
const DATE_PATTERN = /^(\d{4})-([A-Z][a-z]{2})-(\d{2}) (\d{2}):(\d{2})(?::(\d{2}))?$/;

/**
 * Converts a Horizons calendar date (`2026-Nov-01 00:00`) to ISO 8601 in UTC
 * (`2026-11-01T00:00:00Z`).
 */
export function horizonsDateToIso(text: string): string {
  const match = DATE_PATTERN.exec(text.trim());
  const month = match ? MONTHS[match[2] ?? ''] : undefined;
  if (!match || month === undefined) {
    throw new HorizonsParseError(`unreadable Horizons date: "${text}"`);
  }
  const [, year, , day, hour, minute, second] = match;
  return `${year}-${month}-${day}T${hour}:${minute}:${second ?? '00'}Z`;
}

function parseNumber(
  text: string | undefined,
  what: string,
  line: string,
): number {
  const value = Number(text?.trim());
  if (text === undefined || text.trim() === '' || !Number.isFinite(value)) {
    throw new HorizonsParseError(`unreadable ${what} in Horizons row: "${line}"`);
  }
  return value;
}

/**
 * Reads the rows between `$$SOE` and `$$EOE` of a Horizons `result` text. Each
 * row is `date, solar-presence flag, lunar-presence flag, azimuth, elevation,`;
 * the two flag columns may be blank and are ignored here (visibility is decided
 * from the elevation).
 *
 * @throws HorizonsParseError when the markers are missing or a row cannot be
 *   read.
 */
export function parseHorizonsTable(result: string): HorizonsRow[] {
  const start = result.indexOf(START_MARKER);
  const end = result.indexOf(END_MARKER);
  if (start === -1 || end === -1 || end < start) {
    throw new HorizonsParseError('Horizons result has no $$SOE..$$EOE table');
  }
  const body = result.slice(start + START_MARKER.length, end);
  return body
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .map((line) => {
      const fields = line.split(',');
      return {
        t: horizonsDateToIso(fields[0] ?? ''),
        azimuth: parseNumber(fields[3], 'azimuth', line),
        elevation: parseNumber(fields[4], 'elevation', line),
      };
    });
}
