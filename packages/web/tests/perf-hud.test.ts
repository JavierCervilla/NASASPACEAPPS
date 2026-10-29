// Ported from GAMESTUDIO's Web starter (studio/engines/web/scaffold/packages/client/tests/perf-hud.test.ts).
import { describe, expect, it } from 'vitest';
import { debugHash, FrameMeter, parseDebugHash, readout } from '../src/devtools/perf-hud';

describe('perf hud', () => {
  it('reads the tier and Spector from the address hash', () => {
    const flags = parseDebugHash('#stats-low-spector-bogus');
    expect(flags).toEqual({ tier: 'low', spector: true });
  });

  it('reads an empty hash as nothing forced', () => {
    expect(parseDebugHash('')).toEqual({ tier: null, spector: false });
  });

  it('writes a hash that reads back the same', () => {
    const hash = debugHash({ tier: 'medium', spector: true });
    expect(hash).toBe('stats-medium-spector');
    expect(parseDebugHash(`#${hash}`)).toEqual({ tier: 'medium', spector: true });
  });

  it('averages frames over half a second and keeps the slowest one', () => {
    const meter = new FrameMeter(0.5);
    expect(meter.sample(0.1)).toBeNull();
    expect(meter.sample(0.1)).toBeNull();
    expect(meter.sample(0.1)).toBeNull();
    expect(meter.sample(0.1)).toBeNull();
    const reading = meter.sample(0.2);
    expect(reading).not.toBeNull();
    expect(reading!.fps).toBeCloseTo(5 / 0.6);
    expect(reading!.frameMs).toBeCloseTo(120);
    expect(reading!.worstMs).toBeCloseTo(200);
    // The window starts over after a reading.
    expect(meter.sample(0.1)).toBeNull();
  });

  it('shows fps, draw calls, triangles, texture memory and the GPU', () => {
    const text = readout(
      { fps: 59.6, frameMs: 16.78, worstMs: 33.2 },
      { calls: 42, triangles: 125_400, pixelRatio: 1.5, width: 1080, height: 2400, textureMB: 87.4, textures: 12 },
      { tierLabel: 'Medium', gpu: 'PowerVR D-Series DXT-48-1536' },
    );
    expect(text).toContain('60 fps');
    expect(text).toContain('16.8 ms');
    expect(text).toContain('slowest 33 ms');
    expect(text).toContain('quality Medium · scale 1.50 · 1080×2400');
    expect(text).toContain('42 draw calls');
    expect(text).toContain('125k triangles');
    expect(text).toContain('textures 87 MB (12)');
    expect(text).toContain('PowerVR D-Series DXT-48-1536');
  });

  it('shows frame rate and the GPU without a renderer', () => {
    const text = readout({ fps: 120, frameMs: 8.33, worstMs: 9 }, null, { tierLabel: 'High', gpu: '' });
    expect(text.split('\n')).toEqual(['120 fps · 8.3 ms · slowest 9 ms', 'quality High', 'no renderer attached', 'unknown GPU']);
  });

  it('leaves out the texture line when the adapter does not estimate it', () => {
    const text = readout(
      { fps: 60, frameMs: 16.7, worstMs: 17 },
      { calls: 3, triangles: 8_000, pixelRatio: 1, width: 800, height: 600 },
      { tierLabel: 'Low', gpu: 'Apple M2' },
    );
    expect(text).not.toContain('textures');
  });
});
