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
 * The astronaut standing on its point (VENT-10), on the globe or the polar
 * map: its visor wears the state there at the shared instant (the
 * selected site's, when it is the selection, so it matches the card). A
 * tap selects its point again; a drag, or Enter, lifts it again. While it
 * is carried it stays, invisible, so the keyboard's focus is not lost.
 */
import { useRef } from 'react';
import { customId } from '../../astronaut/custom-point';
import type { Visor } from '../../astronaut/figure-types';
import { stateAtPoint } from '../../astronaut/sky-state';
import type { DropSurface } from '../../astronaut/surfaces';
import type { LatLon } from '../../lib/polar-projection';
import { formatCoords } from '../../i18n/format';
import { useI18n } from '../i18n-context';
import { useAstronaut, useInstant, useWatched } from './context';
import { Figure } from './Figure';
import { liftHandlers } from './lift-handlers';
import { useStanding, useStandingPoint } from './use-standing';

interface Props {
  readonly surface: DropSurface | null;
  /** The selected site's id. */
  readonly selected: string;
  /** Selects the site `id` (a tap on the figure selects its point). */
  readonly onSelect: (id: string) => void;
}

/**
 * The visor's state at `point` at the shared instant: the selection's
 * when it is this point, so it matches the card.
 */
function useVisor(selected: string, point: LatLon | null): Visor {
  const kit = useAstronaut();
  const feed = useWatched(kit?.selectedState ?? null, null);
  const atMs = useInstant(kit);
  if (!kit || !point || atMs === null) return 'idle';
  if (selected === customId(point) && feed) return feed;
  return stateAtPoint(point, atMs);
}

export function StandingAstronaut({ surface, selected, onSelect }: Props) {
  const kit = useAstronaut();
  const i18n = useI18n();
  const ref = useRef<HTMLButtonElement>(null);
  const { point, carried } = useStandingPoint(kit);
  useStanding(ref, surface, point);
  const visor = useVisor(selected, point);
  if (!kit || !point || !surface) return null;
  const select = (): void => onSelect(customId(point));
  const handlers = liftHandlers(kit, select);
  const coords = formatCoords(i18n, point.lat, point.lonEast);
  return (
    <button
      ref={ref}
      type="button"
      className="astro-pin"
      data-carried={carried}
      data-visor={visor}
      aria-label={i18n.t('astro.pin.label', { coords })}
      {...handlers}
    >
      <Figure pose="stand" visor={visor} />
    </button>
  );
}
