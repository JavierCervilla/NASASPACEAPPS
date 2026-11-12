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
 * Chip 3A (VENT-121, the human's choice on the canvas): where the eye stands
 * from the point, «180 m NE of IM-2», over the state there, a dot and the
 * word in its signal colour as the phone pill writes them («Window here»),
 * and beside it a 44 px round «Back to IM-2» that glides back to the point.
 * Glass in the floating surfaces' recipe; under the phone's top bar on the
 * left, clear of the compass; on desktop at the view's top left.
 */
import type { WalkView } from '../../../terrain/walk/walk-view';
import { useI18n } from '../../i18n-context';
import { Icon } from '../../phone/Icon';

interface Props {
  readonly view: WalkView;
  readonly site: string;
  readonly onBack: () => void;
}

export function WalkChip({ view, site, onBack }: Props) {
  const { t } = useI18n();
  return (
    <div className="walk-chip" data-state={view.state}>
      <p className="walk-chip__lines">
        <span className="walk-chip__where">{view.where}</span>
        <span className="walk-chip__here" data-tone={view.state}>
          <span className="signal-dot" data-state={view.state} />
          {view.here}
        </span>
      </p>
      <button type="button" className="walk-chip__back" aria-label={t('walk.back', { site })} onClick={onBack}>
        <Icon name="back" />
      </button>
    </div>
  );
}
