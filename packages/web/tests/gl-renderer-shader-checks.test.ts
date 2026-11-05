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

// Three reads every shader's and program's info log right after linking while `renderer.debug.checkShaderErrors` is
// on, which makes the driver finish the compile on the spot (VENT-93; 1.47 s on the VENT-80 phone profile). The checks
// stay on only where the dev tools run: the dev server, a PUBLIC_PERF_HUD=1 build, or `?debug`.
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('three', () => ({
  WebGLRenderer: class {
    readonly debug = { checkShaderErrors: true };
    constructor(readonly parameters: { canvas: unknown }) {}
    get domElement() {
      return this.parameters.canvas;
    }
  },
}));

const canvas = { addEventListener: vi.fn(), removeEventListener: vi.fn() };

async function rendererAt(search: string, dev: boolean) {
  vi.stubGlobal('document', { createElement: () => canvas });
  vi.stubGlobal('window', { location: { search } });
  vi.stubEnv('DEV', dev);
  vi.resetModules();
  const { createGlRenderer } = await import('../src/lib/gl-renderer');
  return createGlRenderer({});
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('shader checks on the page\'s WebGL renderers', () => {
  it('are off in a production page without ?debug', async () => {
    expect((await rendererAt('', false)).debug.checkShaderErrors).toBe(false);
    expect((await rendererAt('?site=im2-athena', false)).debug.checkShaderErrors).toBe(false);
  });

  it('are on with ?debug, with or without a value', async () => {
    expect((await rendererAt('?debug', false)).debug.checkShaderErrors).toBe(true);
    expect((await rendererAt('?site=x&debug=1', false)).debug.checkShaderErrors).toBe(true);
  });

  it('are on in the dev server', async () => {
    expect((await rendererAt('', true)).debug.checkShaderErrors).toBe(true);
  });
});
