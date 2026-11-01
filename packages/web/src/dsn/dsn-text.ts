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
 * The «Listening on Earth» block in words (VENT-7). Without a link it says
 * so first, with the reason, and only then which complex would listen;
 * with one, the complex, the Moon over it, how long it keeps it and who
 * comes next. Pure.
 */
import { EARTH_MIN_ELEVATION_DEG } from '@ventana/sim';
import type { I18n } from '../i18n/translate';
import { clockText, dayText, degText, leftText } from './clock-text';
import type { DsnModel } from './dsn-model';
import { STATIONS } from './stations';

export interface DsnText {
  readonly kind: 'listening' | 'silent' | 'noLink';
  /** «Robledo», «No antenna» or «No link». */
  readonly title: string;
  /** «Madrid»; empty when no complex listens. */
  readonly place: string;
  /** «Moon at 52°» and the phone's «Moon 52°»; empty without one. */
  readonly moon: string;
  readonly moonShort: string;
  /** «~6 h left»; empty when unknown or without a link. */
  readonly left: string;
  /**
   * «Next: Goldstone at 02:16 UTC», with the day when it is not the
   * instant's UTC day («… tomorrow at 02:16 UTC»); empty when unknown.
   */
  readonly next: string;
  /** Without a link: why, and «Robledo would listen». */
  readonly reason: string;
  readonly would: string;
}

const EMPTY = { place: '', moon: '', moonShort: '', left: '', next: '' };

/** «Next: Goldstone at 02:16 UTC», «… tomorrow at …», or empty. */
function nextLine(model: DsnModel, i18n: I18n): string {
  if (!model.next) return '';
  const { complex, startMs } = model.next;
  const name = STATIONS[complex].short;
  const time = clockText(i18n, startMs);
  const day = dayText(i18n, model.atMs, startMs);
  if (!day) return i18n.t('dsn.nextAt', { name, time });
  return i18n.t('dsn.nextOn', { name, day, time });
}

function noLink(model: DsnModel, i18n: I18n): DsnText {
  const reason = model.link === 'low'
    ? i18n.t('dsn.reasonLow', { deg: degText(i18n, EARTH_MIN_ELEVATION_DEG) })
    : i18n.t('dsn.reasonBelow');
  const would = model.active
    ? i18n.t('dsn.wouldListen', { name: STATIONS[model.active].short })
    : i18n.t('dsn.noneWould');
  const title = i18n.t('dsn.noLink');
  return { kind: 'noLink', title, ...EMPTY, reason, would };
}

function listening(model: DsnModel, i18n: I18n): DsnText {
  const station = model.active ? STATIONS[model.active] : null;
  const next = nextLine(model, i18n);
  const plain = { reason: '', would: '' };
  if (!station) {
    const title = i18n.t('dsn.none');
    return { kind: 'silent', title, ...EMPTY, next, ...plain };
  }
  const deg = degText(i18n, model.moonElDeg ?? 0);
  const left = model.untilMs === null
    ? '' : leftText(i18n, model.untilMs - model.atMs);
  return {
    kind: 'listening',
    title: station.short,
    place: i18n.t(station.place),
    moon: i18n.t('dsn.moonAt', { deg }),
    moonShort: i18n.t('dsn.moonShort', { deg }),
    left,
    next,
    ...plain,
  };
}

/** The block's words for `model`, in the language of `i18n`. */
export function dsnText(model: DsnModel, i18n: I18n): DsnText {
  const cut = model.link === 'low' || model.link === 'below';
  return cut ? noLink(model, i18n) : listening(model, i18n);
}
