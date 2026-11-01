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
 * The globe's layer registry (VENT-37): register and take away, the paint
 * order, the flags (kept from before, set before a layer comes), the
 * changes it tells, and the flags kept on the device.
 */
import { describe, expect, it, vi } from 'vitest';
import { FLAGS_KEY, keepFlags, readFlags } from '../src/globe/layers/kept-flags';
import { LAYER_IDS, LAYER_Z } from '../src/globe/layers/ids';
import { createLayerRegistry } from '../src/globe/layers/registry';
import { siteLayers } from '../src/globe/layers/site-layers';
import { inLayers } from '../src/globe/marker-cull';
import type { MarkerKind } from '../src/globe/markers';

function memoryStorage(initial: Record<string, string> = {}) {
  const kept = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => kept.get(key) ?? null,
    setItem: (key: string, value: string) => void kept.set(key, value),
    kept,
  };
}

describe('the layer registry', () => {
  it('lists layers by z, ties in registration order', () => {
    const layers = createLayerRegistry();
    layers.register({ id: 'rovers', z: 40 });
    layers.register({ id: 'saved-sites', z: 30 });
    layers.register({ id: 'tracks', z: 30 });
    expect(layers.list().map(({ id }) => id)).toEqual(['saved-sites', 'tracks', 'rovers']);
  });

  it('refuses a taken id, a malformed id and a z that is not finite', () => {
    const layers = createLayerRegistry();
    layers.register({ id: 'saved-sites', z: 1 });
    expect(() => layers.register({ id: 'saved-sites', z: 2 })).toThrow(/already/);
    expect(() => layers.register({ id: 'Saved Sites', z: 2 })).toThrow(/lowercase/);
    expect(() => layers.register({ id: 'x', z: Number.NaN })).toThrow(/finite/);
  });

  it('takes a layer away, only through its own registration', () => {
    const layers = createLayerRegistry();
    const first = { id: 'saved-sites', z: 1 };
    const off = layers.register(first);
    off();
    expect(layers.list()).toEqual([]);
    layers.register({ id: 'saved-sites', z: 2 });
    off();
    expect(layers.list().map(({ z }) => z)).toEqual([2]);
    layers.unregister('saved-sites');
    expect(layers.list()).toEqual([]);
  });

  it('shows and hides; a flag outlives its layer and comes before it', () => {
    const layers = createLayerRegistry();
    expect(layers.isVisible('rovers')).toBe(true);
    layers.setVisible('rovers', false);
    layers.register({ id: 'rovers', z: 1 });
    expect(layers.list()[0]?.visible).toBe(false);
    layers.unregister('rovers');
    layers.register({ id: 'rovers', z: 1, visible: true });
    expect(layers.isVisible('rovers')).toBe(false);
  });

  it('starts a layer with its own default, unless a kept flag says otherwise', () => {
    const layers = createLayerRegistry({ zones: true });
    layers.register({ id: 'tracks', z: 1, visible: false });
    layers.register({ id: 'zones', z: 1, visible: false });
    expect(layers.isVisible('tracks')).toBe(false);
    expect(layers.isVisible('zones')).toBe(true);
  });

  it('tells each change once', () => {
    const layers = createLayerRegistry();
    const heard = vi.fn();
    const stop = layers.subscribe(heard);
    layers.register({ id: 'tracks', z: 1 });
    layers.setVisible('tracks', false);
    layers.setVisible('tracks', false);
    layers.unregister('tracks');
    layers.unregister('tracks');
    stop();
    layers.setVisible('tracks', true);
    expect(heard.mock.calls.map(([change]) => change)).toEqual([
      { kind: 'added', id: 'tracks' },
      { kind: 'visibility', id: 'tracks' },
      { kind: 'removed', id: 'tracks' },
    ]);
  });
});

describe("Ventana's site layers", () => {
  it('show and hide their kind of marker on the one marker layer', () => {
    const kinds = new Set<MarkerKind>(['exact', 'zone']);
    const [sites, zones] = siteLayers({ kinds });
    expect([sites?.id, zones?.id]).toEqual([LAYER_IDS.sites, LAYER_IDS.zones]);
    expect([sites?.z, zones?.z]).toEqual([LAYER_Z.sites, LAYER_Z.zones]);
    sites?.renderer?.show?.(false);
    expect([...kinds]).toEqual(['zone']);
    zones?.renderer?.show?.(false);
    sites?.renderer?.show?.(true);
    expect([...kinds]).toEqual(['exact']);
  });

  it('keep the selected marker whatever its layer', () => {
    const site = (id: string, approximate: boolean) => ({ site: { id, name: id, lat: 0, lonEast: 0, approximate, members: [] } });
    const markers = [site('a', false), site('b', true), site('c', true)];
    const shown = inLayers(markers, new Set<MarkerKind>(['exact']), 'c');
    expect(shown.map(({ site: { id } }) => id)).toEqual(['a', 'c']);
    expect(inLayers(markers, new Set(), null)).toEqual([]);
  });
});

describe('the flags kept on the device', () => {
  it('reads only well-formed ids with true or false', () => {
    const text = JSON.stringify({ 'saved-sites': false, 'Bad id': true, zones: 'no', 'landing-sites': true });
    expect(readFlags(memoryStorage({ [FLAGS_KEY]: text }))).toEqual({ 'saved-sites': false, 'landing-sites': true });
    for (const bad of ['{', '[]', 'null', '7']) {
      expect(readFlags(memoryStorage({ [FLAGS_KEY]: bad }))).toEqual({});
    }
    expect(readFlags(null)).toEqual({});
  });

  it('keeps every change, registered or not, beside the flags kept before', () => {
    const storage = memoryStorage({ [FLAGS_KEY]: JSON.stringify({ rovers: false }) });
    const layers = createLayerRegistry(readFlags(storage));
    layers.register({ id: 'saved-sites', z: 1 });
    const stop = keepFlags(layers, storage);
    layers.setVisible('saved-sites', false);
    layers.setVisible('landing-sites', false);
    expect(JSON.parse(storage.kept.get(FLAGS_KEY)!)).toEqual({ rovers: false, 'saved-sites': false, 'landing-sites': false });
    stop();
    const refusing = { getItem: () => null, setItem: () => { throw new Error('denied'); } };
    keepFlags(layers, refusing);
    expect(() => layers.setVisible('saved-sites', true)).not.toThrow();
  });
});
