/**
 * The dev-only test tooling, started together: breadcrumbs that survive a GPU
 * crash, the WebGL context watch, the performance readout and, on request
 * (`#stats-spector`), Spector.js. Base.astro imports it only in dev builds
 * (`import.meta.env.DEV` or `PUBLIC_PERF_HUD=1`), so none of it, Spector.js
 * included, reaches a production bundle.
 *
 * It knows no renderer library: the page's renderer, once there is one, calls
 * `attach` with a `RendererAdapter`.
 * Ported from GAMESTUDIO's Web starter
 * (`studio/engines/web/scaffold/packages/client/src/engine/dev-tools.ts`).
 */
import { Breadcrumbs } from './breadcrumbs';
import { watchContext } from './context-watch';
import { parseDebugHash, type DebugFlags } from './debug-flags';
import { PerfHud, type HudView } from './perf-hud';
import { PERF_TEXT } from './perf-text';
import type { Tier } from '../lib/quality';
import type { RendererAdapter } from './renderer';
import { RendererSampler } from './renderer-sampler';
import { startSpector } from './spector';

/**
 * Frames worth a breadcrumb: the first ones, where a driver that cannot cope
 * usually gives up.
 */
const FRAME_MARKS = new Set([1, 2, 10, 60, 300, 1200]);

type FrameScheduler = (callback: (now: number) => void) => unknown;

export interface DevToolsOptions {
  readonly tier: Tier;
  readonly gpu: string;
  readonly hash: string;
  /** The trail; a test passes one with in-memory storage. */
  readonly crumbs?: Breadcrumbs;
  /**
   * Where readings go; defaults to the on-screen panel. A test passes a fake.
   */
  readonly view?: (options: {
    flags: DebugFlags;
    crumbs: Breadcrumbs;
  }) => HudView;
}

export class DevTools {
  readonly crumbs: Breadcrumbs;
  readonly flags: DebugFlags;
  private readonly hud: HudView;
  private sampler: RendererSampler | null = null;
  private frames = 0;

  constructor(options: DevToolsOptions) {
    const crumbs = options.crumbs ?? new Breadcrumbs();
    this.crumbs = crumbs;
    this.flags = parseDebugHash(options.hash);
    this.hud = options.view
      ? options.view({ flags: this.flags, crumbs })
      : new PerfHud({
          tier: options.tier,
          gpu: options.gpu,
          flags: this.flags,
          previous: crumbs.previous,
          current: () => crumbs.current,
        });
    crumbs.mark(`boot ${options.tier} ${options.gpu}`);
  }

  /**
   * Starts the tooling; call it before any renderer exists, so Spector.js
   * sees the context from its first call.
   */
  static async start(options: DevToolsOptions): Promise<DevTools> {
    const tools = new DevTools(options);
    if (tools.flags.spector) {
      await startSpector();
      tools.crumbs.mark('spector on');
    }
    return tools;
  }

  /** Starts reading a renderer's frames and watches its canvas. */
  attach(renderer: RendererAdapter): void {
    this.sampler = new RendererSampler(renderer);
    this.crumbs.mark('renderer attached');
    watchContext(renderer.canvas, this.crumbs, (event) =>
      this.hud.error(
        event === 'lost' ? PERF_TEXT.contextLost : PERF_TEXT.contextRestored,
      ),
    );
  }

  /** Called once per page frame with the frame's duration in seconds. */
  frame(dt: number): void {
    this.frames += 1;
    if (FRAME_MARKS.has(this.frames)) this.crumbs.mark(`frame ${this.frames}`);
    this.hud.sample(dt, this.sampler?.read(this.frames) ?? null);
  }

  /**
   * Drives `frame` from the page's own animation frames, so the readout runs
   * with or without a renderer.
   */
  run(requestFrame: FrameScheduler = requestAnimationFrame): void {
    let last: number | null = null;
    const tick = (now: number): void => {
      if (last !== null) this.frame((now - last) / 1000);
      last = now;
      requestFrame(tick);
    };
    requestFrame(tick);
  }
}
