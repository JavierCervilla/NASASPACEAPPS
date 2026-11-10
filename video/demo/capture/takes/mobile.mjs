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
 * The phone take, 390 x 844 CSS px at device scale 3 with touch: the Sites
 * tab selects the Shackleton connecting ridge, the Calendar's columns are
 * dragged with a finger from hackathon day one to a landing window, then
 * the DSN and Horizon tabs, with a swipe that turns the on-foot view.
 */
import { finger, pause } from '../pointer.mjs';
import { readyOnFoot } from './onfoot.mjs';

export const MOBILE = {
  view: { width: 390, height: 844 },
  scale: 3,
  mobile: true,
  start: '2026-11-14T13:00:00Z',
  query: '',
};

/** Hours the selected hour moves per px of a vertical drag on the Calendar's columns. */
const HOURS_PER_PX = 1.75;
/** Any hour from here to 23:00 on Fri 20 Nov is in the window with Robledo listening. */
const TARGET = 19 * 24 + 18;
const tab = (page, name) => page.getByRole('button', { name, exact: true });

/** Waits for the phone's globe and sheet; closes the first hint. */
export async function readyMobile(page) {
  await page.locator('.globe-ring').waitFor({ state: 'visible' });
  await tab(page, 'Calendar').waitFor();
  const hint = page.getByRole('button', { name: 'Dismiss the hint' });
  if (await hint.isVisible()) await hint.tap();
}

/** Drags the columns until the selected hour lands within an hour of TARGET. */
async function scrub(page, hand) {
  const columns = page.getByRole('slider', { name: 'Selected hour' });
  const box = await columns.boundingBox();
  const x = box.x + box.width * 0.62;
  let y = box.y + box.height * 0.45;
  for (let tries = 0; tries < 6; tries += 1) {
    const now = Number(await columns.getAttribute('aria-valuenow'));
    if (Math.abs(now - TARGET) <= 1) return;
    const dy = (TARGET - now) / HOURS_PER_PX;
    await hand.swipe({ x, y }, { x, y: y + dy }, tries === 0 ? 2200 : 400);
    y += dy;
    await pause(page, 400);
  }
}

/** Plays the loop on the phone; `mark` stamps each step's start. */
export async function filmMobile(page, mark) {
  const hand = await finger(page);
  mark('open');
  await pause(page, 1400);
  mark('sites');
  await hand.tap(tab(page, 'Sites'));
  await pause(page, 900);
  await hand.tap(page.getByText('Shackleton connecting ridge', { exact: true }).first());
  await page.getByRole('button', { name: /^Change site, now Shackleton connecting ridge/ }).waitFor();
  mark('site');
  await pause(page, 1600);
  mark('calendar');
  await hand.tap(tab(page, 'Calendar'));
  await page.getByRole('slider', { name: 'Selected hour' }).waitFor();
  await pause(page, 800);
  mark('scrub');
  await scrub(page, hand);
  mark('window');
  await pause(page, 1800);
  mark('dsn');
  await hand.tap(tab(page, 'DSN'));
  await page.getByText('Robledo de Chavela', { exact: true }).first().waitFor();
  await pause(page, 2600);
  mark('horizon');
  await hand.tap(tab(page, 'Horizon'));
  await readyOnFoot(page);
  await pause(page, 1200);
  mark('turn');
  await hand.swipe({ x: 300, y: 330 }, { x: 90, y: 340 }, 2600);
  await pause(page, 1600);
  mark('end');
}
