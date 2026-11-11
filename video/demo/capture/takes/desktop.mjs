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
 * The desktop take: the globe turns to the south pole and zooms in, the
 * header's picker selects the Shackleton connecting ridge, the strip's
 * slider moves from hackathon day one (Sun, no Earth) to a landing window,
 * and the DSN view shows Robledo de Chavela listening.
 */
import { centre, drag, glide, pause, press } from '../pointer.mjs';

export const DESKTOP = {
  view: { width: 1920, height: 1080 },
  scale: 2,
  mobile: false,
  /** Hackathon day one, 13:00 UTC: at the ridge the Sun is up and Earth is not. */
  start: '2026-11-14T13:00:00Z',
  query: '',
};

/** The hour the take moves to: a landing window, Robledo de Chavela listening. */
const WINDOW_HOUR = { index: 19 * 24 + 16, label: 'Fri 20 Nov · 16:00 UTC' };
const SITE_OPTION = 'Shackleton connecting ridge';
const SITE_HEADER = /^Change site, now Blue Moon MK1 Pathfinder/;

/** Waits for the globe, the strip and the card; closes the first hint. */
export async function readyDesktop(page) {
  await page.locator('.globe-ring').waitFor({ state: 'visible' });
  await page.getByRole('img', { name: /^Window:/ }).waitFor();
  const hint = page.getByRole('button', { name: 'Dismiss the hint' });
  if (await hint.isVisible()) await hint.click();
}

/** Turns the globe so the south pole faces the camera, then zooms toward it. */
async function towardThePole(page, at) {
  await glide(page, at, { x: 790, y: 640 }, 700);
  await drag(page, at, { x: 790, y: 420 }, 1300);
  await glide(page, at, { x: 800, y: 560 }, 400);
  for (let i = 0; i < 3; i += 1) {
    await page.mouse.wheel(0, -250);
    await pause(page, 300);
  }
}

/** Picks the Shackleton connecting ridge in the header's site picker. */
async function pickSite(page, at) {
  await press(page, at, page.getByRole('button', { name: /^Change site/ }), 700);
  const dialog = page.getByRole('dialog');
  await dialog.waitFor({ state: 'visible' });
  await pause(page, 400);
  await press(page, at, dialog.getByText(SITE_OPTION, { exact: true }), 700);
  await page.getByRole('button', { name: SITE_HEADER }).waitFor();
  await page.getByRole('img', { name: /^Sun: 100 %/ }).waitFor();
}

/** Drags the hour slider to the window hour, then lands it with the arrow keys. */
async function scrubToWindow(page, at) {
  const slider = page.getByRole('slider', { name: 'Selected hour' });
  const box = await slider.boundingBox();
  const max = Number(await slider.getAttribute('max'));
  const value = Number(await slider.inputValue());
  const xOf = (v) => box.x + 10 + (v / max) * (box.width - 20);
  const y = box.y + box.height / 2;
  await glide(page, at, { x: xOf(value), y }, 700);
  await drag(page, at, { x: xOf(WINDOW_HOUR.index), y }, 2200);
  for (let i = 0; i < 24; i += 1) {
    const now = Number(await slider.inputValue());
    if (now === WINDOW_HOUR.index) break;
    await page.keyboard.press(now < WINDOW_HOUR.index ? 'ArrowRight' : 'ArrowLeft');
  }
  await page.locator('.strip__date', { hasText: WINDOW_HOUR.label }).waitFor();
}

/** Plays the loop; `mark` stamps each step's start. */
export async function filmDesktop(page, mark) {
  const at = { x: 1500, y: 760 };
  await page.mouse.move(at.x, at.y);
  mark('globe');
  await pause(page, 1000);
  mark('pole');
  await towardThePole(page, at);
  await pause(page, 1200);
  mark('picker');
  await pickSite(page, at);
  mark('site');
  await pause(page, 1800);
  mark('scrub');
  await scrubToWindow(page, at);
  mark('window');
  await pause(page, 2200);
  mark('dsnClick');
  const tabs = page.getByRole('navigation', { name: 'View' });
  await press(page, at, tabs.getByRole('link', { name: 'DSN', exact: true }), 800);
  await page.getByText('Robledo de Chavela', { exact: true }).first().waitFor();
  mark('dsn');
  await glide(page, at, await centre(page.getByText('Robledo', { exact: true }).last()), 1600);
  await pause(page, 2600);
  mark('end');
}
