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

/** When the page loads the dev tools (VENT-49): a dev build at once, a production build only on `?debug`, after start. */
import { describe, expect, it, vi } from 'vitest';
import { debugAsked, loadDevTools, type DevToolsModule } from '../src/lib/dev-tools-loader';

const MODULE = { devTools: vi.fn() } as unknown as DevToolsModule;

/** A host whose idle callbacks run only when the test says the page has started. */
function idleHost() {
  const waiting: (() => void)[] = [];
  return {
    host: {
      requestIdleCallback: (run: () => void) => waiting.push(run),
      cancelIdleCallback: vi.fn(),
      setTimeout: vi.fn(() => 0),
      clearTimeout: vi.fn(),
    },
    started: () => waiting.splice(0).forEach((run) => run()),
  };
}

describe('the ?debug parameter', () => {
  it('turns the tools on with any value, or none', () => {
    expect(debugAsked('?debug')).toBe(true);
    expect(debugAsked('?debug=')).toBe(true);
    expect(debugAsked('?debug=0')).toBe(true);
    expect(debugAsked('?site=im-2&debug=1')).toBe(true);
  });

  it('is that parameter alone', () => {
    expect(debugAsked('')).toBe(false);
    expect(debugAsked('?debugger=1')).toBe(false);
    expect(debugAsked('?site=debug')).toBe(false);
  });
});

describe('loadDevTools', () => {
  it('requests nothing in a production build without ?debug', () => {
    const load = vi.fn(async () => MODULE);
    const { host } = idleHost();
    expect(loadDevTools({ devBuild: false, search: '?site=im-2', host, load })).toBeNull();
    expect(load).not.toHaveBeenCalled();
  });

  it('with ?debug, loads the chunk only once the page has started', async () => {
    const load = vi.fn(async () => MODULE);
    const { host, started } = idleHost();
    const tools = loadDevTools({ devBuild: false, search: '?debug', host, load });
    expect(load).not.toHaveBeenCalled();
    started();
    expect(load).toHaveBeenCalledTimes(1);
    await expect(tools).resolves.toBe(MODULE);
  });

  it('in the dev server or a PUBLIC_PERF_HUD=1 build, loads at once, as before', async () => {
    const load = vi.fn(async () => MODULE);
    const { host } = idleHost();
    const tools = loadDevTools({ devBuild: true, search: '', host, load });
    expect(load).toHaveBeenCalledTimes(1);
    await expect(tools).resolves.toBe(MODULE);
  });
});
