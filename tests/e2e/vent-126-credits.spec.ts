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
 * VENT-126: the project's public source code, the AI used to write it and
 * «not endorsed by NASA», on the landing's footer, at the end of the
 * desktop Layers key and at the end of the phone's Settings page. The link
 * opens GitHub in a new tab without the opener or the referrer, its arrow
 * an SVG, never the ↗ character a phone may draw as an emoji. At 1280x720
 * the key already scrolls, so the block sits inside its scroll and nothing
 * in the key moves. The spec reads the links; it never follows them.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { stubApi } from './api-stub';

const NOW = new Date('2026-11-23T18:00:00Z');
const IM2 = './?site=im2-athena';
const SOURCE = 'https://github.com/JavierCervilla/NASASPACEAPPS';
const LANDING = `http://localhost:${Number(process.env.PW_PORT ?? 4321) + 1}/`;
const SHOTS = process.env.VENT126_SHOTS;
const SCALE = SHOTS ? 2 : 1;

const TEXT = {
  en: {
    source: 'Source code on GitHub',
    name: 'Source code on GitHub, in a new tab',
    ai: 'Built with Claude (AI) as a coding assistant',
    disclaimer: 'Built for the NASA Space Apps Challenge. Not endorsed by NASA.',
  },
  es: {
    source: 'Código fuente en GitHub',
    name: 'Código fuente en GitHub, en una pestaña nueva',
    ai: 'Hecho con Claude (IA) como asistente de programación',
    disclaimer: 'Hecho para el NASA Space Apps Challenge. Sin respaldo de la NASA.',
  },
} as const;

async function open(page: Page, path: string): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.setFixedTime(NOW);
  await page.addInitScript(() => localStorage.setItem('ventana.pinHint', 'seen'));
  await stubApi(page);
  // Nothing in this spec may reach GitHub.
  await page.route('https://github.com/**', (route) => route.abort());
  await page.goto(path);
}

async function shot(target: Page | Locator, name: string): Promise<void> {
  if (SHOTS) await target.screenshot({ path: `${SHOTS}/${name}.png` });
}

/** A new tab on GitHub, without the opener or the referrer, its arrow an SVG hidden from assistive technology. */
async function expectSourceLink(link: Locator, name: string): Promise<void> {
  await expect(link).toHaveAttribute('href', SOURCE);
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', /\bnoopener\b/);
  await expect(link).toHaveAttribute('rel', /\bnoreferrer\b/);
  await expect(link).toHaveAccessibleName(name);
  expect(await link.innerText()).not.toContain('↗');
  const arrow = link.locator('svg');
  await expect(arrow).toHaveCount(1);
  await expect(arrow).toHaveAttribute('aria-hidden', 'true');
}

/** The link takes the pointer 21 px above and below its centre: a 44 px target. */
async function expectTallTarget(link: Locator): Promise<void> {
  const hits = await link.evaluate((el) => {
    const box = el.getBoundingClientRect();
    const x = box.left + Math.min(box.width / 2, 40);
    const y = box.top + box.height / 2;
    return [y - 21, y + 21].map((at) => el.contains(document.elementFromPoint(x, at)));
  });
  expect(hits).toEqual([true, true]);
}

test.describe('landing footer', () => {
  test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: SCALE });

  for (const [locale, path] of [['en', ''], ['es', 'es/']] as const) {
    test(`${locale}: the source link, the AI credit and the disclaimer`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.route('https://github.com/**', (route) => route.abort());
      await page.goto(`${LANDING}${path}`);
      const foot = page.locator('footer.foot');
      const link = foot.locator('a.foot__source');
      await expectSourceLink(link, TEXT[locale].name);
      await expect(link).toHaveText(TEXT[locale].source);
      expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await expect(foot).toContainText(TEXT[locale].ai);
      await expect(foot).toContainText(TEXT[locale].disclaimer);
      expect(await foot.innerText()).not.toContain('↗');
      await foot.scrollIntoViewIfNeeded();
      if (locale === 'en') await shot(foot, 'landing-footer');
    });
  }
});

