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
import { copyFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.ts';
import { createHorizonsClient } from '../src/horizons/client.ts';
import type { Tier, TierFile } from '../src/terrain/catalogue.ts';
import type { FetchFs } from '../src/terrain/fetch-fs.ts';
import { acquireLock, HEARTBEAT_MS, LOCK_FILE, STALE_MS, type LockDeps } from '../src/terrain/fetch-lock.ts';
import { FetchStatus } from '../src/terrain/fetch-status.ts';
import { backoffMs, LOG_EVERY_MS } from '../src/terrain/file-fetch.ts';
import { cachedHorizons } from '../src/terrain/horizon-cache.ts';
import { fetchOnBoot, terrainStatusOf, wantedTiers } from '../src/terrain/terrain-boot.ts';
import type { TerrainSetup } from '../src/terrain/terrain-config.ts';
import { fetchTiers, type TierFetchPlan } from '../src/terrain/terrain-fetch.ts';
import { TerrainService } from '../src/terrain/terrain-service.ts';
import { CATALOGUE, SOUTH, terrainDir } from './terrain-fixture.ts';

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

/** A disk in memory, its free room set by the test. */
class MemoryFs implements FetchFs {
  readonly files = new Map<string, Uint8Array>();
  readonly mtimes = new Map<string, number>();
  free = 100 * GB;
  canWrite = true;

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
    this.files.set(to, this.files.get(from)!);
    this.files.delete(from);
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
    this.mtimes.set(path, Number(text));
    return true;
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
    const setup: TerrainSetup = { horizons, service, dir: empty, catalogue: CATALOGUE };
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
