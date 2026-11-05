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
 * The results (VENT-81, the canvas «2 · Results A vs B»): the device's
 * header, the on-foot view's full turn with each metric's median for A
 * and B and B's change, and «Copy report», «Run again» and «Close».
 */
import { useState } from 'react';
import { copyText } from '../../bench/copy';
import { browserName, cellText, changeText } from '../../bench/display';
import type { Phase } from '../../bench/phase';
import { reportText } from '../../bench/report';
import { resultRows } from '../../bench/results';
import type { BenchState } from '../../bench/types';
import { endBench, startBench } from '../../bench/navigate';
import { useI18n } from '../i18n-context';

type Results = Extract<Phase, { kind: 'results' }>;

/** The header line: GPU, browser, screen, tier, script and build. */
function HeaderLine({ state }: { state: BenchState }) {
  const { t } = useI18n();
  const h = state.header;
  if (!h) return null;
  const browser = browserName(h.userAgent);
  return <p className="bench__meta">{t('bench.header', { ...h, browser, version: h.script })}</p>;
}

/** The table of the turning step's metrics. */
function ResultTable({ state }: { state: BenchState }) {
  const i18n = useI18n();
  const { t } = i18n;
  return (
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
  );
}

export function BenchResults({ state }: Results) {
  const { t, plural } = useI18n();
  const [copied, setCopied] = useState(false);
  const copy = () => void copyText(reportText(state), document).then(setCopied);
  return (
    <>
      <div className="bench__head">
        <h2 className="bench__title">{t('bench.done')}</h2>
        <HeaderLine state={state} />
      </div>
      <ResultTable state={state} />
      <p className="bench__note">{plural('bench.note', state.runs)}</p>
      <p className="bench__note" role="status">{copied ? t('bench.copied') : ''}</p>
      <div className="bench__actions">
        <button type="button" className="bench__button bench__primary" onClick={copy}>{t('bench.copy')}</button>
        <button type="button" className="bench__button" onClick={() => startBench(state.runs)}>{t('bench.again')}</button>
        <button type="button" className="bench__button bench__plain" onClick={() => endBench(true)}>{t('bench.close')}</button>
      </div>
    </>
  );
}
