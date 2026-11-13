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
 * The Moon's map swapper wired to the page (texture-swap.ts): the GPU's
 * loaders (moon-textures.ts), the maps' URLs and, under `?debug` only, the
 * trace in the dev tools' breadcrumbs (VENT-99), with what the density
 * rule read each time its answer changes and the GL error each upload left.
 */
import type { MeshLambertMaterial, Texture, WebGLRenderer } from 'three';
import { devToolsModule } from '../lib/dev-tools-loader';
import { loadKtx2 } from '../textures/ktx2-load';
import { pageKtx2Deps } from '../textures/ktx2-page';
import { pageKtx2 } from '../textures/ktx2-session';
import { discPixels, pxPerTexel } from './disc-density';
import { mapCrumbs } from './map-crumbs';
import { glErrorName } from './map-failure';
import type { Ktx2Target } from './ktx2-target';
import type { MapTrace } from './map-trace';
import type { MoonOptions } from './moon';
import { moonTextureDeps } from './moon-textures';
import {
  levelUrls,
  wantedLevel,
  type LodCaps,
  type LodLevel,
  type LodView,
} from './texture-lod';
import { TextureSwap } from './texture-swap';

export interface MoonSwap {
  readonly swap: TextureSwap<Texture>;
  /** The level the view needs, told to the trace when it changes. */
  readonly want: (view: LodView) => LodLevel;
}

/**
 * The density rule (texture-lod.ts) over the caps as they are now (KTX2 may
 * turn off mid-session: VENT-123), telling what it read on a change.
 */
export function ruleWatch(
  capsNow: () => LodCaps,
  trace: Pick<MapTrace<unknown>, 'mark'> | undefined,
): (view: LodView) => LodLevel {
  let last: LodLevel | 0 = 0;
  return (view) => {
    const caps = capsNow();
    const level = wantedLevel(view, caps);
    if (level !== last) {
      const { tier, phone, coarsePointer, saveData, maxTextureSize } = caps;
      const discPx = discPixels(view);
      const texel = pxPerTexel(level, view);
      trace?.mark({ kind: 'rule', level, discPx, pxPerTexel: texel, tier,
        phone, coarsePointer, ktx2: caps.ktx2 ?? false, saveData,
        maxTextureSize });
    }
    last = level;
    return level;
  };
}

/** The swapper of `material`'s maps, and the rule that feeds it. */
export function moonSwap(
  renderer: WebGLRenderer,
  material: MeshLambertMaterial,
  options: MoonOptions,
): MoonSwap {
  const glError = (): string => glErrorName(renderer.getContext().getError());
  const trace = mapCrumbs<Texture>(devToolsModule(), glError);
  // KTX2 (VENT-101): the start colour's bytes may have been asked early.
  const early = options.early?.maps;
  const deps = pageKtx2Deps((url) => early?.takeBytes(url) ?? null);
  const ktx2 = {
    session: pageKtx2,
    load: (url: string, target: Ktx2Target) => loadKtx2(url, target, deps),
  };
  const swap = new TextureSwap<Texture>({
    ...moonTextureDeps({ ...options, renderer, material, ktx2, trace,
      handheld: options.phone || options.coarsePointer }),
    urls: (level) => levelUrls(level, options.base, pageKtx2.choice().target),
    warn: options.warn,
    trace,
  });
  const { maxTextureSize } = renderer.capabilities;
  const caps = (): LodCaps => ({ ...options, maxTextureSize,
    ktx2: pageKtx2.choice().target !== null });
  return { swap, want: ruleWatch(caps, trace) };
}
