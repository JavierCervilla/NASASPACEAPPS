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

import { describe, expect, it } from 'vitest';
import { filmEnv } from '../src/hero/film-boot';
import { PHONE_QUERY, REDUCED_MOTION, filmCut, filmSources, narrowed, startUrl, stillUrl } from '../src/hero/film-plan';
import { filmPlayer, type FilmPhase, type FilmVideo } from '../src/hero/film-player';

type Listener = () => void;

/** A video that records what it was asked and plays when the test says so. */
function fakeVideo(refuse = false) {
  const listeners = new Map<string, Listener[]>();
  const video = {
    sources: [] as string[],
    plays: 0,
    pauses: 0,
    load(sources) {
      video.sources = sources.map((s) => s.src);
    },
    play() {
      video.plays += 1;
      return refuse ? Promise.reject(new Error('NotAllowedError')) : Promise.resolve();
    },
    pause() {
      video.pauses += 1;
    },
    on(event, listener) {
      listeners.set(event, [...(listeners.get(event) ?? []), listener]);
    },
    emit(event: string) {
      for (const listener of listeners.get(event) ?? []) listener();
    },
  } satisfies FilmVideo & Record<string, unknown>;
  return video;
}

function stage(refuseDescent = false) {
  const shown: FilmPhase[] = [];
  const descent = fakeVideo(refuseDescent);
  const hold = fakeVideo();
  return { descent, hold, shown, show: (phase: FilmPhase) => shown.push(phase) };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('which film the hero asks for (VENT-112)', () => {
  it('asks for none under reduced motion or Save-Data: the still stays', () => {
    expect(filmCut({ reducedMotion: true, saveData: false, phone: false })).toBeNull();
    expect(filmCut({ reducedMotion: false, saveData: true, phone: true })).toBeNull();
  });

  it('takes the phone cut in the phone layout and the desktop cut otherwise', () => {
    expect(filmCut({ reducedMotion: false, saveData: false, phone: true })).toBe('phone');
    expect(filmCut({ reducedMotion: false, saveData: false, phone: false })).toBe('desktop');
  });

  it('offers AV1 first, then H.264, for the cut', () => {
    expect(filmSources('phone', 'descent')).toEqual([
      { src: '/media/hero/hero-phone-descent.av1.mp4', type: 'video/mp4; codecs="av01.0.08M.08"' },
      { src: '/media/hero/hero-phone-descent.h264.mp4', type: 'video/mp4' },
    ]);
  });

  it('starts on the descent\'s first frame and keeps the end frame as the still', () => {
    expect(startUrl('desktop')).toBe('/media/hero/hero-desktop-start.webp');
    expect(startUrl('phone')).toBe('/media/hero/hero-phone-start.webp');
    expect(stillUrl('desktop')).toBe('/media/hero/hero-desktop-poster.webp');
    expect(stillUrl('phone')).toBe('/media/hero/hero-phone-poster.webp');
  });

  it('narrows each query of a list, so a phone under reduced motion takes the phone still', () => {
    expect(narrowed(PHONE_QUERY, REDUCED_MOTION)).toBe(
      '(prefers-reduced-motion: reduce) and (max-width: 820px), (prefers-reduced-motion: reduce) and (orientation: portrait)',
    );
  });

  it('reads the window once: reduced motion, Save-Data and the phone query', () => {
    const asked: string[] = [];
    const win = (saveData?: boolean) => ({
      matchMedia: (query: string) => {
        asked.push(query);
        return { matches: query === PHONE_QUERY };
      },
      navigator: saveData === undefined ? {} : { connection: { saveData } },
    });
    expect(filmEnv(win())).toEqual({ reducedMotion: false, saveData: false, phone: true });
    expect(filmEnv(win(true)).saveData).toBe(true);
    expect(asked).toContain('(prefers-reduced-motion: reduce)');
  });
});

describe('the hero film\'s playback (VENT-112)', () => {
  it('loads both parts of the cut but plays nothing until shown', () => {
    const parts = stage();
    filmPlayer(parts, 'desktop');
    expect(parts.descent.sources[0]).toBe('/media/hero/hero-desktop-descent.av1.mp4');
    expect(parts.hold.sources[0]).toBe('/media/hero/hero-desktop-hold.av1.mp4');
    expect(parts.descent.plays + parts.hold.plays).toBe(0);
  });

  it('shows the descent once it plays, then swaps to the hold when it ends', () => {
    const parts = stage();
    filmPlayer(parts, 'phone').setShown(true);
    expect(parts.descent.plays).toBe(1);
    parts.descent.emit('playing');
    parts.descent.emit('ended');
    expect(parts.hold.plays).toBe(1);
    // Until the hold really plays, the descent's last frame stays on screen.
    expect(parts.shown).toEqual(['descent']);
    parts.hold.emit('playing');
    expect(parts.shown).toEqual(['descent', 'hold']);
  });

  it('pauses the part on screen when hidden and resumes it when shown', () => {
    const parts = stage();
    const player = filmPlayer(parts, 'desktop');
    player.setShown(true);
    parts.descent.emit('ended');
    player.setShown(false);
    expect(parts.hold.pauses).toBe(1);
    expect(parts.descent.pauses).toBe(0);
    player.setShown(true);
    expect(parts.hold.plays).toBe(2);
  });

  it('shows the still for good when the browser refuses to play', async () => {
    const parts = stage(true);
    const player = filmPlayer(parts, 'desktop');
    player.setShown(true);
    await flush();
    expect(parts.shown).toEqual(['still']);
    player.setShown(false);
    player.setShown(true);
    expect(parts.descent.plays).toBe(1);
  });

  it('does not take a play cut short by its own pause for a refusal', async () => {
    const parts = stage(true);
    const player = filmPlayer(parts, 'desktop');
    player.setShown(true);
    player.setShown(false);
    await flush();
    expect(parts.shown).toEqual([]);
  });
});
