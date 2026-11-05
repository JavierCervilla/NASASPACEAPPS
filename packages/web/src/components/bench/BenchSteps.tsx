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
 * The script's steps in the running panel (VENT-81): a filled mark and the
 * time it took for each step done, a ring and «…» for the step under way
 * (also its `aria-current`), a faint ring for those to come.
 */
import type { StepId } from '../../bench/script';
import { useI18n } from '../i18n-context';

interface Props {
  readonly ids: readonly StepId[];
  readonly step: number;
  readonly times: readonly number[];
}

const markOf = (i: number, step: number) =>
  i < step ? 'done' : i === step ? 'now' : 'next';

export function BenchSteps({ ids, step, times }: Props) {
  const { t, number } = useI18n();
  const timeOf = (i: number): string => {
    const ms = times[i];
    if (ms !== undefined) return t('bench.unit.s', { n: number(ms / 1000, 1) });
    return i === step ? '…' : '';
  };
  return (
    <ol className="bench__steps">
      {ids.map((id, i) => (
        <li key={id} className="bench__step" data-mark={markOf(i, step)} aria-current={i === step ? 'step' : undefined}>
          <span className="bench__mark" aria-hidden="true" />
          <span className="bench__step-name">{t(`bench.step.${id}`)}</span>
          <span className="bench__time">{timeOf(i)}</span>
        </li>
      ))}
    </ol>
  );
}
