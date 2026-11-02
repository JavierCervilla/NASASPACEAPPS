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
 * The page's crash recorder (VENT-49): one for the page, made when the
 * on-foot view first asks, so the page's start pays nothing. It reads the
 * device from the window, keeps the runs in the session's storage, and asks
 * the battery where the browser has one.
 */
import { readEnvironment, watchBattery, type BatteryHost }
  from './environment';
import { createRecorder, type Recorder } from './recorder';
import { reportStorage } from './run-store';

let page: Recorder | null = null;

/** The recorder the on-foot view writes to and the lost state copies from. */
export function pageReport(): Recorder {
  page ??= createRecorder({
    storage: reportStorage,
    now: () => performance.now(),
    date: () => new Date(),
    environment: (mount) => readEnvironment(window, mount),
    battery: (hear) => watchBattery(navigator as BatteryHost, hear),
  });
  return page;
}
