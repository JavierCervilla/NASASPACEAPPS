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
 * What the crash report says of the device (VENT-49): the page, the browser,
 * the GPU as the driver names it, the screen and the canvas, the cores, the
 * memory and the battery, each only where the browser exposes it. Read
 * from what the page already has; the battery is asked once and never
 * waited for. Nothing is sent anywhere: the person copies it.
 */

/** What a run says of itself and of the device. */
export interface Environment {
  readonly tier: string;
  /** The `?onfoot=` parts left out, comma separated; empty: none. */
  readonly leftOut: string;
  /** The page's path, query and hash. */
  readonly page: string;
  readonly userAgent: string;
  readonly gpu: string | null;
  readonly pixelRatio: number;
  readonly viewport: string;
  readonly threads: number | null;
  readonly deviceMemoryGb: number | null;
  readonly battery: string | null;
}

/** What a mount tells the run about itself. */
export interface Mount {
  readonly tier: string;
  readonly leftOut: string;
}

/** The part of the `window` the report reads. */
export interface EnvSource {
  readonly navigator: {
    readonly userAgent: string;
    readonly hardwareConcurrency?: number | undefined;
    readonly deviceMemory?: number | undefined;
  };
  readonly location: {
    readonly pathname: string;
    readonly search: string;
    readonly hash: string;
  };
  readonly devicePixelRatio: number;
  readonly innerWidth: number;
  readonly innerHeight: number;
}

/** A browser that can say how its battery is (Chromium's). */
export interface BatteryHost {
  readonly getBattery?: () => Promise<{
    readonly level: number;
    readonly charging: boolean;
  }>;
}

/** The environment of a mount, with the GPU and the battery still unknown. */
export function readEnvironment(
  source: EnvSource,
  mount: Mount,
): Environment {
  const { navigator, location } = source;
  return {
    ...mount,
    page: `${location.pathname}${location.search}${location.hash}`,
    userAgent: navigator.userAgent,
    gpu: null,
    pixelRatio: source.devicePixelRatio,
    viewport: `${source.innerWidth}x${source.innerHeight}`,
    threads: navigator.hardwareConcurrency ?? null,
    deviceMemoryGb: navigator.deviceMemory ?? null,
    battery: null,
  };
}

/**
 * The GPU's name when the driver exposes it, else null: never the masked
 * `RENDERER`, which lib/quality.ts `gpuName` falls back to (VENT-84: a
 * hidden GPU must read as unknown).
 */
export function unmaskedGpuName(
  gl: Pick<WebGLRenderingContext, 'getExtension' | 'getParameter'>,
): string | null {
  try {
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const name: unknown = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL)
      : null;
    return typeof name === 'string' && name !== '' ? name : null;
  } catch {
    return null;
  }
}

/** Asks the battery once; `hear` gets «14%, not charging» if it answers. */
export function watchBattery(
  host: BatteryHost,
  hear: (text: string) => void,
): void {
  try {
    void host.getBattery?.().then(({ level, charging }) => {
      hear(`${Math.round(level * 100)}%, ${charging ? 'charging'
        : 'not charging'}`);
    }, () => undefined);
  } catch {
    // A browser that throws on the question has no battery to report.
  }
}
