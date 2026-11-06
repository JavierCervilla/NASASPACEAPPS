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
 * The benchmark's script (VENT-81), declarative and versioned: the same
 * moves on the same points every run, so two runs differ only by the
 * device and the variant. Synthetic keys, never pointer drags (a synthetic
 * pointer cannot take capture). Version 1:
 * a. the globe idle 5 s;
 * b. the globe turned and zoomed in by keys (globe/keys.ts: 10° an arrow,
 *    two zoom steps a «+»; four «+» bring the opening 5 radii to 2.2, past
 *    close enough for globe/texture-lod.ts to ask the 4K map), then 3 s;
 * c. the on-foot view of IM-2 until it settles (60 s at most);
 * d. a full turn by ArrowRight (look-input.ts: 5° a key);
 * e. the point changed to Malapert Massif without a reload, until it
 *    settles, and turned again;
 * f. back to the globe, 3 s.
 * `fast` (the e2e's `&benchFast`) scales the waits and turns down, for
 * software GL.
 */

export const SCRIPT_VERSION = 1;

export type StepId =
  | 'globeIdle' | 'globeMoves' | 'openView' | 'turn' | 'changePoint'
  | 'backToGlobe';

export type KeyTarget = 'globe' | 'onFoot';

export type Action =
  | { readonly kind: 'view'; readonly view: 'globe' | 'horizon' }
  | { readonly kind: 'wait'; readonly ms: number }
  | { readonly kind: 'keys'; readonly target: KeyTarget;
      readonly keys: readonly string[]; readonly gapMs: number }
  | { readonly kind: 'settle'; readonly timeoutMs: number;
      /** Wait first for a point change to park the scene. */
      readonly park: boolean }
  | { readonly kind: 'site'; readonly id: string };

export interface Step {
  readonly id: StepId;
  readonly actions: readonly Action[];
}

/** The site each run opens on (its reload's `?site=`), and the next one. */
export const START_SITE = 'im2-athena';
export const NEXT_SITE = 'artemis-malapert-massif';

/** Degrees of one ArrowRight on the on-foot view (look-input.ts). */
export const LOOK_KEY_DEG = 5;
/** Keys apart while turning the view: about one a frame at 60 Hz. */
const TURN_GAP_MS = 16;
const GLOBE_GAP_MS = 100;
const ZOOM_GAP_MS = 250;
const GLOBE_KEY_DEG = 10;
const ZOOM_IN_PRESSES = 4;
const SETTLE_MS = 60_000;
/** What `fast` keeps of every wait and turn. */
const FAST = { waits: 0.2, turnDeg: 90 } as const;

/** How many keys of `stepDeg` turn the view `turnDeg`. */
export function turnKeyCount(turnDeg: number, stepDeg = LOOK_KEY_DEG) {
  return Math.ceil(turnDeg / stepDeg);
}

const repeat = (key: string, count: number): string[] =>
  Array.from({ length: count }, () => key);

/** The globe's moves: half a turn east, the zoom in, half a turn back. */
function globeMoves(scale: number): Action[] {
  const half = Math.max(1, Math.round((180 / GLOBE_KEY_DEG) * scale));
  return [
    { kind: 'keys', target: 'globe', keys: repeat('ArrowRight', half),
      gapMs: GLOBE_GAP_MS },
    { kind: 'keys', target: 'globe', keys: repeat('+', ZOOM_IN_PRESSES),
      gapMs: ZOOM_GAP_MS },
    { kind: 'keys', target: 'globe', keys: repeat('ArrowLeft', half),
      gapMs: GLOBE_GAP_MS },
  ];
}

/** The steps of script v1; `fast` scales its waits and turns down. */
export function benchScript(fast: boolean): readonly Step[] {
  const scale = fast ? FAST.waits : 1;
  const wait = (ms: number): Action => ({ kind: 'wait', ms: ms * scale });
  const keys = repeat('ArrowRight', turnKeyCount(fast ? FAST.turnDeg : 360));
  const turn: Action = { kind: 'keys', target: 'onFoot', keys,
    gapMs: TURN_GAP_MS };
  const settle = (park: boolean): Action =>
    ({ kind: 'settle', timeoutMs: SETTLE_MS, park });
  return [
    { id: 'globeIdle', actions: [{ kind: 'view', view: 'globe' }, wait(5000)] },
    { id: 'globeMoves', actions: [...globeMoves(scale), wait(3000)] },
    { id: 'openView', actions: [{ kind: 'view', view: 'horizon' },
      settle(false)] },
    { id: 'turn', actions: [turn, wait(1000)] },
    { id: 'changePoint', actions: [{ kind: 'site', id: NEXT_SITE },
      settle(true),
      turn, wait(1000)] },
    { id: 'backToGlobe', actions: [{ kind: 'view', view: 'globe' },
      wait(3000)] },
  ];
}
