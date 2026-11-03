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
 * Makes the page's layers and saved sites once the island runs (VENT-37):
 * the registry starts on the flags kept from the last visit and keeps every
 * change; the saved sites are read from the device and drawn on the globe.
 * Both follow what another tab keeps (`storage` events).
 */
import { useEffect, useState } from 'react';
import {
  applyFlags,
  FLAGS_KEY,
  keepFlags,
  readFlags,
} from '../../globe/layers/kept-flags';
import { createLayerRegistry } from '../../globe/layers/registry';
import { localStore } from '../../i18n/choice';
import { onStorageKey } from '../../lib/storage-events';
import { after } from '../../pin/clocks';
import { createSavedSites, SAVED_KEY } from '../../saved/saved-sites';
import { createUndo } from '../../saved/undo';
import type { PinKit } from '../../pin/kit';
import type { SiteStore } from '../../phone/site-store';
import type { SavedKit } from './context';
import { useSavedGlobeLayer } from './use-saved-layer';
import { useStandingCover } from './use-standing-cover';

/** The kit, with the «Saved sites» layer on the globe (use-saved-layer.ts). */
export function useCreateSavedKit(pin: PinKit, store: SiteStore): SavedKit {
  const [kit] = useState(() => {
    const storage = localStore();
    const layers = createLayerRegistry(readFlags(storage));
    const saved = createSavedSites(storage);
    return { layers, saved, undo: createUndo(saved, after) };
  });
  useEffect(() => keepFlags(kit.layers, localStore()), [kit]);
  useEffect(() => onStorageKey(window, SAVED_KEY, kit.saved.refresh), [kit]);
  useEffect(() => onStorageKey(window, FLAGS_KEY, () =>
    applyFlags(kit.layers, localStore())), [kit]);
  useEffect(() => kit.undo.dismiss, [kit]);
  useSavedGlobeLayer(kit, pin, store);
  useStandingCover(kit, pin);
  return kit;
}
