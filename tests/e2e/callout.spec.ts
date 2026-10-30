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

/**
 * The selected site's callout on the globe (VENT-29, validated canvases «Globe · site callout B, image card» for
 * desktop and «… A, compact» for phones), at the canvas's date: IM-2 answers real JPL Horizons hours for November
 * 2026 (api-stub.ts), so its state and countdowns read as the site card's.
 */
import { expect, test, type Page } from '@playwright/test';
import { stubApi } from './api-stub';

const NOW = new Date('2026-11-23T18:00:00Z');
const IM1 = '[data-site-id="im1-odysseus"]';
const IM2 = '[data-site-id="im2-athena"]';
const callout = (page: Page) => page.locator('.globe-callout');
const part = (page: Page, name: string) => callout(page).locator(`.globe-callout__${name}`);

async function open(page: Page): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  await page.clock.setFixedTime(NOW);
  await stubApi(page);
  await page.goto('./');
  await expect(callout(page)).toHaveAttribute('data-state', 'window');
}

/** The centre of a marker once two reads 150 ms apart agree: the globe has stopped turning. */
async function settledCentre(page: Page, selector: string): Promise<{ x: number; y: number }> {
  const read = () => page.locator(selector).evaluate((el) => (el as HTMLElement).style.transform);
  let last = await read();
  await expect
    .poll(async () => {
      await page.waitForTimeout(150);
      const now = await read();
      const still = now === last && now !== '';
      last = now;
      return still;
    })
    .toBe(true);
  const box = await page.locator(selector).boundingBox();
  return { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 };
}

