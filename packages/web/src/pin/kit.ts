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
 * Everything the pin's views share (VENT-10, VENT-37), made once per page:
 * where it is, the carry under way, the places to drop it on, the
 * gesture that places it, and what the live region says.
 */
import type { TimeStore } from '../calendar/time-store';
import type { HorizonStore } from '../horizon/horizon-store';
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
import { after, nextFrame } from './clocks';
import type { CarryView } from './carry-view';
import { createPinHint, type HintStorage, type PinHint } from './first-hint';
import { carryByKeys, dropAtStart, type KeyCarryDeps } from './key-carry';
import { bindPlacing } from './place-gesture';
import { createPlaces, type Address, type Places } from './places';
import { type stateAtPoint, terrainStateAt } from './sky-state';
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
  /** Where the first-time hint's dismissal is kept; null: nowhere. */
  readonly storage: HintStorage | null;
  /** The points' terrain horizons the page has, or asks for (VENT-44). */
  readonly horizons: PointHorizons;
}

/** What the pin's views read of the points' terrain horizons. */
export type PointHorizons = Pick<
  HorizonStore,
  'cached' | 'prefetch' | 'terrain'
>;

export interface PinKit {
  readonly places: Places;
  readonly time: KitDeps['time'];
  readonly selectedState: KitDeps['selectedState'];
  readonly carrier: Carrier;
  readonly surfaces: Surfaces;
  /** What the polite live region says. */
  readonly live: WatchedValue<string>;
  /** The first-time hint. */
  readonly hint: PinHint;
  readonly horizons: PointHorizons;
  /**
   * The state of `point` at the shared instant, over its terrain when
   * the page already has that point's profile.
   */
  readonly stateAt: (point: LatLon) => ReturnType<typeof stateAtPoint>;
  readonly reducedMotion: () => boolean;
  /** Lifts it for the keyboard, springing back to `home` if cancelled. */
  readonly keys: (home?: ClientPoint) => boolean;
  /** Drops it at once over the selected site, or mid view. */
  readonly dropHere: () => void;
  /** Places it from presses on a surface's `host`; returns the unbind. */
  readonly placeOn: (host: HTMLElement) => () => void;
  /** Stops following the store. */
  readonly stop: () => void;
}

/** What the live region says when a carry ends. */
function sayEnd(
  kit: Pick<PinKit, 'live' | 'stateAt'>,
  i18n: I18n,
  end: CarryEnd | null,
): void {
  if (end?.kind === 'dropped') {
    kit.live.set(describeDrop(i18n, end.point, kit.stateAt(end.point)));
  } else if (end?.cancelled) {
    kit.live.set(i18n.t('pin.say.cancelled'));
  }
}

/** The carrier: what is under the pin, and where a drop stands it. */
function carrierOf(
  deps: KitDeps,
  places: Places,
  surfaces: Surfaces,
  stateAt: PinKit['stateAt'],
): Carrier {
  const { reducedMotion } = deps;
  const drop = places.drop;
  const frame = nextFrame;
  return createCarrier({ surfaces, stateAt, drop, reducedMotion, frame });
}

/** The element at a client point, where the surfaces look for the Moon. */
const elementAt = ({ x, y }: ClientPoint) => document.elementFromPoint(x, y);

export function createKit(deps: KitDeps): PinKit {
  const { i18n, time, selectedState, startPoint, reducedMotion } = deps;
  const stateAt = terrainStateAt(deps.horizons.cached, () => time.get().atMs);
  const surfaces = createSurfaces(elementAt);
  const places = createPlaces(deps.store, deps.address);
  const carrier = carrierOf(deps, places, surfaces, stateAt);
  const live = createWatchedValue('');
  const say = (view: CarryView, first: boolean): void =>
    live.set(describeCarry(i18n, view, first));
  const byKeys: KeyCarryDeps = { carrier, surfaces, startPoint, say };
  const actions = {
    keys: (home?: ClientPoint) => carryByKeys(byKeys, home),
    dropHere: () => dropAtStart(byKeys),
    placeOn: (host: HTMLElement) =>
      bindPlacing(host, { carrier, surfaces, after, keys: window }),
  };
  const hint = createPinHint(deps.storage, carrier);
  const shared = { places, carrier, surfaces, live, stateAt, hint };
  const kept = { time, selectedState, reducedMotion, horizons: deps.horizons };
  const kit = { ...shared, ...actions, ...kept };
  const ends = carrier.ended.subscribe(() =>
    sayEnd(kit, i18n, carrier.ended.get()));
  const stops = [places.stop, ends, hint.stop];
  return { ...kit, stop: () => stops.forEach((fn) => fn()) };
}
