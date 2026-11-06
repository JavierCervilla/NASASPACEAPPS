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
 * What the on-foot view draws with, written by the scene on its canvas
 * (`data-scene-*`) when it makes its renderer, so the `?debug` readout can
 * say it from the scene itself and not from the address (VENT-105). Pure:
 * the scene writes and the dev tools read, and neither imports the other.
 */
import { TIERS, type Tier } from '../lib/quality';

/** The shadow map: drawn, drawn on `?shadows=force`, or off and why. */
export type ShadowMapState = 'on' | 'forced' | 'left-out' | 'unsafe-gpu';

const SHADOW_STATES: readonly ShadowMapState[] =
  ['on', 'forced', 'left-out', 'unsafe-gpu'];

export interface SceneMarks {
  /** The depth buffer drawn, e.g. «log» or «linear (reversed refused)». */
  readonly depth: string;
  /** The depth buffer's bits. */
  readonly bits: number;
  /** Whether three's reversed depth buffer is on. */
  readonly reversed: boolean;
  readonly shadows: ShadowMapState;
  /** The view's tier. */
  readonly tier: Tier;
}

/** Whatever has a `dataset`: the canvas, or a test's stand-in. */
interface Marked {
  readonly dataset: Record<string, string | undefined>;
}

/**
 * The shadow map's state: `?onfoot=shadows` leaves it out above all, then
 * `?shadows=force` draws it, then an unsafe GPU turns it off.
 */
export function shadowMapState(asked: {
  readonly leftOut: boolean;
  readonly forced: boolean;
  readonly unsafe: boolean;
}): ShadowMapState {
  if (asked.leftOut) return 'left-out';
  if (asked.forced) return 'forced';
  return asked.unsafe ? 'unsafe-gpu' : 'on';
}

export function writeSceneMarks(el: Marked, marks: SceneMarks): void {
  el.dataset['sceneDepth'] = marks.depth;
  el.dataset['sceneBits'] = String(marks.bits);
  el.dataset['sceneReversed'] = String(marks.reversed);
  el.dataset['sceneShadows'] = marks.shadows;
  el.dataset['sceneTier'] = marks.tier;
}

/** The marks on `el`; null when the scene wrote none or they are bad. */
export function readSceneMarks(el: Marked): SceneMarks | null {
  const { dataset } = el;
  const shadows = SHADOW_STATES.find((s) => s === dataset['sceneShadows']);
  const tier = TIERS.find((t) => t === dataset['sceneTier']);
  const depth = dataset['sceneDepth'];
  const bits = Number(dataset['sceneBits']);
  if (!shadows || !tier || !depth || !Number.isFinite(bits)) return null;
  const reversed = dataset['sceneReversed'] === 'true';
  return { depth, bits, reversed, shadows, tier };
}
