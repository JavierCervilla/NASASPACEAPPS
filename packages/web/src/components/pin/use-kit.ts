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
 * Makes the pin's shared parts once the island runs (VENT-10, VENT-37):
 * the places, the carrier and the surfaces (pin/kit.ts); then opens the
 * point the address names.
 */
import { useEffect, useState } from 'react';
import {
  createKit,
  type PinKit,
  type KitDeps,
} from '../../pin/kit';
import type { Address } from '../../pin/places';
import { selectedSite } from '../../pin/selected-site';
import type { CardSite } from '../../card/site-facts';
import { localStore } from '../../i18n/choice';
import type { I18n } from '../../i18n/translate';
import { useI18n } from '../i18n-context';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/** The page's address; rewritten in place, keeping the path and hash. */
const browserAddress: Address = {
  search: () => location.search,
  replace: (search) => {
    const url = `${location.pathname}${search}${location.hash}`;
    history.replaceState(history.state, '', url);
  },
};

interface Options extends Pick<KitDeps, 'store' | 'time'> {
  /** The selected site's state, as the views show it. */
  readonly state: KitDeps['selectedState'];
  readonly sites: readonly CardSite[];
}

/** The selected site's point, where the keyboard's carry starts. */
function startPointOf(options: Options, i18n: I18n) {
  return () => {
    const id = options.store.get().id;
    const site = selectedSite(options.sites, id, i18n);
    const known = Number.isFinite(site.lat) && Number.isFinite(site.lonEast);
    return known ? { lat: site.lat, lonEast: site.lonEast } : null;
  };
}

export function useCreatePinKit(options: Options): PinKit {
  const { sites } = options;
  const i18n = useI18n();
  const [kit] = useState(() => createKit({
    ...options,
    selectedState: options.state,
    i18n,
    address: browserAddress,
    reducedMotion: () => matchMedia(REDUCED_MOTION).matches,
    storage: localStore(),
    startPoint: startPointOf(options, i18n),
  }));
  useEffect(() => {
    kit.places.restore(sites.map((site) => site.id));
  }, [kit, sites]);
  return kit;
}
