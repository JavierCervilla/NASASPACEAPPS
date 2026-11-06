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
 * What the on-foot view draws with, read for the depth suite (VENT-104):
 * the depth buffer the host says (`data-depth`, scene/scene-loading.ts),
 * and from the on-foot renderer the bench watches (registry.ts) the depth
 * buffer's bits, whether three's reversed depth buffer is on and whether
 * the shadow map is. What cannot be read (no view, a lost context) is
 * null.
 */
import type { WebGLRenderer } from 'three';
import type { Registry } from './registry';
import { ON_FOOT_HOST } from './settle';
import type { DepthReading } from './types';

/** The bound framebuffer's depth bits; null on a lost context. */
function depthBits(renderer: WebGLRenderer): number | null {
  const gl = renderer.getContext();
  if (gl.isContextLost()) return null;
  const bits = Number(gl.getParameter(gl.DEPTH_BITS));
  return Number.isFinite(bits) ? bits : null;
}

/** What the on-foot view draws with now. */
export function readDepth(registry: Registry, doc: Document): DepthReading {
  const host = doc.querySelector<HTMLElement>(ON_FOOT_HOST);
  const drawn = host?.dataset['depth'] ?? null;
  const handle = registry.handles().find((h) => h.kind === 'onFoot');
  if (!handle) return { drawn, bits: null, reversed: null, shadowMap: null };
  const { renderer } = handle;
  return { drawn, bits: depthBits(renderer),
    reversed: renderer.capabilities.reversedDepthBuffer,
    shadowMap: renderer.shadowMap.enabled };
}
