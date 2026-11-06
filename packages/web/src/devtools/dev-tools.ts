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
 * The test tooling, started together: breadcrumbs that survive a GPU crash,
 * the WebGL context watch, the performance readout and, on request
 * (`#stats-spector`), Spector.js. It loads at once in the dev server and a
 * PUBLIC_PERF_HUD=1 build, and in a production build only on `?debug`, after
 * the page has started (src/lib/dev-tools-loader.ts, VENT-49); Spector.js is
 * never in a production build (spector.ts).
 *
 * It knows no renderer library: the page's renderer, once there is one, calls
 * `attach` with a `RendererAdapter`.
 * Ported from GAMESTUDIO's Web starter
 * (`studio/engines/web/scaffold/packages/client/src/engine/dev-tools.ts`).
 */
import { Breadcrumbs } from './breadcrumbs';
import {
  KIND_NAMES, lossLine, type RendererKind,
} from './condition-lines';
import { Conditions } from './conditions';
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
  /** The GPU's profile lines for the readout (VENT-101). */
  readonly gpuLines?: (() => readonly string[]) | undefined;
  readonly hash: string;
  /** Starts the on-screen panel folded to its first line. */
  readonly folded?: boolean;
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
  /**
   * What the readout states above its trail (VENT-105); the island hands it
   * the shared instant (`conditions.watchInstant`).
   */
  readonly conditions = new Conditions(
    () => globalThis.location?.search ?? '');
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
          gpuLines: options.gpuLines,
          flags: this.flags,
          previous: crumbs.previous,
          current: () => crumbs.current,
          folded: options.folded === true,
          conditions: () => this.conditions.lines(),
        });
    crumbs.mark(`boot ${options.tier} ${options.gpu}`);
  }

  /**
   * Starts the tooling; call it before any renderer exists, so Spector.js
   * sees the context from its first call.
   */
  static async start(options: DevToolsOptions): Promise<DevTools> {
    const tools = new DevTools(options);
    if (tools.flags.capture) {
      await startSpector();
      tools.crumbs.mark('Spector.js on');
    }
    return tools;
  }

  /**
   * Starts reading a renderer's frames and watches its canvas; `kind` names
   * it in a loss, and the on-foot canvas's marks show while it is attached.
   * Returns what gives the readout back to the renderer it read before, for
   * a view that leaves before the page does (the on-foot view).
   */
  attach(renderer: RendererAdapter, kind?: RendererKind): () => void {
    const previous = this.sampler;
    const sampler = new RendererSampler(renderer);
    this.sampler = sampler;
    this.crumbs.mark('renderer attached');
    const lossText = (): string => (kind
      ? lossLine(this.conditions.lost(kind, this.crumbs.elapsed()))
      : PERF_TEXT.contextLost);
    watchContext(renderer.canvas, this.crumbs, (event) => this.hud.error(
      event === 'lost' ? lossText() : PERF_TEXT.contextRestored,
    ), kind && KIND_NAMES[kind]);
    const unscene = kind === 'onFoot' && 'dataset' in renderer.canvas
      ? this.conditions.attachScene(renderer.canvas as HTMLElement)
      : () => undefined;
    return () => {
      unscene();
      if (this.sampler !== sampler) return;
      this.sampler = previous;
      this.crumbs.mark('renderer detached');
    };
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
