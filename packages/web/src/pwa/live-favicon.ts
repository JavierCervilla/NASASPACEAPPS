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
 * The live favicon: the app icon «J2» with the Moon in the phase of the
 * selected instant and the ring emphasising the selected site's state.
 * It redraws only when the frame or the state changes, at most once per
 * THROTTLE_MS, so playing time costs no per-frame work. The drawing and
 * the page come in as dependencies (favicon-dom.ts in the browser).
 */
import type { NowState } from '../phone/widget-types';
import type { IconPicture } from './icon-draw';
import type { PhaseSource } from './moon-phase';
import { frameIndex } from './phase-frames';
import { ringEmphasis } from './ring';

export const THROTTLE_MS = 250;
/** The favicon's canvas side: crisp at 32 px on 2x screens. */
export const FAVICON_SIZE = 64;

export interface FaviconDeps {
  readonly phase: PhaseSource;
  /** The phase frame `index`, loaded once. */
  readonly frame: (index: number) => Promise<CanvasImageSource>;
  /** Draws `picture` and returns it as an image address. */
  readonly paint: (picture: IconPicture) => string;
  /** Points the page's icon at `href`. */
  readonly show: (href: string) => void;
  readonly setTimer: (fn: () => void, ms: number) => number;
  readonly clearTimer: (id: number) => void;
}

export interface LiveFavicon {
  /** The instant or the state changed. */
  update(atMs: number, state: NowState | null): void;
  dispose(): void;
}

interface Wanted {
  readonly index: number;
  readonly state: NowState | null;
}

const keyOf = (w: Wanted): string => `${w.index}|${w.state ?? '-'}`;

/**
 * Draws `target` unless the favicon moved on while its frame loaded;
 * true once it shows with its Moon. A frame that failed to load leaves
 * the ring alone, to be drawn again with the next update.
 */
async function drawFrame(
  deps: FaviconDeps,
  target: Wanted,
  current: () => Wanted | null,
): Promise<boolean> {
  const moon = await deps.frame(target.index).catch(() => null);
  if (target !== current()) return false;
  const emphasis = ringEmphasis(target.state);
  deps.show(deps.paint({ size: FAVICON_SIZE, moon, emphasis }));
  return moon !== null;
}

/** A favicon that follows `update`, drawn through `deps`. */
export function createLiveFavicon(deps: FaviconDeps): LiveFavicon {
  let wanted: Wanted | null = null;
  let shown = '';
  let timer: number | null = null;
  const draw = async (): Promise<void> => {
    timer = null;
    const target = wanted;
    if (!target || keyOf(target) === shown) return;
    if (await drawFrame(deps, target, () => wanted)) shown = keyOf(target);
  };
  return {
    update: (atMs, state) => {
      const next = { index: frameIndex(deps.phase.phaseAt(atMs)), state };
      // The same wish keeps its identity: a draw in flight stays valid.
      if (!wanted || keyOf(wanted) !== keyOf(next)) wanted = next;
      if (keyOf(next) === shown) return;
      timer ??= deps.setTimer(() => void draw(), THROTTLE_MS);
    },
    dispose: () => {
      wanted = null;
      if (timer !== null) deps.clearTimer(timer);
    },
  };
}
