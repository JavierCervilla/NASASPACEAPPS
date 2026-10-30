/**
 * Mounts the sheet's physics on its element: the state, the frame loop
 * that draws it, the drag gestures (on the sheet, and on the edge that
 * opens it when closed) and the viewport resize.
 */
import { createLoop, type Loop } from '../globe/loop';
import { bindSheetDrag } from './sheet-drag';
import { edgeDragTarget } from './sheet-edge-drag';
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
  /** Where a drag up opens the closed sheet (the tab bar); null: none. */
  readonly edge: HTMLElement | null;
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
    placeSheet(el, state.axis.value, state.detents);
    report.onOpenness(openness(state.detents, state.axis.value));
    report.onEdge(state.axis.value);
    return moving;
  });
}

interface DragParts {
  readonly state: SheetState;
  readonly motion: SheetMotion;
  readonly options: SheetMountOptions;
}

/**
 * Drags on the sheet, and on the edge while the sheet is closed; returns
 * the unbind function.
 */
function bindDrags(el: HTMLElement, parts: DragParts): () => void {
  const { state, motion, options } = parts;
  const unbind = bindSheetDrag(el, motion, options.canDrag);
  if (!options.edge) return unbind;
  const closed = (): boolean => state.detent === 'closed';
  const edge = edgeDragTarget(state, motion);
  const doc = options.edge.ownerDocument;
  const unbindEdge = bindSheetDrag(options.edge, edge, closed, doc);
  return () => {
    unbind();
    unbindEdge();
  };
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
  const unbind = bindDrags(el, { state, motion, options });
  const resize = (): void => motion.moveTo(state.detent);
  window.addEventListener('resize', resize);
  placeSheet(el, state.axis.value, state.detents);
  invalidate();
  const dispose = (): void => {
    loop.stop();
    unbind();
    window.removeEventListener('resize', resize);
  };
  return { motion, dispose };
}
