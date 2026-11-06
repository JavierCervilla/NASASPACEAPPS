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
 * Whether the view is at night (VENT-100), the Sun under the point's
 * horizon at the instant, the answer the scene lights by and the caption
 * says; and the notice of when it rises, by the hour the widgets show
 * (VENT-106), worked out once per hour of the instant.
 *
 * The two may disagree within the hour of a sunrise or a sunset: the
 * light speaks for the Sun the scene draws, which has to be the exact
 * instant (lit by day with the Sun already behind the ridge, the view is
 * a flat grey slab), while the notice speaks for the widgets' hour, so
 * its count is the «Sunrise in» widget's.
 */
import { useMemo } from 'react';
import { HOUR_MS, type HorizonProfile } from '@ventana/sim';
import { isNight } from '../../terrain/night-light';
import { nightNotice, type NightNotice } from '../../terrain/night-notice';
import type { SkyDirs } from '../../terrain/scene/scene-types';
import type { HoursResult } from '../../phone/widgets-loader';
import { useI18n } from '../i18n-context';
import type { OnFootSite } from './use-on-foot';

export interface Night {
  /** The scene's answer: the Sun under the horizon at the instant. */
  readonly night: boolean;
  /** «Lunar night here · The Sun rises in …», by the widgets' hour. */
  readonly notice: NightNotice | null;
}

/** The instant the view shows and the hours its widgets show. */
interface When {
  readonly atMs: number | null;
  readonly hours: HoursResult | undefined;
}

export function useNight(
  site: OnFootSite,
  sky: SkyDirs | null,
  profile: HorizonProfile | null,
  { atMs, hours }: When,
): Night {
  const i18n = useI18n();
  const night = sky !== null && isNight(sky, profile);
  const hour = atMs === null ? null : Math.floor(atMs / HOUR_MS) * HOUR_MS;
  const shown = hours?.kind === 'ready' ? hours.hours : null;
  const { lat, lonEast, shadow } = site;
  const notice = useMemo(() => (hour === null ? null
    : nightNotice({ lat, lonEast, profile, shadow }, hour, shown, i18n)),
  [hour, lat, lonEast, profile, shadow, shown, i18n]);
  return { night, notice };
}
