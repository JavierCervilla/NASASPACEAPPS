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
 * The globe lets go of a mouse that leaves its view (VENT-122, the human: «when you are on the globe dragging and you
 * take the mouse out of the view, it keeps moving; it feels buggy»). A fast drag carried out of the globe onto the site
 * card stops the globe at the view's edge: carried on over the card it turns no further, the release there makes no
 * coast, and a mouse moved back over the globe with no button down does not turn it. Nothing on the globe counts its frames, so the checks compare
 * screenshots clipped to the globe's view, with the finite animations finished (the selected marker's ring pulses) and
 * the markers and their callouts masked (a hover may show a callout).
 */
import { expect, test, type Page } from '@playwright/test';
import { stubApi } from './api-stub';

// Under CI's parallel software-rendered pages the globe can take a while to start (same bound as globe.spec.ts).
const GLOBE_START_MS = 20_000;
const CANVAS = new Date('2026-11-22T20:00:00Z');
const GLOBE_NAME = 'The Moon, seen over its south pole';
// Long enough for a coast to show: a flick decays to a stop in about a second (look-coast's and the globe's 0.995/ms).
const STILL_MS = 1500;

const globe = (page: Page) => page.getByRole('application', { name: GLOBE_NAME });

/** The globe's view as drawn now, markers and callouts masked. */
async function globeShot(page: Page): Promise<Buffer> {
  const clip = (await globe(page).boundingBox())!;
  return page.screenshot({
    clip,
    animations: 'disabled',
    caret: 'hide',
    mask: [page.locator('.globe-marker, .globe-callout, .globe-ring')],
  });
}

test.describe('desktop, 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('a drag carried out of the globe onto the site card stops it at the edge, and a bare mouse never turns it', async ({ page }) => {
    await page.clock.setFixedTime(CANVAS);
    await stubApi(page);
    await page.goto('./?site=im2-athena');
    await expect(page.locator('.globe-viewport')).toHaveAttribute('data-status', 'ready', { timeout: GLOBE_START_MS });
    const view = (await globe(page).boundingBox())!;
    const card = (await page.locator('aside.site-card').boundingBox())!;
    // The card sits beside the globe, so the drag leaves the view on its way there.
    expect(card.x).toBeGreaterThanOrEqual(view.x + view.width - 1);
    const before = await globeShot(page);

    // A fast drag from the globe's middle to near its right edge turns it; carried on over the card, the button still
    // down, it turns it no further, and the release over the card, at a speed that would coast inside, leaves it still.
    const from = { x: view.x + view.width / 2, y: view.y + view.height / 2 };
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(view.x + view.width - 20, from.y, { steps: 8 });
    const atEdge = await globeShot(page);
    expect(atEdge.equals(before)).toBe(false);
    await page.mouse.move(card.x + 40, from.y);
    await page.mouse.move(card.x + card.width / 2, from.y + 60, { steps: 6 });
    const outside = await globeShot(page);
    expect(outside.equals(atEdge)).toBe(true);
    await page.mouse.up();
    await page.waitForTimeout(STILL_MS);
    const later = await globeShot(page);
    expect(later.equals(atEdge)).toBe(true);

    // Back over the globe with no button down, and across it: it stays where it stopped.
    await page.mouse.move(from.x, view.y + 40, { steps: 8 });
    await page.mouse.move(view.x + 40, view.y + 40, { steps: 8 });
    await page.waitForTimeout(STILL_MS);
    expect((await globeShot(page)).equals(later)).toBe(true);
  });
});
