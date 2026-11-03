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
 * VENT-52 part B. On a phone the sheet at peek shows its head (the name, «Save» for a custom point and the point's
 * coordinates) clear of the floating tab bar by 12 px at any text size and language, on the globe and in the on-foot
 * view, as the half sheet already does with its content. On desktop every block of the site card beside the view can
 * be brought into view inside the card's scroll box, uncovered, at 1440x900 and at 200 % text.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { stubApi } from './api-stub';

const NOW = new Date('2026-11-23T18:00:00Z');
const PIN = '?lat=-85.50&lon=40.00';
const SHOTS = process.env.VENT52_SHOTS;

async function open(page: Page, path: string): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.setFixedTime(NOW);
  await page.addInitScript(() => localStorage.setItem('ventana.pinHint', 'seen'));
  await stubApi(page);
  await page.goto(path);
}

/** Sets the root text size to 200 %, as a browser's text zoom does, once the page has started. */
async function bigText(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
}

async function shot(page: Page, name: string): Promise<void> {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

/** Whether the point at the centre of `locator`'s box belongs to it: nothing paints over it there. */
function uncovered(locator: Locator): Promise<boolean> {
  return locator.evaluate((el) => {
    const box = el.getBoundingClientRect();
    const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    return hit !== null && (el === hit || el.contains(hit));
  });
}

test.describe('phone, 390x844: the sheet at peek', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  const sheet = (page: Page) => page.locator('.sheet');
  const tabBar = (page: Page) => page.locator('.tab-bar');

  /** Once the sheet rests at peek: its head's bottom, the tab bar's top. */
  async function restsAtPeek(page: Page): Promise<{ headBottom: number; tabsTop: number }> {
    await expect(sheet(page)).toHaveAttribute('data-detent', 'peek');
    await expect(sheet(page)).not.toHaveAttribute('data-moving', { timeout: 30_000 });
    const head = (await page.locator('.summary__head').boundingBox())!;
    const tabs = (await tabBar(page).boundingBox())!;
    return { headBottom: head.y + head.height, tabsTop: tabs.y };
  }

  /** From half, the grabber cycles to full, then to peek. */
  async function toPeek(page: Page): Promise<void> {
    const grabber = page.locator('.sheet__grabber');
    await expect(sheet(page)).toHaveAttribute('data-detent', 'half');
    await grabber.press('Enter');
    await expect(sheet(page)).toHaveAttribute('data-detent', 'full');
    await grabber.press('Enter');
  }

  async function expectHeadClear(page: Page, custom: boolean): Promise<void> {
    const { headBottom, tabsTop } = await restsAtPeek(page);
    expect(tabsTop - headBottom).toBeGreaterThanOrEqual(11.5);
    await expect.poll(() => uncovered(page.locator('.summary__name'))).toBe(true);
    if (!custom) return;
    await expect.poll(() => uncovered(page.locator('.summary__head .save-button'))).toBe(true);
    await expect.poll(() => uncovered(page.locator('.summary__coords'))).toBe(true);
  }

  for (const [name, path, big] of [
    ['IM-2', './?site=im2-athena', false],
    ['a custom point', `./${PIN}`, false],
    ['IM-2 at 200 % text', './?site=im2-athena', true],
    ['a custom point at 200 % text', `./${PIN}`, true],
    ['a custom point in Spanish at 200 % text', `./es/${PIN}`, true],
  ] as const) {
    test(`globe, ${name}: the head clears the tab bar by 12 px`, async ({ page }) => {
      await open(page, path);
      await expect(page.locator('.summary__head')).toBeVisible();
      if (big) await bigText(page);
      await toPeek(page);
      await expectHeadClear(page, path.includes('lat='));
      await shot(page, `phone-peek-${name.replaceAll(' ', '-')}`);
    });
  }

  test('on-foot view, a custom point in Spanish at 200 % text: «Guardar» and the point clear the tab bar', async ({ page }) => {
    await open(page, `./es/${PIN}`);
    await expect(page.locator('.summary__head')).toBeVisible();
    await bigText(page);
    // The Horizon tab is the fourth of five (Globe, Calendar, DSN, Horizon, Sites); it leaves the sheet at peek.
    await page.locator('.tab-bar button').nth(3).tap();
    await expectHeadClear(page, true);
    await shot(page, 'phone-peek-on-foot-es-200');
  });

  test('reloaded at peek, the sheet rises for the head that comes after it', async ({ page }) => {
    await open(page, `./es/${PIN}`);
    await toPeek(page);
    await restsAtPeek(page);
    // The session keeps the detent (sheet-memory.ts): the reload mounts the sheet at peek before the head is drawn.
    await page.reload();
    const gap = async (): Promise<number> => {
      const { headBottom, tabsTop } = await restsAtPeek(page);
      return tabsTop - headBottom;
    };
    await expect.poll(gap).toBeGreaterThanOrEqual(11.5);
    await expectHeadClear(page, true);
  });

  test('resting at peek, a head that grows (a name on three lines) lifts the sheet again', async ({ page }) => {
    await open(page, './?site=im2-athena');
    await toPeek(page);
    await restsAtPeek(page);
    // Nothing else moves at the same time (no top bar, no viewport, no detent change): only the head's own watch can.
    await page.locator('.summary__name').evaluate((el) => {
      el.textContent = 'A site with a long name that wraps onto three lines';
    });
    const gap = async (): Promise<number> => {
      const { headBottom, tabsTop } = await restsAtPeek(page);
      return tabsTop - headBottom;
    };
    await expect.poll(gap).toBeGreaterThanOrEqual(11.5);
  });

  test('IM-2 at the usual text size keeps the canvas peek: 156 px', async ({ page }) => {
    await open(page, './?site=im2-athena');
    await toPeek(page);
    await restsAtPeek(page);
    expect(Math.round((await sheet(page).boundingBox())!.y)).toBe(844 - 156);
  });
});

