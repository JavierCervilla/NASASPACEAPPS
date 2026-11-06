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
 * The benchmark's first state (VENT-81): what it does, «Runs: 1 | 3» in
 * the app's segmented control (3 by default, or the address's
 * `benchRuns`), «Start», which reloads at the first run, and «Close». The
 * depth suite (VENT-104) says what it does instead.
 */
import { useState } from 'react';
import { endBench, startBench } from '../../bench/navigate';
import { benchOptions } from '../../bench/params';
import type { RunCount } from '../../bench/types';
import { useI18n } from '../i18n-context';
import { BenchFrame } from './BenchFrame';

const COUNTS: readonly RunCount[] = [1, 3];

interface Choice {
  readonly runs: RunCount;
  readonly onRuns: (runs: RunCount) => void;
}

/** «Runs: 1 | 3», the chosen count pressed. */
function RunsChoice({ runs, onRuns }: Choice) {
  const { t, number } = useI18n();
  return (
    <div className="bench__options">
      <span className="bench__label" id="bench-runs">{t('bench.runs')}</span>
      <div className="segmented" role="group" aria-labelledby="bench-runs">
        {COUNTS.map((count) => (
          <button key={count} type="button" aria-pressed={count === runs} onClick={() => onRuns(count)}>
            {number(count)}
          </button>
        ))}
      </div>
    </div>
  );
}

export function BenchReady({ runs: preset }: { runs: RunCount }) {
  const { t } = useI18n();
  const [runs, setRuns] = useState(preset);
  const actions = (
    <>
      <button type="button" className="bench__button bench__primary" onClick={() => startBench(runs)}>{t('bench.start')}</button>
      <button type="button" className="bench__button bench__plain" onClick={() => endBench(true)}>{t('bench.close')}</button>
    </>
  );
  return (
    <BenchFrame title={t('bench.title')} actions={actions} focus>
      <p className="bench__note">{t(benchOptions(location.search).suite ? 'bench.depthHint' : 'bench.readyHint')}</p>
      <p className="bench__note">{t('bench.hint')}</p>
      <RunsChoice runs={runs} onRuns={setRuns} />
    </BenchFrame>
  );
}
