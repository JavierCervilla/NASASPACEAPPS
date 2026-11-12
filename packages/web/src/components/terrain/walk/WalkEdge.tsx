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
 * The edge card (VENT-121): the eye reached the end of the relief loaded at
 * 15.6 m around the point. «Drop a pin here» makes the eye's place the
 * custom point through the pin's own flow (pin/places.ts: the `@lat,lon`
 * id and `?lat&lon`), so the widgets, the address and the view move there
 * and the view opens again around it; «Back to IM-2» glides back.
 */
import { useI18n } from '../../i18n-context';
import { Icon } from '../../phone/Icon';

interface Props {
  readonly text: string;
  readonly site: string;
  /** Null when the page has no pin (no kit). */
  readonly onPin: (() => void) | null;
  readonly onBack: () => void;
}

export function WalkEdge({ text, site, onPin, onBack }: Props) {
  const { t } = useI18n();
  return (
    <section className="walk-edge" aria-labelledby="walk-edge-title">
      <h2 id="walk-edge-title" className="walk-edge__title">{t('walk.edge.title')}</h2>
      <p className="walk-edge__text">{text}</p>
      <div className="walk-edge__actions">
        {onPin ? (
          <button type="button" className="card-retry walk-edge__pin" onClick={onPin}>
            <Icon name="pin" />
            {t('walk.edge.pin')}
          </button>
        ) : null}
        <button type="button" className="card-retry" onClick={onBack}>
          {t('walk.back', { site })}
        </button>
      </div>
    </section>
  );
}
