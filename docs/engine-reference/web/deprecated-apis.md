# Web Stack — Deprecated APIs

APIs to avoid in the components pinned in `VERSION.md` (set `2026.10`), with their replacement and source. Read on
2026-10-18. An API not listed here is **NOT SOURCEABLE**, not "not deprecated": check `breaking-changes.md` and the
component's own notes.

| Component | Don't use | Use instead | Source |
|-----------|-----------|-------------|--------|
| TypeScript 7 | `baseUrl` | `paths` relative to the project root | https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/ |
| TypeScript 7 | `moduleResolution: node` / `node10` / `classic` | `bundler` (Vite) or `nodenext` (Node) | same |
| TypeScript 7 | `module: amd` / `umd` / `systemjs` / `none` | `esnext` or `preserve` | same |
| TypeScript 7 | `target: es5`, `downlevelIteration` | ES2015 or later | same |
| TypeScript 7 | `outFile` | a bundler | same |
| TypeScript 7 | import `asserts { … }` | import `with { … }` | same |
| TypeScript 7 | `module Foo {}` | `namespace Foo {}` | same |
| TypeScript 7 | `tsc file.ts` next to a `tsconfig.json` | `tsc --ignoreConfig file.ts` | https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/ |
| TypeScript 7 | relying on implicit `@types` loading | `"types": ["node", "vite/client", …]` | https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/ |
| Node 24 | `url.parse()` | the WHATWG `URL` API | https://nodejs.org/en/blog/release/v24.0.0 |
| Node 24 | `SlowBuffer` | NOT SOURCED — the release post does not name the replacement | same |
| Node 24 | `--experimental-permission` | `--permission` | same |
| three.js | `Clock` | `Timer` (in core since r179) | https://github.com/mrdoob/three.js/wiki/Migration-Guide |
| three.js | `RGBELoader` | `HDRLoader` | same |
| three.js | `PCFSoftShadowMap` (removed in r186) | `PCFShadowMap`, which is soft | same |
| three.js | `PostProcessing` | `RenderPipeline` | same |
| three.js | `Source` | `TextureSource` | same |
| three.js | `ColorManagement.fromWorkingColorSpace()` / `toWorkingColorSpace()` | `workingToColorSpace()` / `colorSpaceToWorking()` | same |
| three.js | `WebGPURenderer.renderAsync()`, `computeAsync()`, `clearAsync()` | `setAnimationLoop()` or `await renderer.init()`, then the sync methods | same |
| three.js | `Matrix3.translate()` / `scale()` / `rotate()` | NOT SOURCED — the guide does not name the replacement | same |
| three.js | the CommonJS build | ES modules (`import * as THREE from "three"`) | https://github.com/mrdoob/three.js/releases/tag/r186 |
| Vite 8 | `build.rollupOptions` | `build.rolldownOptions` | https://vite.dev/guide/migration |
| Vite 8 | top-level `esbuild` option | `oxc` | same |
| Vite 8 | `transformWithEsbuild` | `transformWithOxc` | same |
| Vite 8 | `output.manualChunks` (object form removed, function form deprecated) | Rolldown `codeSplitting` | same |
| Vite 8 | `build.minify: 'esbuild'` | the default Oxc minifier | same |
| Vite 8 | `server.hmr` options | `server.ws` | https://github.com/vitejs/vite/blob/main/packages/vite/CHANGELOG.md |
| Vitest | `workspace` | `projects` | https://v4.vitest.dev/guide/migration |
| Vitest | `poolOptions`, `maxThreads` / `maxForks` | top-level options, `maxWorkers` | same |
| Vitest | `test.sequential` / `describe.sequential` | `concurrent: false` | https://vitest.dev/guide/migration |
| Vitest | `@vitest/browser/context` | `vitest/browser` | https://vitest.dev/blog/vitest-4 |
| Playwright | `page.accessibility` | an accessibility library such as Axe | https://playwright.dev/docs/release-notes |
| Playwright | `Locator.ariaRef()` | `ariaSnapshot()` | same |
| Playwright | `videosPath` / `videoSize` | `recordVideo` | same |
| Capacitor 8 | `android.adjustMarginsForEdgeToEdge` | the core SystemBars plugin and CSS `env()` | https://capacitorjs.com/docs/updating/8-0 |
