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

// The globe's start maps are asked as soon as the tier is known (VENT-93): before the globe's chunk mounts, for the
// start level only, and the swapper takes the asked images instead of fetching them again. The VENT-80 baseline
// measured the 1K maps asked 3.7 s after the chunk landed on a phone profile, behind a 1.45 s long task.
import { MeshLambertMaterial, Texture, TextureLoader, type WebGLRenderer } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { settingsFor, type Tier } from '../src/lib/quality';
import { moonTextureDeps } from '../src/globe/moon-textures';
import { askStartMaps, earlyStart } from '../src/globe/start-maps';
import { levelUrls } from '../src/globe/texture-lod';

const BASE = '/';
const image = (url: string) => ({ url }) as unknown as HTMLImageElement;
const fakeRenderer = () =>
  ({ initTexture: vi.fn(), capabilities: { getMaxAnisotropy: () => 16 } }) as unknown as WebGLRenderer;

function deps(startMaps: ReturnType<typeof askStartMaps>, compile?: () => Promise<void>) {
  const onTextured = vi.fn();
  const onChange = vi.fn();
  const material = new MeshLambertMaterial();
  const options = { renderer: fakeRenderer(), material, tier: 'medium' as Tier, onChange, onTextured };
  return { onTextured, onChange, material, gpu: moonTextureDeps({ ...options, shown: () => true, early: { maps: startMaps }, compile }) };
}

describe('the start maps, asked early', () => {
  it('asks the colour and the relief of the start level once each, and nothing else', () => {
    for (const [tier, level] of [['medium', 1], ['low', 1], ['high', 2]] as const) {
      const fetchImage = vi.fn((url: string) => Promise.resolve(image(url)));
      const early = earlyStart(BASE, { pick: () => settingsFor(tier), fetchImage });
      const urls = levelUrls(level, BASE);
      expect(early.quality.tier).toBe(tier);
      expect(fetchImage.mock.calls.map(([url]) => url).sort()).toEqual([urls.colour, urls.normal].sort());
    }
  });

  it('hands each asked image out once: a second take is a fresh fetch', async () => {
    const urls = levelUrls(1, BASE);
    const maps = askStartMaps(urls, (url) => Promise.resolve(image(url)));
    expect(await maps.take(urls.colour)).toEqual(image(urls.colour));
    expect(maps.take(urls.colour)).toBeNull();
    expect(maps.take(levelUrls(4, BASE).colour)).toBeNull();
  });

  it('keeps a failed early fetch quiet until the swapper takes it, which sees the failure', async () => {
    const urls = levelUrls(1, BASE);
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    const maps = askStartMaps(urls, () => Promise.reject(new Error('offline')));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(unhandled).not.toHaveBeenCalled();
    await expect(maps.take(urls.colour)).rejects.toThrow('offline');
    process.off('unhandledRejection', unhandled);
  });

  it('is what the swapper loads: the asked image becomes the texture, with no second request', async () => {
    const urls = levelUrls(1, BASE);
    const loadAsync = vi.spyOn(TextureLoader.prototype, 'loadAsync');
    const { gpu } = deps(askStartMaps(urls, (url) => Promise.resolve(image(url))));
    const colour = await gpu.load(urls.colour, 'colour');
    expect(colour).toBeInstanceOf(Texture);
    expect(colour.image).toEqual(image(urls.colour));
    // `needsUpdate` set: three uploads it, as it does a TextureLoader's.
    expect(colour.version).toBeGreaterThan(0);
    expect(loadAsync).not.toHaveBeenCalled();
    loadAsync.mockResolvedValue(new Texture());
    await gpu.load(levelUrls(4, BASE).colour, 'colour');
    expect(loadAsync).toHaveBeenCalledTimes(1);
    loadAsync.mockRestore();
  });
});

describe('a map going onto the Moon', () => {
  it('asks its frame and lifts the splash only once the textured programs are compiled', async () => {
    let compiled: () => void = () => undefined;
    const compile = vi.fn(() => new Promise<void>((resolve) => { compiled = resolve; }));
    const { gpu, onTextured, onChange, material } = deps(askStartMaps(levelUrls(1, BASE), () => new Promise(() => undefined)), compile);
    const colour = new Texture();
    gpu.apply({ colour, normal: null });
    expect(material.map).toBe(colour);
    expect(compile).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    expect(onTextured).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
    compiled();
    await vi.waitFor(() => expect(onTextured).toHaveBeenCalledTimes(1));
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
