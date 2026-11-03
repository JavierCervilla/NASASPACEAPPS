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
 * WebGL calls. A tap on the readout folds it to its first line; on a phone it
 * starts folded (see boot.ts).
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
import { readout, type RenderStats } from './readout';

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
}

export interface PerfHudOptions {
  readonly tier: Tier;
  readonly gpu: string;
  readonly flags: DebugFlags;
  /** The breadcrumb trail the previous session left. */
  readonly previous: readonly string[];
  /** This session's trail, read at each refresh. */
  readonly current: () => readonly string[];
  /**
   * Starts folded to the readout's first line, as on a phone, where the open
   * panel would cover the page.
   */
  readonly folded?: boolean;
}

/** The readout on screen. */
export class PerfHud implements HudView {
  private readonly button: HTMLButtonElement;
  private readonly text: HTMLElement;
  /** Everything but the readout's text and the errors: hidden while folded. */
  private readonly details = detailsRegion();
  private readonly errors = errorBox();
  private readonly meter = new FrameMeter();
  private readonly options: PerfHudOptions;
  private folded = false;
  private lastText = '';

  constructor(options: PerfHudOptions) {
    this.options = options;
    const { button, text } = readoutButton(() => this.fold(!this.folded));
    this.button = button;
    this.text = text;
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
    const text = readout(reading, stats, { tierLabel, gpu });
    this.lastText = `${text}\n${PERF_TEXT.currentTrail}\n${live}`;
    this.show();
  }

  error(message: string): void {
    const shown = `${this.errors.textContent ?? ''}\n${message}`.trim();
    this.errors.textContent = shown.slice(-ERROR_CHARS);
  }

  private fold(folded: boolean): void {
    this.folded = folded;
    this.details.hidden = folded;
    this.button.setAttribute('aria-expanded', String(!folded));
    this.show();
  }

  private show(): void {
    const firstLine = this.lastText.split('\n')[0] ?? '';
    this.text.textContent = this.folded ? firstLine : this.lastText;
  }
}
