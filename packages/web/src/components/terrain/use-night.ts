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
 * Whether the view is at night (VENT-100) and, then, the notice of when
 * the Sun rises: one answer for the scene's light, the caption and the
 * notice, read from the hour the widgets show (VENT-106, night-notice.ts
 * says why), worked out once per hour of the instant.
 */
import { useMemo } from 'react';
import { HOUR_MS, type HorizonProfile } from '@ventana/sim';
import { nightAnswer, type NightAnswer } from '../../terrain/night-notice';
import type { HoursResult } from '../../phone/widgets-loader';
import { useI18n } from '../i18n-context';
import type { OnFootSite } from './use-on-foot';

export type Night = NightAnswer;

export function useNight(
  site: OnFootSite,
  atMs: number | null,
  profile: HorizonProfile | null,
  hours: HoursResult | undefined,
): Night {
  const i18n = useI18n();
  const hour = atMs === null ? null : Math.floor(atMs / HOUR_MS) * HOUR_MS;
  const shown = hours?.kind === 'ready' ? hours.hours : null;
  const { lat, lonEast, shadow } = site;
  return useMemo(() => (hour === null
    ? { night: false, notice: null }
    : nightAnswer({ lat, lonEast, profile, shadow }, hour, shown, i18n)),
  [hour, lat, lonEast, profile, shadow, shown, i18n]);
}
