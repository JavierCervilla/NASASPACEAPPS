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
 * The performance readout's text: frame rate, frame time, the slowest recent
 * frame, render scale and size, draw calls, triangles, estimated texture
 * memory and the GPU's name.
 *
 * Split out of perf-hud.ts, ported from GAMESTUDIO's Web starter
 * (`studio/engines/web/scaffold/packages/client/src/engine/perf-hud.ts`).
 */
import type { FrameReading } from './frame-meter';
import { PERF_TEXT } from './perf-text';
import type { RendererReading } from './renderer';

/** A renderer's frame as the readout shows it. */
export interface RenderStats extends RendererReading {
  /**
   * Estimated GPU memory of the textures on screen, in MB, when the adapter
   * estimates it.
   */
  readonly textureMB?: number;
}

export interface DeviceLabels {
  readonly tierLabel: string;
  readonly gpu: string;
  /** The GPU's profile, under its name (gpu-lines.ts, VENT-101). */
  readonly gpuLines?: readonly string[] | undefined;
}

function frameLine(frame: FrameReading): string {
  const fps = frame.fps.toFixed(0);
  const ms = frame.frameMs.toFixed(1);
  const worst = frame.worstMs.toFixed(0);
  return `${fps} fps · ${ms} ms · ${PERF_TEXT.slowest} ${worst} ms`;
}

/**
 * The folded readout's one line: the rate and the slowest frame, the two a
 * hitch shows in. Short enough to sit over the phone's title (VENT-51).
 */
export function foldedLine(frame: FrameReading): string {
  const worst = frame.worstMs.toFixed(0);
  return `${frame.fps.toFixed(0)} fps · ${PERF_TEXT.slowest} ${worst} ms`;
}

function textureLine(stats: RenderStats): string[] {
  if (stats.textureMB === undefined) return [];
  const count = stats.textures === undefined ? '' : ` (${stats.textures})`;
  const mb = stats.textureMB.toFixed(0);
  return [`${PERF_TEXT.textures} ${mb} MB${count}`];
}

function rendererLines(stats: RenderStats | null, tierLabel: string): string[] {
  const quality = `${PERF_TEXT.quality} ${tierLabel}`;
  if (!stats) return [quality, PERF_TEXT.noRenderer];
  const scale = stats.pixelRatio.toFixed(2);
  const size = `${stats.width}×${stats.height}`;
  const triangles = (stats.triangles / 1000).toFixed(0);
  return [
    `${quality} · ${PERF_TEXT.scale} ${scale} · ${size}`,
    `${stats.calls} draw calls · ${triangles}k ${PERF_TEXT.triangles}`,
    ...textureLine(stats),
  ];
}

/** The readout's text; `stats` is `null` while no renderer is attached. */
export function readout(
  frame: FrameReading,
  stats: RenderStats | null,
  device: DeviceLabels,
): string {
  return [
    frameLine(frame),
    ...rendererLines(stats, device.tierLabel),
    device.gpu || PERF_TEXT.noGpu,
    ...(device.gpuLines ?? []),
  ].join('\n');
}
