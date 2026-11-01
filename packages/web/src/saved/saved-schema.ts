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
 * grid or off the Moon, a name that is empty, too long or not text. At
 * most {@link SAVED_CAP} are kept, one per point. Pure.
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
/** The most sites kept; a save beyond it is refused with a message. */
export const SAVED_CAP = 50;
/** The longest name, in UTF-16 units. */
export const NAME_MAX = 60;

const CONTROL = /\p{Cc}/gu;
const SPACES = /\s+/g;

/**
 * `raw` as a name: control characters out, runs of spaces folded, ends
 * trimmed, at most {@link NAME_MAX} long; null when nothing is left.
 */
export function cleanName(raw: string): string | null {
  const folded = raw.replace(SPACES, ' ').replace(CONTROL, '').trim();
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
  return [...sites.values()].slice(0, SAVED_CAP);
}

/** The document that keeps `sites`. */
export function serializeSaved(sites: readonly SavedSite[]): string {
  return JSON.stringify({ v: SAVED_VERSION, sites });
}
