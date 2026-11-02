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
 * The terrain fetch (VENT-43) over a disk in memory, an injected fetch and
 * a hand-moved clock: resume, a hash that does not match, the stop on a
 * full volume, the re-scan of a fetched tier and the volume's lock. No
 * network is touched.
 */
import { createHash } from 'node:crypto';
import { copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.ts';
import { createHorizonsClient } from '../src/horizons/client.ts';
import type { Tier, TierFile } from '../src/terrain/catalogue.ts';
import type { FetchFs } from '../src/terrain/fetch-fs.ts';
import { acquireLock, HEARTBEAT_MS, LOCK_FILE, STALE_MS, type LockDeps } from '../src/terrain/fetch-lock.ts';
import { FetchStatus } from '../src/terrain/fetch-status.ts';
import { backoffMs, LOG_EVERY_MS, RETRIES } from '../src/terrain/file-fetch.ts';
import { cachedHorizons, horizonKey } from '../src/terrain/horizon-cache.ts';
import { NodeFetchFs } from '../src/terrain/node-fetch-fs.ts';
import { stopGracefully } from '../src/graceful-stop.ts';
import { fetchLocked, fetchOnBoot, terrainStatusOf, wantedTiers } from '../src/terrain/terrain-boot.ts';
import type { TerrainSetup } from '../src/terrain/terrain-config.ts';
import { fetchTiers, type TierFetchPlan } from '../src/terrain/terrain-fetch.ts';
import { TerrainService } from '../src/terrain/terrain-service.ts';
import { CATALOGUE, CRATER, GLOBE, SOUTH, terrainDir } from './terrain-fixture.ts';

const DIR = '/data/terrain';
const GB = 1024 ** 3;

/** `n` bytes counting up from `seed`, so two files never match. */
function bytesOf(n: number, seed: number): Uint8Array {
  return Uint8Array.from({ length: n }, (_, i) => (seed + i) % 251);
}

const sha = (data: Uint8Array): string => createHash('sha256').update(data).digest('hex');

function fileOf(name: string, data: Uint8Array): TierFile {
  return { file: name, url: `https://lola.invalid/${name}`, label: '', labelSha256: '', bytes: data.length, sha256: sha(data), row: 0, col: 0 };
}

function tierOf(id: string, files: TierFile[]): Tier {
  return { ...SOUTH, id, files };
}

/** A disk in memory, its free room set by the test, its times from `clock`. */
class MemoryFs implements FetchFs {
  readonly files = new Map<string, Uint8Array>();
  readonly mtimes = new Map<string, number>();
  free = 100 * GB;
  canWrite = true;

  readonly clock: () => number;

  constructor(clock: () => number = () => 0) {
    this.clock = clock;
  }

  async size(path: string) {
    return this.files.get(path)?.length ?? -1;
  }
  async append(path: string, body: AsyncIterable<Uint8Array>) {
    for await (const chunk of body) this.files.set(path, Buffer.concat([this.files.get(path) ?? new Uint8Array(), chunk]));
  }
  async sha256(path: string) {
    return sha(this.files.get(path) ?? new Uint8Array());
  }
  async rename(from: string, to: string) {
    const data = this.files.get(from);
    if (!data) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    this.files.set(to, data);
    this.mtimes.set(to, this.mtimes.get(from) ?? 0);
    this.files.delete(from);
    this.mtimes.delete(from);
  }
  async moveExclusive(from: string, to: string) {
    if (this.files.has(to)) return false;
    await this.rename(from, to);
    return true;
  }
  async remove(path: string) {
    this.files.delete(path);
    this.mtimes.delete(path);
  }
  async freeBytes() {
    return this.free;
  }
  async writable() {
    return this.canWrite;
  }
  async createExclusive(path: string, text: string) {
    if (this.files.has(path)) return false;
    this.files.set(path, Buffer.from(text));
    this.mtimes.set(path, this.clock());
    return true;
  }
  async read(path: string) {
    const data = this.files.get(path);
    return data ? Buffer.from(data).toString('utf8') : null;
  }
  async mtimeMs(path: string) {
    return this.mtimes.get(path) ?? null;
  }
  async touch(path: string, atMs: number) {
    this.mtimes.set(path, atMs);
  }
}

/** A server of `files` by URL that honours Range, with a chunk size. */
function lolaServer(files: Map<string, Uint8Array>, chunk = 4) {
  return vi.fn(async (url: string, init: { readonly headers: Record<string, string> }) => {
    const data = files.get(url);
    if (!data) return new Response('', { status: 404 });
    const from = Number(/bytes=(\d+)-/.exec(init.headers['Range'] ?? '')?.[1] ?? 0);
    const rest = data.subarray(from);
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        for (let i = 0; i < rest.length; i += chunk) controller.enqueue(rest.slice(i, i + chunk));
        controller.close();
      },
    });
    const range = `bytes ${from}-${data.length - 1}/${data.length}`;
    return new Response(body, { status: 206, headers: { 'Content-Range': range } });
  });
}

