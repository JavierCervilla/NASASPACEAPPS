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
 * The benchmark's address parameter and its fixed instant (VENT-81):
 * `?bench` (any value, or none) loads the scripted benchmark once the page
 * has started (bench-loader.ts), and the page's shared instant stands still
 * at {@link BENCH_INSTANT_ISO}, so every run sees the same Sun, Earth and
 * sky. Pure: the address comes in.
 */

/** The address parameter that turns the benchmark on. */
export const BENCH_PARAM = 'bench';

/**
 * The instant every benchmark run shows, the human's choice: outside the
 * API's Horizons window, so the views use no ephemeris request and the
 * on-foot view's sky is the simulator's alone.
 */
export const BENCH_INSTANT_ISO = '1967-03-19T12:00:00Z';

/** Whether the address asks for the benchmark. */
export const benchAsked = (search: string): boolean =>
  new URLSearchParams(search).has(BENCH_PARAM);

/** A clock fixed at the bench instant under `?bench`; null otherwise. */
export function benchClock(search: string): (() => number) | null {
  if (!benchAsked(search)) return null;
  const atMs = Date.parse(BENCH_INSTANT_ISO);
  return () => atMs;
}
