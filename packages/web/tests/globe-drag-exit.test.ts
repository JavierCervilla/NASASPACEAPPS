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

// The globe lets go of a mouse that left it (VENT-122): a move with no button down (its pointerup was lost: a release
// outside the window, a context menu), a lost pointer capture, or a move outside the globe's view ends the drag where
// it is, with a release at no speed, so it never coasts and a stretched pole still settles back. Touch and pen keep
// their drag. The web package has no DOM test environment, so the host is a plain EventTarget with a box.
import { describe, expect, it, vi } from 'vitest';
import { bindDrag } from '../src/globe/drag';

/** The globe's view is the box 100..300 x 100..300. */
function setUp() {
  const host = new EventTarget() as unknown as HTMLElement;
  Object.assign(host, {
    getBoundingClientRect: () => ({ left: 100, top: 100, right: 300, bottom: 300, width: 200, height: 200 }),
    setPointerCapture: () => undefined,
  });
  const turn = { drag: vi.fn(), release: vi.fn(), press: vi.fn(() => false) };
  bindDrag(host, turn);
  return { host, turn };
}

/** A pointer event of `kind` at `x`, `y`, `buttons` held, from a `type` pointer. */
function fire(host: EventTarget, kind: string, x: number, more: { buttons?: number; type?: string; t?: number } = {}) {
  const event = Object.assign(new Event(kind, { cancelable: true }), {
    clientX: x,
    clientY: 200,
    pointerType: more.type ?? 'mouse',
    pointerId: 1,
    button: 0,
    buttons: more.buttons ?? 1,
  });
  Object.defineProperty(event, 'timeStamp', { value: more.t ?? 0 });
  host.dispatchEvent(event);
}

/** A fast drag from 150 to 250 px, past the slop: it would coast if released now. */
function dragFast(host: EventTarget, type = 'mouse') {
  fire(host, 'pointerdown', 150, { type });
  for (let i = 1; i <= 5; i++) fire(host, 'pointermove', 150 + i * 20, { type, t: i * 10 });
}

describe('a mouse that leaves the globe', () => {
  it('a move with no button down ends the drag with no coast, and no later move turns the globe', () => {
    const { host, turn } = setUp();
    dragFast(host);
    const drags = turn.drag.mock.calls.length;
    fire(host, 'pointermove', 260, { buttons: 0, t: 60 });
    fire(host, 'pointermove', 280, { buttons: 0, t: 70 });
    expect(turn.release).toHaveBeenCalledExactlyOnceWith(0, 0);
    expect(turn.drag).toHaveBeenCalledTimes(drags);
  });

  it('a lost pointer capture ends the drag with no coast', () => {
    const { host, turn } = setUp();
    dragFast(host);
    const drags = turn.drag.mock.calls.length;
    fire(host, 'lostpointercapture', 250, { t: 60 });
    fire(host, 'pointermove', 270, { t: 70 });
    fire(host, 'pointerup', 270, { t: 80 });
    expect(turn.release).toHaveBeenCalledExactlyOnceWith(0, 0);
    expect(turn.drag).toHaveBeenCalledTimes(drags);
  });

  it('a move outside the view ends the drag there with no coast, and the release outside does nothing more', () => {
    const { host, turn } = setUp();
    dragFast(host);
    const drags = turn.drag.mock.calls.length;
    fire(host, 'pointermove', 320, { t: 60 });
    fire(host, 'pointermove', 400, { t: 70 });
    fire(host, 'pointerup', 400, { t: 80 });
    expect(turn.release).toHaveBeenCalledExactlyOnceWith(0, 0);
    expect(turn.drag).toHaveBeenCalledTimes(drags);
  });

  it('a mouse released inside the view after a fast drag still coasts', () => {
    const { host, turn } = setUp();
    dragFast(host);
    fire(host, 'pointerup', 250, { t: 55 });
    const [vx] = turn.release.mock.calls[0] as [number, number];
    expect(vx).toBeGreaterThan(0);
  });

  it('a finger or a pen keeps its drag outside the view and with no buttons reported', () => {
    for (const type of ['touch', 'pen']) {
      const { host, turn } = setUp();
      dragFast(host, type);
      const drags = turn.drag.mock.calls.length;
      fire(host, 'pointermove', 340, { type, t: 60 });
      fire(host, 'pointermove', 360, { type, buttons: 0, t: 70 });
      expect(turn.drag).toHaveBeenCalledTimes(drags + 2);
      expect(turn.release).not.toHaveBeenCalled();
    }
  });
});
