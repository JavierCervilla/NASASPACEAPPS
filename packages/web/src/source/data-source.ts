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
 * Where the views take a site's hours from (VENT-36): the simulator's own
 * sky («Computed»), JPL Horizons through the API («Horizons», the
 * default), or Horizons with the hours where the two disagree marked
 * («Compare»). The choice is kept on the device; storage can be missing
 * or refuse access, and then nothing is kept and nothing breaks.
 */
import type { ChoiceStorage } from '../i18n/choice';
import {
  createWatchedValue,
  type WatchedValue,
} from '../lib/watched-value';

export const DATA_SOURCES = ['computed', 'horizons', 'compare'] as const;

export type DataSource = (typeof DATA_SOURCES)[number];

/** The watched choice; setting it also keeps it. */
export type SourceStore = WatchedValue<DataSource>;

/** Where the choice is kept. */
export const SOURCE_KEY = 'ventana.dataSource';

const DEFAULT_SOURCE: DataSource = 'horizons';

const isSource = (value: unknown): value is DataSource =>
  DATA_SOURCES.includes(value as DataSource);

/** The kept choice; Horizons when there is none or it cannot be read. */
export function readSource(storage: ChoiceStorage | null): DataSource {
  try {
    const kept = storage?.getItem(SOURCE_KEY);
    return isSource(kept) ? kept : DEFAULT_SOURCE;
  } catch {
    return DEFAULT_SOURCE;
  }
}

/** The choice, starting on the kept one and keeping every new one. */
export function createSourceStore(
  storage: ChoiceStorage | null,
): SourceStore {
  const value = createWatchedValue(readSource(storage));
  const set = (source: DataSource): void => {
    value.set(source);
    try {
      storage?.setItem(SOURCE_KEY, source);
    } catch {
      // Refused storage: the choice holds for this page only.
    }
  };
  return { ...value, set };
}
