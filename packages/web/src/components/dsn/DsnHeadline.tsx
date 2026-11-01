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
 * The DSN view's headline (VENT-7, canvas «DsnC»): «Listening on Earth» at
 * the instant, the complex by its whole name (Robledo de Chavela), where it
 * is, the Moon over it and how long it keeps it, and who comes next; or «No
 * link» first, why, and who would listen.
 */
import { formatInstant } from '../../calendar/instant-format';
import { STATIONS } from '../../dsn/stations';
import { useI18n } from '../i18n-context';
import type { Dsn } from './use-dsn';

/** The line under the name. */
function subline({ text }: Dsn, join: (parts: string[]) => string): string {
  if (text.kind === 'noLink') return text.reason;
  if (text.kind === 'silent') return '';
  return join([text.place, text.moon, text.left].filter(Boolean));
}

export function DsnHeadline({ dsn }: { readonly dsn: Dsn }) {
  const i18n = useI18n();
  const { model, text } = dsn;
  const join = (parts: string[]): string =>
    parts.reduce((first, second) => i18n.t('dsn.pair', { first, second }));
  const when = formatInstant(i18n, model.atMs);
  const kicker = i18n.t('dsn.headingAt', { label: i18n.t('widgets.listening'), when });
  const listening = text.kind === 'listening' && model.active;
  const title = listening ? STATIONS[model.active].full : text.title;
  const line = subline(dsn, join);
  const last = text.kind === 'noLink' ? text.would : text.next;
  return (
    <div className="dsn-headline" data-kind={text.kind}>
      <p className="dsn-headline__kicker">{kicker}</p>
      <h2 className="dsn-headline__title">{title}</h2>
      {line ? <p className="dsn-headline__line">{line}</p> : null}
      {last ? <p className="dsn-headline__next">{last}</p> : null}
    </div>
  );
}
