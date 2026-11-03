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
 * The standing pin as an obstacle on the globe (VENT-55, V-19): a
 * cover-only layer on the page's registry, at the pin's point while it
 * stands, the size of a selected marker's ring, so a graticule label
 * never touches it. No switch in the Layers key: the pin always shows.
 */
import { useEffect } from 'react';
import { RING_RADIUS_PX } from '../../globe/graticule/clearance';
import { coverLayer } from '../../globe/layers/cover-layer';
import type { PinKit } from '../../pin/kit';
import type { SavedKit } from './context';

const STANDING_PIN = 'standing-pin';
/** Under the saved pins: it only covers, it draws nothing. */
const STANDING_Z = 0;

export function useStandingCover(kit: SavedKit, pin: PinKit): void {
  useEffect(() => {
    const layer = coverLayer(RING_RADIUS_PX);
    const update = (): void => {
      const place = pin.places.place.get();
      layer.setPoint(place.kind === 'moon' ? place.point : null);
    };
    update();
    const off = kit.layers.register({
      id: STANDING_PIN, z: STANDING_Z, renderer: layer,
    });
    const stop = pin.places.place.subscribe(update);
    return () => {
      stop();
      off();
    };
  }, [kit, pin]);
}
