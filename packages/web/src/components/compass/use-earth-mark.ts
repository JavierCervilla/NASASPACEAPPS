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
 * Keeps the compass's Earth mark where the Earth lies (VENT-50): after every
 * globe frame the mark's angle goes to the button as a custom property and
 * its hollow state as an attribute, written to the element (no re-render
 * per frame), and the component hears only when the mark moves to another
 * of the places the button names. The sub-Earth point is the
 * simulator's, at the shared instant.
 */
import { useLayoutEffect, useMemo, useState, type RefObject } from 'react';
import { moonPosition, subEarthPoint } from '@ventana/sim';
import type { TimeStore } from '../../calendar/time-store';
import type { GlobeCompass } from '../../globe/compass-link';
import { earthMark, type EarthMark } from '../../globe/earth-mark';
import { useTime } from '../calendar/hooks';
import { samePlace } from './compass-name';

/** Writes `mark` to the button: the angle, and whether the Earth is behind. */
function paint(button: HTMLElement, mark: EarthMark): void {
  button.style.setProperty('--earth-angle', `${mark.angleDeg}deg`);
  const far = String(mark.far);
  if (button.dataset['far'] !== far) button.dataset['far'] = far;
}

/** The sub-Earth point at the instant `atMs`; null before it is known. */
function useSubEarthPoint(time: TimeStore) {
  const atMs = useTime(time)?.atMs ?? null;
  return useMemo(
    () => (atMs === null ? null : subEarthPoint(moonPosition(atMs))),
    [atMs],
  );
}

/**
 * The mark as of the last place it changed to (null until the first
 * frame); `button` follows every frame of `compass`.
 */
export function useEarthMark(
  compass: GlobeCompass | null,
  time: TimeStore,
  button: RefObject<HTMLElement | null>,
): EarthMark | null {
  const earth = useSubEarthPoint(time);
  const [place, setPlace] = useState<EarthMark | null>(null);
  useLayoutEffect(() => {
    const el = button.current;
    if (!compass || !el || !earth) return undefined;
    const update = (): void => {
      const mark = earthMark(compass.eye(), earth);
      paint(el, mark);
      setPlace((was) => (was && samePlace(was, mark) ? was : mark));
    };
    update();
    return compass.subscribe(update);
  }, [compass, earth, button]);
  return place;
}
