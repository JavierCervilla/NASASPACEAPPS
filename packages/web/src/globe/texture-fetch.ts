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
 * Fetching one level of the Moon's maps for the swapper (texture-swap.ts):
 * download both maps, upload them to the GPU, and free what a swap leaves
 * behind. Generic over the texture type, with the loader and the GPU
 * injected.
 */
import type { LodLevel } from './texture-lod';

/** The colour map and the relief map shown together. */
export interface MoonMaps<T> {
  readonly colour: T;
  /** Null when the relief failed to load: the colour shows flat. */
  readonly normal: T | null;
}

/** A level on hand: on screen, or fetched and ready to swap in. */
export interface HeldLevel<T> {
  readonly level: LodLevel | 0;
  readonly normalUrl: string;
  readonly maps: MoonMaps<T> | null;
}

/** A level just fetched: its maps are there. */
export interface FetchedLevel<T> extends HeldLevel<T> {
  readonly level: LodLevel;
  readonly maps: MoonMaps<T>;
}

export const NO_LEVEL = { level: 0, normalUrl: '', maps: null } as const;

export interface SwapDeps<T> {
  readonly urls: (level: LodLevel) => { colour: string; normal: string };
  /** Fetches and decodes a map; rejects when it does not load. */
  readonly load: (url: string, kind: 'colour' | 'normal') => Promise<T>;
  /** Uploads a map to the GPU ahead of its first frame. */
  readonly upload: (texture: T) => void;
  /** Puts the maps on the Moon and asks for a frame. */
  readonly apply: (maps: MoonMaps<T>) => void;
  readonly dispose: (texture: T) => void;
  readonly warn: (message: string) => void;
}

/** Frees the textures of `old` that `keep` does not show. */
export function release<T>(
  old: MoonMaps<T> | null,
  keep: MoonMaps<T> | null,
  deps: SwapDeps<T>,
): void {
  if (!old) return;
  const kept = new Set([keep?.colour, keep?.normal]);
  for (const texture of [old.colour, old.normal]) {
    if (texture !== null && !kept.has(texture)) deps.dispose(texture);
  }
}

/**
 * The relief at `url`: the one already shown when the URL is the same
 * (8K reuses the 4K relief), else a new one, or the old one on failure.
 */
async function loadNormal<T>(
  url: string,
  held: HeldLevel<T>,
  deps: SwapDeps<T>,
): Promise<T | null> {
  const shown = held.maps?.normal ?? null;
  if (url === held.normalUrl) return shown;
  try {
    return await deps.load(url, 'normal');
  } catch {
    deps.warn(`Ventana Lunar: Moon relief ${url} did not load.`);
    return shown;
  }
}

/**
 * Fetches `level`'s two maps side by side and uploads the new ones; null
 * when its colour map failed (the level is then not tried again).
 */
export async function fetchLevel<T>(
  level: LodLevel,
  held: HeldLevel<T>,
  deps: SwapDeps<T>,
): Promise<FetchedLevel<T> | null> {
  const urls = deps.urls(level);
  const relief = loadNormal(urls.normal, held, deps);
  const colour = await deps.load(urls.colour, 'colour').catch(() => null);
  const normal = await relief;
  const fresh = normal !== null && normal !== held.maps?.normal;
  if (colour === null) {
    deps.warn(`Ventana Lunar: Moon texture ${urls.colour} did not load.`);
    if (fresh) deps.dispose(normal);
    return null;
  }
  deps.upload(colour);
  if (fresh) deps.upload(normal);
  return { level, normalUrl: urls.normal, maps: { colour, normal } };
}
