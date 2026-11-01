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
 * The DSN mode (VENT-7, canvases «DsnA» and «DsnC», approved: A + C, «No link» first, to the minute): the «Listening
 * on Earth» block of the desktop card and the phone's widget, the DSN view on its header tab (`#dsn`) and on the
 * phone's tab bar, the 24 h band whose playhead follows the shared instant, the no-link case, the month's «Hours with
 * DSN», keyboard and screen-reader names, the tab bar at 360 px and in the pseudo-locale, 200 % text and the CSP.
 * The numbers are the simulator's at the canvas's instant, IM-2 Athena on 22 November 2026 at 20:00 UTC: Robledo
 * with the Moon at 52°, Goldstone next at 02:16 UTC, Canberra at 10:58.
 *
 * `CAPTURE_EVIDENCE=1` also keeps screenshots in production/qa/evidence/.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { stubApi } from './api-stub';

const CANVAS = new Date('2026-11-22T20:00:00Z');
/** The no-link canvas: a pin at 85.50° S 31.00° E, where the Earth is just under the horizon. */
const NO_LINK = new Date('2026-11-14T18:00:00Z');
const DATE = '2026-11-01';
const OUT = new URL('../../production/qa/evidence/', import.meta.url);
const DIST = fileURLToPath(new URL('../../packages/web/dist', import.meta.url));
const CSP_SCRIPT = fileURLToPath(new URL('../../packages/web/scripts/csp-header.mjs', import.meta.url));

async function evidence(page: Page, name: string): Promise<void> {
  if (!process.env.CAPTURE_EVIDENCE) return;
  await page.waitForTimeout(300);
  await page.screenshot({ path: new URL(`${DATE}-vent-7-${name}.png`, OUT).pathname });
}

async function open(page: Page, path = './', at = CANVAS): Promise<void> {
  await page.clock.setFixedTime(at);
  await page.addInitScript(() => localStorage.setItem('ventana.pinHint', 'seen'));
  await stubApi(page);
  await page.goto(path);
}

/** Starts the page on the simulator's hours, as if chosen on an earlier visit. */
async function computed(page: Page): Promise<void> {
  await page.addInitScript(() => localStorage.setItem('ventana.dataSource', 'computed'));
}

const card = (page: Page) => page.getByRole('complementary', { name: 'Site card' });
const block = (page: Page) => card(page).getByRole('region', { name: 'Listening on Earth' });
const view = (page: Page) => page.getByRole('region', { name: 'Deep Space Network' });
const band = (page: Page) => view(page).getByRole('group', { name: /^Which antenna sees the Moon on / });
const headerTab = (page: Page, name: string) => page.getByRole('navigation', { name: 'View' }).getByRole('link', { name });
const tabs = (page: Page) => page.getByRole('navigation', { name: 'Views' });
const slider = (page: Page) => page.getByRole('region', { name: 'Calendar' }).getByRole('slider', { name: 'Selected hour' });
const playheadLeft = (page: Page) =>
  view(page).locator('.dsn-band__playhead').evaluate((el) => (el as HTMLElement).style.left);

/** The value of the card's list row `label`. */
async function fact(page: Page, label: string): Promise<string> {
  return (await card(page).locator('dl > div').filter({ has: page.getByText(label, { exact: true }) }).locator('dd').textContent()) ?? '';
}

