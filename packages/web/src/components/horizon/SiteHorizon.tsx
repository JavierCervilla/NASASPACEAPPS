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
 * The selected site's horizon strip (VENT-40) as the card and the sheet
 * place it: the site's horizon as the page knows it (a custom point's
 * asked for on selection) and the Sun and the Earth of the hour the views
 * show at the shared instant.
 */
import type { SiteShadow } from '@ventana/sim';
import type { HorizonStore } from '../../horizon/horizon-store';
import { hourSky } from '../../horizon/hour-sky';
import type { HoursResult } from '../../phone/widgets-loader';
import { HorizonStrip } from './HorizonStrip';
import { useSiteHorizon } from './use-horizon';

interface Props {
  readonly horizons: HorizonStore;
  readonly site: {
    readonly id: string;
    readonly lat: number;
    readonly lonEast: number;
    readonly shadow?: SiteShadow | undefined;
  };
  readonly atMs: number | null;
  /** The month's hours the views show. */
  readonly hours: HoursResult;
  readonly className: string;
}

export function SiteHorizon({ horizons, site, atMs, hours, className }: Props) {
  const horizon = useSiteHorizon(horizons, site.id);
  const sky = hourSky(site, atMs, hours);
  return <HorizonStrip horizon={horizon} sky={sky} className={className} />;
}
