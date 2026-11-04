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
 * What the browser remembers of its WebGL (VENT-69). After a GPU reset
 * Chrome blocks WebGL for the whole site until it is restarted: every
 * `getContext` answers null, which reads as «this browser has no WebGL» and
 * sends the visitor nowhere. The page cannot ask the browser which of the
 * two it is, and the blocking message's text is not a promise, so it keeps
 * its own marks in `localStorage`: the time a context was last made
 * (`ventana.glWorked`) and the time one was last lost (`ventana.glLostAt`).
 * A context that cannot be made on a browser that has the WebGL constructors
 * and made one before is a block, not an absence. Pure, over an injected
 * storage; storage that is missing or refused remembers nothing.
 */

import { hadGl, type GlStorage } from './gl-marks';

/** Whether the browser has the WebGL constructors at all. */
export const hasGlConstructors = (
  scope: { WebGL2RenderingContext?: unknown; WebGLRenderingContext?: unknown }
    = globalThis,
): boolean =>
  typeof scope.WebGL2RenderingContext === 'function'
  || typeof scope.WebGLRenderingContext === 'function';

export type GlFailureKind = 'blocked' | 'absent';

export interface GlFacts {
  readonly constructors: boolean;
  readonly storage: GlStorage | null;
}

/** Why no context could be made: blocked after a fault, or just absent. */
export const classifyGlFailure = (facts: GlFacts): GlFailureKind =>
  facts.constructors && hadGl(facts.storage) ? 'blocked' : 'absent';

/** No WebGL context could be made; says which of the two it is. */
export class GlUnavailableError extends Error {
  readonly kind: GlFailureKind;
  /** The browser's `webglcontextcreationerror` message, when it gave one. */
  readonly statusMessage: string | undefined;

  constructor(kind: GlFailureKind, statusMessage: string | undefined,
    cause: unknown) {
    super(`Error creating WebGL context (${kind}${
      statusMessage ? `, statusMessage: "${statusMessage}"` : ''})`, { cause });
    this.kind = kind;
    this.statusMessage = statusMessage;
  }
}

/** Whether `error` is a context the browser blocked after a fault. */
export const isGlBlocked = (error: unknown): boolean =>
  error instanceof GlUnavailableError && error.kind === 'blocked';
