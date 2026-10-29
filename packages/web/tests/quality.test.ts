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
