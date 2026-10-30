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
 * Between the API and the sheet: loads the month of an instant for a site
 * (the loader and the instant are injected) and turns its hours into the
 * four widgets of any hour of that month.
 */
import type { HourSample } from '@ventana/sim';
import type { HoursLoader } from './hours-cache';
import { siteWidgets } from './site-widgets';
import { widgetRange } from './widget-range';
import type { SiteWidgets } from './widget-types';

/**
 * A month's hours: loading, loaded, an honest error, or outside the data
 * the API holds (2026 and 2027).
 */
export type HoursResult =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly hours: readonly HourSample[] }
  | { readonly kind: 'error' }
  | { readonly kind: 'outside' };

/** What the sheet shows: the same, with the widgets once loaded. */
export type WidgetsResult =
  | Exclude<HoursResult, { readonly kind: 'ready' }>
  | { readonly kind: 'ready'; readonly widgets: SiteWidgets };

export const LOADING = { kind: 'loading' } as const;

/**
 * The hours of site `id` for the month of `atMs`; `error` when the API
 * fails, and `outside`, without a request, when `atMs` has no data.
 */
export async function loadMonthHours(
  load: HoursLoader,
  id: string,
  atMs: number,
): Promise<HoursResult> {
  const range = widgetRange(atMs);
  if (!range) return { kind: 'outside' };
  try {
    return { kind: 'ready', hours: await load(id, range) };
  } catch {
    return { kind: 'error' };
  }
}

/** The widgets at the hour of `atMs`, from its month's `hours`. */
export function widgetsAt(hours: HoursResult, atMs: number): WidgetsResult {
  if (hours.kind !== 'ready') return hours;
  const range = widgetRange(atMs);
  const widgets = range && siteWidgets(hours.hours, range);
  return widgets ? { kind: 'ready', widgets } : { kind: 'error' };
}
