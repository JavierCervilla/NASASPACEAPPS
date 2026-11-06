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
 * header (in the scrolling body: long at large text), the full turn's
 * table (BenchTable.tsx), each run's view tier and a warning when they
 * differ, and «Copy report», «Run again» and «Close». A run that threw
 * shows here too, as «Benchmark stopped» with its error, «Copy report»,
 * «Run again» and «Stop». The depth suite (VENT-104) shows its own table,
 * a row per run under log against reversed (VENT-107), and copies its own
 * report.
 */
import { useState } from 'react';
import { copyText } from '../../bench/copy';
import { browserName } from '../../bench/display';
import { endBench, startBench } from '../../bench/navigate';
import type { Phase } from '../../bench/phase';
import { benchReport } from '../../bench/depth-report';
import { tierSummary } from '../../bench/results';
import type { BenchState } from '../../bench/types';
import { useI18n } from '../i18n-context';
import { BenchFrame } from './BenchFrame';
import { BenchTable } from './BenchTable';
import { DepthTable, DepthVersus } from './DepthTable';

type Shown = Extract<Phase, { kind: 'results' | 'failed' }>;

/** The header line: GPU, browser, viewport, script and build. */
function HeaderLine({ state }: { state: BenchState }) {
  const { t } = useI18n();
  const h = state.header;
  if (!h) return null;
  const browser = browserName(h.userAgent);
  return <p className="bench__meta">{t('bench.header', { ...h, browser, version: h.script })}</p>;
}

/** Each run's tier, and the warning when the runs ran at different ones. */
function TierNotes({ state }: { state: BenchState }) {
  const { t } = useI18n();
  const { list, mixed } = tierSummary(state.results);
  return (
    <>
      {list && <p className="bench__note">{t('bench.tiers', { list })}</p>}
      {mixed && <p className="bench__note bench__warning">{t('bench.tiersMixed')}</p>}
    </>
  );
}

/** The suite's table: A against B, or the depth suite's runs. */
function RunsTable({ state }: { state: BenchState }) {
  if (state.suite) {
    const { results } = state;
    return (
      <>
        <DepthVersus results={results} />
        <DepthTable results={results} />
      </>
    );
  }
  return <BenchTable state={state} />;
}

/** «Copy report», «Run again», and «Close» or, after an error, «Stop». */
function Actions({ state, failed }: { state: BenchState; failed: boolean }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const copy = () =>
    void copyText(benchReport(state), document).then(setCopied);
  return (
    <>
      <button type="button" className="bench__button bench__primary" onClick={copy}>{t('bench.copy')}</button>
      <button type="button" className="bench__button" onClick={() => startBench(state.runs)}>{t('bench.again')}</button>
      <button type="button" className="bench__button bench__plain" onClick={() => endBench(!failed)}>{t(failed ? 'bench.stop' : 'bench.close')}</button>
      <p className="bench__note bench__status" role="status">{copied ? t('bench.copied') : ''}</p>
    </>
  );
}

export function BenchResults({ kind, state }: Shown) {
  const { t, plural } = useI18n();
  const failed = kind === 'failed';
  return (
    <BenchFrame title={t(failed ? 'bench.failed' : 'bench.done')} actions={<Actions state={state} failed={failed} />} focus>
      <HeaderLine state={state} />
      {failed && <p className="bench__note bench__warning">{t('bench.failedHint', { error: state.error ?? '' })}</p>}
      {state.results.length > 0 && <RunsTable state={state} />}
      <TierNotes state={state} />
      <p className="bench__note">{plural(state.suite ? 'bench.depth.note' : 'bench.note', state.runs)}</p>
    </BenchFrame>
  );
}
