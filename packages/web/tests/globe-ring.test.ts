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
 * The selected marker's ring starts its pulse over on every call (VENT-44), even twice in one frame. A browser
 * recalculates style when a script reads it and at the end of the frame; a CSS animation starts each time a
 * recalculation finds a new `animation-name`. The fake below models exactly that, so two attribute swaps that the
 * frame never sees apart start nothing.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MarkerRing } from '../src/globe/marker-ring';

/** The ring's element: the attributes and the inline transform the ring writes. */
class RingElement {
  readonly attributes = new Set<string>();
  readonly style = { transform: '' };
  className = '';
  hidden = false;

  setAttribute(name: string): void {
    this.attributes.add(name);
  }

  toggleAttribute(name: string): boolean {
    if (this.attributes.delete(name)) return false;
    this.attributes.add(name);
    return true;
  }
}

/** The style engine: counts the animations a recalculation starts (globe.css names the twin by `data-again`). */
function styleEngine(el: RingElement) {
  let computed: string | null = null;
  let starts = 0;
  const recalc = (): string => {
    const name = el.attributes.has('data-again') ? 'globe-ring-pulse-again' : 'globe-ring-pulse';
    if (name !== computed) starts += 1;
    computed = name;
    return name;
  };
  return { recalc, starts: () => starts };
}

describe('the selected marker\'s ring', () => {
  let el: RingElement;
  let engine: ReturnType<typeof styleEngine>;
  let ring: MarkerRing;

  beforeEach(() => {
    el = new RingElement();
    engine = styleEngine(el);
    vi.stubGlobal('document', { createElement: () => el });
    vi.stubGlobal('getComputedStyle', () => ({ get animationName() { return engine.recalc(); } }));
    ring = new MarkerRing({ append: () => undefined } as unknown as HTMLElement);
    engine.recalc();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('pulses when it comes', () => {
    expect(engine.starts()).toBe(1);
  });

  it('starts the pulse over once per call, even twice in one frame', () => {
    ring.pulse();
    ring.pulse();
    engine.recalc();
    expect(engine.starts()).toBe(3);
  });
});
