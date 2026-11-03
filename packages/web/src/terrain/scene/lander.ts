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
 * The lander beside the astronaut (VENT-46): a baked glb (the Apollo
 * Lunar Module, or the generic robotic lander) read without GLTFLoader
 * (glb.ts), its WebP maps fetched by URI, one `MeshStandardMaterial` per
 * primitive (lander-material.ts). Feet on the origin, +Y up, metres, as
 * the bake leaves it. A file that does not load leaves the
 * ground bare and a warning, never a broken view.
 */
import {
  BufferAttribute,
  BufferGeometry,
  Group,
  Mesh,
} from 'three';
import { loadChunk } from '../../pwa/missing-chunk';
import { readGlb, type GlbAccessor, type GlbPrimitive } from '../glb';
import { LANDER_RADIUS_M, type LanderKind } from '../lander-kind';
import { loadMaps } from './lander-maps';
import { materialOf, type Look } from './lander-material';
import { contactShadow } from './contact-shadow';
import type { ModelFiles } from './model-files';
import type { SunMask } from './sun-mask';

const SHADOW = { scale: 1.15, opacity: 0.3 } as const;

const filesOf = async (kind: LanderKind): Promise<ModelFiles> =>
  (await loadChunk(() => (kind === 'apollo' ? import('./apollo-lm-assets')
    : import('./lander-assets')), window)).default;

const attribute = (a: GlbAccessor): BufferAttribute =>
  new BufferAttribute(a.array, a.itemSize, a.normalized);

function meshOf(p: GlbPrimitive, look: Look): Mesh {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', attribute(p.position));
  geometry.setAttribute('normal', attribute(p.normal));
  geometry.setAttribute('uv', attribute(p.uv));
  geometry.setIndex(attribute(p.index));
  const mesh = new Mesh(geometry, materialOf(p, look));
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

/** What the loader needs from the scene. */
export interface LanderHost {
  readonly into: Group;
  readonly mask: SunMask;
  /** False once the scene is freed: nothing more is built. */
  readonly alive: () => boolean;
}

/** Loads the lander of `kind` into `host.into`; resolves when it is on. */
export async function loadLander(
  host: LanderHost,
  kind: LanderKind,
  warn: (message: string) => void,
): Promise<void> {
  try {
    const files = await filesOf(kind);
    const response = await fetch(files.glb);
    const glb = readGlb(await response.arrayBuffer());
    const maps = await loadMaps(glb.primitives, files);
    if (!host.alive()) return;
    const look = { maps, mask: host.mask };
    host.into.add(...glb.primitives.map((p) => meshOf(p, look)),
      withShadow(kind));
  } catch (error) {
    warn(`Ventana Lunar: the lander did not load (${String(error)}).`);
  }
}

function withShadow(kind: LanderKind): Mesh {
  return contactShadow(LANDER_RADIUS_M[kind] * SHADOW.scale, SHADOW.opacity);
}
