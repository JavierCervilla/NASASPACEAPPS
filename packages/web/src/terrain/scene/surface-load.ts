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
 * How the on-foot view loads its surfaces on this page: images through
 * three's TextureLoader, and the colour maps' KTX2 (VENT-101) through the
 * page's transcoder worker, which the globe shares, under the page session's
 * KTX2 switch.
 */
import { TextureLoader, type Texture } from 'three';
import { loadKtx2 } from '../../textures/ktx2-load';
import { pageKtx2Deps } from '../../textures/ktx2-page';
import { pageKtx2 } from '../../textures/ktx2-session';
import type { Ktx2Target } from '../../globe/ktx2-target';
import type { Ktx2Switch } from '../../textures/ktx2-session';

export interface SurfaceLoad {
  readonly image: (url: string) => Promise<Texture>;
  readonly ktx2: (url: string, target: Ktx2Target) => Promise<Texture>;
  readonly session: Ktx2Switch;
}

/** This page's surface loading. */
export function pageSurfaceLoad(): SurfaceLoad {
  const loader = new TextureLoader();
  const deps = pageKtx2Deps();
  const image = (url: string): Promise<Texture> => loader.loadAsync(url);
  const ktx2 = (url: string, target: Ktx2Target): Promise<Texture> =>
    loadKtx2(url, target, deps);
  return { image, ktx2, session: pageKtx2 };
}
