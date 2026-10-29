/**
 * On-device performance readout for dev builds: frames per second, frame time, the slowest recent frame, render scale
 * and size, draw calls, triangles, estimated texture memory, the GPU's name, the breadcrumb trail (this session's and,
 * after a crash, the previous one's) and uncaught errors, so a page that breaks on a laptop or a phone says why
 * instead of staying black. Buttons reload the page at another quality tier, or with Spector.js (`#stats-spector`) to
 * capture a frame's WebGL calls. A tap on the readout folds it to its first line.
 *
 * Never in a production build: Base.astro imports the dev tools only when `import.meta.env.DEV` or `PUBLIC_PERF_HUD=1`.
 * Ported from GAMESTUDIO's Web starter (`studio/engines/web/scaffold/packages/client/src/engine/perf-hud.ts`).
 */
import './perf-hud.css';
import { TIERS, type Tier } from '../lib/quality';
import type { RendererReading } from './renderer';

/** Seconds between readout refreshes. */
const REFRESH_SECONDS = 0.5;
/** Lines of this session's trail the readout shows live. */
const LIVE_TRAIL_LINES = 6;
/** Characters of error text kept on screen. */
const ERROR_CHARS = 600;
const STATS_WORD = 'stats';
const SPECTOR_WORD = 'spector';

/** The panel's class and data attribute; also the marker the production build check looks for. */
export const HUD_MARKER = 'ventana-perf-hud';

/** Labels the readout shows. */
export const PERF_TEXT = {
  tiers: { low: 'Low', medium: 'Medium', high: 'High' } satisfies Record<Tier, string>,
  slowest: 'slowest',
  quality: 'quality',
  scale: 'scale',
  triangles: 'triangles',
  textures: 'textures',
  noRenderer: 'no renderer attached',
  spector: 'Spector',
  previousTrail: 'Previous session:',
  currentTrail: 'This session:',
  contextLost: 'WebGL context lost',
  contextRestored: 'WebGL context restored',
  noGpu: 'unknown GPU',
  label: 'Performance readout',
} as const;

/** What the address's hash asks for: `#stats-low-spector`. */
export interface DebugFlags {
  readonly tier: Tier | null;
  readonly spector: boolean;
}