function depsOf(fs: MemoryFs, http: LockDeps['http']) {
  let now = 0;
  const lines: string[] = [];
  const sleeps: number[] = [];
  const deps: LockDeps = {
    http,
    fs,
    now: () => now,
    sleep: async (ms) => {
      sleeps.push(ms);
      now += ms;
    },
    log: (line) => lines.push(line),
    every: () => () => undefined,
  };
  return { deps, lines, sleeps, advance: (ms: number) => (now += ms) };
}

function planOf(tiers: Tier[], extra: Partial<TierFetchPlan> = {}): TierFetchPlan {
  return { dir: DIR, tiers, status: new FetchStatus(tiers, []), marginBytes: 2 * GB, onTierReady: async () => undefined, ...extra };
}

describe('fetchTiers', () => {
  it('resumes a cut file with a Range request from where its part stopped', async () => {
    const data = bytesOf(40, 1);
    const file = fileOf('a.img', data);
    const fs = new MemoryFs();
    fs.files.set(`${DIR}/a.img.part`, data.subarray(0, 25));
    const http = lolaServer(new Map([[file.url, data]]));
    const { deps } = depsOf(fs, http);
    const plan = planOf([tierOf('t', [file])]);
    await fetchTiers(deps, plan);
    expect(http).toHaveBeenCalledTimes(1);
    expect(http.mock.calls[0]?.[1].headers['Range']).toBe('bytes=25-');
    expect(fs.files.get(`${DIR}/a.img`)).toEqual(Buffer.from(data));
    expect(fs.files.has(`${DIR}/a.img.part`)).toBe(false);
    expect(plan.status.snapshot()).toEqual({ fetch: 'done', tiers: [{ id: 't', state: 'installed', bytesDone: 40, bytesTotal: 40 }] });
  });

  it('never asks again for a complete file', async () => {
    const data = bytesOf(8, 2);
    const fs = new MemoryFs();
    fs.files.set(`${DIR}/a.img`, data);
    const http = lolaServer(new Map());
    await fetchTiers(depsOf(fs, http).deps, planOf([tierOf('t', [fileOf('a.img', data)])]));
    expect(http).not.toHaveBeenCalled();
  });

  it('deletes a part whose sha256 is not the pin, waits, and fetches it again whole', async () => {
    const data = bytesOf(16, 3);
    const file = fileOf('a.img', data);
    const fs = new MemoryFs();
    const served = new Map([[file.url, bytesOf(16, 9)]]);
    const http = lolaServer(served);
    const { deps, sleeps, lines } = depsOf(fs, async (url, init) => {
      const answer = await http(url, init);
      served.set(file.url, data);
      return answer;
    });
    const plan = planOf([tierOf('t', [file])]);
    await fetchTiers(deps, plan);
    expect(http).toHaveBeenCalledTimes(2);
    expect(http.mock.calls[1]?.[1].headers['Range']).toBe('bytes=0-');
    expect(sleeps).toEqual([backoffMs(1)]);
    expect(fs.files.get(`${DIR}/a.img`)).toEqual(Buffer.from(data));
    expect(lines.some((l) => l.includes('sha256 does not match'))).toBe(true);
    expect(lines.some((l) => l.includes(`sha256 ${file.sha256} ok`))).toBe(true);
  });

  it('marks a tier failed after every retry, with backoff, and goes on to the next', async () => {
    const good = bytesOf(8, 4);
    const fs = new MemoryFs();
    const http = lolaServer(new Map([[`https://lola.invalid/b.img`, good]]));
    const { deps, sleeps } = depsOf(fs, http);
    const plan = planOf([tierOf('broken', [fileOf('a.img', bytesOf(8, 5))]), tierOf('fine', [fileOf('b.img', good)])]);
    await fetchTiers(deps, plan);
    expect(sleeps[0]).toBe(5_000);
    expect(Math.max(...sleeps)).toBe(5 * 60_000);
    expect(plan.status.snapshot().tiers.map((t) => t.state)).toEqual(['failed', 'installed']);
  });

  it('stops before a file that would leave less than the margin free, and fetches nothing', async () => {
    const data = bytesOf(1_000, 6);
    const fs = new MemoryFs();
    fs.free = 2 * GB + 999;
    const http = lolaServer(new Map());
    const { deps, lines } = depsOf(fs, http);
    const plan = planOf([tierOf('t', [fileOf('a.img', data)]), tierOf('u', [fileOf('b.img', data)])]);
    await fetchTiers(deps, plan);
    expect(http).not.toHaveBeenCalled();
    expect(plan.status.snapshot()).toMatchObject({ fetch: 'stopped', reason: 'disk' });
    expect(plan.status.snapshot().tiers.map((t) => t.state)).toEqual(['missing', 'missing']);
    expect(lines.at(-1)).toContain('stopped: 2147484647 bytes free');
  });

  it('counts the part already on disk against the room it needs', async () => {
    const data = bytesOf(1_000, 7);
    const file = fileOf('a.img', data);
    const fs = new MemoryFs();
    fs.free = 2 * GB + 500;
    fs.files.set(`${DIR}/a.img.part`, data.subarray(0, 500));
    await fetchTiers(depsOf(fs, lolaServer(new Map([[file.url, data]]))).deps, planOf([tierOf('t', [file])]));
    expect(fs.files.get(`${DIR}/a.img`)?.length).toBe(1_000);
  });

  it('hands a tier over once its last file is in place, and not before', async () => {
    const [a, b] = [bytesOf(8, 8), bytesOf(8, 9)];
    const [fa, fb] = [fileOf('a.img', a), fileOf('b.img', b)];
    const fs = new MemoryFs();
    const ready: string[][] = [];
    const onTierReady = async () => {
      ready.push([...fs.files.keys()].filter((k) => k.endsWith('.img')));
    };
    const http = lolaServer(new Map([[fa.url, a], [fb.url, b]]));
    await fetchTiers(depsOf(fs, http).deps, planOf([tierOf('t', [fa, fb])], { onTierReady }));
    expect(ready).toEqual([[`${DIR}/a.img`, `${DIR}/b.img`]]);
  });

  it('logs a file at its start and its end, and its bytes at most every 30 s', async () => {
    const data = bytesOf(40, 10);
    const file = fileOf('a.img', data);
    const fs = new MemoryFs();
    const { deps, lines, advance } = depsOf(fs, lolaServer(new Map([[file.url, data]]), 1));
    const http = deps.http;
    const slow: LockDeps = {
      ...deps,
      http: async (url, init) => {
        const res = await http(url, init);
        const reader = res.body!.getReader();
        const body = new ReadableStream<Uint8Array>({
          async pull(controller) {
            const { done, value } = await reader.read();
            if (done) return controller.close();
            advance(LOG_EVERY_MS / 10);
            controller.enqueue(value);
          },
        });
        return new Response(body, { status: 206, headers: res.headers });
      },
    };
    await fetchTiers(slow, planOf([tierOf('t', [file])]));
    const progress = lines.filter((l) => /: \d+ of 40 bytes/.test(l));
    expect(lines[0]).toBe('terrain fetch: t/a.img: from 0 of 40 bytes');
    expect(progress).toHaveLength(4);
    expect(lines.join('\n')).not.toContain('lola.invalid');
  });
});

