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
 * A scrolling summary inside the sheet (sheet-scroll.ts), as an iOS sheet
 * treats it (VENT-44): while the sheet sits at its top, a finger pulling
 * down on the summary's top drags the sheet, and any other move scrolls
 * the summary; below its top, the summary drags the sheet like any other
 * content. `data-sheet-pull` gives CSS the touch-action that lets the
 * browser keep the scrolls (styles/phone.css): it must be set before the
 * touch starts, so it follows every scroll and every frame of the sheet.
 */
import type { DragAllowance } from './sheet-drag';
import type { SheetState } from './sheet-state';

type SheetPull = 'any' | 'down' | 'none';

const SCROLLING_FIT = '[data-sheet-fit][data-sheet-scroll]';

const ALLOWS: Record<SheetPull, DragAllowance> = {
  any: true,
  down: 'down',
  none: false,
};

/** What a press on the summary may do, from where sheet and summary are. */
function pullOf(atTop: boolean, scrollTop: number): SheetPull {
  if (!atTop) return 'any';
  return scrollTop <= 0 ? 'down' : 'none';
}

/** Marks the scrolling summary in `sheet` with its pull; a no-op without. */
function markPull(sheet: HTMLElement, atTop: boolean): void {
  const fit = sheet.querySelector<HTMLElement>(SCROLLING_FIT);
  if (!fit) return;
  const pull = pullOf(atTop, fit.scrollTop);
  if (fit.dataset.sheetPull !== pull) fit.dataset.sheetPull = pull;
}

/** Whether `state` sits at its top detent (or above it, stretched). */
function atTop(state: SheetState): boolean {
  return state.axis.value <= state.detents.full + 0.5;
}

/** What the sheet's mount reads from the pull of its summary. */
interface PullParts {
  readonly canDrag: (event: PointerEvent) => DragAllowance;
  readonly onEdge: (top: number) => void;
}

/**
 * The pull of `sheet`'s scrolling summary over `parts`: `canDrag` lets a
 * press on the summary drag as its pull says, read when the press starts,
 * and `onEdge` marks the pull on every frame of the sheet, as each scroll
 * does until `dispose`.
 */
export function sheetPull(
  sheet: HTMLElement,
  state: SheetState,
  parts: PullParts,
): PullParts & { readonly dispose: () => void } {
  const mark = (): void => markPull(sheet, atTop(state));
  // A scroll does not bubble: it is caught on its way down.
  sheet.addEventListener('scroll', mark, true);
  const canDrag = (event: PointerEvent): DragAllowance => {
    const target = event.target as Element | null;
    const fit = target?.closest<HTMLElement>(SCROLLING_FIT);
    if (!fit) return parts.canDrag(event);
    return ALLOWS[pullOf(atTop(state), fit.scrollTop)];
  };
  const onEdge = (top: number): void => {
    parts.onEdge(top);
    mark();
  };
  const dispose = (): void => sheet.removeEventListener('scroll', mark, true);
  return { canDrag, onEdge, dispose };
}
