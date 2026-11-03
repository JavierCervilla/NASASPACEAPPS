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
 * The loader's words (VENT-60): the phase's line, a thin determinate bar
 * and its note, under the plan; a polite status while it loads, quiet as
 * it fades in the hand-over.
 */
import type { CSSProperties } from 'react';
import type { LoaderWords } from '../../../terrain/loader/loader-words';

interface Props {
  readonly words: LoaderWords;
  /** Fading out in the hand-over: no longer a live region. */
  readonly leaving: boolean;
}

export function LoaderStatus({ words, leaving }: Props) {
  const fill: CSSProperties = { transform: `scaleX(${words.bar})` };
  return (
    <div className="on-foot-loader__status" role={leaving ? undefined : 'status'}>
      <p className="on-foot-loader__title">{words.title}</p>
      <div className="on-foot-loader__bar" aria-hidden="true"><i style={fill} /></div>
      <p className="on-foot-loader__note">{words.note}</p>
    </div>
  );
}
