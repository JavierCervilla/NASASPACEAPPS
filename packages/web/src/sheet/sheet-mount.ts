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
 * which the full sheet stays under, and the content the half sheet
 * rises to fit (sheet-lift.ts).
 */
import { createLoop, type Loop } from '../globe/loop';
import { bindSheetDrag } from './sheet-drag';
import { edgeDragTarget } from './sheet-edge-drag';
import { halfLiftPx, watchLift } from './sheet-lift';
import { SheetMotion } from './sheet-motion';
import { scrollingHalf } from './sheet-scroll';
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
}

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
    // CSS pauses what loops inside while the sheet moves (styles/dsn.css).
    el.toggleAttribute('data-moving', moving);
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

/** The sheet's element, the top bar over it and the tab bar under it. */
interface Frame {
  readonly el: HTMLElement;
  readonly bar: HTMLElement | null;
  readonly tabs: HTMLElement | null;
}

/**
 * The canvas's layout, with the full sheet `BAR_GAP_PX` under the bar's
 * bottom edge when the bar outgrows the canvas's (large text), and the
 * half sheet raised until its content clears the tab bar.
 */
function layoutUnder(frame: Frame): SheetLayout {
  const { el, bar, tabs } = frame;
  const bottom = bar ? bar.getBoundingClientRect().bottom : 0;
  const fullGapPx = Math.max(SHEET_LAYOUT.fullGapPx, bottom + BAR_GAP_PX);
  const base = SHEET_LAYOUT.halfPx;
  const halfPx = base + halfLiftPx(el, tabs, base);
  return { ...SHEET_LAYOUT, fullGapPx, halfPx };
}

/**
 * Moves the sheet to its detent again when the viewport resizes, when
 * the bar's height moves the full detent, or when the lift of the half
 * sheet it rests at changes, and lets a content taller than the full
 * sheet scroll (sheet-scroll.ts); returns the unwatch function.
 */
function watchLayout(frame: Frame, state: SheetState, motion: SheetMotion) {
  const { el, bar, tabs } = frame;
  // Only the half detent moves with the lift; the others read it on the
  // next move. A content taller than the full sheet scrolls in it.
  const halfOf = scrollingHalf(el, tabs, () => layoutUnder(frame));
  const resize = (): void => {
    halfOf();
    motion.moveTo(state.detent);
  };
  const fullMoved = (): boolean =>
    layoutUnder(frame).fullGapPx !== state.detents.full;
  const barResized = (): void => {
    if (fullMoved()) resize();
  };
  const observer = new ResizeObserver(barResized);
  if (bar) observer.observe(bar);
  const unwatchLift = watchLift(el, tabs, halfOf, () => {
    if (state.detent === 'half') resize();
  });
  window.addEventListener('resize', resize);
  return (): void => {
    observer.disconnect();
    unwatchLift();
    window.removeEventListener('resize', resize);
  };
}

/** Starts the sheet on `el` at `options.start`; returns its handle. */
export function mountSheet(
  el: HTMLElement,
  options: SheetMountOptions,
): MountedSheet {
  const heightPx = (): number => window.innerHeight;
  const frame = { el, bar: options.bar, tabs: options.edge };
  const layout = (): SheetLayout => layoutUnder(frame);
  const detents = detentsFor(heightPx(), layout());
  const state = createSheetState(detents, options.start);
  const loop = sheetLoop(el, state, options);
  const invalidate = (): void => loop.invalidate();
  const { reducedMotion, onDetent } = options;
  const deps = { heightPx, layout, reducedMotion, invalidate, onDetent };
  const motion = new SheetMotion(state, deps);
  const unbind = bindDrags(el, { state, motion, options });
  const unwatch = watchLayout(frame, state, motion);
  placeSheet(el, state.axis.value, state.detents);
  invalidate();
  const dispose = (): void => {
    loop.stop();
    unbind();
    unwatch();
  };
  return { motion, dispose };
}
