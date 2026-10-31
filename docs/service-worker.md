# Service worker: what it keeps, and the emergency kill switch

The service worker (VENT-28) is `packages/web/src/pwa/sw-worker.ts`, bundled into `dist/sw.js` by
`packages/web/scripts/service-worker.mjs` after every build. What it keeps:

| Cache | What | When |
|---|---|---|
| `ventana-static-<digest>` | Every locale's page (not `/en-xa/`), `_astro/`, the manifests, the app icons | At install |
| `ventana-static-<digest>` | Maps, thumbnails, phase frames | The first time the page fetches each one |
| `ventana-api-v1` | The API's GET answers, stamped with when they came | Each answer; the 24 latest only |

The digest covers every file the worker may keep, so any change to the build names a new static cache and the old one is
deleted when the new worker activates. Under Save-Data the worker is not registered.

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
