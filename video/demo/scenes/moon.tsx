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
 * The Moon in raea's 3D, for the demo videos (VENT-110): a unit sphere drawn
 * by a shader that maps the app's own textures (the LROC colour map, the
 * south polar map past 80° S and the LOLA relief as object-space normals)
 * from each pixel's latitude and longitude, lit by the Sun with a lunar
 * Lommel-Seeliger law, in front of a seeded star field and with the Earth
 * where it stands from the Moon. Axes are the app's globe (geo.ts): +Y
 * north, +X 0° E, -Z 90° E; the Earth lies near +X, 220 Moon radii away.
 */
import { staticFile } from "raea";
import { Camera3d } from "raea/camera";
import { ShaderMesh } from "raea/pbr";
import { Transform } from "raea/transform";

export type V3 = [number, number, number];

/** The textures the app ships, copied into media/textures by capture/textures.mjs. */
const TEX = {
  colour: "textures/moon-lroc-4k.jpg",
  polar: "textures/moon-south-polar-2k.jpg",
  relief: "textures/moon-lola-normal-4k.jpg",
  earth: "textures/on-foot-earth.webp",
};
const MAP = { wrap: ["repeat", "clamp"] as ["repeat", "clamp"], mipmap: "linear" as const, anisotropy: 16 };
const media = (p: string) => staticFile(p);

/** Earth's distance and radius in Moon radii (384 400 km, 6 371 km, 1 737.4 km). */
export const EARTH_DISTANCE = 221.3;
export const EARTH_RADIUS = 3.667;

const COMMON = /* wgsl */ `
const PI: f32 = 3.14159265;
fn to_raw(c: vec3<f32>) -> vec3<f32> {
  let lo = c * 12.92;
  let hi = 1.055 * pow(max(c, vec3<f32>(0.0)), vec3<f32>(1.0 / 2.4)) - 0.055;
  return select(hi, lo, c <= vec3<f32>(0.0031308));
}
fn equirect(p: vec3<f32>) -> vec2<f32> {
  let lat = asin(clamp(p.y, -1.0, 1.0));
  let lon = atan2(-p.z, p.x);
  return vec2<f32>((lon + PI) / (2.0 * PI), (PI * 0.5 - lat) / PI);
}
fn seamless_grad(u: f32) -> vec4<f32> {
  let u2 = fract(u + 0.5) - 0.5;
  var gx = dpdx(u);
  var gy = dpdy(u);
  if (abs(dpdx(u2)) < abs(gx)) { gx = dpdx(u2); }
  if (abs(dpdy(u2)) < abs(gy)) { gy = dpdy(u2); }
  return vec4<f32>(gx, gy, 0.0, 0.0);
}
`;

const MOON = /* wgsl */ `${COMMON}
fn shade(in: VertexOutput) -> vec4<f32> {
  let p = normalize(in.world_position.xyz);
  let uv = equirect(p);
  let g = seamless_grad(uv.x);
  let dx = vec2<f32>(g.x, dpdx(uv.y));
  let dy = vec2<f32>(g.y, dpdy(uv.y));
  var albedo = textureSampleGrad(tex_colour, samp_colour, uv, dx, dy).rgb;
  let lat = asin(clamp(p.y, -1.0, 1.0));
  let lon = atan2(-p.z, p.x);
  let w = smoothstep(-1.4016, -1.4224, lat);
  if (w > 0.0) {
    let c = PI * 0.5 + lat;
    let r = tan(c * 0.5) / tan(0.0872665);
    let q = vec2<f32>(0.5 + 0.5 * r * sin(lon), 0.5 - 0.5 * r * cos(lon));
    let polar = textureSampleLevel(tex_polar, samp_polar, q, 0.0).rgb * u_polar_gain();
    albedo = mix(albedo, polar, w);
  }
  let raw = to_raw(textureSampleGrad(tex_relief, samp_relief, uv, dx, dy).rgb);
  let n = normalize(mix(p, normalize(raw * 2.0 - 1.0), u_relief()));
  let l = normalize(u_sun());
  let v = normalize(u_eye() - in.world_position.xyz);
  let ci = max(dot(n, l), 0.0);
  let ce = max(dot(n, v), 0.02);
  let lit = smoothstep(-0.01, 0.02, dot(p, l));
  let ls = 2.0 * ci / (ci + ce);
  let f = mix(ci, ls, 0.55) * lit;
  let colour = albedo * (f * u_exposure() + u_earthshine());
  return vec4<f32>(colour, 1.0);
}
`;

const EARTH = /* wgsl */ `${COMMON}
fn shade(in: VertexOutput) -> vec4<f32> {
  let p = normalize(in.world_position.xyz - u_centre());
  let uv = equirect(vec3<f32>(p.x * u_spin().x + p.z * u_spin().y, p.y, -p.x * u_spin().y + p.z * u_spin().x));
  let g = seamless_grad(uv.x);
  let albedo = textureSampleGrad(tex_earth, samp_earth, uv, vec2<f32>(g.x, dpdx(uv.y)), vec2<f32>(g.y, dpdy(uv.y))).rgb;
  let ci = dot(p, normalize(u_sun()));
  let day = smoothstep(-0.05, 0.12, ci);
  let v = normalize(u_eye() - in.world_position.xyz);
  let rim = pow(1.0 - max(dot(p, v), 0.0), 3.0) * day;
  let colour = albedo * max(ci, 0.0) * u_exposure() + vec3<f32>(0.25, 0.45, 0.9) * rim * 0.6;
  return vec4<f32>(colour, 1.0);
}
`;

