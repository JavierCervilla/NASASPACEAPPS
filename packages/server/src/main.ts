/** Server startup. The port comes from the PORT environment variable. */
import { serve } from '@hono/node-server';
import { createApp } from './app.ts';

const DEFAULT_PORT = 3000;

const port = Number(process.env['PORT'] ?? DEFAULT_PORT);
const server = serve({ fetch: createApp().fetch, port }, (info) => {
  process.stdout.write(`server listening on port ${info.port}\n`);
});
process.on('SIGTERM', () => server.close());
