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
 * The sites saved on this device on the polar map (VENT-37): a silver pin
 * (look C, smaller) for each one from 80° S to the pole, real buttons named
 * for assistive technology, shown while the «Saved sites» layer is on.
 * The selected one is left to the standing pin, which wears its state.
 */
import { LAYER_IDS } from '../../globe/layers/ids';
import { onPolarMap, toPolarMap } from '../../lib/polar-projection';
import { useI18n } from '../i18n-context';
import { useLayerShown, useSavedKit, useSavedSites } from '../saved/context';

interface Props {
  /** The selected site's id. */
  readonly selected: string;
  readonly onPick: (id: string) => void;
}

export function PolarSaved({ selected, onPick }: Props) {
  const kit = useSavedKit();
  const i18n = useI18n();
  const sites = useSavedSites(kit);
  const shown = useLayerShown(kit, LAYER_IDS.saved);
  if (!shown) return null;
  return sites
    .filter(({ id, lat }) => id !== selected && onPolarMap(lat))
    .map((site) => {
      const at = toPolarMap(site);
      const place = { left: `${50 + 50 * at.x}%`, top: `${50 + 50 * at.y}%` };
      return (
        <button key={site.id} type="button" className="polar-saved saved-marker" style={place} aria-label={i18n.t('saved.marker', { name: site.name })} data-point-id={site.id} onClick={() => onPick(site.id)} />
      );
    });
}
