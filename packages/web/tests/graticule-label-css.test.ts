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

// `.graticule-label` is the polar map's label (polar.css) and the globe's moving chip (orientation.css). With both
// stylesheets styling the bare class at the same specificity, the one bundled last won both kinds (VENT-52), so the
// polar map's labels piled up on its disk's corner. Every other stylesheet scopes the class by its own parent.
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const STYLES = new URL('../src/styles/', import.meta.url);

/** The selectors of every rule in `css`, comments dropped, each selector alone. */
function selectorsOf(css: string): string[] {
  const plain = css.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...plain.matchAll(/([^{}]+)\{/g)].flatMap(([, list]) => list!.split(',').map((s) => s.trim()));
}

/** Whether `selector` styles `.graticule-label` with nothing before it. */
const bare = (selector: string): boolean => /^\.graticule-label(?![\w-])/.test(selector);

describe('who styles .graticule-label', () => {
  it('only polar.css styles the bare class; orientation.css scopes it by the globe\'s layer', () => {
    const files = readdirSync(STYLES).filter((name) => name.endsWith('.css'));
    const owners = files.filter((name) => selectorsOf(readFileSync(new URL(name, STYLES), 'utf8')).some(bare));
    expect(owners).toEqual(['polar.css']);
    const globe = selectorsOf(readFileSync(new URL('orientation.css', STYLES), 'utf8'))
      .filter((s) => /\.graticule-label(?![\w-])/.test(s));
    expect(globe.length).toBeGreaterThan(0);
    for (const selector of globe) expect(selector).toMatch(/^\.globe-graticule /);
  });
});
