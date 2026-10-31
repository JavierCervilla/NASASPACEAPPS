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
 * Everything the astronaut's views share (VENT-10), made once per page:
 * where it is, the carry under way, the places to drop it on, its
 * pictures, and what the live region says.
 */
import type { TimeStore } from '../calendar/time-store';
import type { I18n } from '../i18n/translate';
import type { LatLon } from '../lib/polar-projection';
import {
  createWatchedValue,
  type WatchedValue,
} from '../lib/watched-value';
import type { SiteStore } from '../phone/site-store';
import type { NowState } from '../phone/widget-types';
import { describeCarry, describeDrop } from './announce';
import { createCarrier, type Carrier, type CarryEnd } from './carrier';
import type { CarryView } from './carry-view';
import type { FigureImages } from './figure-types';
import { carryByKeys } from './key-carry';
import { createPlaces, type Address, type Places } from './places';
import { stateAtPoint } from './sky-state';
import { createSurfaces, type ClientPoint, type Surfaces } from './surfaces';

export interface KitDeps {
  readonly store: SiteStore;
  readonly time: Pick<TimeStore, 'get' | 'subscribe'>;
  /** The selected site's state, as the views show it. */
  readonly selectedState: WatchedValue<NowState | null>;
  readonly i18n: I18n;
  readonly address: Address;
  /** The selected site's point, where the keyboard's carry starts. */
  readonly startPoint: () => LatLon | null;
  readonly reducedMotion: () => boolean;
}

export interface AstronautKit {
  readonly places: Places;
  readonly time: KitDeps['time'];
  readonly selectedState: KitDeps['selectedState'];
  readonly carrier: Carrier;
  readonly surfaces: Surfaces;
  /** Its pictures once drawn; null until then, or if they cannot be. */
  readonly figures: WatchedValue<FigureImages | null>;
  /**
   * Whether the pictures may be drawn: set once the globe has taken over
   * (its first map is on, it gave up, or its splash timed out), so their
   * second WebGL renderer never competes with the globe's start.
   */
  readonly figuresDue: WatchedValue<boolean>;
  /** What the polite live region says. */
  readonly live: WatchedValue<string>;
  /** The state of `point` at the shared instant. */
  readonly stateAt: (point: LatLon) => ReturnType<typeof stateAtPoint>;
  readonly reducedMotion: () => boolean;
  /** Lifts it for the keyboard, walking back to `home` if cancelled. */
  readonly keys: (home: ClientPoint) => boolean;
  /** Stops following the store. */
  readonly stop: () => void;
}

/** What the live region says when a carry ends. */
function sayEnd(
  kit: Pick<AstronautKit, 'live' | 'stateAt'>,
  i18n: I18n,
  end: CarryEnd | null,
): void {
  if (end?.kind === 'dropped') {
    kit.live.set(describeDrop(i18n, end.point, kit.stateAt(end.point)));
  } else if (end?.cancelled) {
    kit.live.set(i18n.t('astro.say.cancelled'));
  }
}

/** The next animation frame, and how to cancel it. */
const nextFrame = (fn: (ms: number) => void): (() => void) => {
  const id = requestAnimationFrame(fn);
  return () => cancelAnimationFrame(id);
};

/** The carrier: what is under the feet, and where a drop stands it. */
function carrierOf(
  deps: KitDeps,
  places: Places,
  surfaces: Surfaces,
  stateAt: AstronautKit['stateAt'],
): Carrier {
  const { reducedMotion } = deps;
  const drop = places.drop;
  const frame = nextFrame;
  return createCarrier({ surfaces, stateAt, drop, reducedMotion, frame });
}

export function createKit(deps: KitDeps): AstronautKit {
  const { i18n, time, selectedState, startPoint, reducedMotion } = deps;
  const stateAt = (point: LatLon) => stateAtPoint(point, time.get().atMs);
  const hit = ({ x, y }: ClientPoint) => document.elementFromPoint(x, y);
  const surfaces = createSurfaces(hit);
  const places = createPlaces(deps.store, deps.address);
  const carrier = carrierOf(deps, places, surfaces, stateAt);
  const live = createWatchedValue('');
  const say = (view: CarryView, first: boolean): void =>
    live.set(describeCarry(i18n, view, first));
  const keys = (home: ClientPoint): boolean =>
    carryByKeys(home, { carrier, surfaces, startPoint, say });
  const figures = createWatchedValue<FigureImages | null>(null);
  const figuresDue = createWatchedValue(false);
  const parts = { places, carrier, surfaces, figures, figuresDue, live };
  const shared = { ...parts, stateAt };
  const kit = { ...shared, time, selectedState, reducedMotion, keys };
  const ends = carrier.ended.subscribe(() =>
    sayEnd(kit, i18n, carrier.ended.get()));
  return { ...kit, stop: () => [places.stop, ends].forEach((fn) => fn()) };
}
