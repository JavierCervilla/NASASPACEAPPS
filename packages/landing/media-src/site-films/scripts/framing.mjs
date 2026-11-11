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
 * Prints a site film's plan as built (VENT-115): the sky at the target and
 * which light the film takes (scene/light.ts), the heading rule applied, the
 * camera path every half second (altitude over the target, clearance over
 * the ground under the eye, pitch, speed, exposure) and, for the last frame
 * of each look, where the Sun and the Earth land on the screen. It also
 * marches the film's own relief (moon-scene's field) toward the Sun and the
 * Earth from the eye, as the app's LOLA profile was marched, so a site where
 * the two disagree is seen before it is rendered. Fails when
 * the eye comes closer than 1 m to the ground before the end. Reads the
 * same path and light the composition draws.
 *
 *   node packages/landing/media-src/site-films/scripts/framing.mjs SITE_ID
 */
import { readFileSync } from 'node:fs';
import { frameOf, project, sub } from '../../moon-scene/scene/frame.ts';
import { heightFast, heightSmooth, loadField, planeOf } from '../../moon-scene/scripts/field.mjs';
import { RADIUS_M, SITES } from '../../moon-scene/scripts/sites.mjs';
import { NIGHT_EXPOSURE, lightAt, lightCaseOf, nightEarth, seesEarth, skyOf, startHeading } from '../scene/light.ts';
import { LOOKS, MOVE_S, shotAt } from '../scene/path.ts';
import { INSTANT, sceneKeyOf, tagOf } from './sites.mjs';

