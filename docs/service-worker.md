# Service worker: what it keeps, and the emergency kill switch

The service worker (VENT-28) is `packages/web/src/pwa/sw-worker.ts`, bundled into `dist/sw.js` by
`packages/web/scripts/service-worker.mjs` after every build. What it keeps:

| Cache | What | When |
|---|---|---|
| `ventana-static-<digest>` | Every locale's page (not `/en-xa/`), `_astro/`, the manifests, the icons and the 30 phase frames, every site thumbnail, the 1K maps | At install |
| `ventana-static-<digest>` | The desktop extras: the 2K start maps and the polar map (`DEVICE_EXTRAS`) | When a page in the desktop layout asks, once it has started |
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

The install set is what every device uses (VENT-95). The maps only the desktop layout uses are left out of it: the 2K
start maps (the globe opens on them at the high tier, which a phone never runs: a phone opens on the 1K map and its
zoom goes from 1K to 4K) and the polar map (a phone has no polar view). They are named once, `DEVICE_EXTRAS` in
`service-worker.mjs`, which the build hands to the worker as `extras`. A page in the desktop layout, once it has started
(`afterStart`, after the first paint), posts `{ type: 'ventana:keep-extras', set: 'desktop' }` to the active worker
(`src/pwa/keep-extras.ts`); a phone-sized page posts it only if it turns into the desktop layout. The worker
(`src/pwa/sw-extras.ts`) reads only a set the build named, skips every file it already keeps, and keeps the others under
`waitUntil`: the HTTP cache's copy (the page may have just loaded it) when its body hashes to the build's hash, else the
server's past the HTTP cache on the same test, else nothing. The page asks on every start, which costs one cache lookup
per file once they are kept, and the activation carries them over a deploy when their hash did not change. A desktop that
goes offline before its first visit has started does not have them yet.

What a first visit downloads has a hard budget: `PRECACHE_BUDGET` in `service-worker.mjs`, 5 MB (5 × 1024 × 1024 bytes;
human decision, 2026-10-31), held against the largest first visit, the install set plus the desktop extras. The build
logs the precache, each set of extras and that total, and fails when it goes over; to add past it, leave the new files to
the runtime cache or raise the budget with the human.

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
