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

import { afterEach, describe, expect, it, vi } from 'vitest';
import { playFilm } from '../src/components/terrain/loader/film-element';
import { filmShows, filmStep, handsOver, type FilmEvent, type FilmState } from '../src/terrain/loader/film-gate';
import { loaderPicture, type PictureFacts } from '../src/terrain/loader/loader-picture';
import { FILM_SITES, siteFilm } from '../src/terrain/loader/site-films';

const FILM_FACTS: PictureFacts = { tier: 'high', site: 'im2-athena', reducedMotion: false, saveData: false, bench: false };

describe('the loader\'s picture with the descent films (VENT-117)', () => {
  it('is the film for a curated site that has one, at the high and medium tiers', () => {
    expect(loaderPicture(FILM_FACTS)).toBe('film');
    expect(loaderPicture({ ...FILM_FACTS, tier: 'medium' })).toBe('film');
  });

  it('keeps the tiles and the skyline at the low tier, under reduced motion and under Save-Data', () => {
    expect(loaderPicture({ ...FILM_FACTS, tier: 'low' })).toBe('tilesThenSkyline');
    expect(loaderPicture({ ...FILM_FACTS, reducedMotion: true })).toBe('tilesThenSkyline');
    expect(loaderPicture({ ...FILM_FACTS, saveData: true })).toBe('tilesThenSkyline');
  });

  it('keeps them under ?bench, any suite, so the benchmark measures the view as before', () => {
    expect(loaderPicture({ ...FILM_FACTS, bench: true })).toBe('tilesThenSkyline');
  });

  it('keeps them for a custom or saved point and for a listed site with no film', () => {
    expect(loaderPicture({ ...FILM_FACTS, site: '@-84.79,29.20' })).toBe('tilesThenSkyline');
    expect(loaderPicture({ ...FILM_FACTS, site: 'apollo11' })).toBe('tilesThenSkyline');
  });

  it('has a film for the eleven curated sites south of 80° S', () => {
    expect(FILM_SITES.size).toBe(11);
    expect(FILM_SITES.has('artemis-malapert-massif')).toBe(true);
  });

  it('names the cut\'s AV1 source first, then H.264, and its first frame, under the site\'s base', () => {
    const film = siteFilm('/app/', 'im2-athena', 'phone');
    expect(film.sources.map((s) => s.src)).toEqual([
      '/app/site-films/im2-athena-phone.av1.mp4', '/app/site-films/im2-athena-phone.h264.mp4']);
    expect(film.sources[0]?.type).toContain('av01');
    expect(film.poster).toBe('/app/site-films/im2-athena-phone-start.webp');
  });
});

/** Plays the events in order from `playing`. */
const after = (...events: FilmEvent[]): FilmState => events.reduce(filmStep, 'playing' as FilmState);

describe('the film\'s hand-over (VENT-117)', () => {
  it('scene first: a drawn scene waits for the film\'s end', () => {
    expect(handsOver(true, after())).toBe(false);
    expect(handsOver(true, after('ended'))).toBe(true);
  });

  it('film first: the ended film holds its last frame until the scene draws', () => {
    const ended = after('ended');
    expect(handsOver(false, ended)).toBe(false);
    expect(filmShows(ended)).toBe(true);
    expect(handsOver(true, ended)).toBe(true);
  });

  it('failure: the film gives way to the usual picture and lets the scene through', () => {
    const failed = after('failed');
    expect(filmShows(failed)).toBe(false);
    expect(handsOver(true, failed)).toBe(true);
    expect(after('failed', 'ended')).toBe('failed');
  });

  it('a film still playing is given up, and no film hands over as before', () => {
    expect(handsOver(true, after('giveUp'))).toBe(true);
    expect(handsOver(true, null)).toBe(true);
    expect(handsOver(false, null)).toBe(false);
    expect(filmShows(null)).toBe(false);
  });
});

class FakeElement extends EventTarget {
  src = '';
  type = '';
  removed = false;
  remove(): void {
    this.removed = true;
  }
}

class FakeVideo extends FakeElement {
  muted = false;
  ended = false;
  paused = true;
  loads = 0;
  readonly children: FakeElement[] = [];
  playResult: Promise<void> = Promise.resolve();
  append(...tags: FakeElement[]): void {
    this.children.push(...tags);
  }
  play(): Promise<void> {
    this.paused = false;
    return this.playResult;
  }
  pause(): void {
    this.paused = true;
  }
  removeAttribute(): void {
    this.src = '';
  }
  load(): void {
    this.loads += 1;
  }
}

function fakeDocument() {
  const doc = Object.assign(new EventTarget(), { hidden: false, createElement: () => new FakeElement() });
  vi.stubGlobal('document', doc);
  return doc;
}

function play(video: FakeVideo) {
  const events: FilmEvent[] = [];
  const film = siteFilm('/', 'im2-athena', 'wide');
  const free = playFilm(video as unknown as HTMLVideoElement, film.sources, (e) => events.push(e));
  return { events, free };
}

describe('the film\'s video element (VENT-117)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('plays muted, AV1 then H.264, and tells its end', () => {
    fakeDocument();
    const video = new FakeVideo();
    const { events } = play(video);
    expect(video.muted).toBe(true);
    expect(video.paused).toBe(false);
    expect(video.children.map((c) => c.src)).toEqual(['/site-films/im2-athena-wide.av1.mp4', '/site-films/im2-athena-wide.h264.mp4']);
    video.dispatchEvent(new Event('ended'));
    expect(events).toEqual(['ended']);
  });

  it('fails when its last source is refused or play() is refused, not when a play is aborted', async () => {
    fakeDocument();
    const refused = new FakeVideo();
    refused.playResult = Promise.reject(new DOMException('no', 'NotAllowedError'));
    const one = play(refused);
    await Promise.resolve();
    await Promise.resolve();
    expect(one.events).toEqual(['failed']);
    const aborted = new FakeVideo();
    aborted.playResult = Promise.reject(new DOMException('paused', 'AbortError'));
    const two = play(aborted);
    await Promise.resolve();
    await Promise.resolve();
    expect(two.events).toEqual([]);
    aborted.children.at(-1)?.dispatchEvent(new Event('error'));
    expect(two.events).toEqual(['failed']);
  });

  it('pauses while the page is hidden, plays on when shown, and frees itself', () => {
    const doc = fakeDocument();
    const video = new FakeVideo();
    const { events, free } = play(video);
    doc.hidden = true;
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(video.paused).toBe(true);
    doc.hidden = false;
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(video.paused).toBe(false);
    free();
    expect(video.paused).toBe(true);
    expect(video.children.every((c) => c.removed)).toBe(true);
    expect(video.loads).toBe(1);
    video.dispatchEvent(new Event('ended'));
    expect(events).toEqual([]);
  });
});
