# Service worker: what it keeps, and the emergency kill switch

The service worker (VENT-28) is `packages/web/src/pwa/sw-worker.ts`, bundled into `dist/sw.js` by
`packages/web/scripts/service-worker.mjs` after every build. What it keeps:

| Cache | What | When |
|---|---|---|
| `ventana-static-<digest>` | Every locale's page (not `/en-xa/`), `_astro/`, the manifests, the icons and the 30 phase frames, every site thumbnail, the 1K and 2K maps, the polar map | At install |
| `ventana-static-<digest>` | The 4K and 8K maps, and any other build file not precached | The first time the page fetches each one |
| `ventana-api-v1` | The API's GET answers, stamped with when they came | Each answer; the 24 latest only |

The digest covers every file the worker may keep, so any change to the build names a new static cache and the old one is
deleted when the new worker activates. Under Save-Data the worker is not registered.

A deploy downloads only what changed (VENT-90). The build also puts in `sw.js` a hash of each file the worker may keep
(the first 16 hex digits of its sha256, keyed by its path under the base: the precache and the files kept on use, the
4K and 8K maps and the on-demand chunks). The install copies from an older `ventana-static-*` cache each precached file
whose kept body still hashes to the new build's hash, and asks the server (past the HTTP cache) only for the rest; it
is all or nothing, like `addAll`: if any file cannot be had or stored, the new cache is deleted and the install fails.
The activation then carries over from the older caches every entry whose body hashes to the new build's hash for its
path (that is how a kept 4K or 8K map survives a deploy), never one that does not, and only then deletes them.

The worker hashes the kept body itself (`crypto.subtle.digest`) and trusts no header or label on a copy: a script
already running on the origin could put any header on an entry, and a copy kept by an older worker may hold bytes of a
newer build than that worker's. Reading and hashing the whole static cache (100 files, 6.5 MB with a 4K map) took
140 to 435 ms in headless Chromium; it runs in the worker, off the page's main thread, once per deploy.

Every answer goes to the page before its copy is kept: the copy is written in the background, the worker kept alive
with `waitUntil`, so the page gets the first byte as the network sends it, not after the whole file is down and stored.
A copy that cannot be kept (a full quota) is skipped and the file is fetched again next time.

The install set has a hard budget: `PRECACHE_BUDGET` in `service-worker.mjs`, 5 MB (5 × 1024 × 1024 bytes; human
decision, 2026-10-31). The build logs the precache total and fails when it goes over; to add to the install set past it,
leave the new files to the runtime cache or raise the budget with the human.

## Kill switch

Use it when a broken worker is serving visitors something wrong and a normal deploy does not fix it (for example, a
worker that no longer updates). Browsers check `sw.js` on every navigation (nginx serves it with `no-cache`), so the
next visit after the deploy installs the replacement.

1. In the `Dockerfile` build stage, after `npm run build -w @ventana/web`, add
   `&& cp packages/web/scripts/sw-kill-switch.js packages/web/dist/sw.js`.
2. Deploy. `sw-kill-switch.js` installs at once, deletes every cache of the site, unregisters itself and reloads the open
   pages from the network.
3. Once the fix is ready, remove the line and deploy again: the next visit registers the real worker from scratch.

The kill switch keeps the same address (`sw.js` at the base), which is the only address browsers check for an update.
