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
 * Quality tiers. A phone starts at `medium` or `low`, a desktop at `high`, and
 * the address can force one (`?quality=low`, or `#stats-low` where a host
 * passes no query string), which is how the performance readout's buttons
 * restart the page at another tier. The settings are starting values for the
 * globe to tune, not measured limits.
 *
 * Ported from GAMESTUDIO's Web starter
 * (`studio/engines/web/scaffold/packages/client/src/engine/quality.ts`). It
 * lives outside `devtools/` because the globe will read it in production too;
 * today only the dev tools do.
 */
export type Tier = 'low' | 'medium' | 'high';

export const TIERS: readonly Tier[] = ['low', 'medium', 'high'];

export interface QualitySettings {
  readonly tier: Tier;
  /**
   * Device pixel ratio cap: on a high-density phone, more pixels cost frame
   * time without looking better.
   */
  readonly maxPixelRatio: number;
  /**
   * Multisampled antialiasing of the canvas (off on weak GPUs: it multiplies
   * the framebuffer's memory).
   */
  readonly antialias: boolean;
  /** Frame rate the tier aims to hold. */
  readonly targetFps: number;
}

const SETTINGS: Record<Tier, QualitySettings> = {
  low: { tier: 'low', maxPixelRatio: 1.25, antialias: false, targetFps: 30 },
  medium: {
    tier: 'medium',
    maxPixelRatio: 1.75,
    antialias: false,
    targetFps: 45,
  },
  high: { tier: 'high', maxPixelRatio: 2, antialias: true, targetFps: 60 },
};

export function settingsFor(tier: Tier): QualitySettings {
  return SETTINGS[tier];
}

/** What the browser tells about the device. */
export interface DeviceHints {
  /** The GPU's name (`gpuName`), empty when unknown. */
  readonly gpu: string;
  /** A touch screen as the main pointer: a phone or a tablet. */
  readonly coarsePointer: boolean;
  readonly cores: number;
}

/**
 * Phone GPUs that hold the medium tier: Apple, Adreno 7xx and 8xx, Mali-G71
 * and later, Immortalis and Xclipse.
 */
const CAPABLE_PHONE_GPU = new RegExp(
  [
    'apple gpu',
    String.raw`adreno \(tm\) (7|8)\d\d`,
    'mali-g7[1-9]',
    String.raw`mali-g[89]\d`,
    'immortalis',
    'xclipse',
  ].join('|'),
);

function isTier(value: string | null | undefined): value is Tier {
  return value === 'low' || value === 'medium' || value === 'high';
}

/**
 * Picks a starting tier; `?quality=` in `search` or a tier word in `hash`
 * overrides it.
 */
export function detectTier(device: DeviceHints, search = '', hash = ''): Tier {
  const forced =
    new URLSearchParams(search).get('quality') ??
    /(?:^|[#-])(low|medium|high)(?:$|-)/.exec(hash)?.[1];
  if (isTier(forced)) return forced;
  const gpu = device.gpu.toLowerCase();
  if (/swiftshader|llvmpipe|software/.test(gpu)) return 'low';
  if (!device.coarsePointer) return device.cores >= 4 ? 'high' : 'medium';
  if (CAPABLE_PHONE_GPU.test(gpu)) return 'medium';
  return device.cores >= 8 ? 'medium' : 'low';
}

/** The part of a WebGL context `gpuName` reads. */
export interface RendererInfoSource {
  readonly RENDERER: number;
  getExtension(
    name: 'WEBGL_debug_renderer_info',
  ): { readonly UNMASKED_RENDERER_WEBGL: number } | null;
  getParameter(name: number): unknown;
}

/**
 * The GPU's name as the browser reports it (unmasked through
 * WEBGL_debug_renderer_info when exposed), or "".
 */
export function gpuName(gl: RendererInfoSource | null): string {
  if (!gl) return '';
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  const name = info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
  return String(gl.getParameter(name));
}

/** The browser's hints, read from the page. */
export function deviceHints(gl: RendererInfoSource | null): DeviceHints {
  return {
    gpu: gpuName(gl),
    coarsePointer:
      typeof matchMedia === 'function' &&
      matchMedia('(pointer: coarse)').matches,
    cores: navigator.hardwareConcurrency ?? 4,
  };
}
