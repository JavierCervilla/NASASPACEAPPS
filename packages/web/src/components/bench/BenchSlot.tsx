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
 * Where the island mounts the benchmark's panel (VENT-81): nothing unless
 * the address asks with `?bench`, and then only once the page has started
 * and the benchmark's chunk has come (lib/bench-loader.ts).
 */
import { useEffect, useState, type ComponentType } from 'react';
import { benchModule } from '../../lib/bench-loader';
import type { SiteStore } from '../../phone/site-store';

type Panel = ComponentType<{ readonly store: SiteStore }>;

export function BenchSlot({ store }: { readonly store: SiteStore }) {
  const [Loaded, setLoaded] = useState<Panel | null>(null);
  useEffect(() => {
    let live = true;
    void benchModule()?.then((bench) => {
      if (live) setLoaded(() => bench.BenchPanel);
    });
    return () => {
      live = false;
    };
  }, []);
  return Loaded ? <Loaded store={store} /> : null;
}
