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

/** The benchmark's wait for the on-foot view (VENT-83): it ends at once, with the reason, when the view has failed. */
import { describe, expect, it } from 'vitest';
import { waitSettled } from '../src/bench/settle';

/** A page whose on-foot host carries `dataset`; nothing else is on it. */
function pageWith(dataset: Record<string, string>): Document {
  const host = { dataset, hasAttribute: () => false };
  return { querySelector: (selector: string) => (selector === '.on-foot__host' ? host : null) } as unknown as Document;
}

const sleep = (ms: number) => new Promise<void>((done) => setTimeout(done, Math.min(ms, 1)));

describe('waitSettled', () => {
  it('stops at once with the status when the view has lost its context', async () => {
    const page = pageWith({ status: 'lost', ready: 'false', working: 'false', frames: '3' });
    const started = performance.now();
    await expect(waitSettled(page, { timeoutMs: 2000, park: false }, sleep)).rejects.toThrow(/3D view failed: lost/);
    expect(performance.now() - started).toBeLessThan(500);
  });

  it('stops for every failed status the view can end in', async () => {
    for (const status of ['failed', 'blocked', 'missing', 'offline']) {
      await expect(waitSettled(pageWith({ status }), { timeoutMs: 2000, park: false }, sleep)).rejects.toThrow(status);
    }
  });

  it('still only times out, without throwing, while the view keeps loading', async () => {
    const page = pageWith({ status: 'loading', ready: 'false' });
    await expect(waitSettled(page, { timeoutMs: 30, park: false }, sleep)).resolves.toBe(true);
  });
});
