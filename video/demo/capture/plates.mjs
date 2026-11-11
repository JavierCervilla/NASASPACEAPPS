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
 * Renders the opening's plates (plates.tsx) on the real Moon: each shot of
 * each cut at twice the size, scaled down to 1920 x 1080 (the terrain
 * module's supersampling) and encoded to media/plates/<id>-<cut>.mp4, then
 * scanned for frame-to-frame jumps (a frame that changes far more than its
 * neighbours do).
 *
 *   node video/demo/capture/plates.mjs [id-cut ...]
 *
 * Needs the two worlds built first (README.md, «The opening»).
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DEMO = fileURLToPath(new URL('../', import.meta.url));
const RAEA = `${process.env.HOME}/.gamestudio/raea/raea/bin/raea`;
const ENV = { ...process.env, HOME: `${process.env.HOME}/.gamestudio/raea/home`, RAEA_OFFLINE: '1' };
const ALL = [
  'dive-hero', 'artemis-hero', 'skim-hero', 'earthset-hero', 'pullback-hero', 'reveal-hero', 'drift-hero',
  'dive-submission', 'skim-submission', 'earthset-submission', 'reveal-submission', 'drift-submission',
];

/** Runs a command in the demo folder, failing loudly. */
function run(cmd, args, env = process.env) {
  const r = spawnSync(cmd, args, { cwd: DEMO, env, stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed (${r.status})`);
  return r.stdout;
}

/** Mean absolute difference between consecutive frames, from ffmpeg's scene score at a small size. */
function jumps(file) {
  const out = spawnSync('ffmpeg', ['-i', file, '-vf', 'scale=320:-1,select=gte(scene\\,0),metadata=print', '-f', 'null', '-'],
    { encoding: 'utf8' }).stderr;
  const scores = [...out.matchAll(/lavfi\.scene_score=([0-9.]+)/g)].map((m) => Number(m[1]));
  const sorted = [...scores].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  const worst = scores.reduce((best, s, i) => (s > best.s ? { s, i } : best), { s: 0, i: -1 });
  return { median, worst };
}

function main() {
  const names = process.argv.length > 2 ? process.argv.slice(2) : ALL;
  mkdirSync(`${DEMO}media/plates`, { recursive: true });
  for (const name of names) {
    const dir = `out/plates/${name}`;
    mkdirSync(`${DEMO}${dir}`, { recursive: true });
    const t0 = Date.now();
    run(RAEA, ['render', 'plates.tsx', '--composition', `${name}-2x`, '-o', `${dir}/`], ENV);
    const frames = readdirSync(`${DEMO}${dir}`).filter((f) => f.endsWith('.png')).length;
    const out = `media/plates/${name}.mp4`;
    run('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '30', '-i', `${dir}/frame-%05d.png`,
      '-vf', 'scale=1920:1080:flags=lanczos', '-c:v', 'libx264', '-preset', 'slow', '-crf', '10', '-tune', 'grain',
      '-pix_fmt', 'yuv420p', out]);
    const j = jumps(`${DEMO}${out}`);
    process.stdout.write(`${name}: ${frames} frames, ${((Date.now() - t0) / 1000).toFixed(0)} s; scene change median ${j.median.toFixed(4)}, worst ${j.worst.s.toFixed(4)} at frame ${j.worst.i}\n`);
  }
}

main();
