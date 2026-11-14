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
 * VENT-125, canvas option A: «Open in LROC QuickMap», a link dressed as the
 * secondary button that opens QuickMap in a new tab centred on the selected
 * site or point, under the desktop card's point line and after the phone
 * sheet's head (from half up, outside what the peek sheet measures). The
 * spec reads the link; it never follows it.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { stubApi } from './api-stub';

const NOW = new Date('2026-11-23T18:00:00Z');
const IM2 = './?site=im2-athena';
const PIN = '?lat=-85.87&lon=61.34';
const QUICKMAP = 'https://quickmap.lroc.im-ldi.com/';
/** IM-2 (84.7906° S, 29.1957° E) on the south polar stereographic, ± 20 x 12.5 km. */
const IM2_HREF = `${QUICKMAP}?prjExtent=57108,125493,97108,150493&proj=27`;
const PIN_HREF = `${QUICKMAP}?prjExtent=89939,47590,129939,72590&proj=27`;
const SHOTS = process.env.VENT125_SHOTS;

async function open(page: Page, path: string): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.setFixedTime(NOW);
  await page.addInitScript(() => localStorage.setItem('ventana.pinHint', 'seen'));
  await stubApi(page);
  // Nothing in this spec may reach QuickMap.
  await page.route(`${QUICKMAP}**`, (route) => route.abort());
  await page.goto(path);
}

async function expectOpensQuickmap(link: Locator, href: string): Promise<void> {
  await expect(link).toHaveAttribute('href', href);
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', /\bnoopener\b/);
  await expect(link).toHaveAccessibleName('Open in LROC QuickMap, in a new tab');
  await expect(link).toHaveText('Open in LROC QuickMap');
}

/** Whether `link` stays inside the screen and its label inside its pill: nothing cut. */
function whole(link: Locator): Promise<boolean> {
  return link.evaluate((el) => {
    const box = el.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(el);
    const text = range.getBoundingClientRect();
    const inScreen = box.left >= 0 && box.right <= innerWidth + 0.5;
    const inPill = text.left >= box.left - 0.5 && text.right <= box.right + 0.5
      && text.top >= box.top - 0.5 && text.bottom <= box.bottom + 0.5;
    return inScreen && inPill && el.scrollWidth <= el.clientWidth + 1;
  });
}

test.describe('desktop, 1440x900: the site card', () => {
  // The screenshots for the human are taken at 2x.
  test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: SHOTS ? 2 : 1 });

  const link = (page: Page) => page.locator('.site-card .card-head__quickmap');

  test('IM-2: the link sits under the point line and opens QuickMap on it', async ({ page }) => {
    await open(page, IM2);
    await expectOpensQuickmap(link(page), IM2_HREF);
    const point = (await page.locator('.card-head__point').boundingBox())!;
    const box = (await link(page).boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(point.y + point.height);
    expect(box.height).toBeGreaterThanOrEqual(44);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/desktop-card-im2.png` });
  });

  test('a custom point gets its own address', async ({ page }) => {
    await open(page, `./${PIN}`);
    await expectOpensQuickmap(link(page), PIN_HREF);
  });

  test('in Spanish the label is Spanish and QuickMap keeps its name', async ({ page }) => {
    await open(page, './es/?site=im2-athena');
    await expect(link(page)).toHaveText('Abrir en LROC QuickMap');
    await expect(link(page)).toHaveAccessibleName('Abrir en LROC QuickMap, en una pestaña nueva');
    await expect(link(page)).toHaveAttribute('href', IM2_HREF);
  });
});

test.describe('phone, 390x844: the sheet', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: SHOTS ? 2 : 1 });

  const sheet = (page: Page) => page.locator('.sheet');
  const link = (page: Page) => page.locator('.summary__quickmap');

  test('IM-2 at half: the link follows the head and opens QuickMap on it', async ({ page }) => {
    await open(page, IM2);
    await expect(sheet(page)).toHaveAttribute('data-detent', 'half');
    await expectOpensQuickmap(link(page), IM2_HREF);
    const head = (await page.locator('.summary__head').boundingBox())!;
    const box = (await link(page).boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(head.y + head.height);
    await expect(sheet(page)).not.toHaveAttribute('data-moving', { timeout: 30_000 });
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/phone-sheet-half-im2.png` });
  });

  test('a custom point gets its own address', async ({ page }) => {
    await open(page, `./${PIN}`);
    await expectOpensQuickmap(link(page), PIN_HREF);
  });

  test('the peek detent does not grow: the link is outside its head', async ({ page }) => {
    await open(page, IM2);
    await expect(link(page)).toBeVisible();
    expect(await page.locator('[data-sheet-peek] .summary__quickmap').count()).toBe(0);
    const grabber = page.locator('.sheet__grabber');
    await grabber.press('Enter');
    await expect(sheet(page)).toHaveAttribute('data-detent', 'full');
    await grabber.press('Enter');
    await expect(sheet(page)).toHaveAttribute('data-detent', 'peek');
    await expect(sheet(page)).not.toHaveAttribute('data-moving', { timeout: 30_000 });
    const top = async (): Promise<number> => (await sheet(page).boundingBox())!.y;
    const withLink = await top();
    await page.addStyleTag({ content: '.summary__quickmap { display: none !important; }' });
    await page.waitForTimeout(300);
    await expect(sheet(page)).not.toHaveAttribute('data-moving', { timeout: 30_000 });
    expect(Math.abs((await top()) - withLink)).toBeLessThanOrEqual(0.5);
  });
});

test.describe('phone, 360x780, pseudo-locale at 200 % text', () => {
  test.use({ viewport: { width: 360, height: 780 }, hasTouch: true, isMobile: true });

  test('the link is not cut', async ({ page }) => {
    await open(page, './en-xa/?site=im2-athena');
    const link = page.locator('.summary__quickmap');
    await expect(link).toBeVisible();
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    await link.scrollIntoViewIfNeeded();
    await expect.poll(() => whole(link)).toBe(true);
    await expect(link).toHaveAttribute('href', IM2_HREF);
  });
});
