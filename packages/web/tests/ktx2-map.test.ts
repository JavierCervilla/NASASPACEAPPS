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
 * The globe's colour map as KTX2, with its JPEG sibling behind it (VENT-101):
 * a `.ktx2` comes through the worker and is told «2K colour as KTX2 → ETC2»;
 * any failure turns KTX2 off for the session, is told once as «KTX2 off:
 * <reason>», and the same load answers with the JPEG, so the swapper's
 * contract holds (a load rejects only when both fail).
 */
import { describe, expect, it } from 'vitest';
import { ktx2OrJpeg, jpegSibling } from '../src/globe/ktx2-map';
import { mapLine, type MapEvent } from '../src/globe/map-trace';
import { ktx2Switch } from '../src/textures/ktx2-session';
import { Ktx2Unavailable } from '../src/textures/ktx2-transcoder';

const KTX2_2K = '/textures/moon-lroc-2k.ktx2';
const KTX2_4K = '/textures/moon-lroc-4k.ktx2';

function harness(ktx2: (url: string) => Promise<string>) {
  const session = ktx2Switch(() => ({ target: 'etc2' }));
  const lines: string[] = [];
  const asked: string[] = [];
  const load = ktx2OrJpeg<string>({
    ktx2: (url, target) => {
      asked.push(`ktx2 ${url} ${target}`);
      return ktx2(url);
    },
    jpeg: (url) => {
      asked.push(`jpeg ${url}`);
      return url.includes('missing') ? Promise.reject(new Error('404'))
        : Promise.resolve(`image ${url}`);
    },
    session,
    mark: (event: MapEvent) => void lines.push(mapLine(event)),
  });
  return { load, session, lines, asked };
}

describe('a colour map as KTX2', () => {
  it('names its JPEG sibling', () => {
    expect(jpegSibling(KTX2_4K)).toBe('/textures/moon-lroc-4k.jpg');
  });

  it('comes through the worker and says so', async () => {
    const h = harness((url) => Promise.resolve(`compressed ${url}`));
    await expect(h.load(KTX2_2K)).resolves.toBe(`compressed ${KTX2_2K}`);
    expect(h.lines).toEqual(['2K colour as KTX2 → ETC2']);
    expect(h.session.choice()).toEqual({ target: 'etc2' });
  });

  it('falls back to the JPEG on a failure, and stays off for the session', async () => {
    const h = harness(() =>
      Promise.reject(new Ktx2Unavailable('worker failed: no unsafe-eval')));
    await expect(h.load(KTX2_2K)).resolves.toBe('image /textures/moon-lroc-2k.jpg');
    expect(h.lines).toEqual(['KTX2 off: worker failed: no unsafe-eval']);
    expect(h.session.choice()).toEqual({
      target: null, reason: 'worker failed: no unsafe-eval',
    });
    await expect(h.load(KTX2_4K)).resolves.toBe('image /textures/moon-lroc-4k.jpg');
    expect(h.asked).toEqual([
      `ktx2 ${KTX2_2K} etc2`,
      'jpeg /textures/moon-lroc-2k.jpg',
      'jpeg /textures/moon-lroc-4k.jpg',
    ]);
    expect(h.lines).toHaveLength(1);
  });

  it('turns any error into the session switch, not just a typed one', async () => {
    const h = harness(() => Promise.reject(new TypeError('boom')));
    await h.load(KTX2_2K);
    expect(h.lines).toEqual(['KTX2 off: boom']);
  });

  it('rejects only when the JPEG fails too', async () => {
    const h = harness(() => Promise.reject(new Ktx2Unavailable('x')));
    await expect(h.load('/textures/missing-2k.ktx2')).rejects.toThrow('404');
  });

  it('loads a JPEG address as it is', async () => {
    const h = harness(() => Promise.reject(new Error('never')));
    await expect(h.load('/textures/moon-lroc-1k.jpg'))
      .resolves.toBe('image /textures/moon-lroc-1k.jpg');
    expect(h.lines).toEqual([]);
  });
});
