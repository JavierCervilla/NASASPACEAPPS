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
 * The depth suite's results table (VENT-104): a row per run, whether the
 * 3D view kept its context or when it lost it, the depth buffer it drew
 * with, its bits, three's reversed buffer and the shadow map, and the
 * turn's frames, in the box of BenchTable.tsx that scrolls sideways; and
 * above it the comparison the suite is run for (VENT-107), logarithmic
 * against reversed depth without a forced shadow map.
 */
import type { DepthRow } from '../../bench/depth-results';
import { depthRows } from '../../bench/depth-results';
import { logVersusReversed } from '../../bench/depth-versus';
import { cellText } from '../../bench/display';
import type { RunResult } from '../../bench/types';
import type { TextKey } from '../../i18n/catalogue';
import { useI18n } from '../i18n-context';

const COLUMNS: readonly TextKey[] = [
  'bench.depth.col.run', 'bench.depth.col.result', 'bench.depth.col.depth',
  'bench.depth.col.bits', 'bench.depth.col.reversed',
  'bench.depth.col.shadows', 'bench.metric.fps', 'bench.metric.p95',
  'bench.metric.worst',
];

/** «yes», «no», or «n/a». */
const flag = (value: boolean | null, yes: TextKey, no: TextKey): TextKey =>
  value === null ? 'bench.na' : (value ? yes : no);

/** One run's row. */
function Row({ row }: { row: DepthRow }) {
  const i18n = useI18n();
  const { t, number } = i18n;
  const d = row.depth;
  const lost = row.lostAt;
  const result = lost ? t(lost.step === 'openView' ? 'bench.depth.lostOpen' : 'bench.depth.lostTurn', { n: number(lost.seconds, 1) })
    : t('bench.depth.survived');
  return (
    <tr data-lost={lost !== null}>
      <td>{row.name}</td>
      <td>{result}</td>
      <td>{d?.drawn ?? t('bench.na')}</td>
      <td>{d?.bits == null ? t('bench.na') : number(d.bits)}</td>
      <td>{t(flag(d?.reversed ?? null, 'bench.yes', 'bench.no'))}</td>
      <td>{t(flag(d?.shadowMap ?? null, 'bench.depth.on', 'bench.depth.off'))}</td>
      <td>{cellText('fps', row.fps, i18n)}</td>
      <td>{cellText('p95', row.p95, i18n)}</td>
      <td>{cellText('worst', row.worst, i18n)}</td>
    </tr>
  );
}

/** «Logarithmic vs reversed, no shadow map: 50.0 fps vs 40.0 fps · …». */
export function DepthVersus({ results }: { results: readonly RunResult[] }) {
  const i18n = useI18n();
  const { log, reversed } = logVersusReversed(results);
  const pair = (id: 'fps' | 'p95' | 'worst') => i18n.t('bench.depth.pair', {
    a: cellText(id, log[id], i18n), b: cellText(id, reversed[id], i18n),
  });
  return (
    <p className="bench__note bench__versus">
      {i18n.t('bench.depth.versus', { fps: pair('fps'), p95: pair('p95'), worst: pair('worst') })}
    </p>
  );
}

export function DepthTable({ results }: { results: readonly RunResult[] }) {
  const { t } = useI18n();
  return (
    <div className="bench__table-box" role="region" aria-label={t('bench.depth.table')} tabIndex={0}>
      <table className="bench__table">
        <thead>
          <tr>{COLUMNS.map((key) => <th key={key} scope="col">{t(key)}</th>)}</tr>
        </thead>
        <tbody>
          {depthRows(results).map((row) => <Row key={row.name} row={row} />)}
        </tbody>
      </table>
    </div>
  );
}
