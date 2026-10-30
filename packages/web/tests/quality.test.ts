import { describe, expect, it } from 'vitest';
import { detectTier, gpuName, settingsFor, type DeviceHints } from '../src/lib/quality';

const LAPTOP: DeviceHints = { gpu: 'ANGLE (Intel, Mesa Intel(R) UHD Graphics 620)', coarsePointer: false, cores: 8 };

describe('quality tiers', () => {
  it('starts a desktop with enough cores at high', () => {
    expect(detectTier(LAPTOP)).toBe('high');
  });

  it('starts a software renderer at low', () => {
    expect(detectTier({ ...LAPTOP, gpu: 'Google SwiftShader' })).toBe('low');
  });

  it('lets the query string or the hash force a tier', () => {
    expect(detectTier(LAPTOP, '?quality=low')).toBe('low');
    expect(detectTier(LAPTOP, '', '#stats-medium-spector')).toBe('medium');
    expect(detectTier(LAPTOP, '?quality=ultra')).toBe('high');
  });

  it('starts a desktop with fewer than 4 cores at medium', () => {
    expect(detectTier({ ...LAPTOP, cores: 3 })).toBe('medium');
    expect(detectTier({ ...LAPTOP, cores: 4 })).toBe('high');
  });

  it('starts a phone with a capable GPU at medium', () => {
    const phone = { coarsePointer: true, cores: 4 };
    expect(detectTier({ ...phone, gpu: 'Apple GPU' })).toBe('medium');
    expect(detectTier({ ...phone, gpu: 'Adreno (TM) 740' })).toBe('medium');
  });

  it('starts a weak phone at low, or at medium with 8 cores', () => {
    const weak = { gpu: 'Mali-G52 MC2', coarsePointer: true };
    expect(detectTier({ ...weak, cores: 7 })).toBe('low');
    expect(detectTier({ ...weak, cores: 8 })).toBe('medium');
  });

  it('forces a tier only with a whole tier word in the hash', () => {
    expect(detectTier(LAPTOP, '', '#stats-lowish')).toBe('high');
  });

  it('turns antialiasing on only at high', () => {
    expect(settingsFor('low').antialias).toBe(false);
    expect(settingsFor('medium').antialias).toBe(false);
    expect(settingsFor('high').antialias).toBe(true);
  });

  it('caps the pixel ratio lower on lower tiers', () => {
    expect(settingsFor('low').maxPixelRatio).toBeLessThan(settingsFor('high').maxPixelRatio);
  });

  it('names the GPU through the unmasked renderer when exposed', () => {
    const gl = {
      RENDERER: 1,
      getExtension: () => ({ UNMASKED_RENDERER_WEBGL: 2 }),
      getParameter: (name: number) => (name === 2 ? 'Apple M2' : 'WebKit WebGL'),
    };
    expect(gpuName(gl)).toBe('Apple M2');
    expect(gpuName(null)).toBe('');
  });
});
