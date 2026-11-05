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
 * The running panel, a strip under the top bar (VENT-85, the canvas
 * «VENT-85 · Banco compacto», option A): the variant, the run and the
 * step over the step's name, «Stop», and the progress over every run, so
 * the view being measured stays in sight. It changes only when a step
 * does, so it costs no frames while the app is measured, and it leaves the
 * focus where it is.
 */
import { benchScript } from '../../bench/script';
import type { Phase } from '../../bench/phase';
import { endBench } from '../../bench/navigate';
import { useI18n } from '../i18n-context';

type Running = Extract<Phase, { kind: 'running' }>;

export function BenchRunning({ state, step }: Running) {
  const { t } = useI18n();
  const ids = benchScript(state.fast).map((s) => s.id);
  const total = state.order.length * ids.length;
  const variant = state.order[state.next] === 'B' ? 'bench.runB' : 'bench.runA';
  const run = Math.floor(state.next / 2) + 1;
  const now = ids[Math.min(step, ids.length - 1)] ?? ids[0];
  return (
    <>
      <div className="bench__strip">
        <div className="bench__strip-text">
          <p className="bench__strip-run">
            <span>{t(variant)}</span>
            {' · '}{t('bench.runLabel', { n: run, total: state.runs })}
            {' · '}{t('bench.stepOf', { n: Math.min(step + 1, ids.length), total: ids.length })}
          </p>
          <p className="bench__strip-step">{now && t(`bench.step.${now}`)}</p>
        </div>
        <button type="button" className="bench__button" onClick={() => endBench(false)}>{t('bench.stop')}</button>
      </div>
      <progress className="bench__progress" max={total} value={state.next * ids.length + step} aria-label={t('bench.progress')} />
    </>
  );
}
