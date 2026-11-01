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
 * The page's layers and saved sites (VENT-37) for the views that show
 * them: the globe layer registry, the sites saved on this device and the
 * undo of a delete. Null on the server and in views rendered without it.
 */
import { createContext, useContext, useSyncExternalStore } from 'react';
import type { LayerRegistry } from '../../globe/layers/registry';
import type { SavedSite } from '../../saved/saved-schema';
import type { SavedSites } from '../../saved/saved-sites';
import type { Undo } from '../../saved/undo';

export interface SavedKit {
  readonly layers: LayerRegistry;
  readonly saved: SavedSites;
  readonly undo: Undo;
}

export const SavedContext = createContext<SavedKit | null>(null);

export const useSavedKit = (): SavedKit | null => useContext(SavedContext);

const nothing = (): (() => void) => () => undefined;
const NONE: readonly SavedSite[] = [];

/** The saved sites, re-rendering on change; none before the page runs. */
export function useSavedSites(kit: SavedKit | null): readonly SavedSite[] {
  return useSyncExternalStore(
    kit?.saved.subscribe ?? nothing,
    () => kit?.saved.get() ?? NONE,
    () => NONE,
  );
}

/** Whether the layer `id` shows, re-rendering on change; true before. */
export function useLayerShown(kit: SavedKit | null, id: string): boolean {
  return useSyncExternalStore(
    kit?.layers.subscribe ?? nothing,
    () => kit?.layers.isVisible(id) ?? true,
    () => true,
  );
}
