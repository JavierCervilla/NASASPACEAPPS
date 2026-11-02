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
 * The crash report as plain English text (VENT-49): what the person copies
 * from the lost state and sends to us. A technical log, not an interface
 * text, so it is not translated. Pure.
 */
import type { Runs } from './run-store';
import type { Run } from './trail';

/** The device and mount facts of `run`, one per line. */
function factLines(run: Run): string[] {
  const { env, frames, memory } = run;
  const orUnknown = (value: string | number | null, unit = ''): string =>
    value === null || value === '' ? 'unknown' : `${value}${unit}`;
  return [`Tier: ${env.tier}`,
    `Left out (?onfoot=): ${env.leftOut || 'none'}`,
    `Page: ${env.page}`, `User agent: ${env.userAgent}`,
    `GPU: ${orUnknown(env.gpu)}`, `Pixel ratio: ${env.pixelRatio}`,
    `Viewport: ${env.viewport}`,
    `Canvas: ${orUnknown(frames.at(-1)?.canvas ?? null)}`,
    `CPU threads: ${orUnknown(env.threads)}`,
    `Device memory: ${orUnknown(env.deviceMemoryGb, ' GB')}`,
    `Battery: ${orUnknown(env.battery)}`,
    ...(memory ? [`GPU memory: ${memory.geometries} geometries, ` +
      `${memory.textures} textures`] : [])];
}

/** The steps of `run`, oldest first, with the seconds since the mount. */
function stepLines(run: Run): string[] {
  const dropped = run.dropped === 0 ? '' : ` (${run.dropped} earlier ` +
    `step${run.dropped === 1 ? '' : 's'} dropped)`;
  const steps = run.steps.map((s) => `  ${s.t.toFixed(1)} ${s.text}` +
    (s.count > 1 ? ` (x${s.count})` : ''));
  return [`Steps, in seconds since the view mounted${dropped}`,
    ...(steps.length > 0 ? steps : ['  (no steps)'])];
}

/** The last frames of `run`. */
function frameLines(run: Run): string[] {
  const frames = run.frames.map((f) => `  ${f.t.toFixed(1)} ${f.calls} ` +
    `${f.triangles} ${f.drawMs.toFixed(1)}`);
  return ['Last frames: seconds, draw calls, triangles, draw ms',
    ...(frames.length > 0 ? frames : ['  (no frames drawn)'])];
}

/** One run's section. */
function runLines(label: string, run: Run): string[] {
  return [`${label}, started ${run.startedAt}`, ...factLines(run), '',
    ...stepLines(run), '', ...frameLines(run)];
}

/** The report of `runs`, made at `at` (ISO). */
export function reportText(runs: Runs, at: string): string {
  const head = ['Ventana Lunar on-foot view report', `Made at ${at}`];
  const sections = [
    ...(runs.current ? [runLines('This run', runs.current)] : []),
    ...(runs.previous ? [runLines('Previous run', runs.previous)] : []),
  ];
  const body = sections.length > 0 ? sections.flatMap((s) => ['', ...s])
    : ['', 'No run was recorded: the on-foot view has not mounted in this ' +
      'session.'];
  return [...head, ...body].join('\n');
}
