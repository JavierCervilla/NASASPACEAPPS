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
 * its phase is the true one as the Moon sees it (no map; a little light
 * on its night side keeps the disc findable); the Sun's soft glare; and
 * faint stars hashed from the direction, the same for the same seed
 * (illustrative: not a catalogue).
 */
import { ShaderMaterial, Vector3, type Blending, type Side } from 'three';

const NORMAL_VERTEX = `
varying vec3 vNormal;
varying vec3 vView;
void main() {
  vNormal = normalize(mat3(modelMatrix) * normal);
  vec4 world = modelMatrix * vec4(position, 1.0);
  vView = normalize(cameraPosition - world.xyz);
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

/** The Earth, `uSun` the unit vector toward the Sun. */
export function earthMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { uSun: { value: new Vector3(0, 1, 0) } },
    vertexShader: NORMAL_VERTEX,
    fragmentShader: `
uniform vec3 uSun;
varying vec3 vNormal;
varying vec3 vView;
void main() {
  float lit = smoothstep(-0.05, 0.15, dot(normalize(vNormal), uSun));
  gl_FragColor = vec4(vec3(0.55, 0.68, 0.92) * (0.06 + 0.94 * lit), 1.0);
  #include <colorspace_fragment>
}`,
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
