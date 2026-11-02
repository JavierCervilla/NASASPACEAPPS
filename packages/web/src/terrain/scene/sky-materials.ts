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
 * The sky's shaders (VENT-34): the Earth lit from the Sun's direction, so
 * its phase is the true one as the Moon sees it, wearing NASA's Blue
 * Marble turned to the face the Moon sees (a little light on its night
 * side keeps the disc findable); the Sun's soft glare; and
 * faint stars hashed from the direction, the same for the same seed
 * (illustrative: not a catalogue).
 */
import { Matrix3, ShaderMaterial, Vector3, type Blending, type Side } from 'three';

const NORMAL_VERTEX = `
varying vec3 vNormal;
varying vec3 vView;
void main() {
  vNormal = normalize(mat3(modelMatrix) * normal);
  vec4 world = modelMatrix * vec4(position, 1.0);
  vView = normalize(cameraPosition - world.xyz);
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

const EARTH_FRAGMENT = `
uniform vec3 uSun;
uniform mat3 uBody;
uniform sampler2D uMap;
varying vec3 vNormal;
varying vec3 vView;
void main() {
  vec3 n = normalize(vNormal);
  vec3 p = uBody * n;
  vec2 uv = vec2(atan(p.x, p.z) / 6.2831853 + 0.5,
    asin(clamp(p.y, -1.0, 1.0)) / 3.1415927 + 0.5);
  vec2 wrapped = vec2(fract(uv.x + 0.5), uv.y);
  vec2 gx = dFdx(uv); vec2 gy = dFdy(uv);
  vec2 hx = dFdx(wrapped); vec2 hy = dFdy(wrapped);
  if (dot(hx, hx) + dot(hy, hy) < dot(gx, gx) + dot(gy, gy)) { gx = hx; gy = hy; }
  vec3 land = textureGrad(uMap, uv, gx, gy).rgb;
  float lit = smoothstep(-0.08, 0.3, dot(n, uSun));
  float rim = pow(1.0 - max(dot(n, normalize(vView)), 0.0), 3.0);
  vec3 colour = land * (0.025 + 0.975 * lit) + vec3(0.2, 0.4, 0.9) * rim * 0.45 * lit;
  gl_FragColor = vec4(colour, 1.0);
  #include <colorspace_fragment>
}`;

/** The Earth: `uMap` its Blue Marble, `uBody` the scene-to-body matrix. */
export function earthMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { uSun: { value: new Vector3(0, 1, 0) },
      uBody: { value: new Matrix3() }, uMap: { value: null } },
    vertexShader: NORMAL_VERTEX,
    fragmentShader: EARTH_FRAGMENT,
    toneMapped: false,
  });
}

/** The Sun's glare: bright at its centre, gone at its rim. */
export function glareMaterial(blending: Blending): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: NORMAL_VERTEX,
    fragmentShader: `
varying vec3 vNormal;
varying vec3 vView;
void main() {
  float c = max(dot(normalize(vNormal), normalize(vView)), 0.0);
  gl_FragColor = vec4(vec3(1.0, 0.92, 0.78) * pow(c, 10.0) * 0.5, 1.0);
}`,
    blending, transparent: true, depthWrite: false, toneMapped: false,
  });
}

const STARS_VERTEX = `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const STARS_FRAGMENT = `
uniform float uSeed;
varying vec3 vDir;
float hash(vec3 p) {
  return fract(sin(dot(p, vec3(127.1, 311.7, 74.7)) + uSeed) * 43758.5453);
}
void main() {
  vec3 cell = floor(vDir * 300.0);
  float h = hash(cell);
  vec3 centre = (cell + 0.5) / 300.0;
  float d = length(vDir - normalize(centre)) * 300.0;
  float star = step(0.994, h) * smoothstep(0.5, 0.1, d);
  gl_FragColor = vec4(vec3(0.55 * star * (h - 0.994) / 0.006 + 0.0), 1.0);
}`;

/** Faint stars on the inside of a far sphere, seeded. */
export function starsMaterial(seed: number, side: Side): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { uSeed: { value: (seed % 1000) / 10 } },
    vertexShader: STARS_VERTEX,
    fragmentShader: STARS_FRAGMENT,
    side, depthWrite: false, toneMapped: false,
  });
}
