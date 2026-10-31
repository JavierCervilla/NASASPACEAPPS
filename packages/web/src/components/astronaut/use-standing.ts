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
 * Keeps the standing astronaut on its point (VENT-10): placed through the
 * surface it stands on, again after every globe frame and every resize,
 * relative to the element that holds it; hidden where the point does not
 * show (behind the limb, off the polar map).
 */
import { useLayoutEffect, type RefObject } from 'react';
import type { AstronautKit } from '../../astronaut/kit';
import type { DropSurface } from '../../astronaut/surfaces';
import type { LatLon } from '../../lib/polar-projection';
import { useWatched } from './context';

const HOME = { kind: 'home' } as const;

/** Puts `el` at `point` on `surface`; hides it where it does not show. */
function placeOn(el: HTMLElement, surface: DropSurface, point: LatLon) {
  const at = surface.place(point);
  const parent = el.offsetParent?.getBoundingClientRect();
  el.dataset['shown'] = String(Boolean(at && parent));
  if (!at || !parent) return;
  const x = at.x - parent.left;
  const y = at.y - parent.top;
  el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
}

export function useStanding(
  ref: RefObject<HTMLElement | null>,
  surface: DropSurface | null,
  point: LatLon | null,
): void {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !surface || !point) return undefined;
    const draw = (): void => placeOn(el, surface, point);
    draw();
    const stop = surface.subscribe?.(draw);
    const observer = new ResizeObserver(draw);
    observer.observe(surface.host);
    window.addEventListener('resize', draw);
    return () => {
      stop?.();
      observer.disconnect();
      window.removeEventListener('resize', draw);
    };
  }, [ref, surface, point]);
}

/** The point the astronaut stands on, if any, and whether it is carried. */
export function useStandingPoint(kit: AstronautKit | null) {
  const place = useWatched(kit?.places.place ?? null, HOME);
  const carried = useWatched(kit?.carrier.view ?? null, null) !== null;
  return { point: place.kind === 'moon' ? place.point : null, carried };
}
