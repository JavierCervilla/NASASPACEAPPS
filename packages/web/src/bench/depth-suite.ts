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
 * The benchmark's depth suite (VENT-104), `?bench=depth`: the on-foot
 * view's depth buffers side by side, to bisect the Pixel 10's lost context
 * (VENT-75, VENT-103) on the phone itself. Its variants, in run order
 * (VENT-107): the app as it is (logarithmic depth, the shadow map as the
 * safety rules say) and the reversed buffer the same way, the two the
 * human weighs for the default on PowerVR; then the shadow map forced with
 * the reversed, the linear and last the logarithmic buffer, the known
 * losses, last because a loss can make Chrome block WebGL for the site,
 * which stops the bench. Each variant is the address's
 * switches (terrain/depth-mode.ts). Pure but for the `params` it is
 * handed.
 */
import { BENCH_PARAM } from '../lib/bench-param';
import type { RunCount, Suite } from './types';

export const DEPTH_VARIANTS = [
  'log', 'reversed', 'reversed+shadows', 'linear+shadows', 'log+shadows',
] as const;

export type DepthVariant = (typeof DEPTH_VARIANTS)[number];

/** The switches a variant's page load sets; every other run drops them. */
export const DEPTH_PARAMS = ['depth', 'shadows'] as const;

const FORCE: readonly [string, string] = ['shadows', 'force'];

const PARAMS: Readonly<Record<DepthVariant,
  readonly (readonly [string, string])[]>> = {
  log: [],
  reversed: [['depth', 'reversed']],
  'reversed+shadows': [['depth', 'reversed'], FORCE],
  'linear+shadows': [['depth', 'linear'], FORCE],
  'log+shadows': [FORCE],
};

/** The variants in run order, the whole order once per round. */
export function depthOrder(runs: RunCount): DepthVariant[] {
  return Array.from({ length: runs }, () => DEPTH_VARIANTS).flat();
}

/** Whether `variant` is one of the depth suite's. */
export const isDepthVariant = (variant: unknown): variant is DepthVariant =>
  DEPTH_VARIANTS.some((v) => v === variant);

/** The address switches of `variant`'s page load. */
export const variantParams = (
  variant: DepthVariant,
): readonly (readonly [string, string])[] => PARAMS[variant];

/** The suite `params` ask for; undefined for the A/B suite. */
export function askedSuite(params: URLSearchParams): Suite | undefined {
  const word = (params.get(BENCH_PARAM) ?? '').trim().toLowerCase();
  return word === 'depth' ? 'depth' : undefined;
}

/** `params` with `variant`'s depth switches in place of any others. */
export function setDepth(
  params: URLSearchParams,
  variant: DepthVariant | null,
): void {
  for (const name of DEPTH_PARAMS) params.delete(name);
  for (const [name, value] of variant ? variantParams(variant) : []) {
    params.set(name, value);
  }
}
