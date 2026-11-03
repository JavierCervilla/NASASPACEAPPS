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
 * The real Sun or Earth on the loader (VENT-60): a dot in its signal
 * colour (it is the body itself, never decoration) with its elevation
 * beside it, «Sun 6.7°»; the Sun with a soft halo, and a caret when the
 * body is pinned inside a side it lies past. HTML, so the label follows
 * the text size.
 */
import type { CSSProperties } from 'react';
import { useI18n } from '../../i18n-context';

interface Props {
  readonly body: 'sun' | 'earth';
  readonly elDeg: number;
  readonly x: number;
  readonly y: number;
  /** The label's side of the dot. */
  readonly side: 'left' | 'right';
  /** Pinned inside the left (-1) or right (1) side; 0: where it is. */
  readonly pinned?: -1 | 0 | 1;
}

export function LoaderBody({ body, elDeg, x, y, side, pinned = 0 }: Props) {
  const i18n = useI18n();
  const style: CSSProperties = { transform: `translate(${x}px, ${y}px)` };
  const name = i18n.t(body === 'sun' ? 'horizon.sun' : 'horizon.earth');
  const label = i18n.t('onFoot.loader.body',
    { body: name, deg: i18n.number(elDeg, 1) });
  return (
    <span className={`loader-body loader-body--${body}`} data-side={side} data-pinned={pinned} style={style}>
      <i className="loader-body__dot" />
      <b className="loader-body__label">{label}</b>
    </span>
  );
}
