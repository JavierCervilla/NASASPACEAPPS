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
 * The crater patch of a mount (VENT-64): its layer, the patch's variant of
 * the ground material and the rings' shadow depth, when the tier and
 * `?onfoot=` have one.
 */
import type { MeshDepthMaterial, MeshStandardMaterial } from 'three';
import type { GroundPolicy } from '../ground-policy';
import { ClodLayer } from './clod-layer';
import { CraterLayer } from './crater-layer';
import { ringDepthMaterial } from './crater-depth';
import { PATCH_SPECS } from './crater-spec';
import { groundMaterial, type GroundShared } from './ground';
import type { SceneSetup } from './scene-types';
import type { Slicer } from './slicer';
import type { SunMask } from './sun-mask';

/** The crater parts of this mount; none for a tier or a mount without. */
export function craterParts(
  seed: number,
  setup: SceneSetup,
  parts: {
    mask: SunMask;
    shared: GroundShared;
    slicer: Slicer;
    policy: GroundPolicy;
  },
): {
  craters: CraterLayer | null;
  patchMaterial: MeshStandardMaterial | null;
  ringDepth: MeshDepthMaterial | null;
} {
  const spec = parts.policy.craters ? PATCH_SPECS[setup.quality.tier] : null;
  if (!spec) return { craters: null, patchMaterial: null, ringDepth: null };
  const material = groundMaterial(parts.mask, parts.shared, parts.policy, true);
  const craters = new CraterLayer({ seed, spec, material,
    uniforms: parts.shared.craters, slicer: parts.slicer,
    note: (text) => setup.report.step(text) });
  return { craters, patchMaterial: material,
    ringDepth: ringDepthMaterial(parts.shared.craters) };
}

/** The clods' bake of this mount, only where the policy has grain. */
export function clodLayer(
  seed: number,
  setup: SceneSetup,
  parts: { shared: GroundShared; slicer: Slicer; policy: GroundPolicy },
): ClodLayer | null {
  if (!parts.policy.grain) return null;
  return new ClodLayer({ seed, uniforms: parts.shared.clods,
    slicer: parts.slicer, note: (text) => setup.report.step(text) });
}
