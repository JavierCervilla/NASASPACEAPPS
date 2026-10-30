// Proves the dev tools stay out of a production build: no file in dist/ may carry their markers (the panel's class,
// the breadcrumbs key, Spector.js). A build made with PUBLIC_PERF_HUD=1 must carry them instead, which shows the
// check can fail. Runs after every `astro build` (package.json).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;
const MARKERS = ['ventana-perf-hud', 'ventana.devtools.breadcrumbs', 'spector'];
const expectTools = process.env.PUBLIC_PERF_HUD === '1';

function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)],
  );
}

const found = new Map();
for (const file of files(DIST)) {
  // Spector.js's chunk is matched by its file name: its code names no package.
  const text = `${file}\n${readFileSync(file, 'latin1')}`;
  for (const marker of MARKERS) if (text.includes(marker)) found.set(marker, [...(found.get(marker) ?? []), file]);
}

if (expectTools && !found.has('ventana-perf-hud')) {
  console.error('check-no-devtools: PUBLIC_PERF_HUD=1 but the build has no performance readout');
  process.exit(1);
}
if (!expectTools && found.size > 0) {
  for (const [marker, where] of found) console.error(`check-no-devtools: "${marker}" in ${where.join(', ')}`);
  process.exit(1);
}
console.warn(`check-no-devtools: ok (${expectTools ? 'dev tools present, as asked' : 'no dev tools in the build'})`);
