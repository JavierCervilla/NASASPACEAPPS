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
 * «Fine detail illustrative · relief LOLA 20 m», then the lander's model
 * (the Apollo LM is NASA's, the generic one is ours; none when
 * `?onfoot=lander` leaves it out) and the Earth's map.
 */
import type { LanderKind } from '../../terrain/lander-kind';
import { captionNote, detailCaption } from '../../terrain/view-text';
import { useI18n } from '../i18n-context';

interface Props {
  readonly resolutionM: number;
  /** The lander drawn; null: left out. */
  readonly lander: LanderKind | null;
}

export function OnFootCaption({ resolutionM, lander }: Props) {
  const i18n = useI18n();
  return (
    <p className="on-foot__caption">
      <span className="on-foot__caption-main">{detailCaption(i18n, resolutionM)}</span>
      <span className="on-foot__caption-note">{captionNote(i18n, lander)}</span>
    </p>
  );
}
