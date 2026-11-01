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
 * Tells listeners that the drop surfaces' points moved (VENT-10), bound
 * to the surfaces' drawn frames only while someone listens (a carry), so
 * an idle globe's frames reach nothing here.
 */
import type { DropSurface } from './surfaces';

interface Binding {
  readonly surface: DropSurface;
  readonly listener: () => void;
  readonly stop: () => void;
}

/** Binds `listener` to `surface`'s frames, if it tells them. */
function bindTo(
  bindings: Set<Binding>,
  surface: DropSurface,
  listener: () => void,
): void {
  const stop = surface.subscribe?.(listener);
  if (stop) bindings.add({ surface, listener, stop });
}

/** Undoes the bindings that `matches`. */
function unbindWhere(
  bindings: Set<Binding>,
  matches: (binding: Binding) => boolean,
): void {
  for (const binding of [...bindings].filter(matches)) {
    binding.stop();
    bindings.delete(binding);
  }
}

export interface SurfaceMoves {
  /** A surface was added: the live listeners hear it; returns its undo. */
  track(surface: DropSurface): () => void;
  /** Hears every surface's moves until the returned unsubscribe. */
  subscribe(listener: () => void): () => void;
}

/** The moves of the surfaces in `list`, which the caller keeps. */
export function createSurfaceMoves(
  list: ReadonlySet<DropSurface>,
): SurfaceMoves {
  const listeners = new Set<() => void>();
  const bindings = new Set<Binding>();
  return {
    track: (surface) => {
      listeners.forEach((l) => bindTo(bindings, surface, l));
      return () => unbindWhere(bindings, (b) => b.surface === surface);
    },
    subscribe: (listener) => {
      listeners.add(listener);
      list.forEach((surface) => bindTo(bindings, surface, listener));
      return () => {
        listeners.delete(listener);
        unbindWhere(bindings, (b) => b.listener === listener);
      };
    },
  };
}
