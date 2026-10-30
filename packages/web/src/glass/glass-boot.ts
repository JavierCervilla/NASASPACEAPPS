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
 * The glass gate's DOM adapter: hands the page's real clock, frame
 * scheduler, media queries, storage and capabilities to startGlass.
 */
import { pickQuality } from '../globe/quality-pick';
import { isPhoneViewport, prefersSaveData } from '../lib/viewport';
import { chromiumEngine, type UaBrand } from './glass-gate';
import { glassStore } from './glass-memory';
import { startGlass } from './glass-start';

/** `navigator.userAgentData`, where the browser has it. */
interface UaData {
  readonly userAgentData?: { readonly brands?: readonly UaBrand[] };
}

/** Sets `data-glass` on the page's root and starts Liquid's trial. */
export function bootGlass(): void {
  const brands = (navigator as UaData).userAgentData?.brands;
  startGlass({
    root: document.documentElement,
    search: window.location.search,
    storage: glassStore(),
    chromium: chromiumEngine(brands),
    supports: (property, value) => CSS.supports(property, value),
    media: (query) => matchMedia(query),
    saveData: prefersSaveData(),
    quality: () => pickQuality(isPhoneViewport()),
    frame: (fn) => requestAnimationFrame(fn),
    now: () => performance.now(),
    firstInput: (fn) =>
      window.addEventListener('pointerdown', fn, { once: true, capture: true }),
  });
}
