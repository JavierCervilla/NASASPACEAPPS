# Web Stack — Breaking Changes

Changes a model trained up to May 2025 does not know, for the components pinned in `VERSION.md` (set `2026.10`).
Every entry says where it comes from: an official page (its URL) or a measurement made in the studio (what was run).
Read on 2026-10-18. What is not here is not known to be safe: write `NOT SOURCEABLE` rather than filling it from
memory. The gaps found while sourcing are listed at the end.

## Measured in the studio (2026-10-18, container with Node 24.22.0)

- **`tsc` exit codes differ between majors.** A type or syntax error exits **1** with TypeScript 7.0.2 and **2** with
  5.9.3 and 6.0.2. A folder without `tsconfig.json` reports `TS5081` on 7.0.2 and `TS5057` on 5 and 6; a path that
  does not exist is `TS5058` on all three. No official page documents 7.0's exit codes, so read the `error TS…` lines,
  never the number. (Run: `tsc --noEmit -p <folder>` with each version installed from npm.)
- **`vite build` exits 0 on a type error** (Vite 8.3.4) and 1 on a syntax error. The starter's `build` script runs
  `npm run typecheck` first for that reason.
- **`vitest run` exits 1 when it finds no test file** (Vitest 5.0.5), as when a test fails.
- **Node 24 runs the starter's server straight from TypeScript** (`node src/main.ts`), also through the workspace link
  to `@game/sim`: npm links the package, and Node resolves it to `packages/sim`, outside `node_modules`.

## Node.js 24 LTS «Krypton»

- Support phases: Active LTS since 2025-10-28, **Maintenance LTS from 2026-10-20**, end of life 2028-04-30. Node 26
  becomes Active LTS on 2026-10-28. Node 20 is end of life since 2026-04-30. — https://github.com/nodejs/Release
- 24.0.0: V8 13.6, npm 11, Undici 7; `URLPattern` is global; `--experimental-permission` → `--permission`; the test
  runner waits for subtests on its own. — https://nodejs.org/en/blog/release/v24.0.0
- Removed or runtime-deprecated in 24.0.0: `url.parse()` (use `URL`), `tls.createSecurePair` (removed), `SlowBuffer`,
  REPL and Zlib classes without `new`, `args` passed to `spawn`/`execFile`, `dirent.path` (removed).
  — https://nodejs.org/en/blog/release/v24.0.0
- Type stripping is stable (since 24.12.0) and on by default. It does no type checking and ignores `tsconfig.json`.
  `enum`, `namespace` with runtime code, parameter properties and import aliases need
  `--experimental-transform-types`; decorators are a parse error; `.tsx` is unsupported. Imports carry their
  extension (`./file.ts`), type-only imports need `import type`, and files under `node_modules` are not stripped.
  — https://nodejs.org/docs/latest-v24.x/api/typescript.html

## TypeScript 7.0 (and the 6.0 step before it)

- 7.0 (2026-07-08) is the native port, written in Go, installed as the usual `typescript` package. 6.0 was the last
  JavaScript release. — https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
- **7.0 ships no programmatic API.** The package has only the `tsc` binary (no `tsserver`); its root export returns the
  version. A different API is expected in 7.1, with no date. — https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
  and the npm registry (`npm view typescript@7.0.2 bin exports`)
- Defaults since 6.0, kept in 7.0: `strict: true`, `module: esnext`, `target` = the latest stable ES version,
  **`types: []`** (list `node`, `vite/client`… explicitly), **`rootDir` = the folder of `tsconfig.json`**,
  `noUncheckedSideEffectImports: true`, `libReplacement: false`. 7.0 adds `stableTypeOrdering: true`, which cannot be
  turned off. — https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
- **Hard errors in 7.0** (deprecated in 6.0): `target: es5`, `downlevelIteration`, `moduleResolution: node`/`node10`
  (use `bundler` or `nodenext`), `moduleResolution: classic`, `module: amd|umd|systemjs|none`, **`baseUrl`** (make
  `paths` relative to the project root), `outFile`, `esModuleInterop`/`allowSyntheticDefaultImports: false`,
  `alwaysStrict: false`, the `module` keyword for namespaces, import `asserts` (use `with`).
  — https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
