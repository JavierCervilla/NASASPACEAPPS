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
 * The on-foot view's caption (VENT-34): what is measured and what is not.
 * «Fine detail illustrative · relief LOLA 20 m», then what stands in for
 * what we do not have yet: the lander's model and the Earth's map.
 */
import { detailCaption } from '../../terrain/view-text';
import { useI18n } from '../i18n-context';

interface Props {
  readonly resolutionM: number;
}

export function OnFootCaption({ resolutionM }: Props) {
  const i18n = useI18n();
  return (
    <p className="on-foot__caption">
      <span className="on-foot__caption-main">{detailCaption(i18n, resolutionM)}</span>
      <span className="on-foot__caption-note">{i18n.t('onFoot.placeholders')}</span>
    </p>
  );
}
