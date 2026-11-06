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
 * On-device performance readout: the readout's text (see
 * readout.ts), the breadcrumb trail (this session's and, after a crash, the
 * previous one's) and uncaught errors, so a page that breaks on a laptop or a
 * phone says why instead of staying black. Buttons reload the page at another
 * quality tier, or with Spector.js (`#stats-spector`) to capture a frame's
 * WebGL calls. A tap on the readout folds it to one line; it starts folded
 * (see boot.ts), so it covers none of the page's controls (VENT-51).
 *
 * In the dev server and a PUBLIC_PERF_HUD=1 build at once; in a production
 * build only on `?debug`, after the page has started, and without the
 * Spector.js button (src/lib/dev-tools-loader.ts, VENT-49).
 * Ported from GAMESTUDIO's Web starter
 * (`studio/engines/web/scaffold/packages/client/src/engine/perf-hud.ts`).
 */
// Linked when the panel mounts, never imported: Astro inlines a script's
// imported CSS into every page, which would put the readout's styles in the
// first load of a production build (VENT-49).
import stylesUrl from './perf-hud.css?url';
import type { Tier } from '../lib/quality';
import type { DebugFlags } from './debug-flags';
import { FrameMeter } from './frame-meter';
import { appendControls } from './hud-controls';
import {
  appendPreviousTrail,
  detailsRegion,
  errorBox,
  hudPanel,
  readoutButton,
} from './hud-elements';
import { PERF_TEXT } from './perf-text';
import { foldedLine, readout, type RenderStats } from './readout';

/** Lines of this session's trail the readout shows live. */
const LIVE_TRAIL_LINES = 6;
/** Characters of error text kept on screen. */
const ERROR_CHARS = 600;

/** Where the dev tools send what they measure: the panel, or a test fake. */
export interface HudView {
  /**
   * Called once per frame with the frame's duration in seconds and what the
   * renderer drew, if any.
   */
  sample(dt: number, stats: RenderStats | null): void;
  /** Shows a message under the readout, such as a lost WebGL context. */
  error(message: string): void;
  /**
   * Folds the readout to its one line, or opens it, as a press does: the
   * on-foot view's lost context folds it, since «Try again» shows where
   * the open readout sits on a phone (VENT-107).
   */
  fold?(folded: boolean): void;
}

export interface PerfHudOptions {
  readonly tier: Tier;
  readonly gpu: string;
  /** The GPU's profile lines, read at each reading (VENT-101). */
  readonly gpuLines?: (() => readonly string[]) | undefined;
  readonly flags: DebugFlags;
  /** The breadcrumb trail the previous session left. */
  readonly previous: readonly string[];
  /** This session's trail, read at each refresh. */
  readonly current: () => readonly string[];
  /**
   * Starts folded to one line (boot.ts always asks), where the open panel
   * would cover the page's controls.
   */
  readonly folded?: boolean;
  /**
   * The conditions of what it shows, read at each reading and shown under
   * the frame line when unfolded (conditions.ts, VENT-105).
   */
  readonly conditions?: (() => readonly string[]) | undefined;
}

/** The readout on screen. */
export class PerfHud implements HudView {
  private readonly button: HTMLButtonElement;
  private readonly text: HTMLElement;
  private readonly alert: HTMLElement;
  /** Everything but the readout's text and the errors: hidden while folded. */
  private readonly details = detailsRegion();
  private readonly errors = errorBox();
  private readonly meter = new FrameMeter();
  private readonly options: PerfHudOptions;
  private folded = false;
  private lastText = '';
  private lastLine = '';
  private errorCount = 0;

  constructor(options: PerfHudOptions) {
    this.options = options;
    const { button, text, alert } = readoutButton(() =>
      this.fold(!this.folded));
    this.button = button;
    this.text = text;
    this.alert = alert;
    appendControls(this.details, options.tier, options.flags);
    appendPreviousTrail(this.details, options.previous);
    const panel = hudPanel();
    panel.append(button, this.details, this.errors);
    const styles = Object.assign(document.createElement('link'),
      { rel: 'stylesheet', href: stylesUrl });
    document.head.append(styles);
    document.body.append(panel);
    this.fold(options.folded === true);
    window.addEventListener('error', (event) => this.error(event.message));
    window.addEventListener('unhandledrejection', (event) =>
      this.error(String(event.reason)),
    );
  }

  sample(dt: number, stats: RenderStats | null): void {
    const reading = this.meter.sample(dt);
    if (!reading) return;
    const { tier, gpu, current } = this.options;
    const tierLabel = PERF_TEXT.tiers[tier];
    const live = current().slice(-LIVE_TRAIL_LINES).join('\n');
    const gpuLines = this.options.gpuLines?.();
    const text = readout(reading, stats, { tierLabel, gpu, gpuLines },
      this.options.conditions?.());
    this.lastText = `${text}\n${PERF_TEXT.currentTrail}\n${live}`;
    this.lastLine = foldedLine(reading);
    this.show();
  }

  error(message: string): void {
    const shown = `${this.errors.textContent ?? ''}\n${message}`.trim();
    this.errors.textContent = shown.slice(-ERROR_CHARS);
    this.errorCount += 1;
    this.show();
  }

  fold(folded: boolean): void {
    this.folded = folded;
    this.details.hidden = folded;
    this.errors.hidden = folded;
    this.button.setAttribute('aria-expanded', String(!folded));
    this.show();
  }

  /**
   * Folded, one short line and the count of the errors under the fold, so
   * the panel stays one line high wherever it sits (VENT-51).
   */
  private show(): void {
    this.text.textContent = this.folded ? this.lastLine : this.lastText;
    const count = this.folded ? this.errorCount : 0;
    this.alert.textContent = count > 0 ? ` · ${PERF_TEXT.errors(count)}` : '';
  }
}
