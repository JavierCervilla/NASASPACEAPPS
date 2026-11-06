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
 * The transcoder worker as the page holds it (VENT-101): made on first use,
 * its answers and its failure (it could not be made, its script or the
 * transcoder failed to load, an uncaught error) told once each, and stopped.
 */
import type { TranscodeAnswer, TranscodeAsk } from './ktx2-image';

/** The part of a Worker the page uses; tests pass a fake. */
export interface WorkerLike {
  postMessage(ask: TranscodeAsk, transfer: Transferable[]): void;
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<TranscodeAnswer>) => void,
  ): void;
  addEventListener(type: 'error', listener: (event: ErrorEvent) => void): void;
  terminate(): void;
}

export interface WorkerLink {
  /** Makes the worker now, if not yet: it loads the transcoder meanwhile. */
  readonly start: () => void;
  readonly post: (ask: TranscodeAsk) => void;
  /** Stops the worker for good. */
  readonly stop: () => void;
}

export interface LinkEvents {
  readonly answer: (answer: TranscodeAnswer) => void;
  /** The worker cannot serve; told once. */
  readonly fail: (reason: string) => void;
}

/** «worker failed: …», from an error event or a thrown error. */
function failure(error: unknown): string {
  const message = (error as { message?: unknown } | null)?.message;
  return `worker failed: ${typeof message === 'string' && message
    ? message : 'no reason given'}`;
}

/** Makes the worker and hears it; a worker that cannot be made fails. */
function made(
  spawn: () => WorkerLike,
  events: LinkEvents,
  fail: (error: unknown) => void,
): WorkerLike | null {
  try {
    const worker = spawn();
    worker.addEventListener('message', ({ data }) => events.answer(data));
    worker.addEventListener('error', fail);
    return worker;
  } catch (error) {
    fail(error);
    return null;
  }
}

/**
 * A link that makes its worker with `spawn` on first use; after a failure
 * or `stop`, it makes none again and posts nothing.
 */
export function workerLink(
  spawn: () => WorkerLike,
  events: LinkEvents,
): WorkerLink {
  let worker: WorkerLike | null = null;
  let over = false;
  const stop = (): void => {
    over = true;
    worker?.terminate();
    worker = null;
  };
  const fail = (error: unknown): void => {
    if (over) return;
    stop();
    events.fail(failure(error));
  };
  const start = (): void => {
    if (!worker && !over) worker = made(spawn, events, fail);
  };
  const post = (ask: TranscodeAsk): void => {
    start();
    worker?.postMessage(ask, [ask.buffer]);
  };
  return { start, post, stop };
}
