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
 * Saving the custom point from the phone's full sheet (VENT-42): with the sheet at full height («Landing sites»
 * and «Done») the half sheet's «Save» is out of reach, so the picker's head carries an icon-only bookmark beside
 * «Done», only for a custom point. Pressing it saves the point under its «Near …» name; pressing it again deletes
 * it, with the undo. Reached with Tab and pressed with Enter or Space.
 *
 * `CAPTURE_EVIDENCE=1` also keeps screenshots in production/qa/evidence/.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { stubApi } from './api-stub';

const NOW = new Date('2026-11-23T18:00:00Z');
/** A cold run starts a software-rendered globe in every worker. */
const GLOBE_START_MS = 20_000;
const OUT = new URL('../../production/qa/evidence/', import.meta.url);
const DATE = '2026-11-02';
/** A custom point near Nobile Rim 1. */
const POINT = '?lat=-85.87&lon=61.34';
const NAME = 'Near Nobile Rim 1';
const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 360, height: 740 },
] as const;

/** A screenshot for QA, only with CAPTURE_EVIDENCE=1. */
async function evidence(page: Page, name: string): Promise<void> {
  if (!process.env.CAPTURE_EVIDENCE) return;
  await page.screenshot({ path: new URL(`${DATE}-vent-42-${name}.png`, OUT).pathname });
}

/** Opens `path` at the fixed instant with the API stubbed and the first-time hint seen. */
async function open(page: Page, path: string): Promise<void> {
  await page.clock.setFixedTime(NOW);
  await stubApi(page);
  await page.addInitScript(() => localStorage.setItem('ventana.pinHint', 'seen'));
  await page.goto(path);
  await expect(page.locator('.globe-viewport[data-status="ready"]')).toBeVisible({ timeout: GLOBE_START_MS });
}

/** Opens the sheet at full height through the «Sites» tab. */
async function fullSheet(page: Page): Promise<Locator> {
  await page.getByRole('button', { name: 'Sites', exact: true }).click();
  const picker = page.locator('.picker');
  await expect(picker.getByRole('heading', { name: 'Landing sites' })).toBeVisible();
  return picker;
}

/** The icon-only bookmark in the picker's head. */
const headSave = (picker: Locator) => picker.locator('.picker__head .save-icon');

const savedIds = (page: Page) =>
  page.evaluate(() => {
    const kept = JSON.parse(localStorage.getItem('ventana.savedSites') ?? '{"sites":[]}') as { sites: { id: string; name: string }[] };
    return kept.sites.map(({ id, name }) => `${id} ${name}`);
  });

for (const viewport of VIEWPORTS) {
  const size = `${viewport.width}x${viewport.height}`;

  test.describe(`phone, ${size}: saving from the full sheet`, () => {
    test.use({ viewport, hasTouch: true, isMobile: true });

    test('the bookmark beside «Done» saves the point, is filled, and the «Saved» segment lists it; again deletes it with Undo', async ({ page }) => {
      await open(page, `./${POINT}`);
      const picker = await fullSheet(page);
      const save = headSave(picker);
      await expect(save).toBeVisible();
      await expect(save).toHaveAccessibleName('Save');
      await expect(save).toHaveAttribute('data-saved', 'false');
      await expect(save).toHaveText('');
      await expect(save.locator('path')).toHaveAttribute('fill', 'none');
      // The layout size: the sheet's transform may still be settling, which blurs the drawn box by a subpixel.
      const target = await save.evaluate((el: HTMLElement) => [el.offsetWidth, el.offsetHeight]);
      expect(Math.min(...target)).toBeGreaterThanOrEqual(44);
      await evidence(page, `unsaved-${size}`);

      await save.click();
      await expect(save).toHaveAccessibleName('Saved: press to remove it from this device');
      await expect(save).toHaveAttribute('data-saved', 'true');
      await expect(save.locator('path')).toHaveAttribute('fill', 'currentColor');
      expect(await savedIds(page)).toEqual([`@-85.87,61.34 ${NAME}`]);
      await picker.getByRole('button', { name: /^Saved, 1 site/ }).click();
      const list = picker.getByRole('list', { name: 'Saved sites' });
      await expect(list.getByRole('listitem')).toHaveCount(1);
      await expect(list.locator('[aria-current="true"]')).toContainText(NAME);
      await evidence(page, `saved-${size}`);

      await save.click();
      const toast = page.locator('.undo-toast');
      await expect(toast).toContainText(`Deleted ${NAME}`);
      await expect(save).toHaveAccessibleName('Save');
      expect(await savedIds(page)).toEqual([]);
      await evidence(page, `undo-${size}`);
      await toast.getByRole('button', { name: 'Undo' }).click();
      await expect(save).toHaveAttribute('data-saved', 'true');
      expect(await savedIds(page)).toEqual([`@-85.87,61.34 ${NAME}`]);
    });

    test('a listed site shows no bookmark in the head', async ({ page }) => {
      await open(page, './');
      const picker = await fullSheet(page);
      await expect(picker.getByRole('button', { name: 'Done' })).toBeVisible();
      await expect(headSave(picker)).toHaveCount(0);
    });

    test('keyboard: Tab reaches the bookmark, Enter saves, Space deletes', async ({ page }) => {
      await open(page, `./${POINT}`);
      const picker = await fullSheet(page);
      const save = headSave(picker);
      await picker.getByRole('button', { name: 'Done' }).focus();
      await page.keyboard.press('Shift+Tab');
      await expect(save).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(save).toHaveAttribute('data-saved', 'true');
      await expect(save).toBeFocused();
      await evidence(page, `focus-${size}`);
      await page.keyboard.press('Space');
      await expect(save).toHaveAttribute('data-saved', 'false');
      await expect(page.locator('.undo-toast')).toContainText(`Deleted ${NAME}`);
    });
  });
}
