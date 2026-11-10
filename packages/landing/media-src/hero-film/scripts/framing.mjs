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
 * Prints the hero film's camera path as built (altitude, distance behind the
 * target, pitch, every second) and, for the last frame of each look, where
 * the Sun and the Earth land on the screen against the brief's framing: the
 * Earth out of the headline's box (left 45 % x 15-50 % on desktop) and the
 * Sun out of the calm bottom-right corner. Reads the same path the
 * composition draws (scene/path.ts) and the same frame (scene/frame.ts).
 *
 *   node packages/landing/media-src/hero-film/scripts/framing.mjs
 */
import { readFileSync } from 'node:fs';
import { frameOf, horizontal, norm, project, sub } from '../../moon-scene/scene/frame.ts';
import { DESCENT_S, LOOKS, shotAt } from '../scene/path.ts';

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const frame = frameOf(read('../media/moon/moon-im2-20261215T0500Z.json'));
const km = (m) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m.toFixed(1)} m`);

process.stdout.write('t (s)  altitude     behind      pitch   speed\n');
for (let t = 0; t <= DESCENT_S + 1e-9; t += 1) {
  const s = shotAt(frame, t, LOOKS.desktop);
  const s2 = shotAt(frame, t + 0.05, LOOKS.desktop);
  const behind = Math.hypot(s.eye[0], s.eye[2]);
  const speed = Math.hypot(...sub(s2.eye, s.eye)) / 0.05;
  process.stdout.write(`${t.toFixed(0).padStart(5)}  ${km(s.altitude).padStart(10)}  ${km(behind).padStart(10)}  ${s.pitchDeg.toFixed(1).padStart(6)}°  ${km(speed)}/s\n`);
}

const sun = horizontal(frame.sun);
const earth = horizontal(sub(frame.earth, [0, 2, 0]));
process.stdout.write(`\nfrom 2 m over the target: Sun el ${sun.elDeg.toFixed(2)}° az ${sun.azDeg.toFixed(2)}°, Earth el ${earth.elDeg.toFixed(2)}° az ${earth.azDeg.toFixed(2)}°\n`);
for (const [name, look, aspect] of [['desktop 16:9', LOOKS.desktop, 16 / 9], ['phone 9:16', LOOKS.phone, 9 / 16]]) {
  const shot = shotAt(frame, DESCENT_S, look);
  const pS = project(shot, frame.sun, aspect);
  const pE = project(shot, norm(sub(frame.earth, shot.eye)), aspect);
  const pH = project(shot, [Math.sin((look.headingDeg * Math.PI) / 180), 0, -Math.cos((look.headingDeg * Math.PI) / 180)], aspect);
  const pct = (p) => (p ? `x ${(100 * p.x).toFixed(1)} %, y ${(100 * p.y).toFixed(1)} %` : 'behind');
  const inBox = pE && pE.x < 0.45 && pE.y > 0.15 && pE.y < 0.5;
  process.stdout.write(`${name}: heading ${look.headingDeg}°, pitch ${look.pitchEndDeg}°; level line at y ${(100 * pH.y).toFixed(1)} %; Sun ${pct(pS)}; Earth ${pct(pE)}${aspect > 1 ? (inBox ? ' INSIDE the headline box' : ' (outside the headline box)') : ''}\n`);
}
