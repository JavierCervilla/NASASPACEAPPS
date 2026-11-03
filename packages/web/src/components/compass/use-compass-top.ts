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
 * sizes are watched, so large text or a rotated phone move it too. While
 * the sheet's top edge covers any of it, it is marked `data-covered` and
 * steps out of view and of the tab order (VENT-51): the sheet then covers
 * the globe it turns. On a desktop the stylesheet places it in the corner
 * and this does nothing.
 */
import { useLayoutEffect, type RefObject } from 'react';
import type { WatchedValue } from '../../lib/watched-value';
import { usePhone } from '../phone/hooks';
import { usePin, useWatched } from '../pin/context';
import { compassCovered, compassTop } from './compass-top';

const PROPERTY = '--compass-top';

/** Sets the button's top under `bar` and, if it shows, the `hint`. */
function placeUnder(el: HTMLElement, bar: Element, hint: Element | null) {
  const height = hint ? hint.getBoundingClientRect().height : null;
  const top = compassTop(bar.getBoundingClientRect().bottom, height);
  el.style.setProperty(PROPERTY, `${top}px`);
  return top;
}

/** Whether the compass shows; written only when it changes. */
function markCovered(el: HTMLElement, covered: boolean): void {
  const value = String(covered);
  if (el.dataset['covered'] !== value) el.dataset['covered'] = value;
}

/**
 * Places `el` under `bar` and `hint` as their sizes change, and marks it
 * covered as the sheet's `edge` moves; returns how to stop. The edge moves
 * every frame of a drag, so its listener reads no layout.
 */
function follow(
  el: HTMLElement,
  [bar, hint]: readonly [Element, Element | null],
  edge: WatchedValue<number | null>,
): () => void {
  let spot = { top: 0, height: 0 };
  const cover = (): void =>
    markCovered(el, compassCovered(spot.top, spot.height, edge.get()));
  const place = (): void => {
    spot = { top: placeUnder(el, bar, hint), height: el.offsetHeight };
    cover();
  };
  const observer = new ResizeObserver(place);
  for (const watched of [bar, hint]) if (watched) observer.observe(watched);
  place();
  const unsubscribe = edge.subscribe(cover);
  return () => {
    observer.disconnect();
    unsubscribe();
    el.style.removeProperty(PROPERTY);
    delete el.dataset['covered'];
  };
}

export function useCompassTop(
  button: RefObject<HTMLElement | null>,
  mounted: boolean,
  sheetEdge: WatchedValue<number | null>,
): void {
  const phone = usePhone();
  const hintShown = useWatched(usePin()?.hint.shown ?? null, false);
  useLayoutEffect(() => {
    const el = button.current;
    const bar = document.querySelector('.phone-bar');
    if (!mounted || !el || !phone || !bar) return undefined;
    const hint = hintShown ? document.querySelector('.pin-hint') : null;
    return follow(el, [bar, hint], sheetEdge);
  }, [button, mounted, phone, hintShown, sheetEdge]);
}
