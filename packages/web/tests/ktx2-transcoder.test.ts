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
 * The page's side of the transcoder worker (VENT-101): started on the first
 * ask, one map at a time (the next ask is sent only once the last answered),
 * each answer matched by id, and a worker that fails to start, errors or
 * hangs rejects every ask, now and later, with a typed error.
 */
import { describe, expect, it } from 'vitest';
import type { TranscodeAnswer, TranscodeAsk } from '../src/textures/ktx2-image';
import {
  Ktx2Unavailable,
  TRANSCODE_TIMEOUT_MS,
  transcoderClient,
  type WorkerLike,
} from '../src/textures/ktx2-transcoder';

/** A worker the test answers by hand. */
function fakeWorker() {
  const asks: TranscodeAsk[] = [];
  const listeners: Record<string, ((event: unknown) => void)[]> = {};
  const state = { spawned: 0, terminated: 0 };
  const worker: WorkerLike = {
    postMessage: (ask: TranscodeAsk) => void asks.push(ask),
    addEventListener: (type: string, fn: (event: never) => void) => {
      (listeners[type] ??= []).push(fn as (event: unknown) => void);
    },
    terminate: () => void state.terminated++,
  };
  const emit = (type: string, event: unknown) =>
    listeners[type]?.forEach((fn) => fn(event));
  const answer = (data: TranscodeAnswer) => emit('message', { data });
  const spawn = () => {
    state.spawned++;
    return worker;
  };
  return { asks, state, emit, answer, spawn };
}

/** A clock the test moves by hand. */
function fakeClock() {
  const timers: { at: number; fn: () => void }[] = [];
  let now = 0;
  return {
    after: (ms: number, fn: () => void) => {
      const timer = { at: now + ms, fn };
      timers.push(timer);
      return () => void timers.splice(timers.indexOf(timer), 1);
    },
    advance: (ms: number) => {
      now += ms;
      for (const timer of timers.filter((t) => t.at <= now)) {
        timers.splice(timers.indexOf(timer), 1);
        timer.fn();
      }
    },
  };
}

const IMAGE = { width: 4, height: 4, levels: [] };
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('the transcoder client', () => {
  it('starts the worker on the first ask, not before', async () => {
    const fake = fakeWorker();
    const client = transcoderClient(fake.spawn, fakeClock());
    expect(fake.state.spawned).toBe(0);
    const done = client.transcode(new ArrayBuffer(8), 'etc2');
    expect(fake.state.spawned).toBe(1);
    expect(fake.asks).toEqual([
      { id: 1, buffer: expect.any(ArrayBuffer), target: 'etc2' },
    ]);
    fake.answer({ id: 1, ok: true, image: IMAGE });
    await expect(done).resolves.toEqual(IMAGE);
  });

  it('warms the worker up without an ask', () => {
    const fake = fakeWorker();
    const client = transcoderClient(fake.spawn, fakeClock());
    client.warm();
    client.warm();
    expect(fake.state.spawned).toBe(1);
    expect(fake.asks).toEqual([]);
  });

  it('sends one map at a time, in order', async () => {
    const fake = fakeWorker();
    const client = transcoderClient(fake.spawn, fakeClock());
    const one = client.transcode(new ArrayBuffer(1), 'bc1');
    const two = client.transcode(new ArrayBuffer(2), 'bc1');
    expect(fake.asks.map((ask) => ask.id)).toEqual([1]);
    fake.answer({ id: 1, ok: true, image: IMAGE });
    await one;
    await flush();
    expect(fake.asks.map((ask) => ask.id)).toEqual([1, 2]);
    fake.answer({ id: 2, ok: false, error: 'level 0 failed' });
    await expect(two).rejects.toThrow('transcode failed: level 0 failed');
  });

  it('a worker error rejects the ask, the queue and every later ask', async () => {
    const fake = fakeWorker();
    const client = transcoderClient(fake.spawn, fakeClock());
    const one = client.transcode(new ArrayBuffer(1), 'etc2');
    const two = client.transcode(new ArrayBuffer(1), 'etc2');
    fake.emit('error', { message: 'Refused to evaluate' });
    await expect(one).rejects.toBeInstanceOf(Ktx2Unavailable);
    await expect(two).rejects.toThrow('worker failed: Refused to evaluate');
    await expect(client.transcode(new ArrayBuffer(1), 'etc2'))
      .rejects.toThrow('worker failed');
    expect(fake.state.spawned).toBe(1);
    expect(fake.state.terminated).toBe(1);
  });

  it('a worker that never answers times out and is stopped', async () => {
    const fake = fakeWorker();
    const clock = fakeClock();
    const client = transcoderClient(fake.spawn, clock);
    const one = client.transcode(new ArrayBuffer(1), 'etc2');
    clock.advance(TRANSCODE_TIMEOUT_MS);
    await expect(one).rejects.toThrow('transcoder timed out');
    expect(fake.state.terminated).toBe(1);
    // A late answer changes nothing.
    fake.answer({ id: 1, ok: true, image: IMAGE });
    await expect(client.transcode(new ArrayBuffer(1), 'etc2'))
      .rejects.toThrow('transcoder timed out');
  });

  it('a worker that cannot be made rejects the ask', async () => {
    const client = transcoderClient(() => {
      throw new Error('SecurityError');
    }, fakeClock());
    await expect(client.transcode(new ArrayBuffer(1), 'etc2'))
      .rejects.toThrow('worker failed: SecurityError');
  });
});
