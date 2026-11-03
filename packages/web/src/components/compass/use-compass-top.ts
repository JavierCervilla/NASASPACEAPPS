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
 * Keeps the compass clear of the phone's bars (VENT-50): one gap under the
 * glass top bar and, while the first-time pin hint shows, under that, as
 * the hint is measured under the bar (components/pin/PinHint.tsx). The
 * sizes are watched, so large text or a rotated phone move it too. On a
 * desktop the stylesheet places it in the corner and this does nothing.
 */
import { useLayoutEffect, type RefObject } from 'react';
import { usePhone } from '../phone/hooks';
import { usePin, useWatched } from '../pin/context';
import { compassTop } from './compass-top';

const PROPERTY = '--compass-top';

/** Sets the button's top under `bar` and, if it shows, the `hint`. */
function placeUnder(el: HTMLElement, bar: Element, hint: Element | null) {
  const height = hint ? hint.getBoundingClientRect().height : null;
  const top = compassTop(bar.getBoundingClientRect().bottom, height);
  el.style.setProperty(PROPERTY, `${top}px`);
}

export function useCompassTop(
  button: RefObject<HTMLElement | null>,
  mounted: boolean,
): void {
  const phone = usePhone();
  const hintShown = useWatched(usePin()?.hint.shown ?? null, false);
  useLayoutEffect(() => {
    const el = button.current;
    const bar = document.querySelector('.phone-bar');
    if (!mounted || !el || !phone || !bar) return undefined;
    const hint = hintShown ? document.querySelector('.pin-hint') : null;
    const place = (): void => placeUnder(el, bar, hint);
    const observer = new ResizeObserver(place);
    observer.observe(bar);
    if (hint) observer.observe(hint);
    place();
    return () => {
      observer.disconnect();
      el.style.removeProperty(PROPERTY);
    };
  }, [button, mounted, phone, hintShown]);
}
