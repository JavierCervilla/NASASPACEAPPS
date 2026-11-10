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
 * moon-scene's two shaders (WGSL, raea's ShaderMaterial: `fn shade`,
 * uniforms read as `u_NAME()`, textures as `tex_NAME` / `samp_NAME`).
 *
 * TERRAIN draws the one Moon mesh: albedo from the LROC colour map (blurred
 * where the mesh carries real relief), the geometric normal of the merged
 * field blended into the LOLA normal map where the mesh is the bare sphere
 * (TEXCOORD_0.y), the baked sunlit share of the Sun's disc (TEXCOORD_0.x),
 * the app's lunar photometry (Hapke et al. 2012 for the highlands, with the
 * on-foot view's floor past 120° of phase), and illustrative relief under
 * the data's resolution, computed per pixel so it never repeats and never
 * switches: small craters (Trask's equilibrium count, Basilevsky's depth
 * classes) and rocks (Golombek and Rapp's law), each scale fading in by the
 * pixel's footprint, with their own shadows marched toward the Sun.
 *
 * SKY draws a sphere around the camera: black, the Sun's disc and a small
 * bloom, and the Earth by ray-sphere intersection at its true place and
 * size, its Blue Marble face turned as at the instant and lit by the Sun, so
 * its phase is the true one. No stars.
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

/** Illustrative relief: craters and rocks, seeded by world cell, scale by scale. */
const DETAIL = /* wgsl */ `
fn pcg3(p: vec3<u32>) -> vec3<u32> {
  var v = p * 1664525u + 1013904223u;
  v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
  v = v ^ (v >> vec3<u32>(16u));
  v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
  return v;
}
fn rand4(c: vec2<i32>, salt: u32) -> vec4<f32> {
  let h = pcg3(vec3<u32>(bitcast<u32>(c.x), bitcast<u32>(c.y), salt));
  let g = pcg3(h.zxy ^ vec3<u32>(0x9e3779b9u, 0x85ebca6bu, 0xc2b2ae35u));
  return vec4<f32>(vec4<u32>(h.x, h.y, g.x, g.y) >> vec4<u32>(8u)) / 16777216.0;
}
// Basilevsky (1976): the share of small craters per class and its d/D range
fn depth_ratio(u: f32, v: f32) -> f32 {
  if (u < 0.005) { return mix(0.2, 0.25, v); }
  if (u < 0.03) { return mix(0.143, 0.2, v); }
  if (u < 0.2) { return mix(0.1, 0.143, v); }
  if (u < 0.5) { return mix(0.083, 0.1, v); }
  return mix(0.03, 0.083, v);
}
// One scale of craters, diameters 0.3 to 0.6 of the cell. Count: N(>D) =
// 0.0336 / D^2 per m^2, the lower bound Minton et al. (2019) measured at
// Apollo 15 (Trask's equilibrium, 0.0794, is the high side and reads as a
// pocked field under a 2° Sun): 0.0252 / D^2 in each doubling, 0.28 per cell.
fn craters(p: vec2<f32>, cell: f32, salt: u32) -> f32 {
  let base = vec2<i32>(floor(p / cell));
  var h = 0.0;
  for (var j = -1; j <= 1; j++) {
    for (var i = -1; i <= 1; i++) {
      let c = base + vec2<i32>(i, j);
      let r = rand4(c, salt);
      if (r.x < 0.28) {
        let s = rand4(c, salt + 7919u);
        let centre = (vec2<f32>(c) + vec2<f32>(0.15) + 0.7 * r.yz) * cell;
        let d = 0.3 * cell / sqrt(1.0 - 0.75 * r.w);
        let q = p - centre;
        let ang = atan2(q.y, q.x);
        // no crater is a circle: its rim wanders by a few per cent
        let wobble = 1.0 + 0.07 * sin(2.0 * ang + 6.28 * s.w) + 0.04 * sin(3.0 * ang + 6.28 * s.z) + 0.025 * sin(5.0 * ang + 6.28 * s.x);
        let x = 2.0 * length(q) / (d * wobble);
        if (x < 2.0) {
          let dd = depth_ratio(s.x, s.y);
          let depth = dd * d;
          let rim = depth * mix(0.08, 0.18, s.z);
          // a fresh bowl is a parabola; a degraded one (low d/D) a shallow cosine dish
          let fresh = smoothstep(0.06, 0.14, dd);
          let bowl = mix(0.5 * (1.0 - cos(PI * x)) - 1.0, x * x - 1.0, fresh);
          if (x < 1.0) { h += depth * bowl + rim; } else { h += rim * smoothstep(2.0, 1.0, x) * smoothstep(2.0, 1.0, x); }
        }
      }
    }
  }
  return h;
}
// One scale of rocks, diameters D0 to 2 D0 in cells of 6 D0, with the
// chance per cell from Golombek and Rapp's fractional area F = k e^(-qD).
fn rocks(p: vec2<f32>, d0: f32, chance: f32, salt: u32) -> f32 {
  let cell = 6.0 * d0;
  let c = vec2<i32>(floor(p / cell));
  let r = rand4(c, salt);
  if (r.x >= chance) { return 0.0; }
  let s = rand4(c, salt + 104729u);
  let centre = (vec2<f32>(c) + vec2<f32>(0.25) + 0.5 * r.yz) * cell;
  let q = p - centre;
  let ang = atan2(q.y, q.x);
  let radius = 0.5 * d0 * (1.0 + r.w) * (1.0 + 0.18 * sin(3.0 * ang + 6.28 * s.x) + 0.08 * sin(5.0 * ang + 6.28 * s.y));
  let x = length(q) / radius;
  if (x >= 1.0) { return 0.0; }
  return radius * mix(0.5, 1.1, s.z) * sqrt(1.0 - x * x);
}
// Value noise on a unit lattice, smooth (quintic), in -1..1.
fn vnoise(p: vec2<f32>, salt: u32) -> f32 {
  let i = vec2<i32>(floor(p));
  let f = p - floor(p);
  let u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  let a = rand4(i, salt).x;
  let b = rand4(i + vec2<i32>(1, 0), salt).x;
  let c = rand4(i + vec2<i32>(0, 1), salt).x;
  let d = rand4(i + vec2<i32>(1, 1), salt).x;
  return 2.0 * mix(mix(a, b, u.x), mix(c, d, u.x), u.y) - 1.0;
}
// The illustrative height at p (world x, z), metres; px is the pixel's
// footprint there, which fades each scale in from 2 to 6 pixels across.
// Scales smaller than min_size are left out (a shadow ray far from its
// start does not see them). Craters up to 19 m: LOLA holds the larger ones.
fn detail_height(p: vec2<f32>, px: f32, min_size: f32) -> f32 {
  var h = 0.0;
  var cell = 0.5;
  for (var k = 0u; k < 7u; k++) {
    let w = smoothstep(2.0 * px, 6.0 * px, 0.6 * cell);
    if (w > 0.0 && cell >= min_size) { h += w * craters(p, cell, 11u + k); }
    cell *= 2.0;
  }
  // hummocky regolith from 0.4 to 13 m, amplitude 3 % of the scale: RMS
  // slopes of a few degrees, as LOLA measures on the highlands at metre
  // baselines (Rosenburg et al. 2011, JGR 116, E02001)
  var size = 0.4;
  for (var k = 0u; k < 6u; k++) {
    let w = smoothstep(2.0 * px, 6.0 * px, size);
    if (w > 0.0 && size >= min_size) { h += w * 0.03 * size * vnoise(p / size, 401u + k); }
    size *= 2.0;
  }
  // clods and grain, 6 to 24 cm, seen only in the nearest metres
  var grain = 0.06;
  for (var k = 0u; k < 3u; k++) {
    let w = smoothstep(2.0 * px, 6.0 * px, grain);
    if (w > 0.0 && grain >= min_size) { h += w * 0.06 * grain * vnoise(p / grain, 601u + k); }
    grain *= 2.0;
  }
  // k = 0.006 (a little over the plains' Diviner median), q held at 9.39
  // below k = 0.02 as the app does; the chance per cell of each doubling
  let chances = array<f32, 4>(0.03, 0.021, 0.0058, 0.0003);
  var d0 = 0.08;
  for (var k = 0u; k < 4u; k++) {
    let w = smoothstep(2.0 * px, 6.0 * px, 2.0 * d0);
    if (w > 0.0 && 12.0 * d0 >= min_size) { h += w * rocks(p, d0, chances[k], 211u + k); }
    d0 *= 2.0;
  }
  return h;
}
`;

const PHOTOMETRY = /* wgsl */ `
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
`;

export const TERRAIN = /* wgsl */ `${COMMON}${DETAIL}${PHOTOMETRY}
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
fn albedo_at(m: vec3<f32>, sharpness: f32) -> vec3<f32> {
  let uv = latlon_uv(m);
  let g = seamless_grad(uv.x);
  let sharp = textureSampleGrad(tex_colour, samp_colour, uv, vec2<f32>(g.x, dpdx(uv.y)), vec2<f32>(g.y, dpdy(uv.y))).rgb;
  let broad = textureSampleLevel(tex_colour, samp_colour, uv, 6.0).rgb;
  let a = mix(broad, sharp, sharpness);
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
// The visible share of a disc whose centre stands x radii over an edge.
fn disc_share(x: f32) -> f32 {
  let c = clamp(x, -1.0, 1.0);
  return 1.0 - acos(c) / PI + c * sqrt(1.0 - c * c) / PI;
}
// The share of the Sun's disc the illustrative relief leaves on p: a march
// toward the Sun over the detail height, against the base surface's plane.
// The edge is soft by the Sun's own 0.53° and, where a pixel spans more
// than that seen from the occluder, by the pixel (so it never aliases).
fn detail_sunlit(p: vec2<f32>, h0: f32, base: vec3<f32>, l: vec3<f32>, px: f32) -> f32 {
  let up_part = dot(base, l);
  if (up_part <= 0.0) { return 0.0; }
  let along = l - base * up_part;
  let flat = length(along.xz);
  if (flat < 1e-4) { return 1.0; }
  let dir = along.xz / flat;
  let slope = up_part / length(along);
  let t0 = max(px, 0.02);
  let t1 = 160.0;
  var worst = -1.0;
  var at = t1;
  for (var i = 0; i < 24; i++) {
    let t = t0 * pow(t1 / t0, f32(i) / 23.0);
    // a scale whose relief subtends less than the Sun's disc from here is skipped
    let rise = (detail_height(p + dir * t, px, 0.08 * t) - h0 - t * slope) / t;
    if (rise > worst) { worst = rise; at = t; }
    if (worst > 0.02) { break; }
  }
  let radius = 0.004653 + 0.5 * px / at;
  return disc_share(-worst / radius);
}
fn shade(in: VertexOutput) -> vec4<f32> {
  let wp = in.world_position.xyz;
  let pw = wp - u_centre();
  let radial = normalize(pw);
  let m = normalize(to_moon(pw));
  // a faint mottling of the regolith's albedo (±6 %), 1 to 30 m, fading by the footprint
  let dist0 = length(wp - u_eye());
  let px0 = max(dist0 * u_pixel(), 0.002);
  let mottle = 1.0 + 0.04 * vnoise(wp.xz / 1.3, 701u) * smoothstep(2.0 * px0, 6.0 * px0, 1.3) + 0.04 * vnoise(wp.xz / 9.0, 702u) * smoothstep(2.0 * px0, 6.0 * px0, 9.0) + 0.03 * vnoise(wp.xz / 31.0, 703u) * smoothstep(2.0 * px0, 6.0 * px0, 31.0);
  let albedo = albedo_at(m, in.uv.y) * mottle;
  let base = normalize(mix(normalize(in.world_normal), relief_normal(m, radial), in.uv.y));
  let dist = length(wp - u_eye());
  let v = normalize(u_eye() - wp);
  // a pixel's footprint: across the view, and stretched along it on ground
  // seen at a grazing angle (the geometric mean of the two), so a scale
  // fades out before it would alias into speckles in depth
  let px = max(dist * u_pixel(), 0.002) / sqrt(max(dot(base, v), 0.02));
  let l = u_sun();
  // illustrative relief: its slope by central differences at the footprint
  let e = max(0.5 * px, 0.01);
  let h0 = detail_height(wp.xz, px, 0.0);
  let hx = detail_height(wp.xz + vec2<f32>(e, 0.0), px, 0.0) - h0;
  let hz = detail_height(wp.xz + vec2<f32>(0.0, e), px, 0.0) - h0;
  let n = normalize(base + vec3<f32>(-hx, 0.0, -hz) / e * u_detail());
  var lit = in.uv.x;
  if (lit > 0.001 && u_detail() > 0.0 && px < 8.0) { lit *= mix(1.0, detail_sunlit(wp.xz, h0, base, l, px), u_detail()); }
  let mu0 = dot(n, l);
  let mu = max(dot(n, v), 0.02);
  let alpha = acos(clamp(dot(l, v), -1.0, 1.0));
  let f = select(0.0, reflectance(mu0, mu, alpha), mu0 > 0.0) * lit;
  // fill: the Earth's light (bluish, physically small) and the light the
  // sunlit regolith around scatters into a shadow, a few per cent of it
  let around = reflectance(max(dot(radial, l), 0.04), mu, alpha);
  let earthshine = max(dot(n, u_earth_dir()), 0.0) * vec3<f32>(0.55, 0.7, 1.0) * u_fill() + vec3<f32>(u_bounce() * around * u_exposure());
  // diagnostic views (u_mode): 1 the geometric normal as colour, 2 a hard
  // hillshade of the geometric normal alone, 3 the shading normal's hillshade
  // (data and detail), 4 the sunlit share (baked and per pixel)
  let ng = normalize(in.world_normal);
  let probe = normalize(vec3<f32>(0.6, 0.5, 0.3));
  if (u_mode() > 3.5) { return vec4<f32>(vec3<f32>(lit), 1.0); }
  if (u_mode() > 2.5) { return vec4<f32>(vec3<f32>(pow(clamp(dot(n, probe), 0.0, 1.0), 3.0)), 1.0); }
  if (u_mode() > 1.5) { return vec4<f32>(vec3<f32>(pow(clamp(dot(ng, probe), 0.0, 1.0), 3.0)), 1.0); }
  if (u_mode() > 0.5) { return vec4<f32>(pow(0.5 + 0.5 * ng, vec3<f32>(4.0)), 1.0); }
  return vec4<f32>(albedo * (f * u_exposure() + earthshine), 1.0);
}
`;

export const SKY = /* wgsl */ `${COMMON}
fn shade(in: VertexOutput) -> vec4<f32> {
  let d = normalize(in.world_position.xyz - u_eye());
  let px = u_pixel();
  // the Sun: its disc (0.2666° radius), far over the exposure, and a small bloom
  let a = 2.0 * asin(clamp(length(d - u_sun()) * 0.5, 0.0, 1.0));
  let disc = smoothstep(0.004653 + px, 0.004653 - px, a);
  var c = vec3<f32>(1.0, 0.97, 0.92) * (disc * 60.0 + exp(-a / 0.003) * 0.6);
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
    let albedo = textureSampleLevel(tex_earth, samp_earth, uv, u_earth_lod()).rgb;
    let ci = dot(nw, u_sun());
    let earth = albedo * max(ci, 0.0) * u_earth_gain();
    c = mix(c, earth, smoothstep(px, -px, edge));
  }
  return vec4<f32>(c, 1.0);
}
`;
