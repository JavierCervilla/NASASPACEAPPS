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
 * Holds the one carry of the astronaut at a time (VENT-10): what it shows,
 * read again whenever the Moon moves under it, and how the last one ended,
 * for the views that follow it (the phone sheet steps aside while it is
 * carried, the screen reader hears where it was dropped).
 */
import type { LatLon } from '../lib/polar-projection';
import {
  createWatchedValue,
  type WatchedValue,
} from '../lib/watched-value';
import { viewAt, type CarryView, type ReadoutDeps } from './carry-view';
import {
  CarrySession,
  type SessionDeps,
  type SessionStart,
} from './carry-session';

/** How a carry ended: dropped at a point, or back where it came from. */
export type CarryEnd =
  | { readonly kind: 'dropped'; readonly point: LatLon }
  | { readonly kind: 'back'; readonly cancelled: boolean };

export interface Carrier {
  readonly view: WatchedValue<CarryView | null>;
  /** The last carry's end; a new object each time. */
  readonly ended: WatchedValue<CarryEnd | null>;
  /** Lifts the astronaut; null while it is already carried. */
  lift(start: SessionStart): CarrySession | null;
  /** The carry under way, walking home included; null when none is. */
  current(): CarrySession | null;
}

export type CarrierDeps = Omit<SessionDeps, 'view' | 'onDrop' | 'onBack'> & {
  /** Stands the astronaut on the dropped point (places.ts). */
  readonly drop: (point: LatLon) => void;
};

/** A session that reports its end to `end`. */
function sessionOf(
  deps: CarrierDeps,
  view: Carrier['view'],
  end: (outcome: CarryEnd) => void,
  start: SessionStart,
): CarrySession {
  const onDrop = (point: LatLon): void => {
    deps.drop(point);
    end({ kind: 'dropped', point });
  };
  const onBack = (cancelled: boolean): void => end({ kind: 'back', cancelled });
  return new CarrySession({ ...deps, view, onDrop, onBack }, start);
}

/**
 * Reads again what is under the carried feet: the Moon moved under them
 * (the globe zoomed, turned or was re-framed), not the pointer. Only a
 * new point or state is set, so a turning globe redraws nothing else.
 */
function repick(deps: ReadoutDeps, view: Carrier['view']): void {
  const now = view.get();
  if (now?.phase !== 'carry') return;
  const next = viewAt(deps, now, now.feet);
  const same = next.point?.lat === now.point?.lat
    && next.point?.lonEast === now.point?.lonEast
    && next.state === now.state;
  if (!same) view.set(next);
}

export function createCarrier(deps: CarrierDeps): Carrier {
  const view = createWatchedValue<CarryView | null>(null);
  const ended = createWatchedValue<CarryEnd | null>(null);
  let session: CarrySession | null = null;
  let unwatch = (): void => undefined;
  const end = (outcome: CarryEnd): void => {
    unwatch();
    session = null;
    ended.set(outcome);
  };
  return {
    view,
    ended,
    lift: (start) => {
      if (session) return null;
      session = sessionOf(deps, view, end, start);
      unwatch = deps.surfaces.subscribe(() => repick(deps, view));
      return session;
    },
    current: () => session,
  };
}