describe('the volume lock', () => {
  it('waits while a live holder keeps it, takes it once stale, and frees it', async () => {
    const fs = new MemoryFs();
    const { deps, sleeps } = depsOf(fs, lolaServer(new Map()));
    const lock = `${DIR}/${LOCK_FILE}`;
    await fs.createExclusive(lock, '0');
    const onWait = vi.fn();
    const release = await acquireLock(deps, DIR, onWait);
    expect(onWait).toHaveBeenCalledTimes(1);
    expect(sleeps.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(STALE_MS);
    expect(sleeps.every((ms) => ms === HEARTBEAT_MS)).toBe(true);
    await release();
    expect(fs.files.has(lock)).toBe(false);
  });
});

describe('fetch at boot', () => {
  it('reads TERRAIN_FETCH_TIERS: all smallest first, a list in its order, unknown ids said', () => {
    const big = tierOf('big', [fileOf('b', bytesOf(9, 0))]);
    const small = tierOf('small', [fileOf('s', bytesOf(3, 0))]);
    const catalogue = { bands: [], tiers: [big, small] };
    const lines: string[] = [];
    expect(wantedTiers(undefined, catalogue, (l) => lines.push(l))).toBeNull();
    expect(wantedTiers(' ', catalogue, (l) => lines.push(l))).toBeNull();
    expect(wantedTiers('all', catalogue, (l) => lines.push(l))?.map((t) => t.id)).toEqual(['small', 'big']);
    expect(wantedTiers('big, nope,small', catalogue, (l) => lines.push(l))?.map((t) => t.id)).toEqual(['big', 'small']);
    expect(lines).toEqual(['terrain fetch: unknown tiers ignored: nope']);
  });

  it('says once that the volume cannot be written, and the route answers 503', async () => {
    const empty = await mkdtemp(join(tmpdir(), 'terrain-empty-'));
    const service = await TerrainService.open({ dir: empty, catalogue: CATALOGUE, cacheBytes: 1 << 20, maxRunning: 1, maxWaiting: 1 });
    const horizons = cachedHorizons(service, join(empty, 'cache'), 1 << 20);
    const pinned = { ...CATALOGUE, tiers: CATALOGUE.tiers.map((t) => ({ ...t, files: t.files.map((f) => ({ ...f, sha256: '0'.repeat(64) })) })) };
    const setup: TerrainSetup = { horizons, service, dir: empty, catalogue: pinned };
    const status = terrainStatusOf(setup);
    const fs = new MemoryFs();
    fs.canWrite = false;
    const http = lolaServer(new Map());
    const { deps, lines } = depsOf(fs, http);
    await fetchOnBoot(deps, setup, { raw: 'all', status });
    expect(lines).toEqual(['terrain fetch: TERRAIN_DIR is not writable; nothing fetched']);
    expect(http).not.toHaveBeenCalled();
    const client = createHorizonsClient({ fetch: async () => new Response(''), cacheDir: empty });
    const app = createApp({ horizons: client, pointsCache: client.points, sites: [], now: () => 0, terrain: horizons, terrainStatus: () => status.snapshot() });
    const res = await app.request('/api/v1/horizon?lat=-89.99&lon=30');
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'terrain data is not installed' });
    const body = await (await app.request('/api/v1/terrain/status')).json();
    expect(body).toMatchObject({ fetch: 'stopped', reason: 'notWritable' });
    expect(JSON.stringify(body)).not.toContain(empty);
    await service.close();
    await rm(empty, { recursive: true, force: true });
  });

  it('serves a tier fetched while the server runs from the next request, without a restart', async () => {
    const source = await terrainDir();
    const target = await mkdtemp(join(tmpdir(), 'terrain-target-'));
    const service = await TerrainService.open({ dir: target, catalogue: CATALOGUE, cacheBytes: 1 << 24, maxRunning: 1, maxWaiting: 1 });
    expect(service.present).toEqual([]);
    for (const f of [...SOUTH.files, ...CATALOGUE.tiers[1]!.files]) await copyFile(join(source, f.file), join(target, f.file));
    await service.rescan();
    expect(service.present.map((t) => t.id)).toEqual(['south-20m', 'globe-coarse']);
    const horizons = cachedHorizons(service, join(target, 'cache'), 1 << 20);
    const answer = await horizons.horizon({ lat: -89.99, lonEast: 30, heightM: 2 });
    expect(answer.tiers.map((t) => t.id)).toContain('south-20m');
    await service.close();
    await Promise.all([source, target].map((d) => rm(d, { recursive: true, force: true })));
  });

  it('answers the status with no tiers when the server has no terrain', async () => {
    const client = createHorizonsClient({ fetch: async () => new Response(''), cacheDir: tmpdir() });
    const app = createApp({ horizons: client, pointsCache: client.points, sites: [], now: () => 0 });
    expect(await (await app.request('/api/v1/terrain/status')).json()).toEqual({ fetch: 'off', tiers: [] });
  });
});

