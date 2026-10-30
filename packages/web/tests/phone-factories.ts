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

/** Hourly samples for the phone widget tests, built from small rules. */
import { addHours, type DsnComplex, type HourSample } from '@ventana/sim';

export const START = '2026-11-01T00:00:00Z';

export interface HourRule {
  readonly sunEl: (hour: number) => number;
  readonly earthEl: (hour: number) => number;
  readonly dsn?: (hour: number) => DsnComplex | null;
}

/** `count` hours from {@link START}, each from the rule at its index. */
export function hoursOf(count: number, rule: HourRule): HourSample[] {
  return Array.from({ length: count }, (_, hour) => ({
    t: addHours(START, hour),
    sunEl: rule.sunEl(hour),
    sunAz: 0,
    earthEl: rule.earthEl(hour),
    earthAz: 0,
    dsn: rule.dsn?.(hour) ?? null,
  }));
}

/** The hour `hour` after {@link START}, as ISO. */
export const hourAt = (hour: number): string => addHours(START, hour);

/** Up (10°) before `edge`, down (-5°) from it. */
export const upUntil = (edge: number) => (hour: number) => (hour < edge ? 10 : -5);
