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
 * Press feedback and exits (VENT-55, apple-design §1, §7, §14): a control answers the moment it is pressed, the
 * same way with reduced motion; a popover and the first-time hint leave along the path they came in instead of
 * vanishing. Screenshots of the pressed states go to the test's output folder.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { stubApi } from './api-stub';

const NOW = new Date('2026-11-23T18:00:00Z');
/** The globe's start is not what this spec checks: a cold run starts a software-rendered globe in every worker. */
const GLOBE_START_MS = 20_000;

async function open(page: Page, path = './'): Promise<void> {
  await page.clock.setFixedTime(NOW);
  await stubApi(page);
  await page.goto(path);
  await expect(page.locator('.globe-viewport[data-status="ready"], .polar').first()).toBeVisible({ timeout: GLOBE_START_MS });
}

/** Holds the mouse down on `target`'s centre; returns how to let go. */
async function pressOn(page: Page, target: Locator): Promise<() => Promise<void>> {
  const box = (await target.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  return () => page.mouse.up();
}

const computed = (target: Locator, property: string) =>
  target.evaluate((el, name) => getComputedStyle(el).getPropertyValue(name), property);

const shot = (page: Page, name: string) => page.screenshot({ path: test.info().outputPath(name) });

test.describe('desktop, 1280x800', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('a header view tab lights up while pressed, and lets go with the press', async ({ page }) => {
    await open(page);
    const tab = page.getByRole('navigation', { name: 'View' }).getByRole('link', { name: 'Polar map' });
    const release = await pressOn(page, tab);
    expect(await computed(tab, 'background-image')).toMatch(/linear-gradient/);
    await shot(page, 'pressed-view-tab.png');
    await page.mouse.move(0, 0);
    await release();
    expect(await computed(tab, 'background-image')).toBe('none');
  });

  test('with reduced motion the month arrow still shrinks on the press', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);
    const arrow = page.locator('.round-button').first();
    const release = await pressOn(page, arrow);
    await expect.poll(() => computed(arrow, 'transform')).toMatch(/^matrix\(0\.97, 0, 0, 0\.97/);
    await shot(page, 'pressed-month-arrow-reduced.png');
    await release();
  });

  test('the language menu shrinks back into its button instead of vanishing', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'Language: English' }).click();
    const menu = page.getByRole('menu', { name: 'Language' });
    await expect(menu).toBeVisible();
    // The way in has ended: what runs after the close is the way out alone.
    await expect.poll(() => page.locator('.lang-popover').evaluate((el) => el.getAnimations().length)).toBe(0);
    expect(await computed(menu, 'opacity')).toBe('1');
    // Closed and read in one task, so a slow machine cannot let the exit finish before the read.
    const leaving = await page.locator('.lang-popover').evaluate((el: HTMLElement) => {
      el.hidePopover();
      const style = getComputedStyle(el);
      const running = el.getAnimations().map((a) => (a as CSSTransition).transitionProperty);
      return { display: style.display, opacity: Number(style.opacity), running };
    });
    expect(leaving.display).not.toBe('none');
    expect(leaving.opacity).toBeGreaterThan(0.5);
    expect(leaving.running).toEqual(expect.arrayContaining(['opacity', 'scale', 'filter', 'overlay', 'display']));
    await expect(menu).toBeHidden();
  });

  test('the first-time hint fades out as a material, then leaves the page', async ({ page }) => {
    await open(page);
    const hint = page.locator('.globe .pin-hint');
    await expect(hint).toBeVisible();
    await expect(hint).toHaveAttribute('data-presence', 'in');
    await hint.locator('.pin-hint__close').click();
    await expect(hint).toHaveAttribute('data-presence', 'out');
    await expect(hint).toHaveCount(0);
  });
});
