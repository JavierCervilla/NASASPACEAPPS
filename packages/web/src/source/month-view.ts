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
 * What the views show of a site's month for the chosen data source, from
 * the API's answer (Horizons) and the simulator's hours. With Horizons
 * chosen, the computed hours stand in while Horizons is on its way, marked
 * as computed (the hollow dot); a failed request stays an honest error.
 * With Computed chosen, the computed hours always. With Compare, Horizons
 * as with Horizons, and both sides for the comparison once both are in.
 * Pure.
 */
import type { HourSample } from '@ventana/sim';
import type { HoursResult } from '../phone/widgets-loader';
import type { DataSource } from './data-source';

/** Where the comparison stands; off outside Compare. */
export type CompareState =
  | { readonly kind: 'off' | 'pending' | 'unavailable' }
  | { readonly kind: 'ready'; readonly computed: readonly HourSample[] };

export interface MonthView {
  /** The hours the views show. */
  readonly result: HoursResult;
  /** Whether those hours are the simulator's. */
  readonly computed: boolean;
  readonly compare: CompareState;
}

function compareOf(
  source: DataSource,
  horizons: HoursResult,
  computed: readonly HourSample[] | null,
): CompareState {
  if (source !== 'compare' || horizons.kind === 'outside') {
    return { kind: 'off' };
  }
  if (horizons.kind === 'loading') return { kind: 'pending' };
  if (horizons.kind === 'error' || !computed) return { kind: 'unavailable' };
  return { kind: 'ready', computed };
}

/** The month the views show, and how it compares. */
export function monthView(
  source: DataSource,
  horizons: HoursResult,
  computed: readonly HourSample[] | null,
): MonthView {
  const compare = compareOf(source, horizons, computed);
  const sim = computed ? { kind: 'ready', hours: computed } as const : null;
  const standIn = source === 'computed' || horizons.kind === 'loading';
  if (sim && standIn) return { result: sim, computed: true, compare };
  return { result: horizons, computed: false, compare };
}
