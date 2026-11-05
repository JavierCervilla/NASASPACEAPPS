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
 * What the attached renderers hold at one instant (VENT-81): the WebGL
 * contexts alive, the globe's map bytes while its context lives (a lost
 * context holds no textures), and the on-foot renderer's texture count
 * (three gives no bytes for it). The meter keeps each one's most.
 */
import { contextAlive, type RendererHandle } from './renderer-watch';

export interface Sample {
  readonly contexts: number;
  readonly textureBytes: number;
  readonly textures: number;
}

export const NO_SAMPLE: Sample = { contexts: 0, textureBytes: 0, textures: 0 };

/** The renderers' state now. */
export function sampleRenderers(handles: readonly RendererHandle[]): Sample {
  const alive = handles.filter(contextAlive);
  const bytes = alive.reduce((sum, h) => sum + (h.textureBytes?.() ?? 0), 0);
  const textures = alive.filter((h) => h.kind === 'onFoot')
    .reduce((sum, h) => sum + h.renderer.info.memory.textures, 0);
  return { contexts: alive.length, textureBytes: bytes, textures };
}

/** The larger of each of `a` and `b`. */
export const maxSample = (a: Sample, b: Sample): Sample => ({
  contexts: Math.max(a.contexts, b.contexts),
  textureBytes: Math.max(a.textureBytes, b.textureBytes),
  textures: Math.max(a.textures, b.textures),
});
