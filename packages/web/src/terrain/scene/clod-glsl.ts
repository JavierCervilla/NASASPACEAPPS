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
 * The regolith's clods in the ground's shader (VENT-67, «K0»): the baked
 * height field (clod-relief.ts) read at two scales gives each pixel a
 * normal, and a march from the pixel toward the Sun over the field gives it
 * a shadow of its own, nearly black as in AS12-49-7284. No displaced mesh:
 * a mesh version drew the same picture (a mean difference of 2/255) for a
 * dense mesh. Both fade as the pixel's footprint grows past a few
 * millimetres a texel (about 13 m from the eye), where the clods are smaller
 * than a pixel; past that the shader does nothing, so the far ground costs
 * nothing. The shadow goes to `gSunShade` (ground-photometry.ts), which
 * lights the Sun's share and tells the fill the point is shaded.
 */
import type {
  IUniform,
  Texture,
  WebGLProgramParametersWithUniforms,
} from 'three';
import { CLOD_TEXEL_M } from '../clod-law';
import { readersGlsl } from './clod-reads';
import { glslFloat as g } from './glsl-float';
import { GRAIN_M } from './ring-geometry';
import { replaceOnce } from './ground-shader';

export interface ClodUniforms {
  readonly uClod: IUniform<Texture | null>;
  /** 1 once the raster is baked and uploaded. */
  readonly uClodOn: IUniform<number>;
}

export const createClodUniforms = (): ClodUniforms => ({
  uClod: { value: null },
  uClodOn: { value: 0 },
});

/** The march (high only): steps, first step (m) and growth of the step. */
export const MARCH = { steps: 20, t0: 0.001, q: 1.38 } as const;
/** Footprint, in mip levels over the texel, where the clods fade out. */
export const FADE_LEVELS = [4, 6.5] as const;
/** The Sun's disc and the march's floor, as in crater-shade.ts. */
const DISC_TAN = 0.0093;
const FLOOR_M = 0.0004;

function marchGlsl(): string {
  const m = MARCH;
  return `
float clodShadow(vec2 p, float lod, vec3 s, float tilt) {
  float hl = length(s.xz);
  if (hl < 1e-4) return 1.0;
  vec2 d = s.xz / hl;
  float slope = s.y / hl - tilt;
  float h0 = clodH(p, lod);
  float worst = -1.0;
  float t = ${g(m.t0)};
  for (int i = 0; i < ${m.steps}; i++) {
    worst = max(worst, (clodH(p + d * t, lod) - h0 - t * slope) / (t * ${g(DISC_TAN)} + ${g(FLOOR_M)}));
    t *= ${g(m.q)};
  }
  return 1.0 - smoothstep(0.0, 1.0, worst + 0.5);
}`;
}

function usage(patch: boolean): string {
  const crater = patch ? ' + dot(vCSlope, kd)' : '';
  return `
  #ifdef USE_MAP
  if (uClodOn > 0.5) {
    vec2 kp = vMapUv * ${g(GRAIN_M)};
    float kl = log2(max(footMpp() / ${g(CLOD_TEXEL_M)}, 1.0));
    float kw = 1.0 - smoothstep(${g(FADE_LEVELS[0])}, ${g(FADE_LEVELS[1])}, kl);
    if (kw > 0.001) {
      mapN.xy -= kw * clodSlope(kp, kl) / normalScale;
      #if NUM_DIR_LIGHTS > 0
      mat3 kToW = transpose(mat3(viewMatrix));
      vec3 ks = kToW * directionalLights[0].direction;
      vec3 kn = kToW * nonPerturbedNormal;
      vec2 kd = normalize(ks.xz + 1e-6);
      float kTilt = -(kn.x * kd.x + kn.z * kd.y) / max(kn.y, 0.2)${crater};
      gSunShade *= mix(1.0, clodShadow(kp, kl, ks, kTilt), kw);
      #endif
    }
  }
  #endif`;
}

/** Adds the clods to `shader` (after antiTile and the craters' slope). */
export function patchClods(
  shader: WebGLProgramParametersWithUniforms,
  uniforms: ClodUniforms,
  grain: { patch: boolean },
): void {
  Object.assign(shader.uniforms, uniforms);
  const decl = replaceOnce(shader.fragmentShader, '#include <uv_pars_fragment>',
    `#include <uv_pars_fragment>\n${readersGlsl()}${marchGlsl()}`);
  const line = 'mapN.xy *= normalScale;';
  shader.fragmentShader = replaceOnce(decl, line,
    `${usage(grain.patch)}\n  ${line}`);
}
