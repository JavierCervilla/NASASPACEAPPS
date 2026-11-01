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
 * Mounts the sheet's physics on its element: the state, the frame loop
 * that draws it, the drag gestures (on the sheet, and on the edge that
 * opens it when closed), the viewport resize, the top bar's height,
 * which the full sheet stays under, and the foot's, which half and peek
 * stay above.
 */
import { createLoop, type Loop } from '../globe/loop';
import { bindSheetDrag } from './sheet-drag';
import { edgeDragTarget } from './sheet-edge-drag';
import { SheetMotion } from './sheet-motion';
import {
  detentsFor,
  SHEET_LAYOUT,
  type DetentName,
  type SheetLayout,
} from './sheet-physics';
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
  /** The top bar the full sheet stays under; null: the canvas's gap. */
  readonly bar: HTMLElement | null;
  /**
   * The row at the screen's foot that holds the tab bar (`edge`) and the
   * astronaut's dock (VENT-10); null: the tab bar alone.
   */
  readonly foot: HTMLElement | null;
}

/** The elements the detents are measured from. */
type Frame = Pick<SheetMountOptions, 'bar' | 'edge' | 'foot'>;

/** Room the full sheet keeps under the top bar. */
const BAR_GAP_PX = 12;

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

/**
 * The canvas's layout, with the full sheet `BAR_GAP_PX` under `bar`'s
 * bottom edge when the bar outgrows the canvas's (large text), and half
 * and peek raised by as much as the foot rises above the tab bar: when
 * the dock wraps over the bar's end (a narrow phone, large text), what
 * they show stays clear of it as it stays clear of the bar.
 */
function layoutUnder({ bar, edge, foot }: Frame): SheetLayout {
  const bottom = bar ? bar.getBoundingClientRect().bottom : 0;
  const fullGapPx = Math.max(SHEET_LAYOUT.fullGapPx, bottom + BAR_GAP_PX);
  const top = (el: HTMLElement | null) => el?.getBoundingClientRect().top;
  const rise = Math.max(0, (top(edge) ?? 0) - (top(foot) ?? Infinity));
  const halfPx = SHEET_LAYOUT.halfPx + rise;
  const peekPx = SHEET_LAYOUT.peekPx + rise;
  return { ...SHEET_LAYOUT, fullGapPx, halfPx, peekPx };
}

/**
 * Moves the sheet to its detent again when the viewport resizes, or when
 * the bar's or the foot's height moves a detent; returns the unwatch
 * function.
 */
function watchLayout(frame: Frame, state: SheetState, motion: SheetMotion) {
  const resize = (): void => motion.moveTo(state.detent);
  const moved = (): boolean => {
    const next = detentsFor(window.innerHeight, layoutUnder(frame));
    const now = state.detents;
    return next.full !== now.full || next.half !== now.half;
  };
  const barResized = (): void => {
    if (moved()) resize();
  };
  const observer = new ResizeObserver(barResized);
  for (const el of [frame.bar, frame.foot]) if (el) observer.observe(el);
  window.addEventListener('resize', resize);
  return (): void => {
    observer.disconnect();
    window.removeEventListener('resize', resize);
  };
}

/** Starts the sheet on `el` at `options.start`; returns its handle. */
export function mountSheet(
  el: HTMLElement,
  options: SheetMountOptions,
): MountedSheet {
  const heightPx = (): number => window.innerHeight;
  const layout = (): SheetLayout => layoutUnder(options);
  const detents = detentsFor(heightPx(), layout());
  const state = createSheetState(detents, options.start);
  const loop = sheetLoop(el, state, options);
  const invalidate = (): void => loop.invalidate();
  const { reducedMotion, onDetent } = options;
  const deps = { heightPx, layout, reducedMotion, invalidate, onDetent };
  const motion = new SheetMotion(state, deps);
  const unbind = bindDrags(el, { state, motion, options });
  const unwatch = watchLayout(options, state, motion);
  placeSheet(el, state.axis.value, state.detents);
  invalidate();
  const dispose = (): void => {
    loop.stop();
    unbind();
    unwatch();
  };
  return { motion, dispose };
}
