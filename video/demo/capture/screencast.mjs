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
 * Records a page through the DevTools screencast: one JPEG per compositor
 * frame with its swap time, then ffmpeg turns the frames into a constant
 * 30 fps H.264 file. Sharper than Playwright's recordVideo, which encodes
 * VP8 at a low bitrate.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Starts the screencast of `page` into `dir`. Returns `stop()`, which ends
 * it and resolves to the frames' swap times (seconds since the epoch).
 */
export async function startScreencast(page, { dir, width, height, quality = 92 }) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const cdp = await page.context().newCDPSession(page);
  const times = [];
  const writes = [];
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    const file = join(dir, `${String(times.length).padStart(6, '0')}.jpg`);
    times.push(metadata.timestamp);
    writes.push(Promise.resolve().then(() => writeFileSync(file, Buffer.from(data, 'base64'))));
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality, maxWidth: width, maxHeight: height, everyNthFrame: 1 });
  return async function stop() {
    await cdp.send('Page.stopScreencast');
    await Promise.all(writes);
    return { times };
  };
}

/**
 * Encodes the frames in `dir` to `out` at a constant `fps`: output frame k
 * shows the last screencast frame swapped at or before k / fps, laid out as
 * a numbered sequence of links (the concat demuxer's per-image durations
 * drift). Returns the first frame's time, the footage's zero.
 */
export function encodeFrames({ dir, times, end, out, fps = 30 }) {
  const seq = join(dir, 'seq');
  mkdirSync(seq, { recursive: true });
  const name = (i) => `${String(i).padStart(6, '0')}.jpg`;
  const count = Math.ceil((end - times[0]) * fps);
  let shown = 0;
  for (let k = 0; k < count; k += 1) {
    const t = times[0] + k / fps;
    while (shown + 1 < times.length && times[shown + 1] <= t) shown += 1;
    symlinkSync(join('..', name(shown)), join(seq, name(k)));
  }
  const args = ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', join(seq, '%06d.jpg'),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '14',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out];
  const run = spawnSync('ffmpeg', args, { stdio: 'inherit' });
  if (run.status !== 0) throw new Error(`ffmpeg failed (${run.status})`);
  return times[0];
}
