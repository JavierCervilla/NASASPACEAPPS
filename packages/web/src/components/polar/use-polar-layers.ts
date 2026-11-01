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
 * The polar map's side of the globe layers (VENT-37): the markers whose
 * layer shows («Landing sites», «Approximate zones»; the selected one
 * always), and where the pin stands on the map, which labels keep clear of.
 */
import { LAYER_IDS } from '../../globe/layers/ids';
import { onPolarMap, toPolarMap, type MapPoint } from '../../lib/polar-projection';
import type { PolarMarker } from '../../polar/polar-markers';
import { usePin } from '../pin/context';
import { useStandingPoint } from '../pin/use-standing';
import { useLayerShown, useSavedKit } from '../saved/context';

export function usePolarLayers(
  markers: readonly PolarMarker[],
  chosen: string | null,
) {
  const kit = useSavedKit();
  const sites = useLayerShown(kit, LAYER_IDS.sites);
  const zones = useLayerShown(kit, LAYER_IDS.zones);
  const { point } = useStandingPoint(usePin());
  const shown = markers.filter(
    (marker) => (marker.zone ? zones : sites) || marker.id === chosen,
  );
  const pins: MapPoint[] =
    point && onPolarMap(point.lat) ? [toPolarMap(point)] : [];
  return { shown, pins };
}