const siteId = process.argv[2];
const key = sceneKeyOf(siteId);
const world = JSON.parse(readFileSync(new URL(`../${siteId}/media/moon/moon-${key}-${tagOf(INSTANT)}.json`, import.meta.url), 'utf8'));
const frame = frameOf(world);
const sky = skyOf(world);
const field = loadField(SITES[key]);
const heading = startHeading(sky);
const f2 = (x) => x.toFixed(2);
const km = (m) => (Math.abs(m) >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${m.toFixed(1)} m`);
const out = (line) => process.stdout.write(`${line}\n`);

/** Moon-frame point of a world position (metres, origin on the target's ground). */
const toMoon = (w) => [0, 1, 2].map((k) => w[0] * frame.east[k] + (w[1] + frame.radiusM + frame.groundM) * frame.up[k] - w[2] * frame.north[k]);

/** Metres from the eye down to the field's ground under it. */
function clearance(eye) {
  const m = toMoon(eye);
  const r = Math.hypot(...m);
  const pl = planeOf(m[0] / r, m[1] / r, m[2] / r);
  return r - (frame.radiusM + (pl ? heightSmooth(field, pl[0], pl[1]) : 0));
}

/** The field's horizon from the eye toward `azDeg`, degrees: 20 m steps to 6 km, then 80 m to 200 km, as the app's profile. */
function fieldHorizon(azDeg) {
  const eye = toMoon([0, 2, 0]);
  const up = frame.up;
  const az = (azDeg * Math.PI) / 180;
  let best = -90;
  for (let d = 20; d < 200_000; d += d < 6000 ? 20 : 80) {
    const th = d / RADIUS_M;
    const dir = [0, 1, 2].map((k) => Math.cos(th) * up[k] + Math.sin(th) * (Math.cos(az) * frame.north[k] + Math.sin(az) * frame.east[k]));
    const pl = planeOf(...dir);
    const p = dir.map((x) => x * (RADIUS_M + (pl ? heightFast(field, pl[0], pl[1]) : 0)));
    const v = p.map((x, k) => x - eye[k]);
    best = Math.max(best, (Math.asin((v[0] * up[0] + v[1] * up[1] + v[2] * up[2]) / Math.hypot(...v)) * 180) / Math.PI);
  }
  return best;
}

/** The share of the Sun's disc (0.2666° radius) over a horizon. */
function discOver(elDeg, horizonDeg) {
  const x = Math.max(-1, Math.min(1, (elDeg - horizonDeg) / 0.2666));
  return 1 - Math.acos(x) / Math.PI + (x * Math.sqrt(1 - x * x)) / Math.PI;
}

const t = sky.terrain;
out(`${siteId} at ${world.instant}`);
out(`Sun   el ${f2(sky.sun.elDeg)}° az ${f2(sky.sun.azDeg)}°; LOLA horizon there ${f2(t.sunHorizonDeg)}°, ${(100 * t.sunDisc).toFixed(0)} % of the disc clears it`);
out(`Earth el ${f2(sky.earth.elDeg)}° az ${f2(sky.earth.azDeg)}°; LOLA horizon there ${f2(t.earthHorizonDeg)}°, ${seesEarth(sky) ? 'over it' : 'under it'}`);
const sunField = fieldHorizon(sky.sun.azDeg);
const earthField = fieldHorizon(sky.earth.azDeg);
out(`film's relief from the eye: horizon ${f2(sunField)}° toward the Sun (${(100 * discOver(sky.sun.elDeg, sunField)).toFixed(0)} % of the disc clears it), ${f2(earthField)}° toward the Earth (${sky.earth.elDeg > earthField ? 'over it' : 'under it'})`);
out(`heading ${f2(heading)}°: the ${sky.sun.elDeg > -2 ? `Sun's azimuth (its elevation ${f2(sky.sun.elDeg)}° > -2°)` : `Earth's azimuth (the Sun ${f2(sky.sun.elDeg)}° <= -2°)`}`);
out(`light: ${lightCaseOf(sky)}${lightCaseOf(sky) === 'sunlit' ? '' : `, ends on the app's night: exposure ${NIGHT_EXPOSURE.toFixed(2)}, the Earth's light ${nightEarth(sky).toFixed(3)} of the key`}`);
out('\n  t (s)    altitude   clearance    pitch      speed   exposure    fill    bounce   night');
let lowest = Infinity;
for (let i = 0; i <= MOVE_S * 30; i++) {
  const s = shotAt(frame, i / 30, LOOKS.wide, heading);
  const c = clearance(s.eye);
  if (i < MOVE_S * 30) lowest = Math.min(lowest, c);
  if (i % 15) continue;
  const s2 = shotAt(frame, i / 30 + 0.01, LOOKS.wide, heading);
  const l = lightAt(sky, s.altitude);
  const speed = Math.hypot(...sub(s2.eye, s.eye)) / 0.01;
  out(`${(i / 30).toFixed(1).padStart(7)}  ${km(s.altitude).padStart(10)}  ${km(c).padStart(10)}  ${s.pitchDeg.toFixed(1).padStart(6)}°  ${km(speed).padStart(8)}/s  ${l.exposure.toFixed(1).padStart(8)}  ${l.fill.toFixed(4)}  ${l.bounce.toFixed(5)}  ${l.night ? (l.night.floor / (0.06875 * 0.3)).toFixed(2) : '-'}`);
}
for (const [name, look, aspect] of [['wide 16:9', LOOKS.wide, 16 / 9], ['phone 9:16', LOOKS.phone, 9 / 16]]) {
  const s = shotAt(frame, MOVE_S, look, heading);
  const pct = (p) => (p && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1 ? `x ${(100 * p.x).toFixed(1)} %, y ${(100 * p.y).toFixed(1)} %` : 'out of frame');
  out(`${name}: eye ${f2(s.eye[1])} m up, pitch ${f2(s.pitchDeg)}°, vertical field ${look.fovYDeg}°; Sun ${pct(project(s, frame.sun, aspect))}; Earth ${pct(project(s, sub(frame.earth, s.eye), aspect))}`);
}
out(`\nlowest clearance before the end: ${km(lowest)}`);
if (lowest < 1) {
  process.stderr.write('the eye comes under 1 m of the ground before the end\n');
  process.exit(1);
}
