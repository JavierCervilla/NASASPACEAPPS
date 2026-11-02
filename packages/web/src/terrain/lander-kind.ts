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
 * Which lander the on-foot view puts beside the astronaut (VENT-46): the
 * Apollo Lunar Module at the listed Apollo sites, NASA's own model; the
 * generic Nova-C class robotic lander everywhere else (the other listed
 * sites, and any point the visitor drops: a pin near Tranquility Base is
 * still not Tranquility Base). Pure: the scene loads the model.
 */
import type { SiteGroup } from '@ventana/sim';

export type LanderKind = 'apollo' | 'generic';

/** Half the span of the footpads, metres: the rocks keep clear of it. */
export const LANDER_RADIUS_M: Readonly<Record<LanderKind, number>> = {
  apollo: 4.7,
  generic: 2.4,
};

/** A custom point's id starts with this (`@-85.87,61.34`, custom-point.ts). */
const CUSTOM_PREFIX = '@';

/** The lander of a site: Apollo's only for a listed Apollo site. */
export function landerKindOf(
  site: { readonly id: string; readonly group?: SiteGroup | undefined },
): LanderKind {
  const listed = !site.id.startsWith(CUSTOM_PREFIX);
  return listed && site.group === 'apollo' ? 'apollo' : 'generic';
}
