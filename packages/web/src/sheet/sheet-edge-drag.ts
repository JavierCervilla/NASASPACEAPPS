/**
 * Opening a closed sheet by dragging up from the tab bar's edge: the
 * sheet rises 1:1 under the finger (it is off-screen, so the first pixels
 * of travel only bring its edge into view), and a release that the
 * momentum projection carries above closed opens it at half; otherwise it
 * goes back down.
 */
import type { SheetDragTarget } from './sheet-drag';
import type { SheetMotion } from './sheet-motion';
import { releaseDetent } from './sheet-physics';
import type { SheetState } from './sheet-state';

/** The drag target of the edge, over the sheet's own motion. */
export function edgeDragTarget(
  state: SheetState,
  motion: SheetMotion,
): SheetDragTarget {
  return {
    grab: () => motion.grab(),
    drag: (dy) => motion.drag(dy),
    release: (vy) => {
      const lands = releaseDetent(state.detents, state.axis.value, vy);
      motion.moveTo(lands === 'closed' ? 'closed' : 'half', vy);
    },
  };
}
