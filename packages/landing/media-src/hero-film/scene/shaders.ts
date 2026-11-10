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
 * The hero film's two shaders (WGSL, raea's ShaderMaterial: `fn shade`,
 * uniforms read as `u_NAME()`, textures as `tex_NAME` / `samp_NAME`).
 *
 * TERRAIN draws the one Moon mesh: albedo from the LROC colour map (blurred
 * where the mesh carries real relief), the geometric normal near the target
 * blended into the LOLA normal map where the mesh is the bare sphere (the
 * mesh's TEXCOORD_0.y), the baked sunlit share of the Sun's disc
 * (TEXCOORD_0.x), the app's lunar photometry (Hapke et al. 2012 for the
 * highlands, with the on-foot view's floor past 120° of phase), and illustrative regolith detail that fades in with the
 * camera's distance, three tilings blended, so no scale switches.
 *
 * SKY draws a sphere around the camera: black, the Sun's disc and a small
 * glow, and the Earth by ray-sphere intersection at its true place and size,
 * its Blue Marble face turned as at the instant and lit by the Sun, so its
 * phase is the true one.
 */

const COMMON = /* wgsl */ `
const PI: f32 = 3.14159265;
fn to_raw(c: vec3<f32>) -> vec3<f32> {
  let lo = c * 12.92;
  let hi = 1.055 * pow(max(c, vec3<f32>(0.0)), vec3<f32>(1.0 / 2.4)) - 0.055;
  return select(hi, lo, c <= vec3<f32>(0.0031308));
}
fn latlon_uv(m: vec3<f32>) -> vec2<f32> {
  let lat = asin(clamp(m.z, -1.0, 1.0));
  let lon = atan2(m.y, m.x);
  return vec2<f32>((lon + PI) / (2.0 * PI), (PI * 0.5 - lat) / PI);
}
fn seamless_grad(u: f32) -> vec2<f32> {
  let u2 = fract(u + 0.5) - 0.5;
  var gx = dpdx(u);
  var gy = dpdy(u);
  if (abs(dpdx(u2)) < abs(gx)) { gx = dpdx(u2); }
  if (abs(dpdy(u2)) < abs(gy)) { gy = dpdy(u2); }
  return vec2<f32>(gx, gy);
}
`;

export const TERRAIN = /* wgsl */ `${COMMON}
fn to_moon(w: vec3<f32>) -> vec3<f32> {
  return w.x * u_east() + w.y * u_up() - w.z * u_north();
}
fn to_world(m: vec3<f32>) -> vec3<f32> {
  return vec3<f32>(dot(m, u_east()), dot(m, u_up()), -dot(m, u_north()));
}
// Where the mesh carries the LOLA relief the albedo is the LROC map seen
// through a wide blur: the polar mosaics hold the light of their own Suns
// (shadows, streaks), which would fight the real shadows of the instant.
// Past the relief, on the bare sphere, the map at full detail. Near neutral.
fn albedo_at(m: vec3<f32>, detail: f32) -> vec3<f32> {
  let uv = latlon_uv(m);
  let g = seamless_grad(uv.x);
  let sharp = textureSampleGrad(tex_colour, samp_colour, uv, vec2<f32>(g.x, dpdx(uv.y)), vec2<f32>(g.y, dpdy(uv.y))).rgb;
  let broad = textureSampleLevel(tex_colour, samp_colour, uv, 6.0).rgb;
  let a = mix(broad, sharp, detail);
  let luma = dot(a, vec3<f32>(0.2126, 0.7152, 0.0722));
  return mix(vec3<f32>(luma), a, 0.3);
}
fn relief_normal(m: vec3<f32>, radial: vec3<f32>) -> vec3<f32> {
  let uv = latlon_uv(m);
  let g = seamless_grad(uv.x);
  let raw = to_raw(textureSampleGrad(tex_relief, samp_relief, uv, vec2<f32>(g.x, dpdx(uv.y)), vec2<f32>(g.y, dpdy(uv.y))).rgb) * 2.0 - 1.0;
  // the map's frame is the app's globe (x 0° E, y north, -z 90° E), its relief exaggerated 3 times
  let n = to_world(normalize(vec3<f32>(raw.x, -raw.z, raw.y)));
  return normalize(mix(radial, n, 0.34));
}
// Hapke et al. 2012, lunar highlands at 604 nm, as the app's on-foot view
// (packages/web/src/terrain/hapke.ts, lunar-photometry.ts, VENT-68)
const HW: f32 = 0.357;
const HB: f32 = 0.298;
fn h_fn(x: f32) -> f32 {
  let r0 = (1.0 - sqrt(1.0 - HW)) / (1.0 + sqrt(1.0 - HW));
  let u = max(x, 1e-4);
  return 1.0 / (1.0 - HW * u * (r0 + ((1.0 - 2.0 * r0 * u) / 2.0) * log((1.0 + u) / u)));
}
fn hapke(mu0: f32, mu: f32, g: f32) -> f32 {
  let t = tan(min(g, 3.1066860) * 0.5);
  let z = max(t / 0.113, 1e-6);
  let bc = 0.456 * (1.0 + (1.0 - exp(-z)) / z) / 2.0 / ((1.0 + z) * (1.0 + z));
  let bs = 0.358 / (1.0 + t / 0.041);
  let hg = (1.0 - HB * HB) / pow(1.0 + HB * HB - 2.0 * HB * cos(g), 1.5);
  let scatter = (1.0 + bs) * hg + h_fn(mu0) * h_fn(mu) - 1.0;
  return max(mu0, 0.0) / (max(mu0, 0.0) + mu + 1e-3) * scatter * (1.0 + bc);
}
fn reflectance(mu0: f32, mu: f32, alpha: f32) -> f32 {
  let smooth1 = 0.0174533;
  let c30 = 0.8660254;
  let norm = c30 / hapke(c30, 1.0, sqrt(0.5235988 * 0.5235988 + smooth1 * smooth1));
  let h = hapke(mu0, mu, sqrt(alpha * alpha + smooth1 * smooth1)) * norm;
  let floor = 1.15 * max(mu0, 0.0) * (0.7 + 0.6 / (max(mu0, 0.0) + mu + 1e-3));
  return h + (max(h, floor) - h) * smoothstep(2.0943951, 2.4434610, alpha);
}
fn regolith(p: vec2<f32>, tile: f32) -> vec2<f32> {
  let t = to_raw(textureSample(tex_detail, samp_detail, p / tile).rgb) * 2.0 - 1.0;
  return t.xy;
}
fn shade(in: VertexOutput) -> vec4<f32> {
  let wp = in.world_position.xyz;
  let pw = wp - u_centre();
  let radial = normalize(pw);
  let m = normalize(to_moon(pw));
  let albedo = albedo_at(m, in.uv.y);
  var n = normalize(mix(normalize(in.world_normal), relief_normal(m, radial), in.uv.y));
  // illustrative regolith: three tilings, each fading out with distance
  let dist = length(wp - u_eye());
  var tilt = vec2<f32>(0.0);
  tilt += regolith(wp.xz, 1.7) * (1.0 - smoothstep(6.0, 40.0, dist));
  tilt += regolith(wp.xz, 7.3) * (1.0 - smoothstep(30.0, 200.0, dist));
  tilt += regolith(wp.xz, 31.0) * (1.0 - smoothstep(150.0, 900.0, dist));
  n = normalize(n + vec3<f32>(tilt.x, 0.0, -tilt.y) * u_detail());
  let l = u_sun();
  let v = normalize(u_eye() - wp);
  let mu0 = dot(n, l);
  let mu = max(dot(n, v), 0.02);
  let alpha = acos(clamp(dot(l, v), -1.0, 1.0));
  let f = select(0.0, reflectance(mu0, mu, alpha), mu0 > 0.0) * in.uv.x;
  let earthshine = max(dot(n, u_earth_dir()), 0.0) * vec3<f32>(0.55, 0.7, 1.0) * u_fill();
  return vec4<f32>(albedo * (f * u_exposure() + earthshine), 1.0);
}
`;

export const SKY = /* wgsl */ `${COMMON}
fn shade(in: VertexOutput) -> vec4<f32> {
  let d = normalize(in.world_position.xyz - u_eye());
  let px = u_pixel();
  // the Sun: its disc (0.2666° radius), far over the exposure, and a small glow
  let a = 2.0 * asin(clamp(length(d - u_sun()) * 0.5, 0.0, 1.0));
  let disc = smoothstep(0.004653 + px, 0.004653 - px, a);
  var c = vec3<f32>(1.0, 0.97, 0.92) * (disc * 60.0 + exp(-a / 0.003) * 0.6) * u_sun_on();
  // the Earth: ray against its sphere, in units of its distance
  let rel = u_earth_rel();
  let ec = normalize(rel);
  let sr = u_earth_radius() / length(rel);
  let cr = cross(d, ec);
  let s2 = dot(cr, cr);
  let ca = dot(d, ec);
  let edge = sqrt(s2) - sr;
  if (ca > 0.0 && edge < px) {
    let s = ca - sqrt(max(sr * sr - s2, 0.0));
    let nw = normalize((d * s - ec) / sr);
    let ne = vec3<f32>(dot(nw, u_earth_x()), dot(nw, u_earth_y()), dot(nw, u_earth_z()));
    let uv = latlon_uv(ne);
    let albedo = textureSampleLevel(tex_earth, samp_earth, uv, 1.5).rgb;
    let ci = dot(nw, u_sun());
    let ce = max(-dot(nw, d), 0.0);
    let rim = pow(1.0 - ce, 4.0) * smoothstep(-0.1, 0.2, ci);
    let earth = albedo * max(ci, 0.0) * u_exposure() * 1.6 + vec3<f32>(0.3, 0.5, 1.0) * rim * 0.35 * u_exposure();
    c = mix(c, earth, smoothstep(px, -px, edge));
  }
  return vec4<f32>(c, 1.0);
}
`;
