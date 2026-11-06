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
 * The on-foot view's depth buffer and shadow map, as the address may ask for
 * them to bisect a GPU crash on a phone (VENT-103, point 8 of VENT-80): the
 * Pixel 10's PowerVR loses its context when a frame samples the shadow map
 * and writes a logarithmic depth (VENT-75), so the view draws there without
 * the shadow map. `?depth=log|linear|reversed` picks the depth buffer
 * (reversed needs EXT_clip_control; without it the view keeps the
 * logarithmic one) and `?shadows=force` draws the shadow map on a GPU the
 * safety rules turn it off for. Not a setting for visitors: nothing links to
 * these words and they show only in `?debug` and the crash report.
 */
import type { WebGLRenderer } from 'three';
import type { LeaveOut } from './leave-out';

export const DEPTH_MODES = ['log', 'linear', 'reversed'] as const;

export type DepthMode = (typeof DEPTH_MODES)[number];

export interface DepthChoice {
  /** The depth buffer the view draws with. */
  readonly mode: DepthMode;
  /** What `?depth=` asked for, null when it named no mode. */
  readonly asked: DepthMode | null;
  /** `?shadows=force`: the shadow map even where it is deemed unsafe. */
  readonly forceShadows: boolean;
}

const word = (params: URLSearchParams, name: string): string =>
  (params.get(name) ?? '').trim().toLowerCase();

/** The depth and shadow choice for the address `search`. */
export function depthChoice(
  search: string,
  leave: ReadonlySet<LeaveOut>,
  clipControl: boolean,
): DepthChoice {
  const params = new URLSearchParams(search);
  const named = word(params, 'depth');
  const asked = DEPTH_MODES.find((mode) => mode === named) ?? null;
  const wanted = asked ?? (leave.has('logdepth') ? 'linear' : 'log');
  const mode = wanted === 'reversed' && !clipControl ? 'log' : wanted;
  return { mode, asked, forceShadows: word(params, 'shadows') === 'force' };
}

/**
 * The report's step for what `renderer` draws with: the mode, what the
 * address asked when it differs, the depth buffer's bits and the shadow map,
 * e.g. «depth reversed · 24 bits · shadow map on (forced)».
 */
export function depthStep(
  choice: DepthChoice,
  renderer: WebGLRenderer,
): string {
  const gl = renderer.getContext();
  const bits = Number(gl.getParameter(gl.DEPTH_BITS));
  const reversedOff = choice.mode === 'reversed'
    && !renderer.capabilities.reversedDepthBuffer;
  const asked = choice.asked && choice.asked !== choice.mode
    ? ` (asked ${choice.asked})` : '';
  const mode = reversedOff ? 'linear (reversed refused)' : choice.mode;
  const map = renderer.shadowMap.enabled ? 'on' : 'off';
  const forced = choice.forceShadows ? ' (forced)' : '';
  return `depth ${mode}${asked} · ${bits} bits · shadow map ${map}${forced}`;
}
