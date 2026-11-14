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
 * VENT-125: «Open in LROC QuickMap» opens LROC QuickMap in a new tab,
 * centred on the selected site or point. On desktop it is the site card's
 * last item (the human's «Al final»); on a phone it is a «QuickMap» pill
 * first in the Sites sheet's head, before the gear and «Done», so the half
 * sheet does not grow. The arrow is always an SVG, never a character an
 * emoji font could draw. The spec reads the links; it never follows them.
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
/** The half sheet's top at 390 x 844 on IM-2, as on main before VENT-125. */
const MAIN_HALF_TOP = 374;
const SHOTS = process.env.VENT125_SHOTS;
const SCALE = SHOTS ? 2 : 1;

async function open(page: Page, path: string): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.setFixedTime(NOW);
  await page.addInitScript(() => localStorage.setItem('ventana.pinHint', 'seen'));
  await stubApi(page);
  // Nothing in this spec may reach QuickMap.
  await page.route(`${QUICKMAP}**`, (route) => route.abort());
  await page.goto(path);
}

async function shot(page: Page, name: string): Promise<void> {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/round2-${name}.png` });
}

/** A new tab, without the opener or the referrer, at `href`. */
async function expectOpens(link: Locator, href: string): Promise<void> {
  await expect(link).toHaveAttribute('href', href);
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', /\bnoopener\b/);
  await expect(link).toHaveAttribute('rel', /\bnoreferrer\b/);
}

/** The arrow is an SVG hidden from assistive technology, never the ↗ character. */
async function expectSvgArrow(link: Locator): Promise<void> {
  expect(await link.innerText()).not.toContain('↗');
  const arrow = link.locator('svg');
  await expect(arrow).toHaveCount(1);
  await expect(arrow).toHaveAttribute('aria-hidden', 'true');
}

test.describe('desktop, 1440x900: the site card', () => {
  test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: SCALE });

  const link = (page: Page) => page.locator('.site-card .card-quickmap');

  test('IM-2: the link is the card\'s last item and opens QuickMap on it', async ({ page }) => {
    await open(page, IM2);
    await expectOpens(link(page), IM2_HREF);
    await expect(link(page)).toHaveText('Open in LROC QuickMap');
    await expect(link(page)).toHaveAccessibleName('Open in LROC QuickMap, in a new tab');
    await expectSvgArrow(link(page));
    await expect(page.locator('.site-card__scroll > :last-child')).toHaveClass(/\bcard-quickmap\b/);
    const box = (await link(page).boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
    await page.locator('.site-card__scroll').evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await expect(link(page)).toBeInViewport();
    await shot(page, 'desktop-card-end');
  });

  test('a custom point gets its own address', async ({ page }) => {
    await open(page, `./${PIN}`);
    await expectOpens(link(page), PIN_HREF);
  });

  test('in Spanish the label is Spanish and QuickMap keeps its name', async ({ page }) => {
    await open(page, './es/?site=im2-athena');
    await expect(link(page)).toHaveText('Abrir en LROC QuickMap');
    await expect(link(page)).toHaveAccessibleName('Abrir en LROC QuickMap, en una pestaña nueva');
    await expect(link(page)).toHaveAttribute('href', IM2_HREF);
  });
});

/** Opens the Sites sheet at full from the tab bar. */
async function openSites(page: Page): Promise<Locator> {
  await page.locator('.tab-bar .tab').last().click();
  await expect(page.locator('.sheet')).toHaveAttribute('data-detent', 'full');
  return page.locator('.picker__head');
}

test.describe('phone, 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: SCALE });

  const pill = (page: Page) => page.locator('.picker__head .quickmap-pill');

  test('IM-2: the half sheet holds no link and rests where it did on main', async ({ page }) => {
    await open(page, IM2);
    const sheet = page.locator('.sheet');
    await expect(sheet).toHaveAttribute('data-detent', 'half');
    await expect(page.locator('.summary')).toBeVisible();
    await expect(sheet).not.toHaveAttribute('data-moving', { timeout: 30_000 });
    await expect(sheet.locator('.quickmap-link, .quickmap-pill')).toHaveCount(0);
    const top = (await sheet.boundingBox())!.y;
    expect(Math.abs(top - MAIN_HALF_TOP)).toBeLessThanOrEqual(1);
    await shot(page, 'phone-half');
  });

  test('IM-2: the Sites sheet\'s head carries «QuickMap» before the gear and «Done»', async ({ page }) => {
    await open(page, IM2);
    const head = await openSites(page);
    await expectOpens(pill(page), IM2_HREF);
    await expect(pill(page)).toHaveText('QuickMap');
    await expect(pill(page)).toHaveAccessibleName('Open IM-2 in LROC QuickMap, in a new tab');
    await expectSvgArrow(pill(page));
    const order = await head.locator('.picker__actions').evaluate((el) => [...el.children].map((child) => child.className));
    const at = (name: string) => order.findIndex((c) => c.includes(name));
    expect(at('quickmap-pill')).toBe(0);
    expect(at('quickmap-pill')).toBeLessThan(at('picker__gear'));
    expect(at('picker__gear')).toBeLessThan(at('picker__done'));
    expect((await pill(page).boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await shot(page, 'phone-sites-head');
  });

  test('a custom point gets its own address beside its bookmark', async ({ page }) => {
    await open(page, `./${PIN}`);
    await openSites(page);
    await expect(page.locator('.picker__head .save-icon')).toBeVisible();
    await expectOpens(pill(page), PIN_HREF);
    await expect(pill(page)).toHaveAccessibleName('Open Custom point in LROC QuickMap, in a new tab');
  });

  test('in Spanish the name is Spanish and the label stays «QuickMap»', async ({ page }) => {
    await open(page, './es/?site=im2-athena');
    await openSites(page);
    await expect(pill(page)).toHaveText('QuickMap');
    await expect(pill(page)).toHaveAccessibleName('Abrir IM-2 en LROC QuickMap, en una pestaña nueva');
  });
});

/**
 * In `head`, the controls (pill, bookmark, gear, «Done») are whole, inside
 * the screen and apart from each other and from the title.
 */
function headFits(head: Locator): Promise<string[]> {
  return head.evaluate((el) => {
    const problems: string[] = [];
    const controls = [...el.querySelectorAll<HTMLElement>('.quickmap-pill, .save-icon, .picker__gear, .picker__done')];
    const title = el.querySelector<HTMLElement>('.picker__title');
    const boxes = controls.map((c) => ({ name: c.className, box: c.getBoundingClientRect() }));
    for (const { name, box } of boxes) {
      if (box.left < -0.5 || box.right > innerWidth + 0.5) problems.push(`${name} leaves the screen`);
      const c = controls.find((x) => x.className === name)!;
      if (c.scrollWidth > c.clientWidth + 1) problems.push(`${name} is cut`);
    }
    const all = title ? [...boxes, { name: 'title', box: title.getBoundingClientRect() }] : boxes;
    for (let i = 0; i < all.length; i += 1) {
      for (let j = i + 1; j < all.length; j += 1) {
        const a = all[i]!.box;
        const b = all[j]!.box;
        const apart = a.right <= b.left + 0.5 || b.right <= a.left + 0.5 || a.bottom <= b.top + 0.5 || b.bottom <= a.top + 0.5;
        if (!apart) problems.push(`${all[i]!.name} overlaps ${all[j]!.name}`);
      }
    }
    if (controls.length < 3) problems.push(`only ${controls.length} controls`);
    return problems;
  });
}

for (const width of [360, 320]) {
  test.describe(`phone, ${width}x780, pseudo-locale at 200 % text`, () => {
    test.use({ viewport: { width, height: 780 }, hasTouch: true, isMobile: true });

    for (const [name, path] of [['IM-2', './en-xa/?site=im2-athena'], ['a custom point', `./en-xa/${PIN}`]] as const) {
      test(`${name}: the head keeps the pill, the icons and «Done» whole and apart`, async ({ page }) => {
        await open(page, path);
        const head = await openSites(page);
        await expect(head.locator('.quickmap-pill')).toBeVisible();
        await page.evaluate(() => {
          document.documentElement.style.fontSize = '200%';
        });
        await expect.poll(() => headFits(head)).toEqual([]);
        await expect(head.locator('.quickmap-pill')).toHaveAttribute('href', path.includes('lat=') ? PIN_HREF : IM2_HREF);
      });
    }
  });
}
