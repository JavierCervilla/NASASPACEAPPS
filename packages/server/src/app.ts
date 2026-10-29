import { Hono } from 'hono';

/** Builds the HTTP API. Routes live under `/api` because the web and the API share one domain. */
export function createApp(): Hono {
  const app = new Hono();
  app.get('/api/health', (c) => c.json({ ok: true }));
  return app;
}
