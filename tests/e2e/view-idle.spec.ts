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
 * The reader behind every «the view is idle» check (VENT-71). A frame sets
 * `data-frames` and `data-working` in one task, so a reader that fetches them
 * in two round trips can pair the count from before a frame with the working
 * mark from after it: on a loaded runner the pair said «still» one frame
 * early and the next assertion saw that frame (terrain-view.spec.ts, the
 * compass test: 3 expected, 4 received). The host here flips both attributes
 * from a timer, the way a frame does, so the pair must always agree.
 */
import { expect, test } from '@playwright/test';
import { readView } from './view-idle';

const READS = 300;

test('the frame count and the working mark come from the same frame', async ({ page }) => {
  await page.setContent('<div id="host" data-frames="0" data-working="false"></div>');
  await page.evaluate(() => {
    const el = document.getElementById('host');
    let n = 0;
    window.setInterval(() => {
      n += 1;
      el?.setAttribute('data-frames', String(n));
      el?.setAttribute('data-working', String(n % 2 === 1));
    }, 0);
  });
  const host = page.locator('#host');
  const torn: number[] = [];
  for (let i = 0; i < READS; i++) {
    const { frames, working } = await readView(host);
    if (working !== (frames % 2 === 1)) torn.push(frames);
  }
  expect(torn, 'reads whose count and mark belong to different frames').toEqual([]);
});
