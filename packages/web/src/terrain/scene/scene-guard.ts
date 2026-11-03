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
 * What guards the on-foot scene's GPU (VENT-49): the loss of its context,
 * which the scene answers by noting it in the crash report, taking the dead
 * canvas and the labels out of the page and stopping the loop, and only then
 * telling the panel, which frees the scene and says so; and the frame probe
 * that, while the view loads, steps it down a tier when a frame costs more
 * than the tier can afford.
 */
import type { WebGLRenderer } from 'three';
import type { Loop } from '../../globe/loop';
import type { QualitySettings } from '../../lib/quality';
import { budgetOf, createFrameProbe, type FrameProbe } from '../frame-probe';
import type { ReportSink } from '../report/sink';

/** What the browser's `webglcontextlost` event carries. */
type LostEvent = Event & { readonly statusMessage?: string | undefined };

/** Tells `onLost` when the browser takes the canvas's context; unbinds. */
export function watchLost(
  canvas: EventTarget,
  onLost: (statusMessage: string | undefined) => void,
): () => void {
  const hear = (event: Event): void =>
    onLost((event as LostEvent).statusMessage);
  canvas.addEventListener('webglcontextlost', hear);
  return () => canvas.removeEventListener('webglcontextlost', hear);
}

/** The report's words for a lost context. */
export function lostWords(statusMessage: string | undefined): string {
  return statusMessage
    ? `context lost, statusMessage: "${statusMessage}"`
    : 'context lost, no statusMessage';
}

export interface LostParts {
  readonly canvas: EventTarget & { remove: () => void };
  readonly labels: { readonly root: { remove: () => void } };
  readonly loop: Pick<Loop, 'stop'>;
  readonly report: Pick<ReportSink, 'step'>;
  /** The panel's answer: free the scene and say so. */
  readonly onLost: () => void;
}

/**
 * Answers a lost context: the dead canvas and the labels leave the page
 * and the loop stops before the panel is told, so neither a frozen frame
 * nor the browser's broken-WebGL icon shows under its message (the panel
 * frees the rest in its own time, a render later). Returns the unbind.
 */
export function guardLost(parts: LostParts): () => void {
  return watchLost(parts.canvas, (statusMessage) => {
    parts.report.step(lostWords(statusMessage));
    parts.loop.stop();
    parts.labels.root.remove();
    parts.canvas.remove();
    parts.onLost();
  });
}

/**
 * The probe for `renderer`'s frames: the GPU is waited on by reading one
 * pixel back. With no `onSlow` it only draws.
 */
export function stageProbe(
  renderer: Pick<WebGLRenderer, 'getContext' | 'info'>,
  quality: QualitySettings,
  onSlow: (() => void) | undefined,
): FrameProbe {
  const gl = renderer.getContext();
  const pixel = new Uint8Array(4);
  return createFrameProbe({
    budgetMs: budgetOf(quality.targetFps),
    now: () => performance.now(),
    sync: () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel),
    programs: () => renderer.info.programs?.length ?? 0,
    onSlow,
  });
}
