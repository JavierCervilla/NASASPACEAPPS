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
 * The results table (VENT-81): the full turn's metrics, A and B and B's
 * change, in a box that scrolls sideways when the text is too large for
 * the panel (a focusable region, so the keyboard scrolls it too); the
 * metric names wrap, the numbers do not.
 */
import { cellText, changeText } from '../../bench/display';
import { resultRows } from '../../bench/results';
import type { BenchState } from '../../bench/types';
import { useI18n } from '../i18n-context';

export function BenchTable({ state }: { state: BenchState }) {
  const i18n = useI18n();
  const { t } = i18n;
  return (
    <div className="bench__table-box" role="region" aria-label={t('bench.col.metric')} tabIndex={0}>
      <table className="bench__table">
        <thead>
          <tr><th scope="col">{t('bench.col.metric')}</th><th scope="col">{t('bench.col.a')}</th><th scope="col">{t('bench.col.b')}</th><th scope="col">{t('bench.col.change')}</th></tr>
        </thead>
        <tbody>
          {resultRows(state.results).map((row) => (
            <tr key={row.id} data-strong={row.strong}>
              <td>{t(`bench.metric.${row.id}`)}</td>
              <td>{cellText(row.id, row.a, i18n)}</td>
              <td>{cellText(row.id, row.b, i18n)}</td>
              <td>{changeText(row.change, i18n)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
