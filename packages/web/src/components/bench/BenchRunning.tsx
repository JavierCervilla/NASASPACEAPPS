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
 * The running panel (VENT-81, the canvas «1 · Running»): which variant
 * this run is, the script's six steps with their marks and times, the
 * progress over every run, the hint not to touch, and «Stop». It changes
 * only when a step does, so it costs no frames while the app is measured,
 * and it leaves the focus where it is.
 */
import { SCRIPT_VERSION, benchScript } from '../../bench/script';
import type { Phase } from '../../bench/phase';
import { endBench } from '../../bench/navigate';
import { useI18n } from '../i18n-context';
import { BenchFrame } from './BenchFrame';
import { BenchSteps } from './BenchSteps';

type Running = Extract<Phase, { kind: 'running' }>;

/** The two variants, the current one marked. */
function RunIndicator({ state }: Pick<Running, 'state'>) {
  const { t } = useI18n();
  const variant = state.order[state.next];
  const run = Math.floor(state.next / 2) + 1;
  const mark = (v: string) => (variant === v ? 'step' : undefined);
  return (
    <ol className="bench__runs" aria-label={t('bench.runLabel', { n: run, total: state.runs })}>
      <li className="bench__run" aria-current={mark('A')}>{t('bench.runA')}</li>
      <li className="bench__run" aria-current={mark('B')}>{t('bench.runB')}</li>
    </ol>
  );
}

export function BenchRunning({ state, step, times }: Running) {
  const { t } = useI18n();
  const ids = benchScript(state.fast).map((s) => s.id);
  const total = state.order.length * ids.length;
  const tier = state.header?.tier ?? '…';
  const meta = <p className="bench__meta bench__meta--small">{t('bench.meta', { version: SCRIPT_VERSION, tier })}</p>;
  const stop = <button type="button" className="bench__button" onClick={() => endBench(false)}>{t('bench.stop')}</button>;
  return (
    <BenchFrame title={t('bench.title')} meta={meta} actions={stop} focus={false}>
      <RunIndicator state={state} />
      <BenchSteps ids={ids} step={step} times={times} />
      <progress className="bench__progress" max={total} value={state.next * ids.length + step} aria-label={t('bench.progress')} />
      <p className="bench__note">{t('bench.hint')}</p>
    </BenchFrame>
  );
}
