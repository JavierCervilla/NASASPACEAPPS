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
 * Fetches a site's range and turns it into the four widgets: the one step
 * between the API and the sheet, with the clock and `fetch` injected.
 */
import { loadSiteHours, type HoursSource } from './site-hours';
import { siteWidgets } from './site-widgets';
import { widgetRange } from './widget-range';
import type { SiteWidgets } from './widget-types';

/**
 * What the sheet shows: skeletons, the widgets, an honest error, or that
 * the current hour is outside the data the API holds (2026 and 2027).
 */
export type WidgetsResult =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly widgets: SiteWidgets }
  | { readonly kind: 'error' }
  | { readonly kind: 'outside' };

export const LOADING: WidgetsResult = { kind: 'loading' };

/**
 * The widgets of site `id` at `nowMs`; `error` when the API fails, and
 * `outside`, without a request, when `nowMs` has no data.
 */
export async function loadWidgets(
  source: HoursSource,
  id: string,
  nowMs: number,
): Promise<WidgetsResult> {
  const range = widgetRange(nowMs);
  if (!range) return { kind: 'outside' };
  try {
    const hours = await loadSiteHours(source, id, range);
    const widgets = siteWidgets(hours, range);
    return widgets ? { kind: 'ready', widgets } : { kind: 'error' };
  } catch {
    return { kind: 'error' };
  }
}
