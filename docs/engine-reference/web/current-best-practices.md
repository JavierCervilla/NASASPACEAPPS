# Web Stack — Current Best Practices

Practices stated by each component's official documentation (read on 2026-10-18, URL on each line), plus the
conventions of the studio's starter (`studio/engines/web/scaffold/`, verified as `VERSION.md` describes).

## The studio's starter

- **npm workspaces monorepo** under `packages/`: `sim` (rules and state; no DOM, three.js or Node imports, enforced by
  its `tsconfig.json`, which loads neither DOM nor Node types), `client` (three.js and Vite) and `server` (Node).
- **Strict TypeScript** from one `tsconfig.base.json`: `strict`, `noUncheckedIndexedAccess`, `isolatedModules`,
  `verbatimModuleSyntax`, `erasableSyntaxOnly`, `noEmit`, and `types` listed per package. Each package type-checks on
  its own: `tsc --noEmit -p packages/<package>`.
- **Tests with Vitest** in `packages/<package>/tests/`, found by the root `vitest.config.ts`.
- **Exact versions** in every `package.json` (no `^` or `~`), equal to `VERSION.md`; a studio test keeps them in step.
- **`build` type-checks first**: Vite transpiles without checking types.

## Type checking

- `tsc` is the only type checker in the pipeline. Vite transpiles with Oxc and "does NOT perform type checking"; run
  `tsc --noEmit`. Vite needs `isolatedModules: true` and `vite/client` in `types`. — https://vite.dev/guide/features
- Vitest checks types only in `--typecheck` mode, by calling `tsc`. — https://vitest.dev/guide/testing-types
- Playwright runs tests even with type errors: run `tsc --noEmit` in CI before `playwright test`. — https://playwright.dev/docs/test-typescript
- Set `rootDir` and `types` explicitly: TypeScript 7 changed both defaults. — https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
- Keep tools that need the TypeScript API (typescript-eslint) on 6.0 through the `@typescript/typescript6` alias
  until they support 7. — https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/

## Node

- Production runs only Active LTS or Maintenance LTS releases. — https://nodejs.org/en/about/previous-releases
- For code Node runs straight from TypeScript: `noEmit`, `erasableSyntaxOnly`, `verbatimModuleSyntax`, imports with
  their `.ts` extension, `import type` for types, and `#` subpath imports instead of `tsconfig` `paths`.
  — https://nodejs.org/docs/latest-v24.x/api/typescript.html

## three.js

- Install from npm with a build tool (Vite is the example); import addons from `three/addons/…`.
  — https://threejs.org/manual/pages/installation.html
- `WebGLRenderer` is the recommended choice for pure WebGL 2 applications; `WebGPURenderer` (`three/webgpu`) is still
  experimental, falls back to WebGL 2 and does not support `ShaderMaterial`, `RawShaderMaterial`, `onBeforeCompile()`
  or `EffectComposer`. With it, drive frames with `setAnimationLoop()` or `await renderer.init()` first.
  — https://threejs.org/manual/pages/webgpurenderer.html
- Colour management is on by default with a Linear-sRGB working space: colour textures take
  `texture.colorSpace = SRGBColorSpace`, data textures (normal, roughness) keep `NoColorSpace`, post-processing needs
  `OutputPass`. — https://threejs.org/manual/pages/color-management.html
- Prefer glTF 2.0 with `GLTFLoader`. — https://threejs.org/manual/pages/color-management.html
- Update in steps of 10 releases. — https://github.com/mrdoob/three.js/wiki/Migration-Guide

## Playwright

Source: https://playwright.dev/docs/best-practices

- Test what the user sees; keep tests isolated; mock third-party services with the Network API.
- Use locators and web-first assertions (`await expect(locator).toBeVisible()`), not `expect(await locator.isVisible())`.
- Lint for floating promises (`@typescript-eslint/no-floating-promises`) — blocked with TypeScript 7 until
  typescript-eslint supports it (see `breaking-changes.md`) — and run `tsc --noEmit` in CI.
- Use the trace viewer to debug CI failures; install only the browsers CI needs.

## Capacitor

- Edge-to-edge comes from the core SystemBars plugin; `insetsHandling: "native"` is the recommended mode on Android,
  and the default `css` mode injects `--safe-area-inset-*` variables. — https://capacitorjs.com/docs/apis/system-bars
- Upgrade with `npm i -D @capacitor/cli@latest` and `npx cap migrate`. — https://capacitorjs.com/docs/updating/8-0
