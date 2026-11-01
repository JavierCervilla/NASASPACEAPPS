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
 * The DSN view's other two complexes (VENT-7, canvas «DsnC»): each by its
 * whole name and region, the Moon over it now (or under its horizon) and
 * when it next takes over.
 */
import {
  DSN_COMPLEXES,
  dsnElevations,
  nextTurn,
  type DsnComplex,
} from '@ventana/sim';
import { clockText, degText } from '../../dsn/clock-text';
import { STATIONS } from '../../dsn/stations';
import type { I18n } from '../../i18n/translate';
import { useI18n } from '../i18n-context';
import type { Dsn } from './use-dsn';

/** «Moon below horizon · next at 02:16», or the Moon's elevation. */
function statusOf(i18n: I18n, dsn: Dsn, complex: DsnComplex): string {
  const { atMs } = dsn.model;
  const el = dsnElevations(atMs)[complex];
  const moon = el < 0
    ? i18n.t('dsn.belowHorizon')
    : i18n.t('dsn.moonAt', { deg: degText(i18n, el) });
  const turn = nextTurn(dsn.spans, atMs, complex);
  if (!turn) return moon;
  const time = clockText(i18n, turn.startMs);
  const second = i18n.t('dsn.nextShort', { time });
  return i18n.t('dsn.pair', { first: moon, second });
}

export function DsnStations({ dsn }: { readonly dsn: Dsn }) {
  const i18n = useI18n();
  const others = DSN_COMPLEXES.filter((c) => c !== dsn.model.active);
  return (
    <ul className="dsn-stations">
      {others.map((complex) => (
        <li key={complex}>
          <span>
            <b>{STATIONS[complex].full}</b>{' '}
            {i18n.t(STATIONS[complex].place)}
          </span>
          <span className="dsn-stations__status">
            {statusOf(i18n, dsn, complex)}
          </span>
        </li>
      ))}
    </ul>
  );
}
