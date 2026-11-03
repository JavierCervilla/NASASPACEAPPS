# Web Stack — Version Reference

| Field | Value |
|-------|-------|
| **Engine Version** | Web stack 2026.10 — Node 24.22.1 LTS, TypeScript 7.0.2, three 0.186.1, Vite 8.3.4, Vitest 5.0.5, Playwright 1.64.1, Capacitor 8.5.3 |
| **Installed at pin time** | NOT DETERMINED — `/setup-engine` §3 probes `node --version` and the installed packages and records the result here. |
| **Pin set** | `2026.10` — the stack is pinned as one set, named by its date. `engine.version` in `project.yaml` is this name. |
| **Project Pinned** | 2026-10-18 |
| **Last Docs Verified** | 2026-10-18 |
| **LLM Knowledge Cutoff** | May 2025 |

## Components

Each version was read on 2026-10-18 from its source: `npm view <package> version` (the npm registry) and, for Node,
`https://nodejs.org/dist/index.json`. The studio's starter (`studio/engines/web/scaffold/`, copied by
`python3 -m studio scaffold web`) pins exactly these versions, and a test keeps the two in step.

| Component | npm | Version | Released / note |
|-----------|-----|---------|-----------------|
| Node.js LTS «Krypton» | `node` | 24.22.1 | 2026-10-21, security release (CVE-2026-111497 and nine more); 24.22.0 was 2026-10-14. Node 26 is the current release, not LTS yet |
| TypeScript | `typescript` | 7.0.2 | 2026-07-08. The native compiler. Last 6.x: 6.0.3 |
| three.js | `three` | 0.186.1 | r186 |
| three.js types | `@types/three` | 0.186.0 | |
| Node types | `@types/node` | 24.19.2 | latest 24.x types |
| Vite | `vite` | 8.3.4 | |
| Vitest | `vitest` | 5.0.5 | |
| Playwright | `@playwright/test` | 1.64.1 | `tests/e2e/`, `npm run e2e` |
| Capacitor | `@capacitor/core` | 8.5.3 | |
| Capacitor CLI | `@capacitor/cli` | 8.5.3 | |
| Capacitor Android | `@capacitor/android` | 8.5.3 | |
| Capacitor iOS | `@capacitor/ios` | 8.5.3 | |
| glTF-Transform CLI | `@gltf-transform/cli` | 4.5.1 | 2026-09-28. `etc1s`/`uastc` spawn KTX-Software's `ktx` 4.4.0+ (`bash studio/web/install-ktx.sh`) |
| gltfpack | `gltfpack` | 1.3.0 | 2026-09-25. meshoptimizer v1.3, WebAssembly build, no dependencies |
| Spector.js | `spectorjs` | 0.9.33 | 2026-09-14. WebGL frame capture, dev builds only |

**Starter verified** on 2026-10-18 in the studio's cloud container with Node 24.22.0: `npm install`,
`npm run typecheck` (TypeScript 7.0.2), `npm test` (Vitest 5.0.5, 7 tests), `npm run build` (Vite 8.3.4),
`npm run autopilot` (five seeds, and its self-test exits 1), `npm run e2e` (Playwright 1.64.1, the capture at 1280x720),
the server started with `node src/main.ts`, and `npx cap add android` (Capacitor 8.5.3: minSdk 24, SDK 36). Building and
running on Android or iOS is not verified: the cloud has no Android SDK, adb or Xcode.

## Known limits of this set

- **TypeScript 7 ships no programmatic API**, so tools that load TypeScript as a library do not work with it yet:
  typescript-eslint (peer range `<6.1.0`; support for 7.1 in progress, no date) and the Volar-based tools. Microsoft's
  workaround is to keep TypeScript 6 as the `typescript` package those tools load and 7 under another name, so `tsc`
  runs 7 (`breaking-changes.md`, «Tools that need the TypeScript API»). The starter has no ESLint, so it is not
  affected; a game that adds typed ESLint rules needs the workaround. Pinned by the human's decision of 2026-10-18.
- **Node 24 enters Maintenance LTS on 2026-10-20**, and Node 26 becomes Active LTS on 2026-10-28. Both are LTS and fit
  for production; the next pin set should consider Node 26.
- **Vite 8's default browser target (Safari 16.4, Chrome 111) is above Capacitor 8's minimum (iOS 15.0, Android API
  24).** Whether those devices' WebViews run the build is not verified: set the iOS deployment target to 16.4, or
  lower Vite's `build.target`, and check on the oldest device (`.claude/docs/run-and-observe.md`, «Web on Android»).

## Knowledge Gap Warning

The LLM's training data stops around May 2025. Every component above has had at least one major release since:
TypeScript 6 and 7, Vite 7 and 8, Vitest 4 and 5, Capacitor 8, Node 24 as LTS, and three.js some ten releases. The
risk is **HIGH** for all of them. Read `breaking-changes.md`, `deprecated-apis.md` and `current-best-practices.md` in
this folder before suggesting an API, a config option or a CLI flag. When they do not cover it, write
`NOT SOURCEABLE — <what> is not covered by docs/engine-reference/web/` instead of answering from memory.

## Installed-Version Gap Warning

This reference can sit **ahead of** what a game has installed: `package.json` and the lockfile decide what runs.
**Check `Installed at pin time` above, and `package.json`, before trusting a version-qualified claim.**
`NOT DETERMINED` means the gap is unknown, not absent.

## Verified Sources

- npm registry: `npm view <package> version` (https://www.npmjs.com/package/typescript and the other package pages)
- Node.js releases: https://nodejs.org/dist/index.json and https://nodejs.org/en/about/previous-releases
- Per-component release notes: listed in `breaking-changes.md`, next to each change.
