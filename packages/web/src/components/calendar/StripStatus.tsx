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
 * What a calendar view shows instead of its bars: grey bars while the
 * month loads, an honest error with a retry, or that the month is outside
 * the data the API holds.
 */
import { useI18n } from '../i18n-context';
import type { Calendar } from './hooks';

export function StripStatus({ calendar }: { readonly calendar: Calendar }) {
  const { result, retry } = calendar;
  const { t } = useI18n();
  // Loaded but holding none of the month counts as a failure too.
  if (result.kind === 'error' || result.kind === 'ready') {
    return (
      <div className="strip-status" role="alert">
        <p>{t('data.monthError')}</p>
        <button type="button" onClick={retry}>{t('data.retry')}</button>
      </div>
    );
  }
  if (result.kind === 'outside') {
    return (
      <p className="strip-status" role="status">
        {t('data.outside')}
      </p>
    );
  }
  return <div className="strip-status strip-status--loading" aria-busy="true" aria-label={t('calendar.loading')} />;
}
