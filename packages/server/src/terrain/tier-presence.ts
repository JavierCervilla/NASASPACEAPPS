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
 * Which tiers of the catalogue are on disk (VENT-40): a tier counts only
 * when every one of its files is there at its catalogued size, so a
 * download cut short never serves half a grid.
 */
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { TerrainCatalogue, Tier } from './catalogue.ts';

/** Whether every file of `tier` is in `dir` with its catalogued size. */
async function isPresent(dir: string, tier: Tier): Promise<boolean> {
  const sizes = await Promise.all(
    tier.files.map((f) =>
      stat(join(dir, f.file)).then(
        (s) => s.size,
        () => -1,
      ),
    ),
  );
  return sizes.every((size, i) => size === tier.files[i]?.bytes);
}

/** The tiers of `catalogue` complete in `dir`, in catalogue order. */
export async function presentTiers(
  dir: string,
  catalogue: TerrainCatalogue,
): Promise<Tier[]> {
  const found = await Promise.all(
    catalogue.tiers.map((tier) => isPresent(dir, tier)),
  );
  return catalogue.tiers.filter((_, i) => found[i]);
}
