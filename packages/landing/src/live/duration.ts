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

import type { Translate } from '../i18n/catalogue';

/** A span of whole hours as the app writes it: «8 d 1 h», «8 d», «6 h». */
export function hoursText(hours: number, t: Translate): string {
  const d = Math.floor(hours / 24);
  const h = Math.round(hours - d * 24);
  if (d === 0) return t('dur.h', { h: Math.max(h, 1) });
  return h === 0 ? t('dur.d', { d }) : t('dur.dh', { d, h });
}

/** A span in milliseconds, rounded: «~6 h», or minutes under an hour. */
export function msText(ms: number, t: Translate): string {
  const minutes = Math.max(1, Math.round(ms / 60_000));
  if (minutes < 60) return t('dur.m', { m: minutes });
  return t('dur.h', { h: Math.round(minutes / 60) });
}
