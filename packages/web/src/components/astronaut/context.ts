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
 * The astronaut's shared parts (astronaut/kit.ts) for the views that show
 * it: the docks, the carried figure, the figure standing on the Moon.
 * Null on the server and in views rendered without it.
 */
import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
} from 'react';
import type { AstronautKit } from '../../astronaut/kit';
import type { WatchedValue } from '../../lib/watched-value';

export const AstronautContext = createContext<AstronautKit | null>(null);

export const useAstronaut = (): AstronautKit | null =>
  useContext(AstronautContext);

const nothing = (): (() => void) => () => undefined;

/** A watched value's current value, re-rendering on change; `server` before. */
export function useWatched<T>(value: WatchedValue<T> | null, server: T): T {
  return useSyncExternalStore(
    value?.subscribe ?? nothing,
    () => (value ? value.get() : server),
    () => server,
  );
}

/** The shared instant, ms, re-rendering on change; null before it runs. */
export function useInstant(kit: AstronautKit | null): number | null {
  return useSyncExternalStore(
    kit?.time.subscribe ?? nothing,
    () => (kit ? kit.time.get().atMs : null),
    () => null,
  );
}

/**
 * What the globe calls once it has taken over (its splash is done): only
 * then may the astronaut's pictures be drawn (astronaut/kit.ts).
 */
export function useFiguresDue(): () => void {
  const kit = useAstronaut();
  return useCallback(() => kit?.figuresDue.set(true), [kit]);
}
