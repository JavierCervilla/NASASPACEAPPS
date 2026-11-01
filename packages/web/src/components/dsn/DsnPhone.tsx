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
 * The phone's DSN view (VENT-7, canvas «DsnC»), chosen from its tab: the
 * Earth as the Moon sees it fills the screen above the sheet (the globe
 * hides under it), and the sheet holds who listens and the 24 h band.
 */
import { useI18n } from '../i18n-context';
import { DsnBand } from './DsnBand';
import { DsnHeadline } from './DsnHeadline';
import { DsnEarth } from './DsnView';
import type { Dsn } from './use-dsn';

/** The Earth over the screen, between the top bar and the sheet. */
export function DsnStage({ dsn }: { readonly dsn: Dsn | null }) {
  const { t } = useI18n();
  return (
    <section className="dsn-stage" aria-label={t('dsn.view')}>
      {dsn ? <DsnEarth dsn={dsn} /> : null}
    </section>
  );
}

/** What the sheet holds at peek and half in the DSN view. */
export function DsnSheet({ dsn }: { readonly dsn: Dsn | null }) {
  if (!dsn) return null;
  return (
    <div className="dsn-sheet">
      <DsnHeadline dsn={dsn} />
      <DsnBand dsn={dsn} />
    </div>
  );
}
