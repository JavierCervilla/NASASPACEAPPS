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
 * Checks the optional `shadow` of a sites file entry (VENT-39): what NASA's
 * illumination maps say about the site's point.
 */
import type { ShadowKind, SiteShadow } from '@ventana/sim';

const SHADOW_KINDS: readonly ShadowKind[] = ['psr', 'dimFloor'];

/**
 * An absent shadow, or one of a known kind with a 0-1 share and a source
 * that `isSource` accepts.
 */
export function isShadow(
  value: unknown,
  isSource: (source: unknown) => boolean,
): boolean {
  if (value === undefined) return true;
  const v = value as Partial<SiteShadow> | null;
  return (
    typeof v === 'object' &&
    v !== null &&
    SHADOW_KINDS.includes(v.kind as ShadowKind) &&
    typeof v.avgSun === 'number' &&
    v.avgSun >= 0 &&
    v.avgSun <= 1 &&
    isSource(v.source)
  );
}
