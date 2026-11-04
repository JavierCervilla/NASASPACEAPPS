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
 * How the e2e specs read the on-foot view's host to tell it is at rest
 * (VENT-71): its frame count and whether more frames are coming.
 */
import { expect, type Locator } from '@playwright/test';

/** What one frame left on the host. */
export interface ViewSample {
  readonly frames: number;
  readonly working: boolean;
}

/**
 * The host's frame count and `data-working`, read in one round trip: a frame
 * writes both in one task, so no frame lands between the two reads.
 */
export async function readView(at: Locator): Promise<ViewSample> {
  return at.evaluate((el) => ({
    frames: Number(el.getAttribute('data-frames')),
    working: el.getAttribute('data-working') === 'true',
  }));
}

/**
 * Waits until the view drew no frame between two reads 600 ms apart and its
 * slices are all run; returns the count.
 */
export async function idleCount(at: Locator): Promise<number> {
  let last = -1;
  await expect
    .poll(async () => {
      const { frames, working } = await readView(at);
      const still = frames === last && !working;
      last = frames;
      return still;
    }, { intervals: [600], timeout: 15_000 })
    .toBe(true);
  return last;
}
