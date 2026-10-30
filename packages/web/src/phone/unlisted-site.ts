/**
 * The site the phone shows for a selected id the build-time list does not
 * hold (one the API added since the build): named by its id, without
 * coordinates, so the pill and the widgets never disagree on the site.
 */
import type { PhoneSite } from './phone-site';

/** A neutral site for `id`: its id as the name, no coordinates. */
export function unlistedSite(id: string): PhoneSite {
  return {
    id,
    name: id,
    mission: id,
    group: 'other',
    lat: Number.NaN,
    lonEast: Number.NaN,
    approximate: false,
  };
}