test.describe('desktop, 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('A · the card says Robledo listens, the Moon at 52°, ~6 h left, Goldstone next at 02:16 UTC', async ({ page }) => {
    await open(page);
    await expect(block(page)).toContainText('Robledo');
    await expect(block(page)).toContainText('Madrid · Moon at 52°');
    await expect(block(page)).toContainText('~6 h left');
    await expect(block(page)).toContainText('Next: Goldstone at 02:16 UTC');
    await expect(block(page).getByRole('img', { name: 'The Earth seen from the Moon, Sun 22 Nov · 20:00 UTC' })).toBeVisible();
    expect(await fact(page, 'Hours with DSN')).toMatch(/^\d+ %$/);
    await block(page).scrollIntoViewIfNeeded();
    await evidence(page, 'a-desktop');
  });

  test('C · the DSN tab shows the Earth, who listens, the other two and the day\'s band, in the globe\'s place', async ({ page }) => {
    await open(page);
    await headerTab(page, 'DSN').click();
    await expect(page).toHaveURL(/#dsn$/);
    await expect(headerTab(page, 'DSN')).toHaveAttribute('aria-current', 'page');
    await expect(view(page)).toBeVisible();
    await expect(page.locator('section.globe')).toBeHidden();
    await expect(view(page).getByRole('heading', { name: 'Robledo de Chavela' })).toBeVisible();
    await expect(view(page)).toContainText('Madrid · Moon at 52° · ~6 h left');
    await expect(view(page)).toContainText('Next: Goldstone at 02:16 UTC');
    await expect(view(page).locator('.dsn-stations')).toContainText('Goldstone California');
    await expect(view(page).locator('.dsn-stations')).toContainText('Moon below horizon · next at 02:16');
    await expect(view(page).locator('.dsn-stations')).toContainText('Canberra Australia');
    await expect(view(page).locator('.dsn-stations')).toContainText('next at 10:58');
    await expect(view(page).getByRole('img', { name: /^The Earth seen from the Moon/ })).toBeVisible();
    await expect(view(page).locator('.dsn-earth__label')).toContainText(['Moon overhead']);
    await expect(band(page)).toBeVisible();
    await expect(band(page).getByRole('img', { name: /^Robledo de Chavela: listening 00:00–01:22, 16:10–24:00$/ })).toBeVisible();
    await expect(band(page).getByRole('img', { name: /^Goldstone: listening / })).toBeVisible();
    await expect(view(page).locator('.dsn-band__chip')).toHaveText('20:00');
    // The card stays beside the view, with its own block.
    await expect(block(page)).toContainText('Robledo');
    await evidence(page, 'c-desktop');
    await headerTab(page, 'Globe').click();
    await expect(view(page)).toHaveCount(0);
    await expect(page.locator('section.globe')).toBeVisible();
  });

  test('C · the playhead follows the shared instant: the slider moves it, and the block with it', async ({ page }) => {
    await open(page, './#dsn');
    await expect(view(page).locator('.dsn-band__chip')).toHaveText('20:00');
    const before = parseFloat(await playheadLeft(page));
    await slider(page).focus();
    for (let i = 0; i < 7; i++) await page.keyboard.press('ArrowRight');
    await expect(view(page).locator('.dsn-band__chip')).toHaveText('03:00');
    // A new UTC day: the band shows 23 November, and Goldstone has taken over since 02:16.
    await expect(band(page)).toHaveAccessibleName(/Mon 23 Nov/);
    expect(parseFloat(await playheadLeft(page))).toBeLessThan(before);
    await expect(view(page).getByRole('heading', { name: 'Goldstone' })).toBeVisible();
    await expect(block(page)).toContainText('Goldstone');
    await slider(page).press('ArrowLeft');
    await expect(view(page).locator('.dsn-band__chip')).toHaveText('02:00');
    await expect(view(page)).toContainText('Madrid · Moon at');
    await expect(view(page)).toContainText('16 min left');
  });

  test('the keyboard reaches the DSN tab and opens the view', async ({ page }) => {
    await open(page);
    const dsn = headerTab(page, 'DSN');
    await dsn.focus();
    await expect(dsn).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(view(page)).toBeVisible();
  });

  test('no link: a pin where the Earth is under the horizon says «No link» first, why, and who would listen', async ({ page }) => {
    await computed(page);
    await open(page, './?lat=-85.5&lon=31', NO_LINK);
    await expect(block(page)).toContainText('No link');
    await expect(block(page)).toContainText('Earth below the horizon');
    await expect(block(page)).toContainText('Robledo would listen');
    await expect(block(page)).not.toContainText('left');
    await block(page).scrollIntoViewIfNeeded();
    await evidence(page, 'nolink-desktop');
    await headerTab(page, 'DSN').click();
    await expect(view(page).getByRole('heading', { name: 'No link' })).toBeVisible();
    await expect(view(page)).toContainText('Robledo would listen');
  });

  test('at 200 % text the view keeps its words inside it', async ({ page }) => {
    await open(page, './#dsn');
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    await expect(view(page).getByRole('heading', { name: 'Robledo de Chavela' })).toBeVisible();
    const box = (await view(page).boundingBox())!;
    const inside = await view(page).locator('.dsn-headline, .dsn-band__head, .dsn-band__name').evaluateAll((els, b) =>
      els.every((el) => {
        const r = el.getBoundingClientRect();
        return r.left >= b.x - 0.5 && r.right <= b.x + b.width + 0.5;
      }), box);
    expect(inside).toBe(true);
    await evidence(page, 'c-desktop-200');
  });

  test('under the production CSP, the block and the view raise no violation', async ({ page }) => {
    const line = execFileSync(process.execPath, [CSP_SCRIPT, DIST], { encoding: 'utf8' });
    const policy = /Content-Security-Policy "([^"]+)"/.exec(line)![1]!;
    await page.route(/\/(\?.*)?(#.*)?$/, async (route) => {
      const response = await route.fetch();
      await route.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': policy } });
    });
    await page.addInitScript(() => {
      const found: string[] = [];
      (window as unknown as { violations: string[] }).violations = found;
      document.addEventListener('securitypolicyviolation', (e) => found.push(`${e.violatedDirective} ${e.blockedURI}`));
    });
    await open(page);
    await expect(block(page)).toContainText('Robledo');
    await headerTab(page, 'DSN').click();
    await expect(band(page)).toBeVisible();
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => (window as unknown as { violations: string[] }).violations)).toEqual([]);
  });
});

