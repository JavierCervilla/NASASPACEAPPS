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

/** The film's two cuts: 1920 x 1080 and 720 x 1280. */
export type FilmCut = 'desktop' | 'phone';

/** The descent plays once; the hold, which starts on its last frame, loops. */
export type FilmPart = 'descent' | 'hold';

/** One `<source>` of a video, in the order the browser should try them. */
export interface FilmSource {
  readonly src: string;
  readonly type: string;
}

/** What the page knows before it asks for any film. */
export interface FilmEnv {
  readonly reducedMotion: boolean;
  readonly saveData: boolean;
  readonly phone: boolean;
}

/** The layout that takes the phone cut; hero.css holds the same query. */
export const PHONE_QUERY = '(max-width: 820px), (orientation: portrait)';

/** The complement of PHONE_QUERY, for the desktop start frame's preload. */
export const DESKTOP_QUERY = '(min-width: 821px) and (orientation: landscape)';

/** Where the still replaces the start frame without any script. */
export const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
export const FULL_MOTION = '(prefers-reduced-motion: no-preference)';

const ROOT = '/media/hero';
const AV1 = 'video/mp4; codecs="av01.0.08M.08"';
const H264 = 'video/mp4';

/**
 * The cut to play, or null for the still alone: reduced motion and
 * Save-Data never ask for a video.
 */
export function filmCut(env: FilmEnv): FilmCut | null {
  if (env.reducedMotion || env.saveData) return null;
  return env.phone ? 'phone' : 'desktop';
}

/** AV1 first, then H.264 for the browsers that cannot decode it. */
export function filmSources(cut: FilmCut, part: FilmPart): FilmSource[] {
  const base = `${ROOT}/hero-${cut}-${part}`;
  return [
    { src: `${base}.av1.mp4`, type: AV1 },
    { src: `${base}.h264.mp4`, type: H264 },
  ];
}

/** The descent's first frame: what the page paints while the film comes. */
export function startUrl(cut: FilmCut): string {
  return `${ROOT}/hero-${cut}-start.webp`;
}

/**
 * The still: the descent's last frame, the hold's first, shown instead of
 * the film under reduced motion, Save-Data or a refused play().
 */
export function stillUrl(cut: FilmCut): string {
  return `${ROOT}/hero-${cut}-poster.webp`;
}

/** `query` (a list) narrowed to where `feature` also holds. */
export function narrowed(query: string, feature: string): string {
  return query
    .split(', ')
    .map((part) => `${feature} and ${part}`)
    .join(', ');
}
