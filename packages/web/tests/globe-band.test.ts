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

import { PerspectiveCamera } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { watchBand } from '../src/globe/band-watch';
import { FreeBandWatch, freeBand } from '../src/globe/free-band';
import { bindSheetEdge } from '../src/globe/sheet-edge';
import { createWatchedValue } from '../src/lib/watched-value';

const INF = Number.POSITIVE_INFINITY;

describe('free band', () => {
  it('on a phone runs from the top bar\'s bottom to the sheet\'s top edge, with no card above the sheet', () => {
    // 390x844 at half: the bar's bottom at 81, the sheet's edge at 500.
    expect(freeBand({ hostHeight: 844, barBottom: 81, sheetTop: 500, tabsTop: 762 })).toEqual({ top: 81, bottom: 500 });
  });

  it('with the sheet closed (below the screen) ends at the tab bar', () => {
    expect(freeBand({ hostHeight: 844, barBottom: 81, sheetTop: 900, tabsTop: 762 })).toEqual({ top: 81, bottom: 762 });
  });

  it('on a desktop is the whole globe', () => {
    expect(freeBand({ hostHeight: 640, barBottom: 0, sheetTop: INF, tabsTop: INF })).toEqual({ top: 0, bottom: 640 });
  });

  it('tells its watchers only when the band moves, until they stop', () => {
    const band = new FreeBandWatch();
    const heard = vi.fn();
    const stop = band.watch(heard);
    band.layout({ hostHeight: 844, barBottom: 81, tabsTop: 762 });
    expect(band.band()).toEqual({ top: 81, bottom: 762 });
    band.layout({ sheetTop: 500 });
    expect(band.band()).toEqual({ top: 81, bottom: 500 });
    // A sheet edge below the tab bar leaves the band where it was.
    band.layout({ sheetTop: 800 });
    band.layout({ sheetTop: 900 });
    expect(heard).toHaveBeenCalledTimes(3);
    stop();
    band.layout({ sheetTop: 500 });
    expect(heard).toHaveBeenCalledTimes(3);
  });
});

/** A ResizeObserver that never fires on its own: the tests call the page's changes instead. */
class StillObserver {
  observe(): void {}
  disconnect(): void {}
}

/** An element drawn at `top`..`bottom` px of the viewport, `height` px tall inside. */
const drawn = (top: number, bottom: number) =>
  ({
    clientWidth: 390,
    clientHeight: bottom - top,
    getBoundingClientRect: () => ({ top, bottom, left: 0, right: 390, width: 390, height: bottom - top }),
  }) as unknown as HTMLElement;

describe('free band wiring (VENT-33)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('band-watch hands the band the top bar\'s bottom, the tab bar\'s top and the host\'s height', () => {
    vi.stubGlobal('ResizeObserver', StillObserver);
    const band = new FreeBandWatch();
    let change = (): void => undefined;
    const anchors = () => ({ bar: drawn(12, 93), tabs: drawn(762, 826) });
    const changes = (listener: () => void) => ((change = listener), () => undefined);
    const stop = watchBand({ host: drawn(0, 844), band, anchors, changes });
    change();
    expect(band.band()).toEqual({ top: 93, bottom: 762 });
    stop();
  });

  it('sheet-edge hands the band the sheet\'s top edge, in the host\'s coordinates, as the sheet moves', () => {
    vi.stubGlobal('ResizeObserver', StillObserver);
    vi.stubGlobal('window', { innerHeight: 844 });
    vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: () => '344px' }));
    const band = new FreeBandWatch();
    band.layout({ hostHeight: 844, barBottom: 93, tabsTop: 762 });
    const edge = createWatchedValue<number | null>(500);
    const parts = { camera: new PerspectiveCamera(), band, invalidate: vi.fn() };
    const unbind = bindSheetEdge(drawn(0, 844), parts, edge);
    expect(band.band()).toEqual({ top: 93, bottom: 500 });
    // A higher detent: the band ends higher, so a framed marker lands above the sheet.
    edge.set(300);
    expect(band.band()).toEqual({ top: 93, bottom: 300 });
    // No sheet: the band reaches the tab bar.
    edge.set(null);
    expect(band.band()).toEqual({ top: 93, bottom: 762 });
    unbind();
  });
});
