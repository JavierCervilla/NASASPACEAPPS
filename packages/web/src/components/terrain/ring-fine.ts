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
 * The fine real relief's part in the ring's run (VENT-69): whether the
 * view's tier reads it, where its tiles are asked, and the pause the run
 * takes between two slices of work.
 */
import { useSyncExternalStore } from 'react';
import { groundPolicy } from '../../terrain/ground-policy';
import { parseLeaveOut } from '../../terrain/leave-out';
import type { ViewTier } from '../../terrain/view-tier';

/** Lets the page draw and answer input between two slices of work. */
export const breathe = (): Promise<void> =>
  new Promise((done) => window.setTimeout(done, 0));

/**
 * Whether the view reads the fine real relief at its tier (VENT-69: only
 * high, and not under `?onfoot=fine`): a tier that does not never asks for
 * a fine tile.
 */
export function useFineAllowed(view: ViewTier): boolean {
  const { tier } = useSyncExternalStore(view.subscribe, view.get, view.get);
  return groundPolicy(tier, parseLeaveOut(window.location.search)).fine;
}

/** Where the fine tiles are asked; none when the tier leaves them out. */
export function fineDeps(allowed: boolean) {
  return allowed
    ? { fetch: (url: string) => fetch(url), base: baseUrl(), breathe }
    : undefined;
}

/** The site's base path with its trailing slash. */
function baseUrl(): string {
  const base = import.meta.env.BASE_URL;
  return base.endsWith('/') ? base : `${base}/`;
}
