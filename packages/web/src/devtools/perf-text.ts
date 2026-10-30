/**
 * The performance readout's labels and its marker.
 *
 * Split out of perf-hud.ts, ported from GAMESTUDIO's Web starter
 * (`studio/engines/web/scaffold/packages/client/src/engine/perf-hud.ts`).
 */
import type { Tier } from '../lib/quality';

/**
 * The panel's class and data attribute; also a marker the production build
 * check looks for (scripts/check-no-devtools.mjs).
 */
export const HUD_MARKER = 'ventana-perf-hud';

/** Labels the readout shows. */
export const PERF_TEXT = {
  tiers: {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
  } satisfies Record<Tier, string>,
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
