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
 * One WebGL probe per page (VENT-91): the GPU's name is read once, by the
 * first pick, while the address (`?quality=`, a hash word) and the pointer
 * are read again on every pick, so a forced tier still decides.
 */
import { describe, expect, it } from 'vitest';
import { qualityPicker, type PickSources } from '../src/globe/quality-pick';

/** Sources over a mutable address and pointer, counting the probes. */
function sources(gpu: string) {
  const state = { search: '', hash: '', coarse: false, probes: 0 };
  const picks: PickSources = {
    probeGpu: () => {
      state.probes++;
      return gpu;
    },
    hints: (name) => ({ gpu: name, coarsePointer: state.coarse, cores: 8 }),
    address: () => ({ search: state.search, hash: state.hash }),
  };
  return { state, picks };
}

describe('the quality picker', () => {
  it('probes the device once for any number of picks', () => {
    const { state, picks } = sources('ANGLE (Apple, Apple M2, OpenGL)');
    const pick = qualityPicker(picks);
    expect(state.probes).toBe(0);
    expect([pick(false), pick(true), pick(false)].map((q) => q.tier))
      .toEqual(['high', 'medium', 'high']);
    expect(state.probes).toBe(1);
  });

  it('reads ?quality= and the hash on every pick', () => {
    const { state, picks } = sources('SwiftShader');
    const pick = qualityPicker(picks);
    expect(pick(false).tier).toBe('low');
    state.search = '?quality=high';
    expect(pick(false).tier).toBe('high');
    state.search = '';
    state.hash = '#medium';
    expect(pick(false).tier).toBe('medium');
    state.hash = '';
    expect(pick(false).tier).toBe('low');
    expect(state.probes).toBe(1);
  });

  it('reads the pointer on every pick, with the probed GPU', () => {
    const { state, picks } = sources('Adreno (TM) 740');
    const pick = qualityPicker(picks);
    expect(pick(false).tier).toBe('high');
    state.coarse = true;
    expect(pick(false).tier).toBe('medium');
    expect(state.probes).toBe(1);
  });

  it('keeps an empty GPU name and does not probe again for it', () => {
    const { state, picks } = sources('');
    const pick = qualityPicker(picks);
    state.coarse = true;
    expect(pick(true).tier).toBe('low');
    expect(pick(true).tier).toBe('low');
    expect(state.probes).toBe(1);
  });

  it('gives each picker its own probe', () => {
    const one = sources('SwiftShader');
    const two = sources('SwiftShader');
    qualityPicker(one.picks)(false);
    qualityPicker(two.picks)(false);
    expect([one.state.probes, two.state.probes]).toEqual([1, 1]);
  });
});