test.describe('desktop, 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('shows the image, the site, its point, the state and the two countdowns for IM-2', async ({ page }) => {
    const requested: string[] = [];
    page.on('request', (request) => requested.push(request.url()));
    await open(page);
    const group = page.getByRole('group', { name: 'Mons Mouton (IM-2 Athena)' });
    await expect(group).toBeVisible();
    const image = group.getByRole('img', { name: 'Mons Mouton from orbit, LOLA relief' });
    await expect(image).toHaveAttribute('src', '/thumbs/im2-athena.jpg');
    await expect(image).toHaveAttribute('decoding', 'async');
    await expect.poll(() => image.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBe(320);
    expect((await image.boundingBox())?.height).toBe(150);
    await expect(part(page, 'badge')).toHaveText('Landing window now');
    await expect(part(page, 'caption')).toHaveText('LOLA · 30 km');
    await expect(part(page, 'mission')).toHaveText('IM-2 Athena · landed 6 Mar 2025');
    await expect(part(page, 'place')).toHaveText('Mons Mouton');
    await expect(part(page, 'point')).toHaveText('84.79° S, 29.20° E · exact touchdown');
    await expect(part(page, 'tiles')).toHaveText('Sunset in7 d 1 hEarthset in7 d 10 h');
    // Only the selected site's thumbnail is fetched.
    expect(requested.filter((url) => url.includes('/thumbs/'))).toEqual([expect.stringMatching(/\/thumbs\/im2-athena\.jpg$/)]);
  });

  test('follows the slider: the state and the countdowns move with the instant', async ({ page }) => {
    await open(page);
    await page.getByRole('slider').first().focus();
    await page.keyboard.press('ArrowRight');
    await expect(part(page, 'tiles')).toHaveText('Sunset in7 dEarthset in7 d 9 h');
    // 9 November, 08:00: neither the Sun nor the Earth at IM-2.
    await page.getByRole('slider').first().fill('200');
    await expect(callout(page)).toHaveAttribute('data-state', 'none');
    await expect(part(page, 'badge')).toHaveText('Neither');
  });

  test('hides when its marker turns behind the limb, and comes back with it', async ({ page }) => {
    await open(page);
    await expect(callout(page)).toBeVisible();
    await page.getByRole('application', { name: 'The Moon, seen over its south pole' }).focus();
    for (let press = 0; press < 8; press += 1) await page.keyboard.press('ArrowUp');
    await expect(page.locator(IM2)).toBeHidden();
    await expect(callout(page)).toBeHidden();
    await expect(page.locator('.globe-callout-leader')).toBeHidden();
    for (let press = 0; press < 8; press += 1) await page.keyboard.press('ArrowDown');
    await expect(callout(page)).toBeVisible();
  });

  test('takes no clicks: IM-1 and a marker under the card are still picked', async ({ page }) => {
    await open(page);
    expect(await callout(page).evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none');
    const im1 = await settledCentre(page, IM1);
    await page.mouse.click(im1.x, im1.y);
    await expect(page.locator(IM1)).toHaveAttribute('aria-pressed', 'true');
    await expect(callout(page)).toHaveAttribute('aria-label', 'Malapert A region (IM-1 Odysseus)');
    // Back on IM-2, zoomed in until a marker sits under its card: the click goes through the card to it.
    await page.getByRole('button', { name: /^Mons Mouton \(IM-2 Athena\)/ }).press('Enter');
    await page.getByRole('application', { name: 'The Moon, seen over its south pole' }).focus();
    for (let press = 0; press < 4; press += 1) await page.keyboard.press('+');
    await settledCentre(page, IM2);
    const under = await page.evaluate(() => {
      const card = document.querySelector('.globe-callout')!.getBoundingClientRect();
      const inside = [...document.querySelectorAll<HTMLElement>('.globe-marker')].filter((el) => {
        const r = el.getBoundingClientRect();
        const [x, y] = [r.x + r.width / 2, r.y + r.height / 2];
        return !el.hidden && x > card.left && x < card.right && y > card.top && y < card.bottom;
      });
      const first = inside[0]!.getBoundingClientRect();
      return { id: inside[0]!.dataset['siteId'], x: first.x + first.width / 2, y: first.y + first.height / 2 };
    });
    expect(await page.evaluate(({ x, y }) => (document.elementFromPoint(x, y) as HTMLElement).dataset['siteId'], under)).toBe(under.id);
    await page.mouse.click(under.x, under.y);
    await expect(page.locator(`[data-site-id="${under.id}"]`)).toHaveAttribute('aria-pressed', 'true');
  });

  test('a site north of 80° S shows the card without the image header', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: /^Change site, now/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Choose a site' });
    await dialog.getByRole('searchbox', { name: 'Search a site or mission' }).fill('apollo 11');
    await dialog.getByRole('button', { name: /^Mare Tranquillitatis/ }).click();
    await expect(callout(page)).toHaveAttribute('aria-label', 'Mare Tranquillitatis (Tranquility Base) (Apollo 11)');
    await expect(callout(page)).toHaveAttribute('data-image', 'none');
    await expect(part(page, 'media')).toBeHidden();
    await expect(part(page, 'pill')).toBeVisible();
  });
});

test.describe('phone, 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('with the sheet closed the compact callout shows the thumbnail, the site and the state with its time left', async ({ page }) => {
    await open(page);
    await page.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: 'Globe' }).click();
    await expect(page.locator('.sheet')).toHaveAttribute('inert', '');
    await expect(callout(page)).toBeVisible();
    const image = callout(page).getByRole('img', { name: 'Mons Mouton from orbit, LOLA relief' });
    const box = await image.boundingBox();
    expect([box?.width, box?.height]).toEqual([84, 84]);
    await expect(part(page, 'pill')).toHaveText('Landing window · 7 d 1 h left');
    await expect(part(page, 'tiles')).toBeHidden();
    await expect(part(page, 'badge')).toBeHidden();
    // Inside the screen, clear of the top bar and the tab bar.
    const card = (await callout(page).boundingBox())!;
    const bar = (await page.locator('.phone-bar').boundingBox())!;
    const tabs = (await page.locator('.tab-bar').boundingBox())!;
    expect(card.x).toBeGreaterThanOrEqual(0);
    expect(card.x + card.width).toBeLessThanOrEqual(390);
    expect(card.y).toBeGreaterThanOrEqual(bar.y + bar.height);
    expect(card.y + card.height).toBeLessThanOrEqual(tabs.y);
  });
});
