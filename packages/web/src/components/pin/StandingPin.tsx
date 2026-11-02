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
 * The pin standing on its point (VENT-10, VENT-37, validated canvas «Pin
 * C»), on the globe or the polar map: a ring with a dot at its centre,
 * the exact point, and no stem. The dot and the ring around it wear the
 * state there at the shared instant (the selection's, so it matches the
 * card), the dot hollow while that state is the simulator's. A solid ring
 * and its dot always tell it from an approximate zone's dashed ring. A
 * tap selects its point again; a drag, or Enter, lifts it again. While it
 * is carried it stays, invisible, so the keyboard's focus is not lost.
 * Its mark is keyed by the point, so each drop plays the drop again, and
 * its halo by the state, so a new state pulses it again.
 */
import { useRef } from 'react';
import { customId } from '../../pin/custom-point';
import { stateAtPoint } from '../../pin/sky-state';
import type { DropSurface } from '../../pin/surfaces';
import type { LatLon } from '../../lib/polar-projection';
import type { NowState } from '../../phone/widget-types';
import { formatCoords } from '../../i18n/format';
import { useI18n } from '../i18n-context';
import { usePin, useInstant, useWatched } from './context';
import { liftHandlers } from './lift-handlers';
import { useStanding, useStandingPoint } from './use-standing';

interface Props {
  readonly surface: DropSurface | null;
  /** The selected site's id. */
  readonly selected: string;
  /** Selects the site `id` (a tap on the pin selects its point). */
  readonly onSelect: (id: string) => void;
}

/**
 * The state at `point` at the shared instant: the selection's when it is
 * this point, so it matches the card; null before the page runs.
 */
function useStateAt(selected: string, point: LatLon | null): NowState | null {
  const kit = usePin();
  const feed = useWatched(kit?.selectedState ?? null, null);
  const atMs = useInstant(kit);
  if (!kit || !point || atMs === null) return null;
  if (selected === customId(point) && feed) return feed;
  return stateAtPoint(point, atMs);
}

/**
 * The ring and its dot; the halo is keyed by the state, so a new state
 * pulses it again (styles/pin.css).
 */
function PinMark({ state }: { readonly state: NowState | null }) {
  return (
    <span className="pin__mark" aria-hidden="true">
      <span key={state} className="pin__halo" />
    </span>
  );
}

export function StandingPin({ surface, selected, onSelect }: Props) {
  const kit = usePin();
  const i18n = useI18n();
  const ref = useRef<HTMLButtonElement>(null);
  const { point, carried } = useStandingPoint(kit);
  useStanding(ref, surface, point);
  const state = useStateAt(selected, point);
  if (!kit || !point || !surface) return null;
  const id = customId(point);
  const handlers = liftHandlers(kit, () => onSelect(id));
  const coords = formatCoords(i18n, point.lat, point.lonEast);
  return (
    <button
      ref={ref}
      type="button"
      className="pin"
      data-carried={carried}
      data-state={state ?? 'unknown'}
      aria-label={i18n.t('pin.label', { coords })}
      {...handlers}
    >
      <PinMark key={id} state={state} />
    </button>
  );
}
