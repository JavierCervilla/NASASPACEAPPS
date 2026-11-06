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
import {
  CompressedTexture,
  MeshLambertMaterial,
  RGB_ETC2_Format,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  type WebGLRenderer,
} from 'three';
import { describe, expect, it, vi } from 'vitest';
import { settingsFor, type Tier } from '../src/lib/quality';
import { moonTextureDeps } from '../src/globe/moon-textures';
import { askStartMaps, earlyStart } from '../src/globe/start-maps';
import { levelUrls } from '../src/globe/texture-lod';
import { mapLine, type MapEvent } from '../src/globe/map-trace';
import { ktx2Switch } from '../src/textures/ktx2-session';

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

describe('the start maps as KTX2 (VENT-101)', () => {
  it('asks the high tier\'s 2K colour as KTX2 bytes, warms the transcoder, and keeps the relief a JPEG', () => {
    const fetchImage = vi.fn((url: string) => Promise.resolve(image(url)));
    const fetchBytes = vi.fn(() => Promise.resolve(new ArrayBuffer(4)));
    const warm = vi.fn();
    earlyStart(BASE, { pick: () => settingsFor('high'), fetchImage, ktx2: { choice: () => ({ target: 'etc2' }), fetchBytes, warm } });
    const urls = levelUrls(2, BASE, 'etc2');
    expect(fetchBytes.mock.calls).toEqual([[urls.colour]]);
    expect(fetchImage.mock.calls).toEqual([[urls.normal]]);
    expect(warm).toHaveBeenCalledTimes(1);
  });

  it('asks JPEGs and starts no worker on a 1K start or without a target', () => {
    for (const [tier, target] of [['medium', 'etc2'], ['high', null]] as const) {
      const fetchImage = vi.fn((url: string) => Promise.resolve(image(url)));
      const fetchBytes = vi.fn(() => Promise.resolve(new ArrayBuffer(4)));
      const warm = vi.fn();
      earlyStart(BASE, { pick: () => settingsFor(tier), fetchImage, ktx2: { choice: () => (target ? { target } : { target: null, reason: 'test' }), fetchBytes, warm } });
      expect(fetchImage).toHaveBeenCalledTimes(2);
      expect(fetchBytes).not.toHaveBeenCalled();
      expect(warm).not.toHaveBeenCalled();
    }
  });

  it('hands the bytes out once, and an image is never handed as bytes', async () => {
    const urls = levelUrls(2, BASE, 'bc1');
    const bytes = new ArrayBuffer(8);
    const maps = askStartMaps(urls, (url) => Promise.resolve(image(url)), () => Promise.resolve(bytes));
    expect(maps.take(urls.colour)).toBeNull();
    expect(maps.takeBytes(urls.normal)).toBeNull();
    expect(await maps.takeBytes(urls.colour)).toBe(bytes);
    expect(maps.takeBytes(urls.colour)).toBeNull();
    expect(await maps.take(urls.normal)).toEqual(image(urls.normal));
  });
});

describe('the swapper\'s KTX2 colour (VENT-101)', () => {
  const ktx2Url = levelUrls(2, BASE, 'etc2').colour;

  function ktx2Deps(load: (url: string) => Promise<Texture>) {
    const lines: string[] = [];
    const session = ktx2Switch(() => ({ target: 'etc2' }));
    const options = {
      renderer: fakeRenderer(), material: new MeshLambertMaterial(), tier: 'medium' as Tier,
      onChange: vi.fn(), shown: () => true,
      ktx2: { session, load: (url: string) => load(url) },
      trace: { mark: (event: MapEvent) => void lines.push(mapLine(event)), size: () => '' },
    };
    return { gpu: moonTextureDeps(options), lines, session };
  }

  it('loads a .ktx2 colour through KTX2, with the tier\'s anisotropy and its own levels', async () => {
    const compressed = new CompressedTexture([], 2048, 1024, RGB_ETC2_Format);
    const { gpu, lines } = ktx2Deps(() => Promise.resolve(compressed));
    const texture = await gpu.load(ktx2Url, 'colour');
    expect(texture).toBe(compressed);
    expect(texture.anisotropy).toBe(4);
    expect(texture.generateMipmaps).toBe(false);
    expect(lines).toEqual(['2K colour as KTX2 → ETC2']);
  });

  it('falls back to the 2K JPEG when KTX2 fails, turning it off for the session', async () => {
    const loadAsync = vi.spyOn(TextureLoader.prototype, 'loadAsync').mockResolvedValue(new Texture());
    const { gpu, lines, session } = ktx2Deps(() => Promise.reject(new Error('worker failed: CSP')));
    const texture = await gpu.load(ktx2Url, 'colour');
    expect(loadAsync).toHaveBeenCalledWith(levelUrls(2, BASE).colour);
    expect(texture.colorSpace).toBe(SRGBColorSpace);
    expect(texture.generateMipmaps).toBe(true);
    expect(lines).toEqual(['KTX2 off: worker failed: CSP']);
    expect(session.choice().target).toBeNull();
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
