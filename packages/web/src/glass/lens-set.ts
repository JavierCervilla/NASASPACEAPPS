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
 * Keeps a lens (lens-surfaces.ts) on every Liquid surface on the page:
 * those there at the start and those that mount later (islands,
 * popovers), found by a rescan once the page's DOM has been
 * quiet for SETTLE_MS. A surface that leaves the page takes its filter
 * with it.
 */
import {
  drop, newLens, resized, SETTLE_MS, type Lens, type LensPage,
} from './lens-surfaces';

/** The surfaces that wear Liquid glass (styles/glass.css). */
export const LENS_SURFACES = [
  '.bar', '.phone-bar', '.tab-bar', '.sheet', '.site-popover',
  '.globe-layers', '.strip', '.card-block',
].join(', ');

interface LensState {
  readonly page: LensPage;
  readonly lenses: Map<HTMLElement, Lens>;
  readonly resize: ResizeObserver;
  /** Lenses made so far: every lens gets a fresh id. */
  made: number;
}

/** Passes each size change to its surface's lens. */
function watchSizes(page: LensPage,
  lenses: Map<HTMLElement, Lens>): ResizeObserver {
  return new ResizeObserver((entries) => {
    for (const entry of entries) {
      const el = entry.target as HTMLElement;
      const lens = lenses.get(el);
      if (lens) resized(page, el, lens, entry);
    }
  });
}

/** Forgets the surfaces that left the page, and lenses the new ones. */
function rescan(state: LensState): void {
  for (const [el, lens] of state.lenses) {
    if (el.isConnected) continue;
    drop(el, lens);
    state.lenses.delete(el);
    state.resize.unobserve(el);
  }
  const found = state.page.doc.querySelectorAll<HTMLElement>(LENS_SURFACES);
  for (const el of found) {
    if (state.lenses.has(el)) continue;
    state.lenses.set(el, newLens(`glass-lens-${++state.made}`));
    state.resize.observe(el);
  }
}

/** Rescans after the page's DOM has been quiet; returns its stop. */
function watchMounts(state: LensState): () => void {
  let pending: ReturnType<typeof setTimeout> | undefined;
  const mounts = new MutationObserver(() => {
    clearTimeout(pending);
    pending = setTimeout(() => rescan(state), SETTLE_MS);
  });
  mounts.observe(state.page.doc.body, { childList: true, subtree: true });
  return () => {
    clearTimeout(pending);
    mounts.disconnect();
  };
}

/** Lenses the page's surfaces until `stop`. */
export function lensSet(page: LensPage): { stop(): void } {
  const lenses = new Map<HTMLElement, Lens>();
  const resize = watchSizes(page, lenses);
  const state: LensState = { page, lenses, resize, made: 0 };
  const stopMounts = watchMounts(state);
  rescan(state);
  return {
    stop() {
      stopMounts();
      resize.disconnect();
      for (const [el, lens] of lenses) drop(el, lens);
      lenses.clear();
    },
  };
}
