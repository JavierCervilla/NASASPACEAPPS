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
 * A view loaded on demand whose chunk is gone (VENT-52: an old page after a deploy). Only the import's own rejection
 * goes through `loadChunk`, and only a fetch failure of the module counts as a missing chunk: an error the module
 * throws as it evaluates, or anything thrown while the view renders or mounts, is a real error and is not taken for
 * a new version. The boundary holds a calm state for a missing chunk and passes every other error on.
 */
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ChunkBoundary } from '../src/components/ChunkBoundary';
import { isMissingChunk, loadChunk, MissingChunkError, MISSING_CHUNK_EVENT, onMissingChunk } from '../src/pwa/missing-chunk';

describe('isMissingChunk', () => {
  it.each([
    ['Chromium', new TypeError('Failed to fetch dynamically imported module: https://v.test/_astro/TerrainPanel.abc.js')],
    ['Firefox', new TypeError('error loading dynamically imported module: https://v.test/_astro/x.js')],
    ['Safari', new TypeError('Importing a module script failed.')],
    ['Vite’s CSS preload', new Error('Unable to preload CSS for /_astro/TerrainPanel.abc.css')],
  ])('is true for %s’s fetch failure', (_name, error) => {
    expect(isMissingChunk(error)).toBe(true);
  });

  it.each([
    ['a module that throws as it evaluates', new TypeError('Cannot read properties of undefined (reading "x")')],
    ['a syntax error', new SyntaxError('Unexpected token')],
    ['a string', 'Failed to fetch dynamically imported module'],
    ['nothing', undefined],
  ])('is false for %s', (_name, error) => {
    expect(isMissingChunk(error)).toBe(false);
  });
});

describe('loadChunk', () => {
  it('passes the module through', async () => {
    await expect(loadChunk(async () => ({ v: 1 }), new EventTarget())).resolves.toEqual({ v: 1 });
  });

  it('tells the page and rejects with a MissingChunkError when the chunk is gone', async () => {
    const target = new EventTarget();
    const heard = vi.fn();
    onMissingChunk(target, heard);
    const gone = new TypeError('Failed to fetch dynamically imported module: /_astro/x.js');
    const loading = loadChunk(() => Promise.reject(gone), target);
    await expect(loading).rejects.toBeInstanceOf(MissingChunkError);
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it('passes any other error on untouched, telling nobody', async () => {
    const target = new EventTarget();
    const heard = vi.fn();
    target.addEventListener(MISSING_CHUNK_EVENT, heard);
    const bug = new TypeError('x is not a function');
    await expect(loadChunk(() => Promise.reject(bug), target)).rejects.toBe(bug);
    expect(heard).not.toHaveBeenCalled();
  });

  it('offline, a chunk it could not fetch is no new version: it rejects marked offline and tells nobody', async () => {
    const target = new EventTarget();
    const heard = vi.fn();
    onMissingChunk(target, heard);
    const gone = new TypeError('Failed to fetch dynamically imported module: /_astro/x.js');
    const loading = loadChunk(() => Promise.reject(gone), target, () => false);
    await expect(loading).rejects.toMatchObject({ name: 'MissingChunkError', offline: true });
    expect(heard).not.toHaveBeenCalled();
  });

  // VENT-59: the browser keeps a module it failed to fetch failed, so an import tried offline never loads again.
  it('offline, does not try the import at all, so the browser has no failure to keep', async () => {
    const load = vi.fn(async () => ({ v: 1 }));
    const loading = loadChunk(load, new EventTarget(), () => false);
    await expect(loading).rejects.toMatchObject({ name: 'MissingChunkError', offline: true });
    expect(load).not.toHaveBeenCalled();
  });

  it('online, the same failure is a missing chunk of an older build', async () => {
    const gone = new TypeError('Failed to fetch dynamically imported module: /_astro/x.js');
    const loading = loadChunk(() => Promise.reject(gone), new EventTarget(), () => true);
    await expect(loading).rejects.toMatchObject({ name: 'MissingChunkError', offline: false });
  });

  it('lets the listener go', () => {
    const target = new EventTarget();
    const heard = vi.fn();
    onMissingChunk(target, heard)();
    target.dispatchEvent(new Event(MISSING_CHUNK_EVENT));
    expect(heard).not.toHaveBeenCalled();
  });
});

describe('ChunkBoundary', () => {
  const calm = createElement('p', null, 'calm');
  const offline = createElement('p', null, 'offline');
  const fallback = (error: MissingChunkError) => (error.offline ? offline : calm);
  const child = createElement('i', null, 'view');

  /** The boundary after `error`, rendered. */
  function renderAfter(error: unknown) {
    const boundary = new ChunkBoundary({ fallback, children: child });
    boundary.state = ChunkBoundary.getDerivedStateFromError(error);
    return () => boundary.render();
  }

  it('renders its children while nothing failed', () => {
    expect(new ChunkBoundary({ fallback, children: child }).render()).toBe(child);
  });

  it('holds the calm state for a missing chunk', () => {
    expect(renderAfter(new MissingChunkError(new TypeError('Failed to fetch dynamically imported module')))()).toBe(calm);
  });

  it('hands the fallback the error, so an offline failure says offline', () => {
    expect(renderAfter(new MissingChunkError(new TypeError('Failed to fetch dynamically imported module'), true))()).toBe(offline);
  });

  it('passes a real error on to the boundary above', () => {
    const bug = new Error('render failed');
    expect(renderAfter(bug)).toThrow(bug);
  });
});

describe('sceneFailure', () => {
  it('says `missing` for a gone chunk and `failed` for a scene that threw', async () => {
    const { sceneFailure } = await import('../src/terrain/scene/load-scene');
    expect(sceneFailure(new MissingChunkError(new TypeError('Failed to fetch dynamically imported module')))).toBe('missing');
    expect(sceneFailure(new Error('WebGL unavailable'))).toBe('failed');
    expect(sceneFailure(new MissingChunkError(new TypeError('Failed to fetch dynamically imported module'), true))).toBe('offline');
  });
});
