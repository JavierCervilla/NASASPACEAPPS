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
 * The rocks are built in bands off the critical path (VENT-62): one slicer
 * job per diameter band, the mesh hidden until the last band has merged.
 * Built all at once in `rocksMesh` they took about 50 ms of one frame.
 */
import { describe, expect, it } from 'vitest';
import { measuredBands } from '../src/terrain/rocks-measured';
import { rocksMesh } from '../src/terrain/scene/props';
import type { Slicer } from '../src/terrain/scene/slicer';
import { createSunMask } from '../src/terrain/scene/sun-mask';

const SEED = 7;
const FLAT = () => 0;

/** A slicer that only keeps what it is given, to run it job by job. */
function recording(): { slicer: Slicer; jobs: { key: string; run: () => void }[] } {
  const jobs: { key: string; run: () => void }[] = [];
  const slicer: Slicer = {
    add: (key, _priority, run) => void jobs.push({ key, run }),
    clear: () => void (jobs.length = 0),
    busy: () => jobs.length > 0,
  };
  return { slicer, jobs };
}

describe('rocksMesh slicing', () => {
  it('queues one job per band and builds nothing while they wait', () => {
    const { slicer, jobs } = recording();
    const mesh = rocksMesh(SEED, FLAT, createSunMask(), { slicer, cap: 520 });
    const bands = measuredBands(SEED, FLAT).count;
    expect(bands).toBeGreaterThan(1);
    expect(jobs.map((j) => j.key)).toEqual(
      Array.from({ length: bands }, (_, i) => `rocks:${i}`));
    expect(mesh.visible).toBe(false);
    expect(mesh.geometry.getAttribute('position')).toBeUndefined();
  });

  it('keeps the mesh hidden until the last band has run, then shows the stones', () => {
    const { slicer, jobs } = recording();
    const mesh = rocksMesh(SEED, FLAT, createSunMask(), { slicer, cap: 520 });
    jobs.slice(0, -1).forEach((job) => {
      job.run();
      expect(mesh.visible).toBe(false);
    });
    jobs[jobs.length - 1]!.run();
    expect(mesh.visible).toBe(true);
    expect(mesh.geometry.getAttribute('position')!.count).toBeGreaterThan(0);
  });
});
