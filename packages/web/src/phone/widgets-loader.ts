/**
 * Fetches a site's month and turns it into the four widgets: the one step
 * between the API and the sheet, with the clock and `fetch` injected.
 */
import { monthRange } from './month-range';
import { loadSiteHours, type HoursSource } from './site-hours';
import { siteWidgets } from './site-widgets';
import type { SiteWidgets } from './widget-types';

/** What the sheet shows: skeletons, the widgets, or an honest error. */
export type WidgetsResult =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly widgets: SiteWidgets }
  | { readonly kind: 'error' };

export const LOADING: WidgetsResult = { kind: 'loading' };

/** The widgets of site `id` at `nowMs`; `error` when the API fails. */
export async function loadWidgets(
  source: HoursSource,
  id: string,
  nowMs: number,
): Promise<WidgetsResult> {
  const range = monthRange(nowMs);
  try {
    const hours = await loadSiteHours(source, id, range);
    const widgets = siteWidgets(hours, range.at, range.month);
    return widgets ? { kind: 'ready', widgets } : { kind: 'error' };
  } catch {
    return { kind: 'error' };
  }
}
