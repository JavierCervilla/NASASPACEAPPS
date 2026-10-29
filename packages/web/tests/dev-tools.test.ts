import { describe, expect, it } from 'vitest';
import { Breadcrumbs } from '../src/devtools/breadcrumbs';
import { DevTools } from '../src/devtools/dev-tools';
import type { HudView, RenderStats } from '../src/devtools/perf-hud';
import { threeAdapter, type RendererAdapter, type ThreeRendererLike } from '../src/devtools/renderer';

interface FakeView extends HudView {
  readonly samples: (RenderStats | null)[];
  readonly errors: string[];
}

function fakeView(): FakeView {
  const samples: (RenderStats | null)[] = [];
  const errors: string[] = [];
  return { samples, errors, sample: (_dt, stats) => void samples.push(stats), error: (message) => void errors.push(message) };
}

function tools(view: FakeView, hash = ''): DevTools {
  return new DevTools({
    tier: 'high',
    gpu: 'Test GPU',
    hash,
    crumbs: new Breadcrumbs({ storage: null, now: () => 0 }),
    view: () => view,
  });
}

const READING = { calls: 7, triangles: 4_096, pixelRatio: 2, width: 1600, height: 1200 };

function fakeAdapter(): RendererAdapter & { resets: number; estimates: number } {
  const adapter = {
    canvas: new EventTarget(),
    resets: 0,
    estimates: 0,
    read: () => READING,
    reset: () => void (adapter.resets += 1),
    textureBytes: () => {
      adapter.estimates += 1;
      return 8_000_000;
    },
  };
  return adapter;
}

describe('dev tools', () => {
  it('reads frames without any renderer', () => {
    const view = fakeView();
    const devTools = tools(view);
    devTools.frame(1 / 60);
    devTools.frame(1 / 60);
    expect(view.samples).toEqual([null, null]);
    expect(devTools.crumbs.current).toEqual(['0.0s boot high Test GPU', '0.0s frame 1', '0.0s frame 2']);
  });

  it('reads the attached renderer once per frame and resets its totals', () => {
    const view = fakeView();
    const devTools = tools(view);
    const adapter = fakeAdapter();
    devTools.attach(adapter);
    devTools.frame(1 / 60);
    expect(view.samples).toEqual([{ ...READING, textureMB: 8 }]);
    expect(adapter.resets).toBe(1);
  });

  it('estimates texture memory only every 30 frames', () => {
    const view = fakeView();
    const devTools = tools(view);
    const adapter = fakeAdapter();
    devTools.attach(adapter);
    for (let i = 0; i < 31; i += 1) devTools.frame(1 / 60);
    expect(adapter.estimates).toBe(2);
    expect(view.samples.at(-1)?.textureMB).toBe(8);
  });

  it('reports a lost WebGL context of the attached canvas', () => {
    const view = fakeView();
    const devTools = tools(view);
    const adapter = fakeAdapter();
    devTools.attach(adapter);
    adapter.canvas.dispatchEvent(new Event('webglcontextlost'));
    expect(view.errors).toEqual(['WebGL context lost']);
    expect(devTools.crumbs.current.at(-1)).toBe('0.0s context lost');
  });

  it('reads the hash flags at start', () => {
    expect(tools(fakeView(), '#stats-low').flags).toEqual({ tier: 'low', spector: false });
  });

  it('drives frames from the given scheduler', () => {
    const view = fakeView();
    const devTools = tools(view);
    const queue: ((now: number) => void)[] = [];
    devTools.run((callback) => queue.push(callback));
    queue.shift()!(1000);
    queue.shift()!(1016);
    queue.shift()!(1050);
    expect(view.samples).toHaveLength(2);
    expect(devTools.crumbs.current).toContain('0.0s frame 2');
  });
});

describe('three adapter', () => {
  function fakeThree(): ThreeRendererLike & { resets: number } {
    const renderer = {
      resets: 0,
      domElement: { width: 640, height: 480 } as HTMLCanvasElement,
      info: {
        autoReset: true,
        render: { calls: 12, triangles: 20_000 },
        memory: { textures: 3 },
        reset: () => void (renderer.resets += 1),
      },
      getPixelRatio: () => 1.25,
    };
    return renderer;
  }

  it('turns off auto reset so a frame sums every render call', () => {
    const renderer = fakeThree();
    threeAdapter(renderer);
    expect(renderer.info.autoReset).toBe(false);
  });

  it('reads the renderer info and resets it', () => {
    const renderer = fakeThree();
    const adapter = threeAdapter(renderer);
    expect(adapter.read()).toEqual({ calls: 12, triangles: 20_000, pixelRatio: 1.25, width: 640, height: 480, textures: 3 });
    adapter.reset?.();
    expect(renderer.resets).toBe(1);
    expect(adapter.textureBytes).toBeUndefined();
  });

  it('passes a texture estimate through', () => {
    const adapter = threeAdapter(fakeThree(), { textureBytes: () => 42 });
    expect(adapter.textureBytes?.()).toBe(42);
  });
});