test.describe('desktop: the Layers key\'s last block', () => {
  const key = (page: Page) => page.locator('.globe .globe-layers');
  const credits = (page: Page) => key(page).locator('.credits');

  for (const [locale, path] of [['en', IM2], ['es', './es/?site=im2-athena']] as const) {
    test(`1440x900, ${locale}: the block follows «Drop a pin» under a hairline`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await open(page, path);
      const link = credits(page).locator('a.credits__source');
      await expectSourceLink(link, TEXT[locale].name);
      await expect(link).toHaveText(TEXT[locale].source);
      await expect(credits(page)).toContainText(TEXT[locale].ai);
      await expect(credits(page)).toContainText(TEXT[locale].disclaimer);
      const last = await key(page).locator('.globe-layers__scroll').evaluate((el) => {
        const block = el.lastElementChild as HTMLElement;
        const drop = el.querySelector('.pin-drop')!.getBoundingClientRect();
        return {
          name: block.className,
          below: block.getBoundingClientRect().top >= drop.bottom,
          hairline: getComputedStyle(block).borderTopWidth,
        };
      });
      expect(last).toEqual({ name: 'credits', below: true, hairline: '1px' });
      await expect(link).toBeInViewport();
      await expectTallTarget(link);
    });
  }

  test.describe('1440x900 shot', () => {
    test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: SCALE });
    test('the key with its block', async ({ page }) => {
      await open(page, IM2);
      await expect(credits(page)).toBeVisible();
      await shot(page, 'desktop-1440x900');
    });
  });

  test.describe('1280x720', () => {
    test.use({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: SCALE });

    test('nothing in the key moves; «Drop a pin» stays reachable, the block scrolls into view', async ({ page }) => {
      await open(page, IM2);
      const drop = key(page).getByRole('button', { name: 'Drop a pin' });
      await expect(drop).toBeVisible();
      await expect(credits(page)).toHaveCount(1);
      // The strip under the globe is shorter while it loads, which leaves the key a taller view.
      await expect(page.locator('.strip__row')).toHaveCount(3);
      // The key and «Drop a pin» with the block and without it (as on main), read in one frame.
      const boxes = await key(page).evaluate((el) => {
        const read = () => [el, el.querySelector('.pin-drop')!].map((node) => {
          const r = node.getBoundingClientRect();
          return [r.x, r.y, r.width, r.height].map(Math.round);
        });
        const block = el.querySelector('.credits')!;
        const scroll = el.querySelector('.globe-layers__scroll')!;
        const withBlock = read();
        const scrolls = scroll.scrollHeight > scroll.clientHeight;
        const next = block.nextSibling;
        block.remove();
        const without = read();
        const scrolledBefore = scroll.scrollHeight > scroll.clientHeight;
        scroll.insertBefore(block, next);
        return { withBlock, without, scrolls, scrolledBefore };
      });
      // At 1280 x 720 the key already scrolled before the block came, so the block only lengthens its scroll.
      expect(boxes.scrolledBefore).toBe(true);
      expect(boxes.scrolls).toBe(true);
      expect(boxes.withBlock).toEqual(boxes.without);
      const hit = await drop.evaluate((el) => {
        const box = el.getBoundingClientRect();
        return el.contains(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2));
      });
      expect(hit).toBe(true);
      await drop.click({ trial: true });
      await shot(page, 'desktop-1280x720');
      const link = credits(page).locator('a.credits__source');
      await link.scrollIntoViewIfNeeded();
      await expect(link).toBeInViewport();
      await expectTallTarget(link);
      await shot(page, 'desktop-1280x720-scrolled');
    });
  });
});

/** Opens the Sites sheet at full, then its Settings page. */
async function openSettings(page: Page): Promise<Locator> {
  await page.locator('.tab-bar .tab').last().click();
  await expect(page.locator('.sheet')).toHaveAttribute('data-detent', 'full');
  await page.locator('.picker__gear').click();
  const settings = page.locator('.sheet .settings-page');
  await expect(settings.locator('.lang-row')).toBeVisible();
  return settings;
}

test.describe('phone, 390x844: the end of Settings', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: SCALE });

  for (const [locale, path] of [['en', IM2], ['es', './es/?site=im2-athena']] as const) {
    test(`${locale}: the block follows the Language and Data source group`, async ({ page }) => {
      await open(page, path);
      const settings = await openSettings(page);
      const order = await settings.locator('.picker__scroll').evaluate((el) =>
        [...el.children].map((child) => child.className.split(' ')[0]));
      expect(order.slice(-2)).toEqual(['settings-group', 'credits']);
      const credits = settings.locator('.credits');
      const link = credits.locator('a.credits__source');
      await expectSourceLink(link, TEXT[locale].name);
      await expect(link).toHaveText(TEXT[locale].source);
      await expect(credits).toContainText(TEXT[locale].ai);
      await expect(credits).toContainText(TEXT[locale].disclaimer);
      await link.scrollIntoViewIfNeeded();
      await expectTallTarget(link);
      if (locale === 'en') await shot(page, 'phone-settings');
    });
  }
});

test.describe('phone, 360x780, pseudo-locale at 200 % text', () => {
  test.use({ viewport: { width: 360, height: 780 }, hasTouch: true, isMobile: true });

  test('the Settings block is whole and inside the screen', async ({ page }) => {
    await open(page, './en-xa/?site=im2-athena');
    const settings = await openSettings(page);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    const scroll = settings.locator('.picker__scroll');
    // The scroll box keeps resizing for a moment after the text grows, so every look scrolls to its end again first.
    const problems = () => scroll.evaluate((box) => {
      box.scrollTop = box.scrollHeight;
      const out: string[] = [];
      const block = box.querySelector<HTMLElement>('.credits');
      if (!block) return ['no block'];
      const view = box.getBoundingClientRect();
      const rect = block.getBoundingClientRect();
      if (rect.left < -0.5 || rect.right > innerWidth + 0.5) out.push('leaves the screen sideways');
      if (rect.bottom > innerHeight + 0.5) out.push('leaves the screen below');
      if (rect.top < view.top - 0.5 || rect.bottom > view.bottom + 0.5) out.push('cut by its scroll');
      for (const part of [block, ...block.querySelectorAll<HTMLElement>('a, p')]) {
        if (part.scrollWidth > part.clientWidth + 1) out.push(`${part.className || part.tagName} is cut`);
        const r = part.getBoundingClientRect();
        if (r.right > innerWidth + 0.5) out.push(`${part.className || part.tagName} leaves the screen`);
      }
      return out;
    });
    await expect.poll(problems).toEqual([]);
  });
});
