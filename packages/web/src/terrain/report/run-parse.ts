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
 * A run read back from storage (VENT-49): its steps, frames, memory and
 * environment each checked field by field, so what an older or a hand-made
 * value gets wrong costs that part, not the report.
 */
import type { Environment } from './environment';
import { isBag, listOf, numOf, textOf, type Bag } from './run-guards';
import type { FrameRecord, MemoryRecord, Run, Step } from './trail';

/** The steps of `list` that are steps. */
function stepsOf(list: unknown): Step[] {
  return listOf(list).flatMap((item) => {
    if (!isBag(item)) return [];
    const [t, count] = [numOf(item['t']), numOf(item['count'])];
    const text = textOf(item['text']);
    if (t === null || count === null || text === null) return [];
    return [{ t, text, count, repeat: textOf(item['repeat']) }];
  });
}

/** The frames of `list` that are frames. */
function framesOf(list: unknown): FrameRecord[] {
  return listOf(list).flatMap((item) => {
    if (!isBag(item)) return [];
    const [t, calls, triangles, drawMs] =
      ['t', 'calls', 'triangles', 'drawMs'].map((k) => numOf(item[k]));
    const canvas = textOf(item['canvas']);
    if (t == null || calls == null || triangles == null || drawMs == null ||
      canvas === null) return [];
    return [{ t, calls, triangles, drawMs, canvas }];
  });
}

/** The memory record in `value`, or null. */
function memoryOf(value: unknown): MemoryRecord | null {
  const geometries = isBag(value) ? numOf(value['geometries']) : null;
  const textures = isBag(value) ? numOf(value['textures']) : null;
  if (geometries === null || textures === null) return null;
  return { geometries, textures };
}

/** The environment in `bag`, each field as its kind or as unknown. */
function envOf(bag: Bag): Environment {
  const words = (key: string): string => textOf(bag[key]) ?? '';
  return { tier: words('tier'), leftOut: words('leftOut'),
    page: words('page'), userAgent: words('userAgent'),
    gpu: textOf(bag['gpu']), pixelRatio: numOf(bag['pixelRatio']) ?? 0,
    viewport: words('viewport'), threads: numOf(bag['threads']),
    deviceMemoryGb: numOf(bag['deviceMemoryGb']),
    battery: textOf(bag['battery']) };
}

/** The run in `value`, or null when it is not one. */
export function runOf(value: unknown): Run | null {
  if (!isBag(value)) return null;
  const startedAt = textOf(value['startedAt']);
  const { env, steps } = value;
  if (startedAt === null || !isBag(env) || !Array.isArray(steps)) return null;
  return { startedAt, env: envOf(env), steps: stepsOf(steps),
    dropped: numOf(value['dropped']) ?? 0, frames: framesOf(value['frames']),
    memory: memoryOf(value['memory']) };
}
