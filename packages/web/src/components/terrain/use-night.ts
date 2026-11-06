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
 * horizon at the instant, the answer the scene lights by; and, then, the
 * notice of when it rises, worked out once per hour of the instant.
 */
import { useMemo } from 'react';
import { HOUR_MS, type HorizonProfile } from '@ventana/sim';
import { isNight } from '../../terrain/night-light';
import { nightNotice, type NightNotice } from '../../terrain/night-notice';
import type { SkyDirs } from '../../terrain/scene/scene-types';
import { useI18n } from '../i18n-context';
import type { OnFootSite } from './use-on-foot';

export interface Night {
  readonly night: boolean;
  /** «Lunar night here · The Sun rises in …»; null by day. */
  readonly notice: NightNotice | null;
}

export function useNight(
  site: OnFootSite,
  sky: SkyDirs | null,
  atMs: number | null,
  profile: HorizonProfile | null,
): Night {
  const i18n = useI18n();
  const night = sky !== null && isNight(sky, profile);
  const hour = atMs === null ? null : Math.floor(atMs / HOUR_MS) * HOUR_MS;
  const { lat, lonEast, shadow } = site;
  const notice = useMemo(() => (night && hour !== null
    ? nightNotice({ lat, lonEast, profile, shadow }, hour, i18n)
    : null), [night, hour, lat, lonEast, profile, shadow, i18n]);
  return { night, notice };
}
