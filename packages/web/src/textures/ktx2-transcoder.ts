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
 * The page's transcoder (VENT-101): sends the worker one map at a time (the
 * next only once the last answered, so two 4K maps never sit in its memory
 * together), matches each answer by its id, and bounds each ask. Once the
 * worker fails, errors or hangs, every ask, now and later, is rejected with
 * Ktx2Unavailable: the caller turns KTX2 off for the session and loads the
 * JPEG instead.
 */
import type { Ktx2Target } from '../globe/ktx2-target';
import type { Ktx2Image, TranscodeAnswer } from './ktx2-image';
import { workerLink, type WorkerLike, type WorkerLink } from './ktx2-worker-link';

export type { WorkerLike } from './ktx2-worker-link';

/**
 * The longest an ask may take once sent, the transcoder's first load
 * included (100 to 180 ms measured, perhaps 0.6 s on a phone, plus the
 * 245 kB wasm on a slow network); past it the worker is taken for hung.
 */
export const TRANSCODE_TIMEOUT_MS = 20_000;

/** Why a map did not come as KTX2: the caller falls back to its JPEG. */
export class Ktx2Unavailable extends Error {
  override readonly name = 'Ktx2Unavailable';
}

export interface Transcoder {
  /** Starts the worker ahead of the first map (the early start). */
  readonly warm: () => void;
  readonly transcode: (
    buffer: ArrayBuffer,
    target: Ktx2Target,
  ) => Promise<Ktx2Image>;
}

/** Calls `fn` after `ms`; returns what cancels it. */
export interface Ktx2Clock {
  readonly after: (ms: number, fn: () => void) => () => void;
}

interface Job {
  readonly id: number;
  readonly buffer: ArrayBuffer;
  readonly target: Ktx2Target;
  readonly resolve: (image: Ktx2Image) => void;
  readonly reject: (error: Ktx2Unavailable) => void;
}

interface Queue {
  link: WorkerLink | null;
  readonly clock: Ktx2Clock;
  readonly jobs: Job[];
  current: { job: Job; cancel: () => void } | null;
  dead: Ktx2Unavailable | null;
  lastId: number;
}

/** Fails every job, now and later, and stops the worker. */
function fail(queue: Queue, reason: string): void {
  if (queue.dead) return;
  queue.dead = new Ktx2Unavailable(reason);
  queue.link?.stop();
  queue.current?.cancel();
  const waiting = [queue.current?.job, ...queue.jobs.splice(0)];
  queue.current = null;
  for (const job of waiting) job?.reject(queue.dead);
}

/** Sends the next job, if the worker is free. */
function pump(queue: Queue): void {
  if (queue.current || queue.dead) return;
  const job = queue.jobs.shift();
  if (!job) return;
  const cancel = queue.clock.after(TRANSCODE_TIMEOUT_MS,
    () => fail(queue, 'transcoder timed out'));
  queue.current = { job, cancel };
  const { id, buffer, target } = job;
  queue.link?.post({ id, buffer, target });
}

/** Settles the job an answer is for, then sends the next. */
function settle(queue: Queue, answer: TranscodeAnswer): void {
  const current = queue.current;
  if (!current || current.job.id !== answer.id) return;
  current.cancel();
  queue.current = null;
  if (answer.ok) current.job.resolve(answer.image);
  else {
    current.job.reject(
      new Ktx2Unavailable(`transcode failed: ${answer.error}`));
  }
  pump(queue);
}

/** Queues one map; rejects at once when the worker is gone. */
function enqueue(
  queue: Queue,
  buffer: ArrayBuffer,
  target: Ktx2Target,
): Promise<Ktx2Image> {
  return new Promise((resolve, reject) => {
    if (queue.dead) {
      reject(queue.dead);
      return;
    }
    queue.lastId += 1;
    queue.jobs.push({ id: queue.lastId, buffer, target, resolve, reject });
    pump(queue);
  });
}

/** A transcoder over the worker `spawn` makes, on first use. */
export function transcoderClient(
  spawn: () => WorkerLike,
  clock: Ktx2Clock,
): Transcoder {
  const queue: Queue = {
    link: null, clock, jobs: [], current: null, dead: null, lastId: 0,
  };
  const link = workerLink(spawn, {
    answer: (answer) => settle(queue, answer),
    fail: (reason) => fail(queue, reason),
  });
  queue.link = link;
  return { warm: link.start, transcode: enqueue.bind(null, queue) };
}
