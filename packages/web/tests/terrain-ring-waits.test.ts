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
 * How long one terrain tile may hold the view (VENT-78): a tile once took over 15 s on a phone. A request that
 * hangs, or whose body stops coming, is asked again after a short silence instead of waiting for the browser to
 * give up, and a tile retries on waits of its own, shorter than the horizon's 2, 6 and 18 s, with a long
 * Retry-After capped: the parent level stands in for a missing tile meanwhile.
 */
import { describe, expect, it } from 'vitest';
import { fetchRingSource } from '../src/terrain/ring/ring-fetch';
import { encodeQuantised, quantiseHeights } from '@ventana/sim';

const N = 129;
const SITES = 'https://x.test/api/v1/sites';
const ring = {
  scheme: 'polar-south',
  levels: [{ level: 0, tiles: [0, 1, 2].map((i) => ({ x: i, y: 0, url: `/api/v1/terrain/tiles/polar-south/0/${i}/0?v=1` })) }],
};
const q = quantiseHeights(new Float32Array(N * N).fill(5));
const tileBody = JSON.stringify({ n: N, quantumM: q.quantumM, baseUnits: q.baseUnits, heights: encodeQuantised(q), resolutionM: 20 });
const request = {
  point: { lat: -84.79, lonEast: 29.2 },
  levels: 1,
  wanted: (_s: string, e: readonly { level: number; x: number; y: number; url: string }[]) => e,
};

/** Waits that record each sleep and run at once, and a stall timer that fires after 5 real ms. */
function fastWaits() {
  const slept: number[] = [];
  const timer = (fn: () => void) => {
    const id = setTimeout(fn, 5);
    return () => clearTimeout(id);
  };
  return { slept, waits: { sleep: (ms: number) => (slept.push(ms), Promise.resolve()), random: () => 0.5, timer } };
}

/** A fetch that never answers until its signal aborts, as the browser's does on a dead connection. */
function hanging(signal: AbortSignal | null | undefined): Promise<Response> {
  return new Promise((_, fail) => signal?.addEventListener('abort', () => fail(new DOMException('aborted', 'AbortError'))));
}

/** A 200 whose body sends its first bytes, then nothing more. */
function stalledBody(): Response {
  const body = new ReadableStream<Uint8Array>({ start: (c) => c.enqueue(new TextEncoder().encode('{"n":')) });
  return new Response(body, { status: 200 });
}

async function load(fetcher: typeof fetch, waits: ReturnType<typeof fastWaits>['waits']) {
  const tiles: number[] = [];
  const feed = { scheme: () => undefined, tile: (t: { key: { x: number } }) => tiles.push(t.key.x), settled: () => undefined };
  await fetchRingSource(fetcher, SITES, waits).load(request, feed as never, new AbortController().signal);
  return tiles.sort();
}

describe('terrain tile waits', () => {
  it('asks a tile again when its request hangs, instead of waiting for the browser', async () => {
    const asked = new Map<string, number>();
    const fetcher = (async (url: string, init?: RequestInit) => {
      if (!url.includes('/tiles/polar')) return new Response(JSON.stringify(ring));
      const n = (asked.get(url) ?? 0) + 1;
      asked.set(url, n);
      return url.includes('/0/1/') && n === 1 ? hanging(init?.signal) : new Response(tileBody);
    }) as unknown as typeof fetch;
    const { waits } = fastWaits();
    expect(await load(fetcher, waits)).toEqual([0, 1, 2]);
    expect(asked.get('https://x.test/api/v1/terrain/tiles/polar-south/0/1/0?v=1')).toBe(2);
  });

  it('asks a tile again when its body stops coming', async () => {
    let first = true;
    const fetcher = (async (url: string) => {
      if (!url.includes('/tiles/polar')) return new Response(JSON.stringify(ring));
      if (url.includes('/0/2/') && first) {
        first = false;
        return stalledBody();
      }
      return new Response(tileBody);
    }) as unknown as typeof fetch;
    const { waits } = fastWaits();
    expect(await load(fetcher, waits)).toEqual([0, 1, 2]);
  });

  it('waits half a second, not two, before asking a busy tile again', async () => {
    let busy = true;
    const fetcher = (async (url: string) => {
      if (!url.includes('/tiles/polar')) return new Response(JSON.stringify(ring));
      if (url.includes('/0/0/') && busy) {
        busy = false;
        return new Response('{}', { status: 503 });
      }
      return new Response(tileBody);
    }) as unknown as typeof fetch;
    const { slept, waits } = fastWaits();
    expect(await load(fetcher, waits)).toEqual([0, 1, 2]);
    expect(slept).toEqual([500]);
  });

  it('caps a long Retry-After at 8 s, since the parent level stands in for the tile', async () => {
    let limited = true;
    const fetcher = (async (url: string) => {
      if (!url.includes('/tiles/polar')) return new Response(JSON.stringify(ring));
      if (url.includes('/0/0/') && limited) {
        limited = false;
        return new Response('{}', { status: 429, headers: { 'retry-after': '300' } });
      }
      return new Response(tileBody);
    }) as unknown as typeof fetch;
    const { slept, waits } = fastWaits();
    expect(await load(fetcher, waits)).toEqual([0, 1, 2]);
    expect(slept).toEqual([8000]);
  });
});