test.describe('phone, 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('A · the fourth widget names Robledo with the Moon at 52° and ~6 h left, beside its small Earth', async ({ page }) => {
    await open(page);
    const widget = page.getByRole('list', { name: 'This site now' }).getByRole('listitem').nth(3);
    await expect(widget).toContainText('Listening on Earth');
    await expect(widget).toContainText('Robledo');
    await expect(widget).toContainText('Moon 52° · ~6 h left');
    await expect(widget.getByRole('img', { name: /^The Earth seen from the Moon/ })).toBeVisible();
    await evidence(page, 'a-phone');
  });

  test('A · no link on a site without the Earth: «No link», why, who would listen', async ({ page }) => {
    await open(page, './?site=apollo11');
    const widget = page.getByRole('list', { name: 'This site now' }).getByRole('listitem').nth(3);
    await expect(widget).toContainText('No link');
    await expect(widget).toContainText('Earth below the horizon');
    await expect(widget).toContainText(/would listen$/);
  });

  test('A · no link at the pin\'s point, on the simulator\'s hours', async ({ page }) => {
    await computed(page);
    await open(page, './?lat=-85.5&lon=31', NO_LINK);
    const widget = page.getByRole('list', { name: 'This site now' }).getByRole('listitem').nth(3);
    await expect(widget).toContainText('No link');
    await expect(widget).toContainText('Earth below the horizon');
    await expect(widget).toContainText('Robledo would listen');
    await evidence(page, 'nolink-phone');
  });

  test('C · the DSN tab shows the Earth over the screen and the band in the sheet; Globe goes back', async ({ page }) => {
    await open(page);
    await tabs(page).getByRole('button', { name: 'DSN', exact: true }).click();
    await expect(page).toHaveURL(/#dsn$/);
    await expect(tabs(page).getByRole('button', { name: 'DSN', exact: true })).toHaveAttribute('aria-current', 'true');
    await expect(view(page).getByRole('img', { name: /^The Earth seen from the Moon/ })).toBeVisible();
    const sheet = page.locator('.sheet');
    await expect(sheet.getByRole('heading', { name: 'Robledo de Chavela' })).toBeVisible();
    await expect(sheet.getByRole('group', { name: /^Which antenna sees the Moon on Sun 22 Nov/ })).toBeVisible();
    await expect(page.locator('section.globe')).toBeHidden();
    await evidence(page, 'c-phone');
    await tabs(page).getByRole('button', { name: 'Globe', exact: true }).click();
    await expect(page).toHaveURL(/#globe$/);
    await expect(page.locator('section.globe')).toBeVisible();
    await expect(page.locator('.dsn-stage')).toHaveCount(0);
  });
});

for (const [path, name] of [['', 'English'], ['en-xa/', 'the pseudo-locale']] as const) {
  for (const width of [320, 360]) {
    test.describe(`phone, ${width} px, ${name}`, () => {
      test.use({ viewport: { width, height: 780 }, hasTouch: true, isMobile: true });

      test('the five tabs fit the bar, each label whole, nothing off the screen', async ({ page }) => {
        await open(page, `./${path}`);
        await expect(page.locator('.tab')).toHaveCount(5);
        const cut = await page.locator('.tab-bar, .tab').evaluateAll((els) =>
          els.filter((el) => {
            const box = el.getBoundingClientRect();
            return box.left < -0.5 || box.right > innerWidth + 0.5 || el.scrollWidth > el.clientWidth + 1;
          }).map((el) => el.textContent));
        expect(cut).toEqual([]);
        // At 360 px every label keeps to one line, even the pseudo-locale's longer words.
        const wrapped = await page.locator('.tab > span:not(.tab__soon)').evaluateAll((els) =>
          els.filter((el) => el.getBoundingClientRect().height > parseFloat(getComputedStyle(el).lineHeight) * 1.5).map((el) => el.textContent));
        if (width === 360) expect(wrapped).toEqual([]);
        if (width === 360) await evidence(page, `tabs-${width}${path ? '-en-xa' : ''}`);
      });
    });
  }
}

test.describe('evidence in the dark theme, as the canvases', () => {
  test.skip(!process.env.CAPTURE_EVIDENCE, 'captures only with CAPTURE_EVIDENCE=1');

  test('desktop: the card\'s block and the DSN view', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await open(page);
    await expect(block(page)).toContainText('Robledo');
    await block(page).scrollIntoViewIfNeeded();
    await evidence(page, 'a-desktop-dark');
    await headerTab(page, 'DSN').click();
    await expect(band(page)).toBeVisible();
    await evidence(page, 'c-desktop-dark');
  });

  test('phone: the widget, the DSN view and no link', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, colorScheme: 'dark', reducedMotion: 'reduce' });
    const page = await context.newPage();
    await open(page);
    await expect(page.locator('.widget--dsn')).toContainText('Robledo');
    await evidence(page, 'a-phone-dark');
    await tabs(page).getByRole('button', { name: 'DSN', exact: true }).click();
    await expect(page.locator('.sheet .dsn-band')).toBeVisible();
    await evidence(page, 'c-phone-dark');
    await context.close();
  });
});