- **`tsc file.ts` next to a `tsconfig.json` is an error** (TS5112 since 6.0); `--ignoreConfig` skips the config.
  — https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/
- `lib`: `dom.iterable` and `dom.asynciterable` are merged into `dom`; the old names stay as empty files.
  — https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/
- CLI: new `--checkers`, `--builders` and `--singleThreaded`; `--watch` rebuilt on a native file watcher.
  — https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
- Type level: template literal inference keeps whole Unicode code points. JSDoc checking in `.js` follows `.ts` rules
  (`@enum`, values as types and postfix `!` are gone). — https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
- Code that compiles on 6.0 with `stableTypeOrdering` on and no `ignoreDeprecations` "should compile identically" on
  7.0. — https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/

### Tools that need the TypeScript API do not work with 7.0

- **typescript-eslint** 8.71.2 (and its canary) declares `typescript >=4.8.4 <6.1.0`: with 7.0 `npm ci` refuses the
  peer range and ESLint crashes. Support for TypeScript 7.1 is in progress, with no date. — https://typescript-eslint.io/users/dependency-versions/ ,
  https://github.com/typescript-eslint/typescript-eslint/issues/10940
- Volar-based tools (Vue, MDX, Astro, Svelte) and Angular template checking. — https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
- **Microsoft's workaround**: keep TypeScript 6 as the `typescript` package that tools load, and 7 under another name,
  so `tsc` runs 7: `"typescript": "npm:@typescript/typescript6@^6.0.2"` and `"@typescript/native": "npm:typescript@^7.0.2"`.
  `@typescript/typescript6` is at 6.0.2 and its binary is `tsc6`. — https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
- Editors: there is no `tsserver`. VS Code needs the `TypeScriptTeam.native-preview` extension until built-in support
  lands. — https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/

## three.js r176 → r186

The guide recommends updating in steps of 10 releases, because deprecation warnings last 10 releases.
Source for every entry: https://github.com/mrdoob/three.js/wiki/Migration-Guide (and, for r186,
https://github.com/mrdoob/three.js/releases/tag/r186).

- r176: `CapsuleGeometry` parameter `length` → `height`.
- r177: `ColorManagement.fromWorkingColorSpace()` → `workingToColorSpace()`, `toWorkingColorSpace()` →
  `colorSpaceToWorking()`.
- r178: `MultiplyBlending` and `SubtractiveBlending` need `material.premultipliedAlpha = true`.
- r179: `Timer` is in core (`THREE.Timer`); `WebGLRenderer` option `reverseDepthBuffer` → `reversedDepthBuffer`.
- r180: `RGBELoader` → `HDRLoader`; `RGBMLoader` removed.
- r181: PBR indirect specular and PMREM changed, so rough materials look brighter. `WebGPURenderer` async methods
  (`renderAsync()`, `computeAsync()`…) deprecated: start with `setAnimationLoop()` or `await renderer.init()`.
- r182: `PCFSoftShadowMap` deprecated with `WebGLRenderer` → `PCFShadowMap`, which is now soft.
- r183: `PostProcessing` → `RenderPipeline`; **`Clock` deprecated → `Timer`**.
- r184: `FileLoader.load()` and `ImageBitmapLoader.load()` return nothing (use `onLoad`); `FBXLoader` converts Z-up to
  Y-up.
- r185: `DRACOLoader.setDecoderConfig()` deprecated; `Matrix3.translate()`, `scale()` and `rotate()` deprecated;
  `Object3D.updateWorldMatrix()` honours `matrixWorldNeedsUpdate`.
- r186: `Object3D.dispose()` added (subclasses call `super.dispose()`); `Source` → `TextureSource`; `PCFSoftShadowMap`
  removed; **the CommonJS build is deprecated and the minified builds are removed**; deprecated code removed.

## Vite 7 → 8

- Vite 7: Node 20.19+ or 22.12+; default `build.target` `'baseline-widely-available'`; `splitVendorChunkPlugin` and
  the Sass legacy API removed. — https://vite.dev/blog/announcing-vite7
- **Vite 8 builds with Rolldown and Oxc instead of Rollup and esbuild.** A compatibility layer converts old config.
  — https://vite.dev/blog/announcing-vite8
