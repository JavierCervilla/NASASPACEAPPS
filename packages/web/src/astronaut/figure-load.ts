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
 * Loads the astronaut's pictures once the page runs (VENT-10): the visor
 * colours come from the page's own tokens, so they never drift from the
 * legend. Under Save-Data, or without WebGL, there are none and the
 * figure is drawn plain (components/astronaut/Figure.tsx).
 */
import {
  IDLE_VISOR,
  VISOR_TOKENS,
  type FigureImages,
  type Visor,
} from './figure-types';

/** The model, under the site's base path. */
const MODEL = 'models/astronaut.glb';

/** Each visor's colour, read from the root's custom properties. */
function visorColours(root: Element): Record<Visor, string> {
  const style = getComputedStyle(root);
  const token = (name: string): string =>
    style.getPropertyValue(name).trim() || IDLE_VISOR;
  return {
    idle: IDLE_VISOR,
    window: token(VISOR_TOKENS.window),
    sun: token(VISOR_TOKENS.sun),
    earth: token(VISOR_TOKENS.earth),
    none: token(VISOR_TOKENS.none),
  };
}

/** The pictures for the page at `base`; null when they cannot be drawn. */
export async function loadFigures(base: string): Promise<FigureImages | null> {
  const url = `${base.replace(/\/?$/, '/')}${MODEL}`;
  try {
    const { renderFigures } = await import('./figure-render');
    return await renderFigures(url, visorColours(document.documentElement));
  } catch (error) {
    console.warn(`astronaut: ${String(error)}`);
    return null;
  }
}
