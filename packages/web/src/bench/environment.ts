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
 * The report's header (VENT-81): the GPU (lib/quality.ts `gpuName`, read
 * from an attached renderer's context, so no context is made for it; with
 * none alive, as when the view has already lost its context and been
 * freed, the page probe's name, VENT-105), the
 * browser, the viewport and the device's screen, the on-foot view's tier
 * (its host's `data-tier`),
 * the script's version, the fixed instant, and the build: the service
 * worker's cache digest (scripts/service-worker.mjs), else the name of the
 * page's first module script.
 */
import { BENCH_INSTANT_ISO } from '../lib/bench-param';
import { pickQuality } from '../globe/quality-pick';
import { gpuName } from '../lib/quality';
import type { Registry } from './registry';
import { SCRIPT_VERSION } from './script';
import { ON_FOOT_HOST } from './settle';
import type { BenchHeader } from './types';

const CACHE_PREFIX = 'ventana-static-';

/** The build's id: the precache's digest, or the first script's name. */
async function buildId(doc: Document): Promise<string> {
  const keys = await globalThis.caches?.keys().catch(() => []) ?? [];
  const cache = keys.find((key) => key.startsWith(CACHE_PREFIX));
  if (cache) return cache.slice(CACHE_PREFIX.length, CACHE_PREFIX.length + 12);
  const script = doc.querySelector<HTMLScriptElement>('script[type=module][src]');
  return script?.src.split('/').pop() ?? 'unknown';
}

/**
 * The GPU's name from a live renderer's context, else the page probe's,
 * else «unknown».
 */
export function headerGpu(live: string | null, probe: string): string {
  return live || probe || 'unknown';
}

/**
 * The header, read now: call it once the on-foot view has opened. `tier`,
 * when known, is the view's tier as it ran (loss-tier.ts, VENT-107).
 */
export async function readHeader(
  registry: Registry,
  doc: Document,
  tier: string | null = null,
): Promise<BenchHeader> {
  const gl = registry.handles().map((h) => h.renderer.getContext())
    .find((context) => !context.isContextLost()) ?? null;
  const host = doc.querySelector<HTMLElement>(ON_FOOT_HOST);
  const { width, height } = window.screen;
  return {
    gpu: headerGpu(gl && gpuName(gl), pickQuality.device().gpu),
    userAgent: navigator.userAgent,
    viewport: `${innerWidth} × ${innerHeight} @ ${devicePixelRatio}`,
    screen: `${width} × ${height}`,
    tier: tier ?? host?.dataset['tier'] ?? 'unknown',
    script: SCRIPT_VERSION,
    build: await buildId(doc),
    instant: BENCH_INSTANT_ISO,
  };
}