- Renamed: `build.rollupOptions` → `build.rolldownOptions`, top-level `esbuild` → `oxc`,
  `optimizeDeps.esbuildOptions` → `optimizeDeps.rolldownOptions`, `transformWithEsbuild` → `transformWithOxc`.
  — https://vite.dev/guide/migration
- Default `build.target` raised to Chrome 111, Edge 111, Firefox 114, Safari 16.4. JS minifies with Oxc and CSS with
  Lightning CSS. The object form of `output.manualChunks` is removed; the function form is deprecated (Rolldown
  `codeSplitting`). — https://vite.dev/guide/migration
- 8.1: `server.hmr` options renamed to `server.ws`. 8.3: top-level `tsconfig` option.
  — https://github.com/vitejs/vite/blob/main/packages/vite/CHANGELOG.md

## Vitest 3 → 5

- Vitest 4: `workspace` removed (use `projects`); pools rewritten (`maxThreads`/`maxForks` → `maxWorkers`,
  `poolOptions` removed); `coverage.all` removed; browser providers are separate packages
  (`@vitest/browser-playwright`), imported from `vitest/browser`. — https://v4.vitest.dev/guide/migration ,
  https://vitest.dev/blog/vitest-4
- **Vitest 5 needs Node 22.12+ and Vite 6.4+.** `clearMocks` defaults to `true`; `vi.mock`, `vi.unmock` and `vi.hoisted`
  must be top-level; unawaited `resolves`/`rejects` fail the test; `toThrow("")` matches any message;
  `test.sequential` removed (use `concurrent: false`); entry points such as `vitest/reporters` removed; artifacts move
  under `.vitest/`. — https://vitest.dev/guide/migration

## Playwright 1.53 → 1.64

Source for every entry: https://playwright.dev/docs/release-notes

- 1.54: Node 16 removed, Node 18 deprecated.
- 1.57: `page.accessibility` removed; Chromium builds are Chrome for Testing.
- 1.58: `_react`/`_vue` selectors and the `devtools` launch option removed.
- 1.60: `Locator.ariaRef()` removed (use `ariaSnapshot()`); `videosPath`/`videoSize` removed (use `recordVideo`);
  `workers: 0` rejected.
- 1.64: device descriptors forward `screen`; `--update-snapshots=missing` passes the run; elements inside hidden
  iframes count as hidden. Ships Chromium 156, Firefox 157 and WebKit 27.2.
- Playwright does not type-check: run `tsc --noEmit` before `playwright test`. — https://playwright.dev/docs/test-typescript

## Capacitor 7 → 8

Source unless stated: https://capacitorjs.com/docs/updating/8-0

- Requirements: Node 22+, **Xcode 26+**, iOS 15.0, Android Studio Otter 2025.2.1+, `minSdkVersion` 24,
  `compileSdkVersion`/`targetSdkVersion` 36.
- `android.adjustMarginsForEdgeToEdge` removed: edge-to-edge comes from the core **SystemBars** plugin and CSS
  `env()` variables (https://capacitorjs.com/docs/apis/system-bars).
- New iOS projects use **Swift Package Manager** by default (`npx cap add ios --packagemanager CocoaPods` opts out).
- Migrate with `npm i -D @capacitor/cli@latest` and `npx cap migrate`.
- 8.5.0: the CLI loads `capacitor.config.ts` with TypeScript 7 (which dropped the API it used) through Node's type
  stripping, so that file cannot use `enum`, value namespaces, parameter properties or decorators.
  — https://github.com/ionic-team/capacitor/blob/main/CHANGELOG.md , https://github.com/ionic-team/capacitor/pull/8534

## Not sourced

Read on 2026-10-18 and not stated on any official page found. Treat each as `NOT SOURCEABLE` until a page states it:

- `tsc` 7.0's exit codes (only measured, above) and which emit `target` values 7.0 still supports below `esnext`.
- Whether Vitest's `--typecheck` mode parses TypeScript 7's `tsc` output.
- Language-service plugins in TypeScript 7.
- Which iOS and Android WebViews run three.js's WebGPU backend rather than its WebGL 2 fallback.
- Whether the WebViews of Capacitor 8's minimum targets (iOS 15.0, Android API 24) meet Vite 8's default
  `build.target` (Safari 16.4, Chrome 111).
- The JDK version Capacitor 8 needs (the 7.0 guide said JDK 21; the 8.0 guide does not say).
