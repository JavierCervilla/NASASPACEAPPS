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
 * The DSN at the shared instant for the selected site (VENT-7): the block's
 * model and words, and the spans the views draw from. The complex comes from
 * the simulator, worked out once per UTC day; the Earth's elevation from the
 * hour of the month's hours the views show, or from the simulator when they
 * have not come yet (a site without coordinates waits for them). None of
 * it runs before the page has started (`useStarted`), so the globe starts
 * first, and it is worked out again only when the instant, the site's point
 * or the hours change, not on every render.
 */
import {
  HOUR_MS,
  skyAt,
  toIso,
  type DsnSpan,
  type DsnState,
} from '@ventana/sim';
import { useMemo, useState } from 'react';
import { createDsnDays } from '../../dsn/dsn-days';
import { dsnModel, type DsnModel } from '../../dsn/dsn-model';
import { dsnText, type DsnText } from '../../dsn/dsn-text';
import type { PhoneSite } from '../../phone/phone-site';
import { sampleAt } from '../../phone/site-widgets';
import type { HoursResult } from '../../phone/widgets-loader';
import { useI18n } from '../i18n-context';
import { useStarted } from '../use-started';

export interface Dsn {
  readonly model: DsnModel;
  readonly text: DsnText;
  readonly spans: readonly DsnSpan[];
  /** Who listens and who sees the Moon above 10°, at the instant. */
  readonly state: DsnState;
}

const SILENT: DsnState = { active: null, above: [] };

/** The site's Earth elevation at the hour of `atMs`, or null. */
function earthElevation(
  site: Pick<PhoneSite, 'lat' | 'lonEast'>,
  atMs: number,
  hours: HoursResult,
): number | null {
  const hour = toIso(Math.floor(atMs / HOUR_MS) * HOUR_MS);
  const sample = hours.kind === 'ready' ? sampleAt(hours.hours, hour) : null;
  if (sample) return sample.earthEl;
  const { lat, lonEast } = site;
  if (!Number.isFinite(lat) || !Number.isFinite(lonEast)) return null;
  return skyAt({ latDeg: lat, lonEastDeg: lonEast }, atMs).earthEl;
}

/** The DSN at `atMs` for `site`; null before it is known. */
export function useDsn(
  site: PhoneSite,
  atMs: number | null,
  hours: HoursResult,
): Dsn | null {
  const [days] = useState(createDsnDays);
  const i18n = useI18n();
  const started = useStarted();
  const { lat, lonEast } = site;
  return useMemo(() => {
    if (!started || atMs === null) return null;
    const point = { lat, lonEast };
    const spans = days.spansFor(atMs);
    const model = dsnModel(spans, atMs, earthElevation(point, atMs, hours));
    const span = spans.find((s) => atMs >= s.startMs && atMs < s.endMs);
    const state = span ? { active: span.active, above: span.above } : SILENT;
    return { model, text: dsnText(model, i18n), spans, state };
  }, [started, days, atMs, lat, lonEast, hours, i18n]);
}
