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
 * The hand in the takes: a mouse that glides and presses, and a finger that
 * taps and swipes through DevTools touch events (Playwright has taps only).
 * Every move runs at a human pace, so the recording reads as real use.
 */

export const pause = (page, ms) => page.waitForTimeout(ms);
const ease = (u) => 1 - (1 - u) ** 3;
const easeInOut = (u) => (u < 0.5 ? 4 * u ** 3 : 1 - (-2 * u + 2) ** 3 / 2);

/** The centre of a locator's box. */
export async function centre(locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error(`no box for ${locator}`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Moves the mouse from `at` to `to` over `ms`, eased; `at` follows. */
export async function glide(page, at, to, ms = 700, curve = ease) {
  const steps = Math.max(2, Math.round(ms / 16));
  for (let i = 1; i <= steps; i += 1) {
    const u = curve(i / steps);
    await page.mouse.move(at.x + (to.x - at.x) * u, at.y + (to.y - at.y) * u);
    await pause(page, 16);
  }
  at.x = to.x;
  at.y = to.y;
}

/** Drags with the mouse from where it is to `to`, slow in and out. */
export async function drag(page, at, to, ms) {
  await page.mouse.down();
  await glide(page, at, to, ms, easeInOut);
  await page.mouse.up();
}

/** Glides to a locator and clicks it with the real mouse. */
export async function press(page, at, locator, ms) {
  await glide(page, at, await centre(locator), ms);
  await page.mouse.down();
  await pause(page, 90);
  await page.mouse.up();
}

/** A finger: taps and swipes sent as touch events on `page`. */
export async function finger(page) {
  const cdp = await page.context().newCDPSession(page);
  const touch = (type, p) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: p ? [{ x: p.x, y: p.y }] : [] });
  return {
    async tap(locator) {
      const p = await centre(locator);
      await touch('touchStart', p);
      await pause(page, 110);
      await touch('touchEnd');
    },
    async swipe(from, to, ms) {
      const steps = Math.max(2, Math.round(ms / 16));
      await touch('touchStart', from);
      for (let i = 1; i <= steps; i += 1) {
        const u = easeInOut(i / steps);
        await touch('touchMove', { x: from.x + (to.x - from.x) * u, y: from.y + (to.y - from.y) * u });
        await pause(page, 16);
      }
      await pause(page, 60);
      await touch('touchEnd');
    },
  };
}
