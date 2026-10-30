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
 * What the site card shows instead of its figures: grey blocks while the
 * month loads (validated canvas «Polar map»), an honest error with a
 * retry, or that the instant is outside the data the API holds.
 */
import type { CardModel } from '../../card/site-card';

interface Props {
  readonly kind: CardModel['kind'];
  readonly onRetry: () => void;
}

function Loading() {
  return (
    <div className="card-loading" aria-busy="true" aria-label="Loading this site">
      <div className="card-tiles" aria-hidden="true">
        <span className="card-block card-skeleton" />
        <span className="card-block card-skeleton" />
      </div>
      <span className="card-block card-skeleton card-skeleton--list" aria-hidden="true" />
    </div>
  );
}

export function CardStatus({ kind, onRetry }: Props) {
  if (kind === 'loading') return <Loading />;
  if (kind === 'outside') {
    return (
      <p className="card-block card-note" role="status">
        Outside the data window (2026–2027)
      </p>
    );
  }
  if (kind !== 'error') return null;
  return (
    <div className="card-block card-note" role="alert">
      <p>The Sun and Earth data for this site could not load.</p>
      <button type="button" className="card-retry" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}
