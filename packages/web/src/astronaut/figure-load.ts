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
 * legend. They are baked once: the four signal colours are the same in
 * every theme and contrast setting (tokens.css, held by contrast.test.ts),
 * so a later theme switch leaves nothing to redraw. Under Save-Data, or
 * without WebGL, there are none and the figure is drawn plain
 * (components/astronaut/Figure.tsx). The work is cut into idle slices (one
 * picture each), so it never holds the main thread for long while the
 * page is busy.
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

/** How long an idle slice may wait for the page to go quiet. */
const IDLE_TIMEOUT_MS = 250;

/**
 * The next moment the main thread is idle; a short timer where the
 * browser has no idle callback (Safari).
 */
const nextIdle = (): Promise<void> =>
  new Promise((resolve) => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => resolve(), { timeout: IDLE_TIMEOUT_MS });
    } else {
      setTimeout(resolve, 0);
    }
  });

/** The pictures for the page at `base`; null when they cannot be drawn. */
export async function loadFigures(base: string): Promise<FigureImages | null> {
  const url = `${base.replace(/\/?$/, '/')}${MODEL}`;
  try {
    await nextIdle();
    const { renderFigures } = await import('./figure-render');
    const colours = visorColours(document.documentElement);
    return await renderFigures(url, colours, nextIdle);
  } catch (error) {
    console.warn(`astronaut: ${String(error)}`);
    return null;
  }
}
