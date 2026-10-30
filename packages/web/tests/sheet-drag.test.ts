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

import { describe, expect, it, vi } from 'vitest';
import { bindSheetDrag } from '../src/sheet/sheet-drag';

type Handler = (event: unknown) => void;

/** The few element calls the binding makes, with a way to fire events at it. */
function fakeSheet() {
  const handlers = new Map<string, Handler[]>();
  const el = {
    addEventListener: (type: string, fn: Handler) => handlers.set(type, [...(handlers.get(type) ?? []), fn]),
    removeEventListener: (type: string, fn: Handler) => handlers.set(type, (handlers.get(type) ?? []).filter((h) => h !== fn)),
    setPointerCapture: vi.fn(),
  };
  const fire = (type: string, y: number, t: number) =>
    handlers.get(type)?.forEach((fn) => fn({ type, pointerId: 1, isPrimary: true, button: 0, clientY: y, timeStamp: t }));
  const click = () => {
    const event = { stopPropagation: vi.fn() };
    handlers.get('click')?.forEach((fn) => fn(event));
    return event;
  };
  return { el: el as unknown as HTMLElement, fire, click, handlers };
}

const target = () => ({ grab: vi.fn(), drag: vi.fn(), release: vi.fn() });

describe('bindSheetDrag', () => {
  it('follows a press on the document when asked, as the tab bar edge does', () => {
    const bar = fakeSheet();
    const doc = fakeSheet();
    const t = target();
    bindSheetDrag(bar.el, t, () => true, doc.el);
    bar.fire('pointerdown', 780, 0);
    // The finger leaves the small bar at once: its moves reach the document, not the bar.
    doc.fire('pointermove', 760, 16);
    doc.fire('pointermove', 700, 32);
    doc.fire('pointerup', 700, 40);
    expect(t.grab).toHaveBeenCalledOnce();
    expect(t.drag.mock.calls).toEqual([[-20], [-60]]);
    expect(t.release).toHaveBeenCalledOnce();
  });

  it('leaves a tap alone: no grab, no release, the click goes through', () => {
    const sheet = fakeSheet();
    const t = target();
    bindSheetDrag(sheet.el, t, () => true);
    sheet.fire('pointerdown', 500, 0);
    sheet.fire('pointermove', 503, 10);
    sheet.fire('pointerup', 503, 20);
    expect(t.grab).not.toHaveBeenCalled();
    expect(t.release).not.toHaveBeenCalled();
    expect(sheet.click().stopPropagation).not.toHaveBeenCalled();
  });

  it('catches the sheet once the press moves, follows 1:1 and hands over the velocity', () => {
    const sheet = fakeSheet();
    const t = target();
    bindSheetDrag(sheet.el, t, () => true);
    sheet.fire('pointerdown', 500, 0);
    sheet.fire('pointermove', 490, 16);
    sheet.fire('pointermove', 470, 32);
    sheet.fire('pointerup', 470, 40);
    expect(t.grab).toHaveBeenCalledOnce();
    expect(t.drag.mock.calls).toEqual([[-10], [-20]]);
    const [vy] = t.release.mock.calls[0] as [number];
    expect(vy).toBeCloseTo(-30 / 0.032, 0);
    expect(sheet.click().stopPropagation).toHaveBeenCalledOnce();
  });

  it('turns a press into a drag at 6 px, not at 5', () => {
    const sheet = fakeSheet();
    const t = target();
    bindSheetDrag(sheet.el, t, () => true);
    sheet.fire('pointerdown', 500, 0);
    sheet.fire('pointermove', 505, 10);
    expect(t.grab).not.toHaveBeenCalled();
    sheet.fire('pointermove', 506, 20);
    expect(t.grab).toHaveBeenCalledOnce();
  });

  it('a drag that ends in pointercancel does not swallow the next tap', () => {
    const sheet = fakeSheet();
    const t = target();
    let draggable = true;
    bindSheetDrag(sheet.el, t, () => draggable);
    sheet.fire('pointerdown', 500, 0);
    sheet.fire('pointermove', 450, 16);
    sheet.fire('pointercancel', 450, 32);
    expect(t.release).toHaveBeenCalledOnce();
    // The next tap lands inside the scrolling list, where the sheet does not drag.
    draggable = false;
    sheet.fire('pointerdown', 300, 100);
    sheet.fire('pointerup', 300, 120);
    expect(sheet.click().stopPropagation).not.toHaveBeenCalled();
  });

  it('a drag that ends in pointerup still swallows only its own click', () => {
    const sheet = fakeSheet();
    bindSheetDrag(sheet.el, target(), () => true);
    sheet.fire('pointerdown', 500, 0);
    sheet.fire('pointermove', 450, 16);
    sheet.fire('pointerup', 450, 32);
    expect(sheet.click().stopPropagation).toHaveBeenCalledOnce();
    expect(sheet.click().stopPropagation).not.toHaveBeenCalled();
  });

  it('ignores presses where the page says the sheet must not drag', () => {
    const sheet = fakeSheet();
    const t = target();
    bindSheetDrag(sheet.el, t, () => false);
    sheet.fire('pointerdown', 500, 0);
    sheet.fire('pointermove', 400, 16);
    sheet.fire('pointerup', 400, 32);
    expect(t.grab).not.toHaveBeenCalled();
  });

  it('unbinds every listener', () => {
    const sheet = fakeSheet();
    bindSheetDrag(sheet.el, target(), () => true)();
    expect([...sheet.handlers.values()].every((list) => list.length === 0)).toBe(true);
  });
});
