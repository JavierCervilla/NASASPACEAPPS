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

import { expect, test, type Page } from '@playwright/test';
import { stubApi } from './api-stub';
import { stubRealRelief } from './terrain-stub';

const AT = new Date('2026-11-22T20:00:00Z');
const FILMS = /\/site-films\//;
const START_MS = 30_000;
const SHOTS = process.env.VENT117_SHOTS;
const IM2 = './?site=im2-athena&quality=high&onfoot=far,craters,grain#horizon';
const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };

/** Opens `path` on IM-2's recorded relief, the loader films let through; returns the films asked. */
async function open(page: Page, path: string): Promise<string[]> {
  const films: string[] = [];
  await page.clock.setFixedTime(AT);
  await page.addInitScript(() => {
    localStorage.setItem('ventana.dataSource', 'computed');
    localStorage.setItem('ventana.pinHint', 'seen');
  });
  page.on('request', (request) => {
    if (FILMS.test(request.url())) films.push(request.url());
  });
  await stubApi(page, { films: true });
  await stubRealRelief(page);
  await page.goto(path);
  return films;
}

const loader = (page: Page) => page.locator('.on-foot-loader');
const film = (page: Page) => page.locator('video.loader-film');
const host = (page: Page) => page.getByRole('application', { name: 'On foot at the site' });

async function shot(page: Page, name: string): Promise<void> {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

/** The film's first source and still, and whether it is muted, inline and hidden from assistive technology. */
const filmFacts = (page: Page) =>
  film(page).evaluate((video: HTMLVideoElement) => ({
    first: video.querySelector('source')?.getAttribute('src') ?? '',
    type: video.querySelector('source')?.getAttribute('type') ?? '',
    poster: video.getAttribute('poster') ?? '',
    muted: video.muted,
    inline: video.playsInline,
    hidden: video.getAttribute('aria-hidden'),
  }));

async function descentThenScene(page: Page, cut: 'wide' | 'phone'): Promise<void> {
  await expect(film(page)).toBeVisible({ timeout: START_MS });
  const facts = await filmFacts(page);
  expect(facts.first).toMatch(new RegExp(`/site-films/im2-athena-${cut}\\.av1\\.mp4$`));
  expect(facts.type).toContain('av01');
  expect(facts.poster).toMatch(new RegExp(`/site-films/im2-athena-${cut}-start\\.webp$`));
  expect(facts).toMatchObject({ muted: true, inline: true, hidden: 'true' });
  await expect(loader(page).getByRole('status')).toBeVisible();
  await expect.poll(() => film(page).evaluate((v: HTMLVideoElement) => v.currentTime), { timeout: START_MS }).toBeGreaterThan(2);
  await shot(page, `${cut}-descent`);
  // The scene stands well before the 6 s film ends; the hand-over waits for the film's end.
  await expect(loader(page)).toHaveAttribute('data-phase', 'handover', { timeout: START_MS });
  expect(await film(page).evaluate((v: HTMLVideoElement) => v.ended)).toBe(true);
  await expect(host(page)).toHaveAttribute('data-ready', 'true');
  await expect(film(page)).toHaveCount(0, { timeout: 5000 });
  await expect(loader(page)).toHaveCount(0);
  await shot(page, `${cut}-live`);
}

test.describe('the loader\'s descent film (VENT-117)', () => {
  test('desktop: IM-2\'s wide cut plays to its end, then the scene fades in and the film goes', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await open(page, IM2);
    await descentThenScene(page, 'wide');
  });

  test('phone: IM-2\'s phone cut', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await open(page, IM2);
    await descentThenScene(page, 'phone');
  });

  test('reduced motion asks for no film: the plan and the skyline as before', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const films = await open(page, IM2);
    await expect(loader(page)).toHaveAttribute('data-picture', 'tiles', { timeout: START_MS });
    await expect(host(page)).toHaveAttribute('data-ready', 'true', { timeout: START_MS });
    await expect(loader(page)).toHaveCount(0, { timeout: START_MS });
    expect(films).toEqual([]);
  });

  test('a custom point asks for no film', async ({ page }) => {
    const films = await open(page, './?lat=-84.79&lon=29.20&quality=high&onfoot=far,craters,grain#horizon');
    await expect(loader(page)).toHaveAttribute('data-picture', 'tiles', { timeout: START_MS });
    await expect(host(page)).toHaveAttribute('data-ready', 'true', { timeout: START_MS });
    expect(films).toEqual([]);
    await expect(film(page)).toHaveCount(0);
  });
});
