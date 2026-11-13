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
 * «Fine detail illustrative · relief LOLA 20 m», then the rocks' source
 * when they are scans, the Earth's map and what was done for legibility, by
 * day or at night.
 */
import type { FineSite } from '../../terrain/fine/fine-catalog';
import { fineCaption } from '../../terrain/fine/fine-caption';
import { captionNote, detailCaption } from '../../terrain/view-text';
import { useI18n } from '../i18n-context';

interface Props {
  readonly resolutionM: number;
  /** The fine real relief under the point, when it has one (VENT-62). */
  readonly fine: FineSite | null;
  /** The Sun is under the point's horizon: the light is added (VENT-100). */
  readonly night: boolean;
  /** The scanned rocks are drawn: their source is credited (VENT-124). */
  readonly rocks: boolean;
}

export function OnFootCaption({ resolutionM, fine, night, rocks }: Props) {
  const i18n = useI18n();
  return (
    <p className="on-foot__caption">
      <span className="on-foot__caption-main">{fine ? fineCaption(i18n, fine, resolutionM) : detailCaption(i18n, resolutionM)}</span>
      <span className="on-foot__caption-note">{captionNote(i18n, night, rocks)}</span>
    </p>
  );
}
