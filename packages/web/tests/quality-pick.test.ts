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
import { probeDevice } from '../src/globe/device-probe';
import { qualityPicker, type PickSources } from '../src/globe/quality-pick';
import { EMPTY_PROFILE, type GpuProfile } from '../src/lib/gpu-profile';

const PROFILE: GpuProfile = { ...EMPTY_PROFILE, maxTextureSize: 4096 };

/** Sources over a mutable address and pointer, counting the probes. */
function sources(gpu: string) {
  const state = { search: '', hash: '', coarse: false, probes: 0 };
  const picks: PickSources = {
    probeDevice: () => {
      state.probes++;
      return { gpu, profile: PROFILE };
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

  it('keeps the profile of that one probe, for any number of reads', () => {
    const { state, picks } = sources('Adreno (TM) 740');
    const pick = qualityPicker(picks);
    expect(pick.gpuProfile()).toBe(PROFILE);
    pick(false);
    expect(pick.device()).toEqual({ gpu: 'Adreno (TM) 740', profile: PROFILE });
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

describe('the page probe', () => {
  /** A context that logs what is read of it, and when it is given back. */
  function loggingContext() {
    const log: string[] = [];
    const lose = { loseContext: () => log.push('lose') };
    const gl = {
      RENDERER: 1,
      MAX_TEXTURE_SIZE: 2,
      getSupportedExtensions: () => {
        log.push('extensions');
        return ['WEBGL_compressed_texture_etc'];
      },
      getExtension: (name: string) => {
        log.push(name);
        return name === 'WEBGL_lose_context' ? lose : null;
      },
      getParameter: (name: number) => (name === 1 ? 'Mali-G715' : 8192),
    };
    return { gl, log };
  }

  it('reads the name and the profile before giving the context back', () => {
    const { gl, log } = loggingContext();
    const options: unknown[] = [];
    const device = probeDevice((attributes) => {
      options.push(attributes);
      return gl as never;
    });
    expect(device.gpu).toBe('Mali-G715');
    expect(device.profile.textureFormats.etc2).toBe(true);
    expect(device.profile.maxTextureSize).toBe(8192);
    expect(log.at(-1)).toBe('lose');
    expect(log.indexOf('extensions')).toBeLessThan(log.indexOf('lose'));
    expect(options).toEqual([{ powerPreference: 'low-power' }]);
  });

  it('answers an empty device without a context', () => {
    expect(probeDevice(() => null)).toEqual({ gpu: '', profile: EMPTY_PROFILE });
  });
});