/** A body of `data` in chunks of `chunk`, noting when it is cancelled. */
function bodyOf(data: Uint8Array, chunk = 4) {
  const seen = { cancelled: false };
  let at = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (at >= data.length) return controller.close();
      controller.enqueue(data.slice(at, at + chunk));
      at += chunk;
    },
    cancel() {
      seen.cancelled = true;
    },
  });
  return { body, seen };
}

/** A server that answers `answers` in turn, then like {@link lolaServer}. */
function scriptedServer(answers: Array<(range: number) => Response>, files: Map<string, Uint8Array>) {
  const rest = lolaServer(files);
  return vi.fn(async (url: string, init: { readonly headers: Record<string, string>; readonly signal?: AbortSignal }) => {
    const answer = answers.shift();
    if (!answer) return rest(url, init);
    return answer(Number(/bytes=(\d+)-/.exec(init.headers['Range'] ?? '')?.[1] ?? 0));
  });
}

describe('resume edge cases (F2, F3, F4)', () => {
  const PART = `${DIR}/a.img.part`;
  const FINAL = `${DIR}/a.img`;

  it('F3: takes a 200 that ignores Range from byte 0, discarding the part', async () => {
    const data = bytesOf(40, 21);
    const file = fileOf('a.img', data);
    const fs = new MemoryFs();
    fs.files.set(PART, data.subarray(0, 25));
    const { body, seen } = bodyOf(data);
    const http = scriptedServer([() => new Response(body, { status: 200 })], new Map());
    const { deps, lines, sleeps } = depsOf(fs, http);
    const plan = planOf([tierOf('t', [file])]);
    await fetchTiers(deps, plan);
    expect(http).toHaveBeenCalledTimes(1);
    expect(sleeps).toEqual([]);
    expect(seen.cancelled).toBe(false);
    expect(fs.files.get(FINAL)).toEqual(Buffer.from(data));
    expect(fs.files.has(PART)).toBe(false);
    expect(lines.some((l) => l.includes('ignored the Range'))).toBe(true);
  });

  it('F2: a 416 deletes the part, cancels the body and starts again from 0', async () => {
    const data = bytesOf(40, 22);
    const file = fileOf('a.img', data);
    const fs = new MemoryFs();
    fs.files.set(PART, bytesOf(25, 99));
    const { body, seen } = bodyOf(new Uint8Array(4));
    const http = scriptedServer([() => new Response(body, { status: 416 })], new Map([[file.url, data]]));
    const { deps, lines } = depsOf(fs, http);
    await fetchTiers(deps, planOf([tierOf('t', [file])]));
    expect(seen.cancelled).toBe(true);
    expect(http.mock.calls.map((c) => c[1].headers['Range'])).toEqual(['bytes=25-', 'bytes=0-']);
    expect(fs.files.get(FINAL)).toEqual(Buffer.from(data));
    expect(lines.some((l) => l.includes('HTTP 416'))).toBe(true);
  });

  it('F4: a part larger than the file is deleted and fetched again from 0, said honestly', async () => {
    const data = bytesOf(40, 23);
    const file = fileOf('a.img', data);
    const fs = new MemoryFs();
    fs.files.set(PART, bytesOf(50, 1));
    const http = lolaServer(new Map([[file.url, data]]));
    const { deps, lines, sleeps } = depsOf(fs, http);
    const plan = planOf([tierOf('t', [file])]);
    await fetchTiers(deps, plan);
    expect(http.mock.calls.map((c) => c[1].headers['Range'])).toEqual(['bytes=0-']);
    expect(sleeps).toEqual([]);
    expect(fs.files.get(FINAL)).toEqual(Buffer.from(data));
    expect(lines.join('\n')).not.toContain('cut at -1');
    expect(lines).toContain('terrain fetch: t/a.img: part of 50 bytes is larger than the file (40); deleted, starting again');
    expect(plan.status.snapshot().tiers[0]?.state).toBe('installed');
  });

  it('F2: a Content-Range at another offset is refused, its body cancelled, the part kept and never renamed', async () => {
    const data = bytesOf(40, 24);
    const file = fileOf('a.img', data);
    const fs = new MemoryFs();
    fs.files.set(PART, data.subarray(0, 25));
    const bodies: Array<{ cancelled: boolean }> = [];
    const http = vi.fn(async () => {
      const { body, seen } = bodyOf(data);
      bodies.push(seen);
      return new Response(body, { status: 206, headers: { 'Content-Range': `bytes 0-39/40` } });
    });
    const { deps, lines } = depsOf(fs, http);
    const plan = planOf([tierOf('t', [file])]);
    await fetchTiers(deps, plan);
    expect(bodies.length).toBe(RETRIES);
    expect(bodies.every((b) => b.cancelled)).toBe(true);
    expect(Buffer.from(fs.files.get(PART)!)).toEqual(Buffer.from(data.subarray(0, 25)));
    expect(fs.files.has(FINAL)).toBe(false);
    expect(lines.some((l) => l.includes('Content-Range bytes 0-39/40 does not start at 25'))).toBe(true);
    expect(plan.status.snapshot().tiers[0]?.state).toBe('failed');
  });

  it('F2: a body that keeps ending short leaves the part and never renames it', async () => {
    const data = bytesOf(40, 25);
    const file = fileOf('a.img', data);
    const fs = new MemoryFs();
    const http = vi.fn(async (_url: string, init: { readonly headers: Record<string, string> }) => {
      const from = Number(/bytes=(\d+)-/.exec(init.headers['Range'] ?? '')?.[1] ?? 0);
      const { body } = bodyOf(from >= 30 ? new Uint8Array() : data.subarray(from, 30));
      return new Response(body, { status: 206, headers: { 'Content-Range': `bytes ${from}-39/40` } });
    });
    const plan = planOf([tierOf('t', [file])]);
    await fetchTiers(depsOf(fs, http).deps, plan);
    expect(fs.files.get(PART)?.length).toBe(30);
    expect(fs.files.has(FINAL)).toBe(false);
    expect(plan.status.snapshot().tiers[0]?.state).toBe('failed');
  });

  it('F2: a whole part whose sha256 never matches is never renamed', async () => {
    const data = bytesOf(16, 26);
    const file = fileOf('a.img', data);
    const fs = new MemoryFs();
    const plan = planOf([tierOf('t', [file])]);
    await fetchTiers(depsOf(fs, lolaServer(new Map([[file.url, bytesOf(16, 27)]]))).deps, plan);
    expect(fs.files.has(FINAL)).toBe(false);
    expect(fs.files.has(PART)).toBe(false);
    expect(plan.status.snapshot().tiers[0]?.state).toBe('failed');
  });

  it('seguridad 3: stops appending past the file size, aborts the request and deletes the part', async () => {
    const data = bytesOf(40, 28);
    const file = fileOf('a.img', data);
    const fs = new MemoryFs();
    const pulled: number[] = [];
    const http = vi.fn(async (_url: string, init: { readonly headers: Record<string, string>; readonly signal?: AbortSignal }) => {
      let at = 0;
      const body = new ReadableStream<Uint8Array>({
        pull(controller) {
          if (at >= 1024) return controller.close();
          pulled.push(at);
          controller.enqueue(bytesOf(8, at));
          at += 8;
        },
      });
      expect(init.signal).toBeInstanceOf(AbortSignal);
      return new Response(body, { status: 200 });
    });
    const plan = planOf([tierOf('t', [file])]);
    const { deps, lines } = depsOf(fs, http);
    await fetchTiers(deps, plan);
    expect(Math.max(...pulled)).toBeLessThan(64);
    expect(fs.files.has(PART)).toBe(false);
    expect(fs.files.has(FINAL)).toBe(false);
    expect(lines.some((l) => l.includes('more than the 40 bytes of the file; part deleted'))).toBe(true);
  });
});