test.describe('desktop, 1440x900: the site card beside the view', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  const scroller = (page: Page) => page.locator('.site-card__scroll');

  /**
   * Each block of the card, scrolled to its top and then to its bottom inside the scroll box: both edges show inside
   * the box (a block taller than the box shows each in turn), and nothing paints over its middle.
   */
  async function expectEveryBlockReachable(page: Page): Promise<void> {
    const blocks = scroller(page).locator(':scope > *');
    const count = await blocks.count();
    expect(count).toBeGreaterThan(3);
    for (let index = 0; index < count; index += 1) {
      for (const edge of ['top', 'bottom'] as const) {
        const seen = await blocks.nth(index).evaluate((el, at) => {
          const box = el.parentElement!;
          const room = box.getBoundingClientRect();
          const own = el.getBoundingClientRect();
          const delta = at === 'top' ? own.top - room.top : own.bottom - room.bottom;
          box.scrollTop += delta;
          const after = el.getBoundingClientRect();
          const edgeY = at === 'top' ? after.top + 1 : after.bottom - 1;
          const inside = edgeY >= room.top && edgeY <= room.bottom && room.bottom <= window.innerHeight;
          const middle = Math.min(Math.max(edgeY + (at === 'top' ? 12 : -12), room.top), room.bottom - 1);
          const hit = document.elementFromPoint(after.left + after.width / 2, middle);
          return inside && hit !== null && el.contains(hit) === true;
        }, edge);
        expect(seen, `block ${index}, ${edge}`).toBe(true);
      }
    }
  }

  for (const [name, path, big] of [
    ['IM-2', './?site=im2-athena', false],
    ['a custom point', `./${PIN}`, false],
    ['a custom point in the Horizon view', `./${PIN}#horizon`, false],
    ['IM-2 at 200 % text', './?site=im2-athena', true],
    ['a custom point in the Horizon view at 200 % text', `./${PIN}#horizon`, true],
  ] as const) {
    test(`${name}: every block of the card can be brought into view`, async ({ page }) => {
      await open(page, path);
      await expect(scroller(page).locator('.dsn-block')).toBeVisible();
      await expect(scroller(page).locator('.card-source')).toBeAttached();
      if (big) await bigText(page);
      // Taller than its room, the card scrolls and says so: focusable, with the fade at its bottom edge.
      await expect(scroller(page)).toHaveAttribute('tabindex', '0');
      await expect(scroller(page)).toHaveAttribute('data-fade-bottom', 'true');
      await expectEveryBlockReachable(page);
      await shot(page, `desktop-card-${name.replaceAll(' ', '-')}`);
    });
  }
});
