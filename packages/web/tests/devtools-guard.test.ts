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

import { describe, expect, it } from 'vitest';
import { devtoolsVerdict, startFiles } from '../scripts/devtools-guard.mjs';

// A small dist: one page whose module script statically imports a shared chunk and asks for the dev tools' chunk
// only through a dynamic import, as Base.astro does behind `?debug`.
const PAGE = [
  '<html><head><link rel="stylesheet" href="/_astro/Page.css"></head><body>',
  '<script type="module" src="/_astro/hoisted.js"></script>',
  '<script type="module">import"/_astro/inline-dep.js";</script>',
  '<astro-island component-url="/_astro/App.js" renderer-url="/_astro/client.js"></astro-island>',
  '</body></html>',
].join('');
const HOISTED = 'import{a as e}from"./shared.js";export{e as b}from"./reexported.js";'
  + 'const m=()=>import("./boot.js");';
const READOUT = '.ventana-perf-hud{position:fixed}';
const TRAIL = 'const k="ventana.devtools.breadcrumbs";';

function dist(overrides: Record<string, string> = {}): Map<string, string> {
  return new Map(Object.entries({
    'index.html': PAGE,
    '_astro/Page.css': 'body{margin:0}',
    '_astro/hoisted.js': HOISTED,
    '_astro/inline-dep.js': 'export const x=1;',
    '_astro/App.js': 'import{c}from"./client.js";',
    '_astro/client.js': 'export const c=1;',
    '_astro/shared.js': 'export const a=1;',
    '_astro/reexported.js': 'export const e=2;',
    '_astro/boot.js': `${TRAIL}import"./boot-dep.js";`,
    '_astro/boot.css': READOUT,
    '_astro/boot-dep.js': 'export const z=3;',
    ...overrides,
  }));
}

const PRECACHE = ['', '_astro/Page.css', '_astro/hoisted.js', '_astro/shared.js'];

describe('the dev tools guard: which files a page loads at start', () => {
  it('follows the page\'s scripts, styles, islands and static imports, never a dynamic one', () => {
    expect([...startFiles(dist())].sort()).toEqual([
      '_astro/App.js', '_astro/Page.css', '_astro/client.js', '_astro/hoisted.js', '_astro/inline-dep.js',
      '_astro/reexported.js', '_astro/shared.js', 'index.html',
    ]);
  });
});

describe('the dev tools guard: a production build', () => {
  const verdict = (files: Map<string, string>, precache = PRECACHE): string[] =>
    devtoolsVerdict({ files, precache, expectTools: false });

  it('passes when only an on-demand chunk carries the markers', () => {
    expect(verdict(dist())).toEqual([]);
  });

  it('fails when a chunk a page loads at start carries a marker', () => {
    // A precache of the page alone, so the start chunk is the only way the marker can be found.
    const problems = verdict(dist({ '_astro/shared.js': `export const a=1;${TRAIL}` }), ['']);
    expect(problems).toEqual(['"ventana.devtools.breadcrumbs" in _astro/shared.js, which a page loads at start']);
  });

  it('fails when a stylesheet a page links carries the readout', () => {
    expect(verdict(dist({ '_astro/Page.css': READOUT }), [''])).toEqual([
      '"ventana-perf-hud" in _astro/Page.css, which a page loads at start',
    ]);
  });

  it('fails when a page\'s own HTML carries a marker', () => {
    const page = PAGE.replace('<body>', '<body><div class="ventana-perf-hud"></div>');
    expect(verdict(dist({ 'index.html': page }))[0]).toContain('index.html');
  });

  it('fails when the precache lists a file that carries a marker', () => {
    const problems = verdict(dist(), [...PRECACHE, '_astro/boot.js']);
    expect(problems).toEqual(['"ventana.devtools.breadcrumbs" in _astro/boot.js, which the service worker precaches']);
  });

  it('fails on Spector.js anywhere, an on-demand chunk or a file name included', () => {
    expect(verdict(dist({ '_astro/boot-dep.js': 'flags.spector' }))).toHaveLength(1);
    expect(verdict(dist({ '_astro/spector.X1.js': 'export{}' }))).toHaveLength(1);
  });
});

describe('the dev tools guard: a build made with PUBLIC_PERF_HUD=1', () => {
  it('passes when the readout is in the build, wherever it is', () => {
    const files = dist({ '_astro/shared.js': READOUT, '_astro/spector.X1.js': 'export{}' });
    expect(devtoolsVerdict({ files, precache: PRECACHE, expectTools: true })).toEqual([]);
  });

  it('fails when the readout is missing', () => {
    const files = dist({ '_astro/boot.css': 'body{}' });
    expect(devtoolsVerdict({ files, precache: PRECACHE, expectTools: true })).toEqual([
      'PUBLIC_PERF_HUD=1 but the build has no performance readout',
    ]);
  });
});
