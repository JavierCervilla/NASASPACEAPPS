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
 * How the results panel writes its numbers (VENT-81): each metric in its
 * unit through the page's Intl (i18n), B's change as a signed percentage
 * or difference with a true minus sign, and the browser's short name from
 * its user agent. Pure.
 */
import type { TextKey } from '../i18n/catalogue';
import type { I18n } from '../i18n/translate';
import type { Change, MetricId } from './results';

/** Each metric's unit message and decimals. */
const UNITS: Readonly<Record<Exclude<MetricId, 'lost'>,
  readonly [TextKey | null, number]>> = {
  fps: ['bench.unit.fps', 1],
  p95: ['bench.unit.ms', 0],
  worst: ['bench.unit.ms', 0],
  longTasks: ['bench.unit.s', 1],
  contexts: [null, 0],
  globeMap: ['bench.unit.mb', 1],
  heap: ['bench.unit.mb', 0],
};

const MINUS = '−';

/** `value` of metric `id` as the table shows it. */
export function cellText(
  id: MetricId,
  value: number | null,
  i18n: I18n,
): string {
  if (value === null) return i18n.t('bench.na');
  if (id === 'lost') return i18n.t(value > 0 ? 'bench.yes' : 'bench.no');
  const [unit, digits] = UNITS[id];
  // A median of two runs' contexts may fall between two counts.
  const half = id === 'contexts' && !Number.isInteger(value);
  const n = i18n.number(value, half ? 1 : digits);
  return unit ? i18n.t(unit, { n }) : n;
}

/** B's change as the table shows it; empty for none. */
export function changeText(change: Change, i18n: I18n): string {
  if (change === null) return '';
  const size = i18n.number(Math.abs(change.value));
  const rounded = Math.round(change.value);
  const sign = rounded > 0 ? '+' : rounded < 0 ? MINUS : '';
  const n = `${sign}${size}`;
  return change.kind === 'percent' ? i18n.t('bench.unit.percent', { n }) : n;
}

/** «Chrome 142», «Firefox 133», «Safari 18»; else the agent's first word. */
export function browserName(userAgent: string): string {
  const known = [/(Firefox)\/(\d+)/, /(Chrome)\/(\d+)/, /Version\/(\d+).*(Safari)/];
  for (const pattern of known) {
    const m = pattern.exec(userAgent);
    if (m?.[1] && m[2]) {
      return /^\d+$/.test(m[1]) ? `${m[2]} ${m[1]}` : `${m[1]} ${m[2]}`;
    }
  }
  return userAgent.split(' ')[0] ?? userAgent;
}
