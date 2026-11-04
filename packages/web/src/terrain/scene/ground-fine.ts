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
 * The fine real relief in the ground's shader (VENT-62). The ring's level 0
 * has the NAC heights at its 15.6 m nodes; between nodes the tile's own
 * slope, at 5 m, replaces the mesh's interpolated one by the feather's
 * weight. The slope is read where the view's frame (metres east and south
 * of the site, the texture coordinates times the repeat) lands on the
 * tile's polar plane, by the affine map of fine-slope.ts.
 */
import {
  ClampToEdgeWrapping,
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  NoColorSpace,
  RGBAFormat,
  Vector2,
  Vector4,
  type IUniform,
  type Texture,
  type WebGLProgramParametersWithUniforms,
} from 'three';
import type { FineView } from '../fine/fine-relief';
import { GRAIN_M } from './ring-geometry';
import { replaceOnce } from './ground-shader';

/** The uniforms the ground's shader shares with the scene. */
export interface FineUniforms {
  uFineTex: IUniform<Texture | null>;
  /** Plane X and Y of the tile's upper-left corner, its side, 1 when on. */
  uFineBox: IUniform<Vector4>;
  /** The site's plane position, and the plane step per metre east, north. */
  uPlaneO: IUniform<Vector2>;
  uPlaneE: IUniform<Vector2>;
  uPlaneN: IUniform<Vector2>;
}

export const createFineUniforms = (): FineUniforms => ({
  uFineTex: { value: null },
  uFineBox: { value: new Vector4(0, 0, 1, 0) },
  uPlaneO: { value: new Vector2() },
  uPlaneE: { value: new Vector2(1, 0) },
  uPlaneN: { value: new Vector2(0, 1) },
});

const MAP = `
#ifdef USE_MAP
uniform sampler2D uFineTex; uniform vec4 uFineBox;
uniform vec2 uPlaneO; uniform vec2 uPlaneE; uniform vec2 uPlaneN;
// The tile's slope (dh/deast, dh/dsouth) at the frame's (east, south) p, and its weight in z.
vec3 fineSlope(vec2 p) {
  if (uFineBox.w < 0.5) return vec3(0.0);
  vec2 plane = uPlaneO + p.x * uPlaneE - p.y * uPlaneN;
  vec2 q = vec2(plane.x - uFineBox.x, uFineBox.y - plane.y) / uFineBox.z;
  if (q.x < 0.0 || q.y < 0.0 || q.x > 1.0 || q.y > 1.0) return vec3(0.0);
  vec4 t = texture2D(uFineTex, q);
  vec2 s = (t.rg * 255.0 - 128.0) / 127.0;
  return vec3(dot(s, vec2(uPlaneE.x, uPlaneE.y)), -dot(s, vec2(uPlaneN.x, uPlaneN.y)), t.b);
}
#endif`;

const USE = `
  #ifdef USE_MAP
  { vec3 fs = fineSlope(vMapUv * ${GRAIN_M.toFixed(1)});
    if (fs.z > 0.0) {
      vec3 nw = transpose(mat3(viewMatrix)) * nonPerturbedNormal;
      vec2 own = vec2(-nw.x, -nw.z) / max(nw.y, 0.2);
      mapN.xy -= fs.z * (fs.xy - own) / normalScale;
    } }
  #endif`;

/** Adds the fine slope to `shader`, after antiTile's normal read. */
export function patchFine(
  shader: WebGLProgramParametersWithUniforms,
  uniforms: FineUniforms,
): void {
  Object.assign(shader.uniforms, uniforms);
  const read = 'vec3 mapN = tiledNormal(normalMap, vNormalMapUv);';
  let source = replaceOnce(shader.fragmentShader, '#include <uv_pars_fragment>',
    `#include <uv_pars_fragment>\n${MAP}`);
  source = replaceOnce(source, read, `${read}${USE}`);
  shader.fragmentShader = source;
}

/** Gives the uniforms the tile of `view` (freeing the old texture), or none. */
export function setFine(uniforms: FineUniforms, view: FineView | null): void {
  uniforms.uFineTex.value?.dispose();
  uniforms.uFineTex.value = null;
  uniforms.uFineBox.value.w = 0;
  if (!view) return;
  const { size, texels } = view;
  const texture = new DataTexture(texels, size, size, RGBAFormat);
  texture.wrapS = texture.wrapT = ClampToEdgeWrapping;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.colorSpace = NoColorSpace;
  texture.needsUpdate = true;
  const { site, affine } = view;
  uniforms.uFineTex.value = texture;
  uniforms.uFineBox.value.set(site.ulx, site.uly, site.size * site.pixelM, 1);
  uniforms.uPlaneO.value.set(affine.x0, affine.y0);
  uniforms.uPlaneE.value.set(affine.xe, affine.ye);
  uniforms.uPlaneN.value.set(affine.xn, affine.yn);
}
