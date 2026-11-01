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
 * The desktop site card's «Listening on Earth» block (VENT-7, canvas
 * «DsnA»): the small Earth as the Moon sees it beside the complex that
 * listens, the Moon over it and how long it keeps it, and who comes next.
 * Without a link it says «No link» first, why, and who would listen.
 */
import { formatInstant } from '../../calendar/instant-format';
import { useI18n } from '../i18n-context';
import { EarthFigure } from './EarthFigure';
import type { Dsn } from './use-dsn';
import { useEarthPicture } from './use-earth-picture';

/** The lines beside the Earth: the place and the Moon, or the reason. */
function Lines({ dsn }: { readonly dsn: Dsn }) {
  const { text } = dsn;
  const { t } = useI18n();
  if (text.kind === 'noLink') {
    return (
      <>
        <span className="dsn-block__line">{text.reason}</span>
        <span className="dsn-block__line dsn-block__line--muted">{text.would}</span>
      </>
    );
  }
  if (text.kind === 'silent') return null;
  return (
    <>
      <span className="dsn-block__line">{t('dsn.pair', { first: text.place, second: text.moon })}</span>
      {text.left ? <span className="dsn-block__line">{text.left}</span> : null}
    </>
  );
}

export function ListeningBlock({ dsn }: { readonly dsn: Dsn }) {
  const i18n = useI18n();
  const { model, text, state } = dsn;
  const picture = useEarthPicture(model.atMs, state, false);
  const label = i18n.t('dsn.earthLabel', { when: formatInstant(i18n, model.atMs) });
  const showNext = text.next && text.kind !== 'noLink';
  return (
    <section className="card-block dsn-block" data-kind={text.kind} aria-label={i18n.t('widgets.listening')}>
      <p className="dsn-block__head">
        <span>{i18n.t('widgets.listening')}</span>
        <span className="dsn-block__tag">{i18n.t('view.dsn')}</span>
      </p>
      <div className="dsn-block__body">
        <EarthFigure picture={picture} wide={false} label={label} />
        <p className="dsn-block__text">
          <span className="dsn-block__title">{text.title}</span>
          <Lines dsn={dsn} />
        </p>
      </div>
      {showNext ? <p className="dsn-block__next">{text.next}</p> : null}
    </section>
  );
}
