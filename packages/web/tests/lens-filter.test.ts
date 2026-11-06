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
 * The lens filter's map (VENT-91): drawn on a canvas asked for frequent reads, so Chromium keeps it in memory and
 * `toDataURL()` reads no GPU memory back on the main thread; the PNG it makes is what `feImage` shows. The web package
 * has no DOM test environment, so the document is a small fake that records what is asked of it.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { lensFilter } from '../src/glass/lens-filter';

interface Asked { contexts: unknown[][]; puts: number; attrs: Map<string, string> }

/** A fake document: one canvas that records its context requests, and SVG elements that record attributes. */
function fakeDocument(asked: Asked): Document {
  const canvas = {
    width: 0,
    height: 0,
    getContext: (...args: unknown[]) => {
      asked.contexts.push(args);
      return { putImageData: () => asked.puts++ };
    },
    toDataURL: () => 'data:image/png;base64,TEST',
  };
  const element = () => ({
    setAttribute: (name: string, value: string) => asked.attrs.set(name, value),
    append: () => undefined,
  });
  return { createElement: () => canvas, createElementNS: element } as unknown as Document;
}

afterEach(() => vi.unstubAllGlobals());

describe('the lens filter', () => {
  it('draws its map on a canvas asked for frequent reads and hands feImage its PNG', () => {
    vi.stubGlobal('ImageData', class { constructor(readonly data: Uint8ClampedArray) {} });
    const asked: Asked = { contexts: [], puts: 0, attrs: new Map() };
    lensFilter(fakeDocument(asked), 'glass-lens-1', { width: 40, height: 20, radius: 8, bezel: 9 });
    expect(asked.contexts).toEqual([['2d', { willReadFrequently: true }]]);
    expect(asked.puts).toBe(1);
    expect(asked.attrs.get('href')).toBe('data:image/png;base64,TEST');
  });
});