/** Two contenders' deps over one disk and one clock that runs `every` timers. */
function sharedClock(fs: MemoryFs, start: number) {
  let now = start;
  const timers: Array<{ ms: number; next: number; fn: () => void; on: boolean }> = [];
  const advance = async (ms: number) => {
    const until = now + ms;
    for (;;) {
      const due = timers.filter((t) => t.on && t.next <= until).sort((a, b) => a.next - b.next)[0];
      if (!due) break;
      now = due.next;
      due.next += due.ms;
      due.fn();
      await new Promise((r) => setImmediate(r));
    }
    now = until;
  };
  const depsFor = (sleep: (ms: number) => Promise<void>): LockDeps => ({
    http: lolaServer(new Map()),
    fs,
    now: () => now,
    sleep,
    log: () => undefined,
    every: (ms, fn) => {
      const timer = { ms, next: now + ms, fn, on: true };
      timers.push(timer);
      return () => {
        timer.on = false;
      };
    },
  });
  return { depsFor, advance, now: () => now };
}

describe('the volume lock (F1, F5)', () => {
  const LOCK = `${DIR}/${LOCK_FILE}`;

  it('F1: a live holder past STALE_MS keeps its lock through the heartbeat, and a contender waits', async () => {
    let clock = () => 0;
    const fs = new MemoryFs(() => clock());
    const shared = sharedClock(fs, 0);
    clock = shared.now;
    const holder = await acquireLock(shared.depsFor(async () => undefined), DIR, () => undefined);
    const token = await fs.read(LOCK);
    let held = true;
    let waits = 0;
    const contender = shared.depsFor(async (ms) => {
      waits++;
      await shared.advance(ms);
      if (waits === 10) {
        await holder();
        held = false;
      }
    });
    const onWait = vi.fn();
    const release = await acquireLock(contender, DIR, onWait);
    expect(onWait).toHaveBeenCalledTimes(1);
    expect(shared.now()).toBeGreaterThan(2 * STALE_MS);
    expect(held).toBe(false);
    expect(await fs.read(LOCK)).not.toBe(token);
    await release();
  });

  it('F5: of two contenders for a stale lock only one takes it; the late one puts the live lock back', async () => {
    let clock = () => 0;
    const fs = new MemoryFs(() => clock());
    await fs.createExclusive(LOCK, 'dead');
    const shared = sharedClock(fs, 10 * STALE_MS);
    clock = shared.now;
    let aTook!: () => void;
    const aHolds = new Promise<void>((r) => (aTook = r));
    let freeB!: () => void;
    const bMayRetry = new Promise<void>((r) => (freeB = r));
    const slowFs = Object.create(fs) as MemoryFs;
    slowFs.mtimeMs = async (path: string) => {
      const touched = await fs.mtimeMs(path);
      if (path === LOCK) await aHolds;
      return touched;
    };
    const b: LockDeps = { ...shared.depsFor(() => bMayRetry), fs: slowFs };
    const onWaitB = vi.fn();
    const bLock = acquireLock(b, DIR, onWaitB);
    const releaseA = await acquireLock(shared.depsFor(async () => undefined), DIR, () => undefined);
    const aToken = await fs.read(LOCK);
    aTook();
    await vi.waitFor(() => expect(onWaitB).toHaveBeenCalledTimes(1));
    expect(await fs.read(LOCK)).toBe(aToken);
    expect([...fs.files.keys()].filter((k) => k.includes('.stale'))).toEqual([]);
    await releaseA();
    freeB();
    const releaseB = await bLock;
    expect(await fs.read(LOCK)).not.toBe(aToken);
    await releaseB();
  });

  it('F5: release deletes only a lock whose token is ours', async () => {
    const fs = new MemoryFs();
    const release = await acquireLock(depsOf(fs, lolaServer(new Map())).deps, DIR, () => undefined);
    fs.files.set(LOCK, Buffer.from('someone-else'));
    await release();
    expect(await fs.read(LOCK)).toBe('someone-else');
  });

  it('F5: an abort stops the fetch at once, keeps the part for resume and frees the lock', async () => {
    const data = bytesOf(40, 30);
    const file = fileOf('a.img', data);
    const fs = new MemoryFs();
    const abort = new AbortController();
    const http = vi.fn(async (_url: string, init: { readonly headers: Record<string, string>; readonly signal?: AbortSignal }) => {
      let at = 0;
      const body = new ReadableStream<Uint8Array>({
        pull(controller) {
          if (at === 12) {
            abort.abort();
            return controller.error(init.signal?.reason ?? new Error('aborted'));
          }
          controller.enqueue(data.slice(at, at + 4));
          at += 4;
        },
      });
      return new Response(body, { status: 206, headers: { 'Content-Range': 'bytes 0-39/40' } });
    });
    const { deps, sleeps } = depsOf(fs, http);
    const tier = tierOf('t', [file]);
    const status = new FetchStatus([tier], []);
    const run = fetchLocked({ ...deps, signal: abort.signal }, { dir: DIR, onTierReady: async () => undefined }, { tiers: [tier], status });
    await expect(run).rejects.toThrow();
    expect(http).toHaveBeenCalledTimes(1);
    expect(sleeps).toEqual([]);
    expect(fs.files.get(`${DIR}/a.img.part`)).toEqual(Buffer.from(data.subarray(0, 12)));
    expect(fs.files.has(LOCK)).toBe(false);
    expect(status.snapshot().tiers[0]?.state).not.toBe('failed');
  });
});

