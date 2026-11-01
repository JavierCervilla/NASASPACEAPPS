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
 * The desktop «DSN» view (VENT-7, canvas «DsnC»), in the view's place when
 * its header tab is chosen: the Earth as the Moon sees it with the three
 * antennas, the point with the Moon overhead and the ring where it stands
 * above 10°; beside it who listens and the other two complexes; under both
 * the 24 h band of the instant's UTC day.
 */
import { formatInstant } from '../../calendar/instant-format';
import { useI18n } from '../i18n-context';
import { DsnBand } from './DsnBand';
import { DsnHeadline } from './DsnHeadline';
import { DsnStations } from './DsnStations';
import { EarthFigure } from './EarthFigure';
import type { Dsn } from './use-dsn';
import { useEarthPicture } from './use-earth-picture';

/** The big Earth, for the desktop view and the phone's stage. */
export function DsnEarth({ dsn }: { readonly dsn: Dsn }) {
  const i18n = useI18n();
  const { model, state } = dsn;
  const picture = useEarthPicture(model.atMs, state, true);
  const label = i18n.t('dsn.earthLabel', { when: formatInstant(i18n, model.atMs) });
  return <EarthFigure picture={picture} wide label={label} />;
}

export function DsnView({ dsn }: { readonly dsn: Dsn | null }) {
  const { t } = useI18n();
  return (
    <section className="dsn-view" aria-label={t('dsn.view')}>
      {dsn ? (
        <div className="dsn-view__layout">
          <DsnEarth dsn={dsn} />
          <div className="dsn-view__side">
            <DsnHeadline dsn={dsn} />
            <DsnStations dsn={dsn} />
          </div>
          <DsnBand dsn={dsn} />
        </div>
      ) : null}
    </section>
  );
}
