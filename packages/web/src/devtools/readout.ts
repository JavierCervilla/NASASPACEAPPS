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
}

function frameLine(frame: FrameReading): string {
  const fps = frame.fps.toFixed(0);
  const ms = frame.frameMs.toFixed(1);
  const worst = frame.worstMs.toFixed(0);
  return `${fps} fps · ${ms} ms · ${PERF_TEXT.slowest} ${worst} ms`;
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
  ].join('\n');
}