/** `p`, or 'still running' when it has not settled within `ms`. */
function within<T>(ms: number, p: Promise<T>): Promise<T | 'still running'> {
  return Promise.race([p, new Promise<'still running'>((r) => setTimeout(() => r('still running'), ms))]);
}

describe('a lost lock and an abortable hash (VENT-44)', () => {
  const LOCK = `${DIR}/${LOCK_FILE}`;

  it.each([
    ['taken by another server', (fs: MemoryFs) => fs.files.set(LOCK, Buffer.from('D'))],
    ['deleted', (fs: MemoryFs) => fs.remove(LOCK)],
  ])('a holder whose lock was %s aborts its fetch at the next heartbeat and says so', async (_how, lose) => {
    let clock = () => 0;
    const fs = new MemoryFs(() => clock());
    const shared = sharedClock(fs, 0);
    clock = shared.now;
    const file = fileOf('a.img', bytesOf(40, 31));
    const lines: string[] = [];
    const asked = vi.fn();
    const http = vi.fn((_url: string, init: { readonly signal?: AbortSignal }) => new Promise<Response>((_resolve, reject) => {
      asked();
      init.signal?.addEventListener('abort', () => reject(init.signal?.reason));
    }));
    const deps: LockDeps = { ...shared.depsFor(async () => undefined), http, log: (l) => lines.push(l) };
    const tier = tierOf('t', [file]);
    const run = fetchLocked(deps, { dir: DIR, onTierReady: async () => undefined }, { tiers: [tier], status: new FetchStatus([tier], []) });
    run.catch(() => undefined);
    await vi.waitFor(() => expect(asked).toHaveBeenCalledTimes(1));
    await lose(fs);
    const before = await fs.read(LOCK);
    await shared.advance(HEARTBEAT_MS);
    const outcome = await within(1_000, run.then(() => 'resolved', () => 'aborted'));
    expect(outcome).toBe('aborted');
    expect(lines).toContain('terrain fetch: lost the volume lock to another server; stopping');
    expect(await fs.read(LOCK)).toBe(before);
    expect(http).toHaveBeenCalledTimes(1);
  });

  it('the real hash stops on an aborted signal', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'terrain-hash-'));
    const path = join(dir, 'a.img');
    await writeFile(path, bytesOf(3 << 20, 5));
    const fs = new NodeFetchFs();
    expect(await fs.sha256(path)).toBe(sha(bytesOf(3 << 20, 5)));
    const abort = new AbortController();
    abort.abort(new Error('stop'));
    await expect(fs.sha256(path, abort.signal)).rejects.toThrow('stop');
    await rm(dir, { recursive: true, force: true });
  });

  it('a stop while a large part is hashed frees the lock well inside the grace time', async () => {
    const data = bytesOf(40, 32);
    const file = fileOf('a.img', data);
    const abort = new AbortController();
    const fs = new MemoryFs();
    fs.files.set(`${DIR}/a.img.part`, data);
    const slow = { chunks: 0 };
    fs.sha256 = async (_path: string, signal?: AbortSignal) => {
      for (let i = 0; i < 1_000; i++) {
        await new Promise((r) => setTimeout(r, 5));
        slow.chunks++;
        signal?.throwIfAborted();
      }
      return sha(data);
    };
    const { deps } = depsOf(fs, lolaServer(new Map()));
    const tier = tierOf('t', [file]);
    const run = fetchLocked({ ...deps, signal: abort.signal }, { dir: DIR, onTierReady: async () => undefined }, { tiers: [tier], status: new FetchStatus([tier], []) });
    run.catch(() => undefined);
    await vi.waitFor(() => expect(slow.chunks).toBeGreaterThan(2));
    abort.abort();
    expect(await within(1_000, run.then(() => 'resolved', () => 'aborted'))).toBe('aborted');
    expect(fs.files.has(LOCK)).toBe(false);
    expect(fs.files.get(`${DIR}/a.img.part`)).toEqual(data);
  });
});

