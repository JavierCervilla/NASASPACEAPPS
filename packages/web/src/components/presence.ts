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
 * A surface that leaves along the path it came in (apple-design §7):
 * while `shown` it is mounted `in`; once hidden it stays mounted `out` for
 * the exit (styles/presence.css), then unmounts. The exit is the
 * stylesheet's `--dur-enter`, so the way out mirrors the way in, and its
 * `--dur-fade` under reduced motion, where the exit is a plain fade.
 */
import { useEffect, useState } from 'react';
import { BROWSER_TIMERS, type Timers } from '../lib/timers';

/** How long the exit runs, ms: `--dur-enter` in styles/tokens.css. */
export const EXIT_MS = 400;

/** How long the reduced-motion fade runs, ms: `--dur-fade` (tokens.css). */
export const FADE_MS = 200;

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/** How long a leaving surface stays mounted: the exit actually run. */
export function exitMs(reducedMotion: boolean): number {
  return reducedMotion ? FADE_MS : EXIT_MS;
}

const prefersReducedMotion = (): boolean =>
  window.matchMedia(REDUCED_MOTION).matches;

export type PresencePhase = 'in' | 'out';

export interface Presence {
  /** Whether the surface is in the page, its exit included. */
  readonly mounted: boolean;
  /** `data-presence`: arriving or shown, or leaving. */
  readonly phase: PresencePhase;
}

/**
 * Keeps a hidden surface mounted through its exit; `reducedMotion` is read
 * as the exit starts, so it follows a change of the setting.
 */
export function usePresence(
  shown: boolean,
  timers: Timers = BROWSER_TIMERS,
  reducedMotion: () => boolean = prefersReducedMotion,
): Presence {
  const [leaving, setLeaving] = useState(false);
  const [wasShown, setWasShown] = useState(shown);
  if (shown !== wasShown) {
    setWasShown(shown);
    setLeaving(!shown);
  }
  useEffect(() => {
    if (!leaving) return undefined;
    const ms = exitMs(reducedMotion());
    const handle = timers.setTimeout(() => setLeaving(false), ms);
    return () => timers.clearTimeout(handle);
  }, [leaving, timers, reducedMotion]);
  return { mounted: shown || leaving, phase: shown ? 'in' : 'out' };
}
