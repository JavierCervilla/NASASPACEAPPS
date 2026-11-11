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
 * The on-foot take: IM-2's landing site, Mons Mouton, on 22 Nov 2026 at
 * 20:00 UTC, when the Sun and the Earth are both up and a landing window is
 * open. The view opens in daylight and a slow drag turns it from the Sun to
 * the Earth and back.
 */
import { drag, glide, pause } from '../pointer.mjs';

export const ONFOOT = {
  view: { width: 1920, height: 1080 },
  scale: 2,
  mobile: false,
  start: '2026-11-22T20:00:00Z',
  query: '?site=im2-athena#horizon',
};

/** Waits until the on-foot view drew no frame for 600 ms and its ring slices are done. */
export async function readyOnFoot(page) {
  const host = page.getByRole('application', { name: 'On foot at the site' });
  await host.waitFor({ state: 'visible' });
  let last = -1;
  for (let tries = 0; tries < 50; tries += 1) {
    const { frames, working } = await host.evaluate((el) => ({
      frames: Number(el.getAttribute('data-frames')),
      working: el.getAttribute('data-working') === 'true',
    }));
    if (frames === last && !working) return;
    last = frames;
    await pause(page, 600);
  }
}

/** Turns the view toward the Earth, then back past the Sun. */
export async function filmOnFoot(page, mark) {
  const at = { x: 1300, y: 760 };
  await page.mouse.move(at.x, at.y);
  mark('open');
  await pause(page, 600);
  await glide(page, at, { x: 760, y: 420 }, 700);
  mark('turn');
  await drag(page, at, { x: 1240, y: 420 }, 3600);
  await pause(page, 500);
  mark('back');
  await drag(page, at, { x: 520, y: 430 }, 4200);
  await glide(page, at, { x: 1500, y: 900 }, 900);
  await pause(page, 1200);
  mark('end');
}
