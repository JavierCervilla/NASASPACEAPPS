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
 * The loader film's video element (VENT-117), driven by hand so the page
 * hears what happens to it: its sources are added in order (AV1, then
 * H.264), it plays muted and inline, pauses while the page is hidden and
 * plays on when it shows again, and says when it ended or failed (every
 * source refused, a decode error, a refused play()). Freed when it goes:
 * its sources taken away and the element loaded empty, so the decoder and
 * the buffered bytes are let go.
 */
import type { FilmEvent } from '../../../terrain/loader/film-gate';
import type { FilmSource } from '../../../terrain/loader/site-films';

/** Plays `video`; a refusal other than a pause or a reload is a failure. */
function start(video: HTMLVideoElement, onFailed: () => void): void {
  video.play().catch((error: unknown) => {
    const aborted = error instanceof DOMException
      && error.name === 'AbortError';
    if (!aborted) onFailed();
  });
}

/** Pauses `video` while the page is hidden. */
function pauseWhileHidden(video: HTMLVideoElement, onFailed: () => void) {
  const onChange = (): void => {
    if (document.hidden) video.pause();
    else if (!video.ended) start(video, onFailed);
  };
  document.addEventListener('visibilitychange', onChange);
  return () => document.removeEventListener('visibilitychange', onChange);
}

function sourceTags(sources: readonly FilmSource[]): HTMLSourceElement[] {
  return sources.map(({ src, type }) => {
    const tag = document.createElement('source');
    tag.src = src;
    tag.type = type;
    return tag;
  });
}

function free(video: HTMLVideoElement, tags: HTMLSourceElement[]): void {
  video.pause();
  for (const tag of tags) tag.remove();
  video.removeAttribute('src');
  video.load();
}

/** Plays `sources` in `video`, telling `tell`; returns what frees it. */
export function playFilm(video: HTMLVideoElement,
  sources: readonly FilmSource[], tell: (event: FilmEvent) => void) {
  const onEnded = (): void => tell('ended');
  const onFailed = (): void => tell('failed');
  const tags = sourceTags(sources);
  video.muted = true;
  video.append(...tags);
  video.addEventListener('ended', onEnded);
  video.addEventListener('error', onFailed);
  tags.at(-1)?.addEventListener('error', onFailed);
  const unwatch = pauseWhileHidden(video, onFailed);
  start(video, onFailed);
  return (): void => {
    video.removeEventListener('ended', onEnded);
    video.removeEventListener('error', onFailed);
    tags.at(-1)?.removeEventListener('error', onFailed);
    unwatch();
    free(video, tags);
  };
}
