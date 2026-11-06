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

// The globe's programs are compiled before the frame that needs them (VENT-93), with three's `compileAsync`, where
// the browser has KHR_parallel_shader_compile: frames wait meanwhile, so no frame finishes a compile on the spot (the
// VENT-80 baseline measured 1.47 s of shader info logs on a phone profile). Without the extension `compileAsync` only
// waits a timer, so the gate does nothing and the first frame is as early as before.
import { describe, expect, it, vi } from 'vitest';
import { COMPILE_GIVE_UP_MS, CompileHold } from '../src/globe/compile-gate';

function gate(parallel: boolean, compileAsync: () => Promise<unknown>) {
  const invalidate = vi.fn();
  let expire: () => void = () => undefined;
  const wait = vi.fn((ms: number) => {
    expect(ms).toBe(COMPILE_GIVE_UP_MS);
    return new Promise<void>((resolve) => { expire = resolve; });
  });
  return { invalidate, wait, expire: () => expire(), gate: new CompileHold({ parallel, compileAsync, invalidate, wait }) };
}

describe('the globe compile gate', () => {
  it('without the parallel extension compiles nothing ahead and never holds a frame', async () => {
    const compileAsync = vi.fn(() => Promise.resolve());
    const { gate: g, invalidate } = gate(false, compileAsync);
    await g.compile();
    expect(compileAsync).not.toHaveBeenCalled();
    expect(g.open()).toBe(true);
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('with it, holds the frames until the programs are ready, then asks one', async () => {
    let ready: () => void = () => undefined;
    const compileAsync = vi.fn(() => new Promise<void>((resolve) => { ready = resolve; }));
    const { gate: g, invalidate } = gate(true, compileAsync);
    const done = g.compile();
    expect(compileAsync).toHaveBeenCalledTimes(1);
    expect(g.open()).toBe(false);
    ready();
    await done;
    expect(g.open()).toBe(true);
    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it('stays shut until every compile asked has finished', async () => {
    const pending: (() => void)[] = [];
    const { gate: g } = gate(true, () => new Promise<void>((resolve) => pending.push(resolve)));
    const first = g.compile();
    const second = g.compile();
    pending[0]?.();
    await first;
    expect(g.open()).toBe(false);
    pending[1]?.();
    await second;
    expect(g.open()).toBe(true);
  });

  it('gives up on a compile that never ends (a lost context) and lets the frames draw', async () => {
    const { gate: g, invalidate, expire } = gate(true, () => new Promise(() => undefined));
    const done = g.compile();
    expect(g.open()).toBe(false);
    expire();
    await done;
    expect(g.open()).toBe(true);
    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it('starts the scene\'s compile on the first frame asked, and draws once it is done', async () => {
    let ready: () => void = () => undefined;
    const compileAsync = vi.fn(() => new Promise<void>((resolve) => { ready = resolve; }));
    const { gate: g, invalidate } = gate(true, compileAsync);
    const draw = vi.fn(() => false);
    const frame = g.gated(draw);
    expect(compileAsync).not.toHaveBeenCalled();
    expect(frame(0)).toBe(false);
    expect(compileAsync).toHaveBeenCalledTimes(1);
    expect(draw).not.toHaveBeenCalled();
    ready();
    await vi.waitFor(() => expect(invalidate).toHaveBeenCalledTimes(1));
    frame(0);
    expect(draw).toHaveBeenCalledTimes(1);
    expect(compileAsync).toHaveBeenCalledTimes(1);
  });

  it('without the extension draws the first frame at once', () => {
    const { gate: g } = gate(false, () => Promise.resolve());
    const draw = vi.fn(() => false);
    g.gated(draw)(0);
    expect(draw).toHaveBeenCalledTimes(1);
  });

  it('opens again when the compile throws', async () => {
    const { gate: g } = gate(true, () => { throw new Error('context lost'); });
    await g.compile();
    expect(g.open()).toBe(true);
  });
});
