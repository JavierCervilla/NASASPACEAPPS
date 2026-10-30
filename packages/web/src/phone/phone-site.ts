/**
 * What the phone list knows of a site, and how it names it. Pure, so the
 * names are tested without a page.
 */
import type { Site } from '@ventana/sim';
import type { NowState } from './widget-types';

/** The part of a site the phone sheet shows. */
export type PhoneSite = Pick<
  Site,
  'id' | 'name' | 'mission' | 'group' | 'lat' | 'lonEast' | 'approximate'
>;

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

/** The slim site of a full one, as the page passes it to the island. */
export function toPhoneSite(site: PhoneSite): PhoneSite {
  const { id, name, mission, group, lat, lonEast, approximate } = site;
  return { id, name, mission, group, lat, lonEast, approximate };
}

const NOW_WORDS: Readonly<Record<NowState, string>> = {
  window: 'window now',
  sun: 'Sun only now',
  earth: 'Earth only now',
  none: 'no window now',
};

/**
 * The second line of a list row: the mission detail, the state right now
 * when it is known (the selected site), and whether it is approximate.
 */
export function rowDetail(site: PhoneSite, state: NowState | null): string {
  const parts = [splitName(site.name).detail || site.mission];
  if (state) parts.push(NOW_WORDS[state]);
  if (site.approximate) parts.push('approximate');
  return parts.join(' · ');
}
