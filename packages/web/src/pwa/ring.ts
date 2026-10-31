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
 * The legend ring of the app icon «J2»: a dark track and three arcs from
 * 12 o'clock clockwise, Sun 0-60°, window 60-120°, Earth 120-180°, in
 * the signal colours (styles/tokens.css). The live favicon emphasises
 * the arc of the selected site's state and dims the others. Pure.
 */
import type { NowState } from '../phone/widget-types';

/** The arcs' states: «none» has no arc of its own. */
export type ArcState = Exclude<NowState, 'none'>;

export interface Arc {
  readonly state: ArcState;
  readonly colour: string;
  /** Degrees clockwise from 12 o'clock. */
  readonly from: number;
  readonly to: number;
}

export const ARCS: readonly Arc[] = [
  { state: 'sun', colour: '#f5c542', from: 0, to: 60 },
  { state: 'window', colour: '#3ddc84', from: 60, to: 120 },
  { state: 'earth', colour: '#4a9cff', from: 120, to: 180 },
];

export const TRACK = '#1a1d24';
export const BACKGROUND = '#07080b';

/** A dimmed arc's opacity, as the approved reference draws it. */
export const DIMMED = 0.25;

/**
 * Each arc's opacity for the site's `state`: its own arc whole and the
 * others dimmed; the full legend when the state is «none» or unknown.
 */
export function ringEmphasis(
  state: NowState | null,
): Readonly<Record<ArcState, number>> {
  const lit = (arc: ArcState): number =>
    state === null || state === 'none' || state === arc ? 1 : DIMMED;
  return { sun: lit('sun'), window: lit('window'), earth: lit('earth') };
}
