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
 * Every error answer of the API leaves one log line (VENT-45): method, path, status and duration, so an intermittent
 * failure a visitor saw can be found afterwards. Never the query string (a point is where someone looks), the client's
 * address or the body.
 */
import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.ts';
import { errorLog } from '../src/error-log.ts';
import { createHorizonsClient } from '../src/horizons/client.ts';
import { fixtureFetch } from './fake-horizons.ts';

const CLIENT_IP = '203.0.113.7';

/** An app with the logger on `/api/*`, a clock that moves 12 ms per read, and routes for each outcome. */
function logged() {
  const lines: string[] = [];
  let ms = 1000;
  const app = new Hono();
  app.use('/api/*', errorLog({ log: (line) => lines.push(line), now: () => (ms += 12) }));
  app.get('/api/v1/horizon', (c) => c.json({ error: 'the service is busy; try again later' }, 503));
  app.get('/api/v1/ok', (c) => c.json({ ok: true }));
  app.get('/api/v1/boom', () => {
    throw new Error('secret body 41.5,-3.7');
  });
  app.get('/web', (c) => c.text('no', 404));
  return { app, lines };
}

const fromClient = { headers: { 'x-forwarded-for': CLIENT_IP, 'x-real-ip': CLIENT_IP } };

describe('the API error log', () => {
  it('logs an error answer as one line: method, path without the query, status and duration', async () => {
    const { app, lines } = logged();
    const res = await app.request('/api/v1/horizon?lat=31.01&lon=-92.62', fromClient);
    expect(res.status).toBe(503);
    expect(lines).toEqual(['api error: GET /api/v1/horizon 503 12 ms']);
  });

  it('never logs the query string, the client address or the body', async () => {
    const { app, lines } = logged();
    await app.request('/api/v1/horizon?lat=31.01&lon=-92.62&height=2', fromClient);
    await app.request('/api/v1/boom?lat=41.5', fromClient);
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe('api error: GET /api/v1/boom 500 12 ms');
    for (const line of lines) {
      expect(line).not.toContain('?');
      expect(line).not.toContain('31.01');
      expect(line).not.toContain('41.5');
      expect(line).not.toContain(CLIENT_IP);
      expect(line).not.toContain('busy');
    }
  });

  it('keeps quiet on a success and outside /api', async () => {
    const { app, lines } = logged();
    expect((await app.request('/api/v1/ok', fromClient)).status).toBe(200);
    expect((await app.request('/web', fromClient)).status).toBe(404);
    expect(lines).toEqual([]);
  });

  it('writes the path as sent, still encoded, cut to a bound', async () => {
    const { app, lines } = logged();
    await app.request(`/api/v1/${'x'.repeat(500)}`, fromClient);
    await app.request('/api/v1/a%20b%22c', fromClient);
    expect(lines).toHaveLength(2);
    expect(lines[0]!.length).toBeLessThan(260);
    expect(lines[1]).toBe('api error: GET /api/v1/a%20b%22c 404 12 ms');
  });

  it('is mounted on the app with the injected logger', async () => {
    const lines: string[] = [];
    const horizons = createHorizonsClient({ fetch: fixtureFetch(), cacheDir: '/nonexistent-cache' });
    const api = createApp({ horizons, pointsCache: horizons.points, sites: [], now: () => 0, log: (line) => lines.push(line) });
    const res = await api.request('/api/v1/sites/nowhere?from=2026-11-01', fromClient);
    expect(res.status).toBe(404);
    expect(lines).toEqual(['api error: GET /api/v1/sites/nowhere 404 0 ms']);
  });

  // VENT-78: a tile that took 15 s on a phone left no trace, since only errors were logged.
  describe('slow answers', () => {
    /** An app whose clock moves `stepMs` per read, so every answer takes `stepMs`. */
    function slow(stepMs: number) {
      const lines: string[] = [];
      let ms = 0;
      const app = new Hono();
      app.use('/api/*', errorLog({ log: (line) => lines.push(line), now: () => (ms += stepMs), slowMs: 1000 }));
      app.get('/api/v1/terrain/tiles/:scheme/:level/:x/:y', (c) => c.json({ ok: true }));
      app.get('/api/v1/horizon', (c) => c.json({ ok: true }));
      return { app, lines };
    }

    it('logs a success that took longer than the bound, with the tile scheme and level but not its place', async () => {
      const { app, lines } = slow(1500);
      await app.request('/api/v1/terrain/tiles/latlon/0/5049/-540?v=57129b75', fromClient);
      await app.request('/api/v1/horizon?lat=-33.71&lon=-44.37', fromClient);
      expect(lines).toEqual([
        'api slow: GET /api/v1/terrain/tiles/latlon/0/{x}/{y} 200 1500 ms',
        'api slow: GET /api/v1/horizon 200 1500 ms',
      ]);
      for (const line of lines) {
        expect(line).not.toContain('5049');
        expect(line).not.toContain('-540');
        expect(line).not.toContain('33.71');
      }
    });

    it('keeps quiet on a success within the bound', async () => {
      const { app, lines } = slow(999);
      await app.request('/api/v1/terrain/tiles/latlon/0/5049/-540?v=1', fromClient);
      expect(lines).toEqual([]);
    });

    it('hides the place of a tile in an error line too', async () => {
      const lines: string[] = [];
      const app = new Hono();
      app.use('/api/*', errorLog({ log: (line) => lines.push(line), now: () => 0 }));
      app.get('/api/v1/terrain/tiles/:scheme/:level/:x/:y', (c) => c.json({ error: 'busy' }, 503));
      await app.request('/api/v1/terrain/tiles/polar-south/2/31/-7?v=1', fromClient);
      expect(lines).toEqual(['api error: GET /api/v1/terrain/tiles/polar-south/2/{x}/{y} 503 0 ms']);
    });
  });
});
