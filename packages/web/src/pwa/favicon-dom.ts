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
 * The live favicon's browser side: the phase frames as images, a canvas
 * to draw the icon on, and the page's `<link rel="icon">` it repoints.
 */
import type { FaviconDeps } from './live-favicon';
import { FAVICON_SIZE } from './live-favicon';
import { drawIcon } from './icon-draw';
import { meanOrbitPhase } from './moon-phase';
import { frameUrl } from './phase-frames';

/** The page's icon link (layouts/Base.astro) the favicon repoints. */
export const FAVICON_LINK_ID = 'live-favicon';

/** Loads each phase frame once; a failed one is asked again next time. */
function frameLoader(base: string) {
  const kept = new Map<number, Promise<HTMLImageElement>>();
  return (index: number): Promise<HTMLImageElement> => {
    const hit = kept.get(index);
    if (hit) return hit;
    const image = new Image();
    image.src = frameUrl(base, index);
    const loading = image.decode().then(() => image);
    loading.catch(() => kept.delete(index));
    kept.set(index, loading);
    return loading;
  };
}

/** The favicon's dependencies in this page; null without its link. */
export function browserFavicon(base: string): FaviconDeps | null {
  const link = document.getElementById(FAVICON_LINK_ID);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!(link instanceof HTMLLinkElement) || !ctx) return null;
  canvas.width = FAVICON_SIZE;
  canvas.height = FAVICON_SIZE;
  return {
    phase: meanOrbitPhase,
    frame: frameLoader(base),
    paint: (picture) => {
      drawIcon(ctx, picture);
      return canvas.toDataURL('image/png');
    },
    show: (href) => {
      link.type = 'image/png';
      link.href = href;
    },
    setTimer: window.setTimeout.bind(window),
    clearTimer: window.clearTimeout.bind(window),
  };
}
