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
 * The clod layer on a new point (VENT-67 on VENT-69's one renderer): another
 * seed frees the old raster's texture and bakes the new point's.
 */
import { describe, expect, it } from 'vitest';
import { ClodLayer } from '../src/terrain/scene/clod-layer';
import { createClodUniforms } from '../src/terrain/scene/clod-glsl';
import type { Slicer } from '../src/terrain/scene/slicer';

function make() {
  const jobs: (() => void)[] = [];
  const slicer = { add: (_id: string, _p: number, job: () => void) => {
    jobs.push(job);
  } } as unknown as Slicer;
  const uniforms = createClodUniforms();
  const notes: string[] = [];
  const layer = new ClodLayer({ seed: 1, uniforms, slicer,
    note: (t) => notes.push(t) });
  const drain = (): void => {
    while (jobs.length) jobs.shift()!();
  };
  return { layer, uniforms, notes, drain };
}

describe('the clod layer on a new point', () => {
  it('bakes once, and switches the shader on', () => {
    const { layer, uniforms, drain } = make();
    layer.start();
    drain();
    expect(uniforms.uClodOn.value).toBe(1);
    expect(uniforms.uClod.value).not.toBeNull();
  });

  it('frees the old texture and bakes the new seed\'s', () => {
    const { layer, uniforms, notes, drain } = make();
    layer.start();
    drain();
    const first = uniforms.uClod.value!;
    let freed = 0;
    first.addEventListener('dispose', () => freed++);
    layer.reseed(2);
    expect(freed).toBe(1);
    expect(uniforms.uClodOn.value).toBe(0);
    layer.start();
    drain();
    expect(uniforms.uClod.value).not.toBe(first);
    expect(uniforms.uClodOn.value).toBe(1);
    expect(notes.filter((t) => t === 'clod relief baked')).toHaveLength(2);
  });

  it('keeps its raster for the same seed', () => {
    const { layer, uniforms, drain } = make();
    layer.start();
    drain();
    const first = uniforms.uClod.value;
    layer.reseed(1);
    layer.start();
    expect(uniforms.uClod.value).toBe(first);
  });
});
