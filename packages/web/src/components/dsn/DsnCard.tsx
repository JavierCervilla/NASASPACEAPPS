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
 * The phone sheet's fourth widget (VENT-7, canvas «DsnA»), in place of the
 * old antenna widget: «Listening on Earth», the complex, the Moon over it
 * and how long it keeps it, with the small Earth in the corner. Without a
 * link: «No link», why, and who would listen.
 */
import { formatInstant } from '../../calendar/instant-format';
import { useI18n } from '../i18n-context';
import { EarthFigure } from './EarthFigure';
import type { Dsn } from './use-dsn';
import { useEarthPicture } from './use-earth-picture';

/** The detail lines under the name. */
function details({ text }: Dsn, pair: (a: string, b: string) => string) {
  if (text.kind === 'noLink') return [text.reason, text.would];
  if (text.kind === 'silent') return [text.next];
  return [text.left ? pair(text.moonShort, text.left) : text.moonShort];
}

export function DsnCard({ dsn }: { readonly dsn: Dsn }) {
  const i18n = useI18n();
  const { model, state, text } = dsn;
  const picture = useEarthPicture(model.atMs, state, false);
  const label = i18n.t('dsn.earthLabel', { when: formatInstant(i18n, model.atMs) });
  const pair = (first: string, second: string): string =>
    i18n.t('dsn.pair', { first, second });
  const lines = details(dsn, pair).filter(Boolean);
  return (
    <li className="widget widget--dsn" data-kind={text.kind}>
      <span className="widget__label" data-tone="muted">{i18n.t('widgets.listening')}</span>
      <EarthFigure picture={picture} wide={false} label={label} />
      <span className="widget__value">{text.title}</span>
      {lines.map((line, i) => (
        <span key={line} className="widget__detail" data-second={i > 0}>{line}</span>
      ))}
    </li>
  );
}
