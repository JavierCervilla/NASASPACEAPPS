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
 * The pin's shared parts (pin/kit.ts) for the views that show it: the
 * carried pin, the pin standing on the Moon, the «Drop a pin» buttons
 * and the first-time hint.
 * Null on the server and in views rendered without it.
 */
import {
  createContext,
  useContext,
  useSyncExternalStore,
} from 'react';
import type { PinKit } from '../../pin/kit';
import type { WatchedValue } from '../../lib/watched-value';

export const PinContext = createContext<PinKit | null>(null);

export const usePin = (): PinKit | null =>
  useContext(PinContext);

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
export function useInstant(kit: PinKit | null): number | null {
  return useSyncExternalStore(
    kit?.time.subscribe ?? nothing,
    () => (kit ? kit.time.get().atMs : null),
    () => null,
  );
}
