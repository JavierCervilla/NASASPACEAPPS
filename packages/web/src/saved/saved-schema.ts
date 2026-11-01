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
 * How the sites saved on this device are kept (VENT-37): a versioned JSON
 * document, `{ "v": 1, "sites": [...] }`, read back defensively. Storage is
 * the visitor's and can hold anything (an older or newer page, an edit by
 * hand), so every entry is checked and a bad one is dropped alone: an id
 * that is not its point's grid id (pin/custom-point.ts), a point off the
 * grid or off the Moon, a name that is empty, too long or not text. One
 * per point is kept; all are read, even past {@link SAVED_CAP} (an older
 * page or an edit by hand), so a write never loses any. Pure.
 */
import { customId, snapPoint } from '../pin/custom-point';

/** A site saved on this device. */
export interface SavedSite {
  /** Its point's custom id, `@-85.87,61.34`: stable, one per point. */
  readonly id: string;
  readonly name: string;
  readonly lat: number;
  readonly lonEast: number;
  /** When it was saved, ms since the epoch. */
  readonly savedAt: number;
}

export const SAVED_VERSION = 1;
/** The most sites a save adds up to; beyond it one is refused. */
export const SAVED_CAP = 50;
/** The longest name, in UTF-16 units. */
export const NAME_MAX = 60;

// Format characters too: bidi overrides and zero-width marks would make
// one name look like another, or reorder the text around it.
const CONTROL = /[\p{Cc}\p{Cf}]/gu;
const SPACES = /\s+/g;

/**
 * `raw` as a name: control characters out, runs of spaces folded, ends
 * trimmed, at most {@link NAME_MAX} long; null when nothing is left.
 */
export function cleanName(raw: string): string | null {
  // Folded again: a format character between spaces leaves two.
  const folded = raw.replace(SPACES, ' ').replace(CONTROL, '')
    .replace(SPACES, ' ').trim();
  const name = folded.slice(0, NAME_MAX).trim();
  return name === '' ? null : name;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** `value` as a saved site, or null when any part of it is wrong. */
function toSite(value: unknown): SavedSite | null {
  if (!isRecord(value)) return null;
  const { id, name, lat, lonEast, savedAt } = value;
  if (typeof lat !== 'number' || typeof lonEast !== 'number') return null;
  if (typeof name !== 'string' || typeof savedAt !== 'number') return null;
  const point = snapPoint({ lat, lonEast });
  const onGrid = point?.lat === lat && point.lonEast === lonEast;
  const named = cleanName(name) === name;
  if (!onGrid || !named || Math.abs(lat) > 90) return null;
  if (id !== customId(point) || !Number.isFinite(savedAt)) return null;
  return { id, name, lat, lonEast, savedAt };
}

/** The sites `text` keeps; none when it is missing or not this version. */
export function parseSaved(text: string | null): SavedSite[] {
  let data: unknown;
  try {
    data = JSON.parse(text ?? 'null');
  } catch {
    return [];
  }
  if (!isRecord(data) || data['v'] !== SAVED_VERSION) return [];
  const entries = Array.isArray(data['sites']) ? data['sites'] : [];
  const sites = new Map<string, SavedSite>();
  for (const site of entries.map(toSite)) {
    if (site && !sites.has(site.id)) sites.set(site.id, site);
  }
  return [...sites.values()];
}

/** The document that keeps `sites`. */
export function serializeSaved(sites: readonly SavedSite[]): string {
  return JSON.stringify({ v: SAVED_VERSION, sites });
}
