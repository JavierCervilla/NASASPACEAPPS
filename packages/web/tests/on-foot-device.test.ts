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
 * What the crash report reads of the device and how a person copies it
 * (VENT-49): the page, the browser, the GPU when the driver names it, the
 * battery when the browser answers, and a copy that falls back to a hidden
 * text area where the clipboard API is missing or refused.
 */
import { describe, expect, it, vi } from 'vitest';
import { copyText, type CopyDeps } from '../src/terrain/report/copy-text';
import { unmaskedGpuName, readEnvironment, watchBattery, type EnvSource } from '../src/terrain/report/environment';

const SOURCE: EnvSource = {
  navigator: { userAgent: 'UA', hardwareConcurrency: 8, deviceMemory: 4 },
  location: { pathname: '/es/', search: '?lat=-85.50&lon=40.00', hash: '#horizon' },
  devicePixelRatio: 2.625,
  innerWidth: 412,
  innerHeight: 915,
};

describe('the environment', () => {
  it('reads the page, the browser, the screen and the cores, with the GPU and battery unknown', () => {
    expect(readEnvironment(SOURCE, { tier: 'low', leftOut: 'shade' })).toEqual({
      tier: 'low',
      leftOut: 'shade',
      page: '/es/?lat=-85.50&lon=40.00#horizon',
      userAgent: 'UA',
      gpu: null,
      pixelRatio: 2.625,
      viewport: '412x915',
      threads: 8,
      deviceMemoryGb: 4,
      battery: null,
    });
  });

  it('leaves the cores and the memory unknown where the browser does not say', () => {
    const bare: EnvSource = { ...SOURCE, navigator: { userAgent: 'UA' } };
    const env = readEnvironment(bare, { tier: 'high', leftOut: '' });
    expect(env.threads).toBeNull();
    expect(env.deviceMemoryGb).toBeNull();
  });
});

describe('the GPU name', () => {
  const UNMASKED = 0x9246;
  const gl = (name: unknown, exposed = true) => ({
    getExtension: (n: string) => (exposed && n === 'WEBGL_debug_renderer_info' ? { UNMASKED_RENDERER_WEBGL: UNMASKED } : null),
    getParameter: (p: number) => (p === UNMASKED ? name : null),
  });

  it('is what the driver says when it exposes it', () => {
    expect(unmaskedGpuName(gl('PowerVR D-Series DXT-48-1536') as never)).toBe('PowerVR D-Series DXT-48-1536');
  });

  it('is null when the extension is hidden, the answer is empty or not text, or the context throws', () => {
    expect(unmaskedGpuName(gl('x', false) as never)).toBeNull();
    expect(unmaskedGpuName(gl('') as never)).toBeNull();
    expect(unmaskedGpuName(gl(7) as never)).toBeNull();
    const lost = { getExtension: () => { throw new Error('lost'); }, getParameter: () => null };
    expect(unmaskedGpuName(lost as never)).toBeNull();
  });
});

describe('the battery', () => {
  it('says the level and whether it charges, once it answers', async () => {
    const hear = vi.fn();
    watchBattery({ getBattery: () => Promise.resolve({ level: 0.144, charging: false }) }, hear);
    await Promise.resolve();
    expect(hear).toHaveBeenCalledWith('14%, not charging');
    const charging = vi.fn();
    watchBattery({ getBattery: () => Promise.resolve({ level: 1, charging: true }) }, charging);
    await Promise.resolve();
    expect(charging).toHaveBeenCalledWith('100%, charging');
  });

  it('is silent where the browser has no battery, refuses, or throws', async () => {
    const hear = vi.fn();
    watchBattery({}, hear);
    watchBattery({ getBattery: () => Promise.reject(new Error('blocked')) }, hear);
    watchBattery({ getBattery: () => { throw new Error('nope'); } }, hear);
    await Promise.resolve();
    await Promise.resolve();
    expect(hear).not.toHaveBeenCalled();
  });
});

/** A document with the one text area the fallback needs. */
function fakeDocument(copies = true) {
  const area = {
    value: '', className: '', selected: false, removed: false, attrs: new Map<string, string>(),
    setAttribute(name: string, value: string) { this.attrs.set(name, value); },
    select() { this.selected = true; },
    setSelectionRange() {},
    remove() { this.removed = true; },
  };
  const appended: unknown[] = [];
  const doc = {
    area, appended,
    activeElement: null,
    createElement: () => area,
    body: { append: (el: unknown) => void appended.push(el) },
    execCommand: vi.fn((command: string) => command === 'copy' && copies),
  };
  return doc;
}

describe('copying the report', () => {
  it('writes to the clipboard and says it worked', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    const doc = fakeDocument();
    const deps: CopyDeps = { clipboard: { writeText }, document: doc as never };
    expect(await copyText('the report', deps)).toBe(true);
    expect(writeText).toHaveBeenCalledWith('the report');
    expect(doc.execCommand).not.toHaveBeenCalled();
  });

  it('falls back to a hidden text area when the clipboard API is missing', async () => {
    const doc = fakeDocument();
    expect(await copyText('the report', { clipboard: undefined, document: doc as never })).toBe(true);
    expect(doc.area.value).toBe('the report');
    expect(doc.area.selected).toBe(true);
    expect(doc.execCommand).toHaveBeenCalledWith('copy');
    expect(doc.area.attrs.get('readonly')).toBe('');
    expect(doc.area.className).toBe('visually-hidden');
    expect(doc.area.removed).toBe(true);
  });

  it('falls back when the clipboard API refuses', async () => {
    const writeText = vi.fn(() => Promise.reject(new Error('denied')));
    const doc = fakeDocument();
    expect(await copyText('the report', { clipboard: { writeText }, document: doc as never })).toBe(true);
    expect(doc.execCommand).toHaveBeenCalledWith('copy');
  });

  it('says it failed when nothing could copy, and leaves no text area behind', async () => {
    const writeText = vi.fn(() => Promise.reject(new Error('denied')));
    const none = fakeDocument(false);
    expect(await copyText('x', { clipboard: { writeText }, document: none as never })).toBe(false);
    expect(none.area.removed).toBe(true);
    const throwing = fakeDocument();
    throwing.execCommand.mockImplementation(() => { throw new Error('gone'); });
    expect(await copyText('x', { clipboard: undefined, document: throwing as never })).toBe(false);
    expect(throwing.area.removed).toBe(true);
  });
});
