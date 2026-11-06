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
 * How a Moon map went wrong, in words for the `?debug` breadcrumbs
 * (VENT-99): a load past its bound, a load the browser refused (with what
 * it said, if anything), a throw, and the GL error an upload left.
 */
import type { MapAsk, MapStepEvent } from './map-trace';

/** The rejection of a load that took longer than its bound. */
export class MapTimeout extends Error {
  constructor(readonly seconds: number) {
    super(`no answer in ${seconds} s`);
  }
}

/** A thrown value's message, or what it is. */
export function messageOf(error: unknown): string {
  if (error instanceof Error && error.message !== '') return error.message;
  const type = (error as { type?: unknown } | null)?.type;
  return typeof type === 'string' ? `${type} event, no details` : 'no details';
}

/** The event that tells how `ask`'s load failed with `error`. */
export function failureOf(ask: MapAsk, error: unknown): MapStepEvent {
  const { level, map } = ask;
  const file = ask.url.split('/').pop() ?? ask.url;
  if (error instanceof MapTimeout) {
    return { kind: 'timedOut', level, map, file, seconds: error.seconds };
  }
  return { kind: 'failed', level, map, file, reason: messageOf(error) };
}

/** WebGL's error codes by name (the WebGL 2 specification, 5.14). */
const GL_ERRORS: Readonly<Record<number, string>> = {
  0: 'NO_ERROR',
  0x0500: 'INVALID_ENUM',
  0x0501: 'INVALID_VALUE',
  0x0502: 'INVALID_OPERATION',
  0x0505: 'OUT_OF_MEMORY',
  0x0506: 'INVALID_FRAMEBUFFER_OPERATION',
  0x9242: 'CONTEXT_LOST_WEBGL',
};

/** A `gl.getError()` code by name, or in hex when unknown. */
export function glErrorName(code: number): string {
  return GL_ERRORS[code] ?? `0x${code.toString(16)}`;
}
