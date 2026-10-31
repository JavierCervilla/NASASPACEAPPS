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
 * What the mounted globe tells the page: that its first map is on the
 * Moon (the loading state may go), its view, where the astronaut is
 * dropped and stands (VENT-10), and `done`, called once its loading state
 * is gone, after which the astronaut's pictures may be drawn. `restart`
 * forgets the map when the globe starts again.
 */
import { useMemo, useState } from 'react';
import type { GlobeView } from '../globe/globe-view';
import { useFiguresDue } from './astronaut/context';

export function useGlobeSignals() {
  const [textured, setTextured] = useState(false);
  const [view, setView] = useState<GlobeView | null>(null);
  const signals = useMemo(
    () => ({
      onTextured: (): void => setTextured(true),
      onView: setView,
      restart: (): void => setTextured(false),
    }),
    [],
  );
  return { textured, view, signals, done: useFiguresDue() };
}
