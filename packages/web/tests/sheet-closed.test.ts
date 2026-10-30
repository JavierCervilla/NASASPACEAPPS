import { describe, expect, it, vi } from 'vitest';
import { viewportShift } from '../src/globe/sheet-edge';
import { sheetActions } from '../src/phone/sheet-actions';
import { readSheetDetent, saveSheetDetent, type DetentStorage } from '../src/phone/sheet-memory';
import { edgeDragTarget } from '../src/sheet/sheet-edge-drag';
import { SheetMotion } from '../src/sheet/sheet-motion';
import { detentsFor, releaseDetent, rubberBand, SHEET_LAYOUT } from '../src/sheet/sheet-physics';
import { createSheetState, dragSheet, grabSheet } from '../src/sheet/sheet-state';
import { grabberLabel, nextDetent, openness } from '../src/sheet/sheet-view';

// The e2e and canvas phone: 390x844.
const HEIGHT = 844;
const DETENTS = detentsFor(HEIGHT);

function motionFrom(detent: 'closed' | 'peek' | 'half') {
  const state = createSheetState(DETENTS, detent);
  const deps = { heightPx: () => HEIGHT, reducedMotion: () => false, invalidate: vi.fn(), onDetent: vi.fn() };
  return { state, deps, motion: new SheetMotion(state, deps) };
}

describe('closed detent', () => {
  it('rests below the screen by the reach of the sheet shadow', () => {
    expect(DETENTS.closed).toBe(HEIGHT + SHEET_LAYOUT.closedPx);
  });

  it('is where a drag down from peek, released past midway, lands', () => {
    const { state, deps, motion } = motionFrom('peek');
    motion.grab();
    motion.drag((DETENTS.closed - DETENTS.peek) * 0.6);
    motion.release(0);
    expect(state.detent).toBe('closed');
    expect(deps.onDetent).toHaveBeenCalledWith('closed');
  });

  it('is where a flick down from peek projects, with the same momentum as the other detents', () => {
    expect(releaseDetent(DETENTS, DETENTS.peek, 1200)).toBe('closed');
    // A short slow drag from peek goes back.
    expect(releaseDetent(DETENTS, DETENTS.peek + 40, 0)).toBe('peek');
  });

  it('rubber-bands a finger that keeps going below it', () => {
    const state = createSheetState(DETENTS, 'closed');
    grabSheet(state, HEIGHT);
    dragSheet(state, 100, HEIGHT);
    const shown = state.axis.value - DETENTS.closed;
    expect(shown).toBeGreaterThan(0);
    expect(shown).toBeLessThan(100);
    expect(shown).toBeCloseTo(rubberBand(DETENTS.closed + 100, { min: DETENTS.full, max: DETENTS.closed }, HEIGHT) - DETENTS.closed, 6);
  });

  it('counts as not open for the scrim', () => {
    expect(openness(DETENTS, DETENTS.closed)).toBe(0);
  });

  it('stays out of the grabber cycle, which a closed sheet hides', () => {
    expect(nextDetent('closed')).toBe('half');
    expect(nextDetent('full')).toBe('peek');
    expect(grabberLabel('closed')).toBe('Sheet closed; press for half height');
  });
});

describe('opening from the tab bar edge', () => {
  it('follows the finger up and opens at half on an upward release', () => {
    const { state, motion } = motionFrom('closed');
    const edge = edgeDragTarget(state, motion);
    edge.grab();
    edge.drag(-200);
    expect(state.axis.value).toBe(DETENTS.closed - 200);
    edge.release(-600);
    expect(state.detent).toBe('half');
  });

  it('opens at half even when the flick would carry it to full', () => {
    const { state, motion } = motionFrom('closed');
    const edge = edgeDragTarget(state, motion);
    edge.grab();
    edge.drag(-300);
    edge.release(-4000);
    expect(state.detent).toBe('half');
  });

  it('falls back closed after a short, slow pull', () => {
    const { state, motion } = motionFrom('closed');
    const edge = edgeDragTarget(state, motion);
    edge.grab();
    edge.drag(-20);
    edge.release(0);
    expect(state.detent).toBe('closed');
  });
});

describe('sheet actions', () => {
  const setUp = () => {
    const setDetent = vi.fn();
    const select = vi.fn();
    return { setDetent, select, actions: sheetActions(setDetent, select) };
  };

  it('Globe and Done close the sheet', () => {
    const { setDetent, actions } = setUp();
    actions.close();
    expect(setDetent).toHaveBeenLastCalledWith('closed');
  });

  it('the pill and Sites open the picker at full', () => {
    const { setDetent, actions } = setUp();
    actions.open();
    expect(setDetent).toHaveBeenLastCalledWith('full');
  });

  it('a picked site is selected and shown at half', () => {
    const { setDetent, select, actions } = setUp();
    actions.pick('apollo11');
    expect(select).toHaveBeenCalledWith('apollo11');
    expect(setDetent).toHaveBeenLastCalledWith('half');
  });
});

/** An in-memory session storage. */
function memoryStorage(): DetentStorage & { items: Map<string, string> } {
  const items = new Map<string, string>();
  return { items, getItem: (key) => items.get(key) ?? null, setItem: (key, value) => void items.set(key, value) };
}

describe('sheet memory', () => {
  it('starts at half the first time, then where the session left it', () => {
    const storage = memoryStorage();
    expect(readSheetDetent(storage)).toBe('half');
    saveSheetDetent(storage, 'closed');
    expect(readSheetDetent(storage)).toBe('closed');
    saveSheetDetent(storage, 'peek');
    expect(readSheetDetent(storage)).toBe('peek');
  });

  it('keeps the picker as half', () => {
    const storage = memoryStorage();
    saveSheetDetent(storage, 'full');
    expect(readSheetDetent(storage)).toBe('half');
  });

  it('ignores a value it did not write', () => {
    const storage = memoryStorage();
    storage.items.set('ventana.sheet-detent', 'sideways');
    expect(readSheetDetent(storage)).toBe('half');
  });

  it('falls back to half when there is no storage or it refuses access', () => {
    const refusing: DetentStorage = {
      getItem: () => {
        throw new DOMException('denied', 'SecurityError');
      },
      setItem: () => {
        throw new DOMException('full', 'QuotaExceededError');
      },
    };
    expect(readSheetDetent(null)).toBe('half');
    expect(readSheetDetent(refusing)).toBe('half');
    expect(() => saveSheetDetent(refusing, 'closed')).not.toThrow();
    expect(() => saveSheetDetent(null, 'closed')).not.toThrow();
  });
});

describe('globe viewport beside the sheet', () => {
  // The phone's globe viewport: the screen less the 290 px the sheet at half covers.
  const VIEWPORT = HEIGHT - 290;

  it('stays put while the sheet covers its lower part', () => {
    expect(viewportShift(DETENTS.half, VIEWPORT, HEIGHT)).toBe(0);
    expect(viewportShift(DETENTS.full, VIEWPORT, HEIGHT)).toBe(0);
  });

  it('slides down to sit centred between the bars once the sheet is closed', () => {
    expect(viewportShift(DETENTS.closed, VIEWPORT, HEIGHT)).toBe(145);
  });

  it('slides part of the way at peek, so the move follows the sheet', () => {
    const peek = viewportShift(DETENTS.peek, VIEWPORT, HEIGHT);
    expect(peek).toBeGreaterThan(0);
    expect(peek).toBeLessThan(145);
  });
});
