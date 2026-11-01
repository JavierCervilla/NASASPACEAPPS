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
 * The «Saved sites» globe layer (VENT-37): a silver pin for each site saved
 * on this device (pin look C, smaller), registered on the page's layers
 * (globe/layers/point-layer.ts). The selected one is left to the standing
 * pin, which wears its state; a click selects a saved site as the pin's
 * point, as a drop there would.
 */
import { useEffect } from 'react';
import { LAYER_IDS, LAYER_Z } from '../../globe/layers/ids';
import { pointLayer, type LayerPoint } from '../../globe/layers/point-layer';
import type { I18n } from '../../i18n/translate';
import type { PinKit } from '../../pin/kit';
import type { SiteStore } from '../../phone/site-store';
import type { SavedSite } from '../../saved/saved-schema';
import { useI18n } from '../i18n-context';
import type { SavedKit } from './context';

/** The points of `sites` but the selected one, named for a screen reader. */
export function savedPoints(
  sites: readonly SavedSite[],
  selectedId: string,
  i18n: I18n,
): LayerPoint[] {
  return sites
    .filter(({ id }) => id !== selectedId)
    .map(({ id, lat, lonEast, name }) => ({
      id,
      lat,
      lonEast,
      label: i18n.t('saved.marker', { name }),
    }));
}

export function useSavedGlobeLayer(
  kit: SavedKit,
  pin: PinKit,
  store: SiteStore,
): void {
  const i18n = useI18n();
  useEffect(() => {
    const pick = (id: string): void => {
      const site = kit.saved.find(id);
      if (site) pin.places.drop(site);
    };
    const layer = pointLayer({ className: 'saved-marker', onPick: pick });
    const update = (): void =>
      layer.setPoints(savedPoints(kit.saved.get(), store.get().id, i18n));
    update();
    const id = LAYER_IDS.saved;
    const off = kit.layers.register({ id, z: LAYER_Z.saved, renderer: layer });
    const stops = [kit.saved.subscribe(update), store.subscribe(update), off];
    return () => stops.forEach((stop) => stop());
  }, [kit, pin, store, i18n]);
}
