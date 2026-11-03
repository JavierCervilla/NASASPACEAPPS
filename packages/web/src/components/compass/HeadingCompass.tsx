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

import { useLayoutEffect, useRef, type RefObject } from 'react';
import type { BodyAt } from '../../horizon/strip-marks';
import type { WatchedValue } from '../../lib/watched-value';
import { headingCompassName, headingMark, type HeadingMark }
  from '../../terrain/heading-compass';
import { useI18n } from '../i18n-context';
import { useCompassTop } from './use-compass-top';

interface Props {
  /** The view's heading, degrees clockwise from north. */
  readonly yawDeg: number;
  /** The Earth as the view sees it; undefined before the sky is known. */
  readonly earth: BodyAt | undefined;
  /** Turns the view back to where it opened. */
  readonly onHome: () => void;
  /** The phone sheet's top edge, px from the viewport's top; null: none. */
  readonly sheetEdge: WatchedValue<number | null>;
}

/** Writes the rose's and the Earth's turns to the button (CSSOM, CSP). */
function usePaint(button: RefObject<HTMLElement | null>, mark: HeadingMark) {
  const rose = mark.roseDeg;
  const earth = mark.earth?.angleDeg ?? 0;
  useLayoutEffect(() => {
    const el = button.current;
    if (!el) return;
    el.style.setProperty('--rose-angle', `${rose}deg`);
    el.style.setProperty('--earth-angle', `${earth}deg`);
  }, [button, rose, earth]);
}

export function HeadingCompass({ yawDeg, earth, onHome, sheetEdge }: Props) {
  const i18n = useI18n();
  const button = useRef<HTMLButtonElement>(null);
  const mark = headingMark(yawDeg, earth);
  usePaint(button, mark);
  useCompassTop(button, true, sheetEdge);
  const shown = mark.earth?.hidden ? 'hidden' : 'shown';
  return (
    <button ref={button} type="button" className="compass compass--heading"
      aria-label={headingCompassName(i18n, yawDeg, earth)}
      data-earth={mark.earth ? shown : undefined} onClick={onHome}>
      <span className="compass__rose" aria-hidden="true">
        <span className="compass__needle" />
        <span className="compass__n">{i18n.t('compass.n')}</span>
      </span>
      {mark.earth
        ? <span className="compass__earth" aria-hidden="true" />
        : null}
    </button>
  );
}
