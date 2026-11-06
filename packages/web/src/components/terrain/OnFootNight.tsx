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
 * «Lunar night here» over «The Sun rises in 8 d 16 h» (VENT-100): a row in
 * the notices' look (update.css's `notice-row__*` parts) with the
 * horizon's mark, in the view's dark material, over the caption; on a
 * phone it keeps to the free band with it (on-foot.css). A polite status,
 * so the wait is said when the night starts, not on every hour. Where the
 * band leaves it no room whole (the sheet risen over a 200 % text) it is
 * hidden rather than cut, until the band grows again.
 */
import { useRef } from 'react';
import type { NightNotice } from '../../terrain/night-notice';
import { Icon } from '../phone/Icon';
import { useCut } from './use-cut';

export function OnFootNight({ notice }: { readonly notice: NightNotice }) {
  const ref = useRef<HTMLDivElement>(null);
  const cut = useCut(ref);
  return (
    <div ref={ref} className="on-foot__night" data-cut={cut || undefined}>
      <Icon name="horizon" className="notice-row__mark" />
      <p className="notice-row__lines" role="status">
        <span className="notice-row__title">{notice.title}</span>
        <span className="notice-row__how">{notice.rise}</span>
      </p>
    </div>
  );
}
