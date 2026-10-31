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
 * Starts the glass gate on a page: chooses the mode (glass-gate.ts), sets
 * it as `data-glass` on the root, and while Liquid is on trial watches
 * the frame time (frame-probe.ts) and the visitor's settings, switching to
 * frosted live, for good, when either asks for it. The frames are timed
 * twice: at load, and again from the first touch or click, because an
 * idle page redraws nothing under the glass and a weak GPU only shows when
 * the globe moves under it. Everything it touches comes in, so it runs in
 * a test without a browser.
 */
import type { QualitySettings } from '../lib/quality';
import { probeFrames } from './frame-probe';
import { chooseGlass, type GlassChoice, type GlassMode } from './glass-gate';
import { keepFrosted, keptGlass, type GlassStorage } from './glass-memory';

/** The part of a `MediaQueryList` the gate uses. */
export interface MediaWatch {
  readonly matches: boolean;
  addEventListener(type: 'change', listener: () => void): void;
}

export interface GlassDeps {
  /** Where `data-glass` goes: the document's root element. */
  readonly root: Pick<Element, 'setAttribute'>;
  readonly search: string;
  readonly storage: GlassStorage | null;
  readonly chromium: boolean;
  /** `CSS.supports`. */
  readonly supports: (property: string, value: string) => boolean;
  /** `matchMedia`. */
  readonly media: (query: string) => MediaWatch;
  readonly saveData: boolean;
  /** The device's quality settings (probes the GPU: read lazily). */
  readonly quality: () => QualitySettings;
  /** `requestAnimationFrame`. */
  readonly frame: (fn: () => void) => unknown;
  /** ms, monotonic. */
  readonly now: () => number;
  /** Calls `fn` once, at the visitor's first pointer press. */
  readonly firstInput: (fn: () => void) => void;
}

const LESS_TRANSPARENCY = '(prefers-reduced-transparency: reduce)';
const MORE_CONTRAST = '(prefers-contrast: more)';

/** Liquid, forced or on trial: drops to frosted when a setting asks. */
function watchSettings(
  watches: readonly MediaWatch[],
  frost: () => void,
): void {
  for (const watch of watches) {
    watch.addEventListener('change', () => {
      if (watch.matches) frost();
    });
  }
}

/** Chooses the glass, sets it, and starts the trial; returns the choice. */
export function startGlass(deps: GlassDeps): GlassChoice {
  const watches = [deps.media(LESS_TRANSPARENCY), deps.media(MORE_CONTRAST)];
  const quality = once(deps.quality);
  const choice = chooseGlass({
    search: deps.search,
    kept: keptGlass(deps.storage),
    chromium: deps.chromium,
    refracts: deps.supports('backdrop-filter', 'url(#x)'),
    saveData: deps.saveData,
    reducedTransparency: watches[0]?.matches ?? false,
    moreContrast: watches[1]?.matches ?? false,
    tier: () => quality().tier,
  });
  const set = (mode: GlassMode): void => deps.root.setAttribute('data-glass', mode);
  set(choice.mode);
  if (choice.mode === 'liquid') watchSettings(watches, () => set('frosted'));
  if (!choice.probe) return choice;
  startTrials(deps, quality().targetFps, () => set('frosted'));
  return choice;
}

/** Times the frames at load and from the first press; frosts on a miss. */
function startTrials(
  deps: GlassDeps,
  targetFps: number,
  frost: () => void,
): void {
  const probe = { frame: deps.frame, now: deps.now, targetFps };
  const trial = (): void =>
    probeFrames(probe, (holds) => {
      if (holds) return;
      frost();
      keepFrosted(deps.storage);
    });
  trial();
  deps.firstInput(trial);
}

/** `read`, called at most once. */
function once<T>(read: () => T): () => T {
  let value: { readonly v: T } | null = null;
  return () => (value ??= { v: read() }).v;
}
