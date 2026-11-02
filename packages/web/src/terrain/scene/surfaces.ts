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
 * Puts the photographed surfaces on the scene (VENT-34) once they load: the
 * regolith's maps on the ground material, the Blue Marble on the Earth.
 * A map that fails to load leaves the plain colours and a warning, never a
 * broken view.
 */
import { attachGroundMaps } from './ground';
import { loadSurfaceMaps } from './surface-maps';
import type { World } from './world';

/** Loads the maps into `world`; resolves when they are on, or failed. */
export async function loadSurfaces(
  world: World,
  warn: (message: string) => void,
): Promise<void> {
  try {
    const maps = await loadSurfaceMaps();
    attachGroundMaps(world.material, maps);
    const uniform = world.sky.earth.material.uniforms['uMap'];
    if (uniform) uniform.value = maps.earth;
  } catch (error) {
    warn(`Ventana Lunar: the surface maps did not load (${String(error)}).`);
  }
}
