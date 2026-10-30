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
