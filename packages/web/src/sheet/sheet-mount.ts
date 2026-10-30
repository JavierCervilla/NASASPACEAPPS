/**
 * Mounts the sheet's physics on its element: the state, the frame loop
 * that draws it, the drag gestures and the viewport resize.
 */
import { createLoop, type Loop } from '../globe/loop';
import { bindSheetDrag } from './sheet-drag';
import { SheetMotion } from './sheet-motion';
import { detentsFor, type DetentName } from './sheet-physics';
import {
  createSheetState,
  stepSheet,
  type SheetState,
} from './sheet-state';
import { openness, placeSheet } from './sheet-view';

export interface SheetMountOptions {
  readonly start: DetentName;
  readonly reducedMotion: () => boolean;
  readonly onDetent: (detent: DetentName) => void;
  /** Each frame, how far open past half the sheet is (0 to 1). */
  readonly onOpenness: (value: number) => void;
  /** Each frame, the sheet's top edge in px from the viewport's top. */
  readonly onEdge: (top: number) => void;
  /** Whether a press may drag the sheet (not inside a scrolling list). */
  readonly canDrag: (event: PointerEvent) => boolean;
}

export interface MountedSheet {
  readonly motion: SheetMotion;
  readonly dispose: () => void;
}

/** The frame loop that springs the sheet, draws it and reports it. */
function sheetLoop(
  el: HTMLElement,
  state: SheetState,
  report: Pick<SheetMountOptions, 'onOpenness' | 'onEdge'>,
): Loop {
  return createLoop((dt) => {
    const moving = stepSheet(state, dt);
    placeSheet(el, state.axis.value);
    report.onOpenness(openness(state.detents, state.axis.value));
    report.onEdge(state.axis.value);
    return moving;
  });
}

/** Starts the sheet on `el` at `options.start`; returns its handle. */
export function mountSheet(
  el: HTMLElement,
  options: SheetMountOptions,
): MountedSheet {
  const heightPx = (): number => window.innerHeight;
  const state = createSheetState(detentsFor(heightPx()), options.start);
  const loop = sheetLoop(el, state, options);
  const invalidate = (): void => loop.invalidate();
  const { reducedMotion, onDetent } = options;
  const deps = { heightPx, reducedMotion, invalidate, onDetent };
  const motion = new SheetMotion(state, deps);
  const unbind = bindSheetDrag(el, motion, options.canDrag);
  const resize = (): void => motion.moveTo(state.detent);
  window.addEventListener('resize', resize);
  placeSheet(el, state.axis.value);
  invalidate();
  const dispose = (): void => {
    loop.stop();
    unbind();
    window.removeEventListener('resize', resize);
  };
  return { motion, dispose };
}