export function parseDebugHash(hash: string): DebugFlags {
  const words = hash.replace(/^#/, '').split('-');
  const tier = TIERS.find((option) => words.includes(option)) ?? null;
  return { tier, spector: words.includes(SPECTOR_WORD) };
}

export function debugHash(flags: DebugFlags): string {
  return [STATS_WORD, flags.tier ?? '', flags.spector ? SPECTOR_WORD : ''].filter(Boolean).join('-');
}

export interface FrameReading {
  readonly fps: number;
  readonly frameMs: number;
  readonly worstMs: number;
}

/** Averages frame times over a window and keeps the slowest frame in it. */
export class FrameMeter {
  private elapsed = 0;
  private frames = 0;
  private worst = 0;
  private readonly window: number;

  constructor(windowSeconds = REFRESH_SECONDS) {
    this.window = windowSeconds;
  }

  /** Adds one frame's duration in seconds; returns a reading once a window is full, otherwise `null`. */
  sample(dt: number): FrameReading | null {
    this.elapsed += dt;
    this.frames += 1;
    this.worst = Math.max(this.worst, dt);
    if (this.elapsed < this.window) return null;
    const reading = { fps: this.frames / this.elapsed, frameMs: (this.elapsed / this.frames) * 1000, worstMs: this.worst * 1000 };
    this.elapsed = 0;
    this.frames = 0;
    this.worst = 0;
    return reading;
  }
}

/** A renderer's frame as the readout shows it: `null` while no renderer is attached. */
export interface RenderStats extends RendererReading {
  /** Estimated GPU memory of the textures on screen, in MB, when the adapter estimates it. */
  readonly textureMB?: number;
}

function rendererLines(stats: RenderStats | null, tierLabel: string): string[] {
  if (!stats) return [`${PERF_TEXT.quality} ${tierLabel}`, PERF_TEXT.noRenderer];
  const lines = [
    `${PERF_TEXT.quality} ${tierLabel} · ${PERF_TEXT.scale} ${stats.pixelRatio.toFixed(2)} · ${stats.width}×${stats.height}`,
    `${stats.calls} draw calls · ${(stats.triangles / 1000).toFixed(0)}k ${PERF_TEXT.triangles}`,
  ];
  if (stats.textureMB !== undefined) {
    const count = stats.textures === undefined ? '' : ` (${stats.textures})`;
    lines.push(`${PERF_TEXT.textures} ${stats.textureMB.toFixed(0)} MB${count}`);
  }
  return lines;
}

/** The readout's text. */
export function readout(frame: FrameReading, stats: RenderStats | null, device: { tierLabel: string; gpu: string }): string {
  return [
    `${frame.fps.toFixed(0)} fps · ${frame.frameMs.toFixed(1)} ms · ${PERF_TEXT.slowest} ${frame.worstMs.toFixed(0)} ms`,
    ...rendererLines(stats, device.tierLabel),
    device.gpu || PERF_TEXT.noGpu,
  ].join('\n');
}

/** Where the dev tools send what they measure; the panel below, or a fake in a test. */
export interface HudView {
  /** Called once per frame with the frame's duration in seconds and what the renderer drew, if any. */
  sample(dt: number, stats: RenderStats | null): void;
  /** Shows a message under the readout, such as a lost WebGL context or an uncaught error. */
  error(message: string): void;
}

export interface PerfHudOptions {
  readonly tier: Tier;
  readonly gpu: string;
  readonly flags: DebugFlags;
  /** The breadcrumb trail the previous session left. */
  readonly previous: readonly string[];
  /** This session's trail, read at each refresh. */
  readonly current: () => readonly string[];
}

/** The readout on screen. Changing the tier or Spector reloads the page with it in the hash: they are read at boot. */
export class PerfHud implements HudView {
  private readonly text: HTMLButtonElement;
  /** Everything but the readout's text and the errors: hidden while folded. */
  private readonly details: HTMLElement;
  private folded = false;
  private lastText = '';
  private readonly errors: HTMLElement;
  private readonly meter = new FrameMeter();
  private readonly options: PerfHudOptions;

  constructor(options: PerfHudOptions) {
    this.options = options;
    const root = document.createElement('aside');
    root.className = HUD_MARKER;
    root.dataset['devtools'] = HUD_MARKER;
    root.setAttribute('aria-label', PERF_TEXT.label);
    this.text = document.createElement('button');
    this.text.type = 'button';
    this.text.className = `${HUD_MARKER}__readout`;
    this.text.setAttribute('aria-expanded', 'true');
    this.text.addEventListener('click', () => this.fold(!this.folded));
    root.append(this.text);
    this.details = document.createElement('div');
    root.append(this.details);
    const { flags } = options;
    const controls = row(this.details);
    for (const tier of TIERS) {
      button(controls, PERF_TEXT.tiers[tier], tier === options.tier, () => restart({ ...flags, tier }));
    }
    button(controls, PERF_TEXT.spector, flags.spector, () => restart({ tier: options.tier, spector: !flags.spector }));
    if (options.previous.length > 0) {
      const trail = document.createElement('div');
      trail.className = `${HUD_MARKER}__trail`;
      trail.textContent = `${PERF_TEXT.previousTrail}\n${options.previous.join('\n')}`;
      this.details.append(trail);
    }
    this.errors = document.createElement('div');
    this.errors.className = `${HUD_MARKER}__errors`;
    this.errors.setAttribute('role', 'status');
    root.append(this.errors);
    document.body.append(root);
    window.addEventListener('error', (event) => this.error(event.message));
    window.addEventListener('unhandledrejection', (event) => this.error(String(event.reason)));
  }

  sample(dt: number, stats: RenderStats | null): void {
    const reading = this.meter.sample(dt);
    if (!reading) return;
    const live = this.options.current().slice(-LIVE_TRAIL_LINES).join('\n');
    this.lastText =
      `${readout(reading, stats, { tierLabel: PERF_TEXT.tiers[this.options.tier], gpu: this.options.gpu })}\n` +
      `${PERF_TEXT.currentTrail}\n${live}`;
    this.show();
  }

  private fold(folded: boolean): void {
    this.folded = folded;
    this.details.hidden = folded;
    this.text.setAttribute('aria-expanded', String(!folded));
    this.show();
  }

  private show(): void {
    this.text.textContent = this.folded ? (this.lastText.split('\n')[0] ?? '') : this.lastText;
  }

  error(message: string): void {
    this.errors.textContent = `${this.errors.textContent ?? ''}\n${message}`.trim().slice(-ERROR_CHARS);
  }
}

function row(root: HTMLElement): HTMLElement {
  const element = document.createElement('div');
  element.className = `${HUD_MARKER}__row`;
  root.append(element);
  return element;
}

function button(parent: HTMLElement, label: string, active: boolean, onClick: () => void): void {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = `${HUD_MARKER}__toggle`;
  element.textContent = label;
  element.setAttribute('aria-pressed', String(active));
  element.addEventListener('click', onClick);
  parent.append(element);
}

function restart(flags: DebugFlags): void {
  window.location.hash = debugHash(flags);
  window.location.reload();
}