const SKY = /* wgsl */ `
fn hash3(p: vec3<f32>) -> f32 {
  var q = fract(p * vec3<f32>(0.1031, 0.1030, 0.0973));
  q += dot(q, q.yxz + 33.33);
  return fract((q.x + q.y) * q.z);
}
fn shade(in: VertexOutput) -> vec4<f32> {
  let d = normalize(in.world_position.xyz - u_eye());
  let k = 220.0;
  let s = d * k;
  let cell = floor(s);
  var light = 0.0;
  for (var i = 0; i < 2; i++) {
    for (var j = 0; j < 2; j++) {
      for (var m = 0; m < 2; m++) {
        let c = cell + vec3<f32>(f32(i), f32(j), f32(m)) - 0.5;
        let h = hash3(c);
        if (h > 0.985) {
          let off = vec3<f32>(hash3(c + 7.1), hash3(c + 3.7), hash3(c + 1.3));
          let dist = length(s - (floor(c) + off));
          let size = max(fwidth(s.x) + fwidth(s.y), 0.02) * 0.9;
          let mag = pow((h - 0.985) / 0.015, 3.0);
          light += smoothstep(size, 0.0, dist) * (0.15 + 1.6 * mag);
        }
      }
    }
  }
  let sun = normalize(u_sun());
  let a = acos(clamp(dot(d, sun), -1.0, 1.0));
  let disc = smoothstep(0.0052, 0.0044, a) * 40.0;
  let glow = exp(-a * a / 0.0009) * 2.5 + exp(-a / 0.05) * 0.25;
  let star = vec3<f32>(0.85, 0.9, 1.0) * light * u_stars();
  return vec4<f32>(star + vec3<f32>(1.0, 0.96, 0.9) * (disc + glow) * u_sun_on(), 1.0);
}
`;

export interface MoonShot {
  /** the camera's position and the point it looks at, in Moon radii */
  eye: V3;
  look: V3;
  /** vertical field of view, degrees */
  fov: number;
  /** the camera's up direction (+Y north by default) */
  up?: V3;
  /** the direction to the Sun, from the Moon */
  sun: V3;
  /** exposure of the sunlit surface */
  exposure?: number;
  /** 0: the smooth sphere, 1: the full LOLA relief */
  relief?: number;
  /** the Earth's turn, radians (its cloud-free map's 0° E faces +X at 0) */
  earthSpin?: number;
  /** the Earth's apparent latitude seen from the Moon, radians (libration) */
  earthLat?: number;
  /** star brightness and whether the Sun's disc and glow show */
  stars?: number;
  sunOn?: number;
}

/** The whole scene for one frame: the camera, the sky, the Earth and the Moon. */
export function MoonScene({ eye, look, fov, up = [0, 1, 0], sun, exposure = 2.6, relief = 1, earthSpin = 0, earthLat = -0.06, stars = 1, sunOn = 1 }: MoonShot) {
  const earth: V3 = [EARTH_DISTANCE * Math.cos(earthLat), EARTH_DISTANCE * Math.sin(earthLat), 0];
  return (
    <>
      <Camera3d transform={Transform.fromXyz(eye[0], eye[1], eye[2]).lookingAt(look, up)} projection={{ Perspective: { fov: (fov * Math.PI) / 180, near: 0.002, far: 2000 } }} />
      <ShaderMesh name="sky" shape={{ primitive: "Sphere", radius: 900 }} position={eye} doubleSided wgsl={SKY}
        uniforms={{ eye, sun, stars, sun_on: sunOn }} />
      <ShaderMesh name="earth" shape="sphere(1, 96)" position={earth} scale={EARTH_RADIUS} wgsl={EARTH}
        uniforms={{ eye, sun, centre: earth, spin: [Math.cos(earthSpin), Math.sin(earthSpin)], exposure: exposure * 0.9 }}
        textures={{ earth: { src: media(TEX.earth), sampler: MAP } }} />
      <ShaderMesh name="moon" shape="sphere(1, 384)" wgsl={MOON}
        uniforms={{ eye, sun, exposure, relief, polar_gain: 3.5, earthshine: 0.004 }}
        textures={{
          colour: { src: media(TEX.colour), sampler: MAP },
          polar: { src: media(TEX.polar), sampler: { mipmap: "linear", wrap: "clamp" } },
          relief: { src: media(TEX.relief), sampler: MAP },
        }} />
    </>
  );
}

/** A point on the Moon at latitude, longitude (degrees) and radius r. */
export function onMoon(lat: number, lon: number, r = 1): V3 {
  const a = (lat * Math.PI) / 180;
  const o = (lon * Math.PI) / 180;
  return [r * Math.cos(a) * Math.cos(o), r * Math.sin(a), -r * Math.cos(a) * Math.sin(o)];
}

/** The direction to the Sun for a sub-solar point at latitude, longitude (degrees). */
export const sunFrom = (lat: number, lon: number): V3 => onMoon(lat, lon, 1);
