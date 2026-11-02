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
 * `data-moving` says the sheet is moving from the instant a settle starts (a release, a button, a resize), not from
 * the next animation frame: the detent is announced at once (`onDetent`), and anything that reads the sheet between
 * the two (CSS, the e2e specs) must not see a sheet at rest mid-way to its detent.
 */
import { describe, expect, it, vi } from 'vitest';
import { sheetLoop } from '../src/sheet/sheet-mount';
import { SheetMotion } from '../src/sheet/sheet-motion';
import { detentsFor } from '../src/sheet/sheet-physics';
import { createSheetState } from '../src/sheet/sheet-state';

const HEIGHT = 600;
const DETENTS = detentsFor(HEIGHT);

/** The sheet's element as the loop touches it: its attributes and its style. */
function fakeSheet() {
  const attributes = new Set<string>();
  const style = { transform: '', setProperty: vi.fn() };
  const toggleAttribute = (name: string, force: boolean): boolean => {
    if (force) attributes.add(name);
    else attributes.delete(name);
    return force;
  };
  return { attributes, el: { style, toggleAttribute } as unknown as HTMLElement };
}

/** A sheet resting on peek, its frames held until `frames` runs them. */
function sheetAtPeek() {
  const { attributes, el } = fakeSheet();
  const state = createSheetState(DETENTS, 'peek');
  const queued: ((now: number) => void)[] = [];
  const schedule = (fn: (now: number) => void): number => queued.push(fn);
  const report = { onOpenness: vi.fn(), onEdge: vi.fn() };
  // The loop's default cancel is the browser's; nothing here cancels a frame.
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
  const loop = sheetLoop(el, state, report, schedule);
  const deps = { heightPx: () => HEIGHT, reducedMotion: () => false, invalidate: loop.invalidate, onDetent: vi.fn() };
  const frames = (count: number, stepMs = 16): void => {
    for (let n = 0, now = 0; n < count && queued.length > 0; n += 1, now += stepMs) queued.shift()!(now);
  };
  return { attributes, state, motion: new SheetMotion(state, deps), frames };
}

describe('the sheet says it moves', () => {
  it('from the instant a move to another detent starts, before any frame runs', () => {
    const { attributes, motion } = sheetAtPeek();
    motion.moveTo('full');
    expect(attributes.has('data-moving')).toBe(true);
  });

  it('from the instant a drag is released short of its detent', () => {
    const { attributes, motion, frames } = sheetAtPeek();
    motion.grab();
    motion.drag(-200);
    frames(1);
    expect(attributes.has('data-moving')).toBe(false);
    motion.release(-1200);
    expect(attributes.has('data-moving')).toBe(true);
  });

  it('and stops saying it once the spring rests exactly on the detent', () => {
    const { attributes, state, motion, frames } = sheetAtPeek();
    motion.moveTo('full');
    frames(400);
    expect(state.axis.value).toBe(DETENTS.full);
    expect(attributes.has('data-moving')).toBe(false);
  });

  it('not when a move lands at once (already there, or reduced motion)', () => {
    const { attributes, motion } = sheetAtPeek();
    motion.moveTo('peek');
    expect(attributes.has('data-moving')).toBe(false);
  });
});