describe('fetch at boot through the service (M8, M9, seguridad 4)', () => {
  it('M8: fetchOnBoot fetches a tier into a real volume and the service serves it after the rescan', async () => {
    const source = await terrainDir();
    const target = await mkdtemp(join(tmpdir(), 'terrain-boot-'));
    const pin = async (f: TierFile): Promise<TierFile> => ({ ...f, sha256: sha(await readFile(join(source, f.file))) });
    const south: Tier = { ...SOUTH, files: await Promise.all(SOUTH.files.map(pin)) };
    const catalogue = { ...CATALOGUE, tiers: [south] , bands: [{ untilM: 5_000, stepM: 20, tiers: ['south-20m'] }] };
    const served = new Map(await Promise.all(south.files.map(async (f) => [f.url, new Uint8Array(await readFile(join(source, f.file)))] as const)));
    const service = await TerrainService.open({ dir: target, catalogue, cacheBytes: 1 << 24, maxRunning: 1, maxWaiting: 1 });
    const horizons = cachedHorizons(service, join(target, 'cache'), 1 << 20);
    const setup: TerrainSetup = { horizons, service, dir: target, catalogue };
    const status = terrainStatusOf(setup);
    await expect(horizons.horizon(CRATER)).rejects.toThrow('terrain data is not installed');
    const { deps } = depsOf(new MemoryFs(), lolaServer(served, 1 << 16));
    await fetchOnBoot({ ...deps, fs: new NodeFetchFs() }, setup, { raw: 'south-20m', status });
    expect(status.snapshot()).toMatchObject({ fetch: 'done', tiers: [{ id: 'south-20m', state: 'installed' }] });
    const answer = await horizons.horizon(CRATER);
    expect(answer.tiers.map((t) => t.id)).toEqual(['south-20m']);
    await service.close();
    await Promise.all([source, target].map((d) => rm(d, { recursive: true, force: true })));
  });

  it('M9: the cache key follows the tiers present, and the service reads the tiers it was keyed with', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'terrain-key-'));
    const calls: string[][] = [];
    const fake = {
      present: [SOUTH] as readonly Tier[],
      horizon: async (_point: unknown, present: readonly Tier[]) => {
        calls.push(present.map((t) => t.id));
        return { tiers: present.map((t) => ({ id: t.id })) };
      },
    };
    const horizons = cachedHorizons(fake as unknown as TerrainService, dir, 1 << 20);
    await horizons.horizon(CRATER);
    await horizons.horizon(CRATER);
    fake.present = [SOUTH, GLOBE];
    await horizons.horizon(CRATER);
    expect(calls).toEqual([['south-20m'], ['south-20m', 'globe-coarse']]);
    expect(horizonKey(CRATER, 'south-20m')).not.toBe(horizonKey(CRATER, 'south-20m+globe-coarse'));
    await rm(dir, { recursive: true, force: true });
  });

  it('seguridad 4: refuses at boot a tier with a file whose sha256 is not pinned, with a clear log line', async () => {
    const unpinned = tierOf('unpinned', [{ ...fileOf('a.img', bytesOf(8, 1)), sha256: null }]);
    const pinned = tierOf('pinned', [fileOf('b.img', bytesOf(8, 2))]);
    const service = { present: [] as Tier[], rescan: async () => undefined } as unknown as TerrainService;
    const catalogue = { bands: [], tiers: [unpinned, pinned] };
    const setup: TerrainSetup = { horizons: { horizon: async () => { throw new Error('no'); } }, service, dir: DIR, catalogue };
    const status = terrainStatusOf(setup);
    const fs = new MemoryFs();
    const http = lolaServer(new Map([[pinned.files[0]!.url, bytesOf(8, 2)]]));
    const { deps, lines } = depsOf(fs, http);
    await fetchOnBoot(deps, setup, { raw: 'unpinned,pinned', status });
    expect(lines).toContain('terrain fetch: unpinned refused: a.img has no pinned sha256 in the catalogue');
    expect(http.mock.calls.map((c) => c[0])).toEqual([pinned.files[0]!.url]);
    expect(status.snapshot().tiers.map((t) => t.state)).toEqual(['missing', 'installed']);
  });
});

describe('graceful stop (F5)', () => {
  it('aborts the fetch, closes the server, waits for the lock to go and exits promptly', async () => {
    const order: string[] = [];
    const abort = new AbortController();
    let settle!: () => void;
    const pending = new Promise<void>((r) => (settle = r));
    abort.signal.addEventListener('abort', () => {
      order.push('abort');
      setImmediate(() => {
        order.push('lock released');
        settle();
      });
    });
    const exit = vi.fn();
    await stopGracefully({ abort, closeServer: () => order.push('close'), pending, graceMs: 5_000, exit });
    order.push('exit');
    expect(order).toEqual(['abort', 'close', 'lock released', 'exit']);
    expect(exit).toHaveBeenCalledWith(0);
  });

  it('exits after the grace time when the fetch does not settle', async () => {
    const exit = vi.fn();
    vi.useFakeTimers();
    const stop = stopGracefully({ abort: new AbortController(), closeServer: () => undefined, pending: new Promise(() => undefined), graceMs: 5_000, exit });
    await vi.advanceTimersByTimeAsync(5_000);
    await stop;
    vi.useRealTimers();
    expect(exit).toHaveBeenCalledWith(0);
  });
});
