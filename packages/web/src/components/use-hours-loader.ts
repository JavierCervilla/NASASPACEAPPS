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
 * The hours loader the views share (phone/hours-cache.ts), started
 * afresh each time the browser comes back online: the views then ask
 * for their hours again, quietly, and keep showing the old ones until
 * the new ones arrive.
 */
import { useEffect, useState } from 'react';
import { cachedHours, type HoursLoader } from '../phone/hours-cache';

const loaderOf = (sitesUrl: string): HoursLoader =>
  cachedHours({ fetch: globalThis.fetch.bind(globalThis), sitesUrl });

export function useHoursLoader(sitesUrl: string): HoursLoader {
  const [load, setLoad] = useState(() => loaderOf(sitesUrl));
  useEffect(() => {
    const fresh = (): void => setLoad(() => loaderOf(sitesUrl));
    window.addEventListener('online', fresh);
    return () => window.removeEventListener('online', fresh);
  }, [sitesUrl]);
  return load;
}
