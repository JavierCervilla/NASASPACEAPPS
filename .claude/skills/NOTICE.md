# Vendored skills

| Skill | Source | Commit | License |
|---|---|---|---|
| `apple-design` | [emilkowalski/skills](https://github.com/emilkowalski/skills/tree/a81dbca/skills/apple-design) | `a81dbca` | MIT (`apple-design/LICENSE`) |

Copied verbatim. To update, copy `skills/apple-design/SKILL.md` from a newer commit and bump the row above.

# Ported code

| Code | Source | License |
|---|---|---|
| `packages/web/src/devtools/` (dev tools: performance readout, breadcrumbs, Spector.js on request), `packages/web/src/lib/quality.ts`, `packages/web/tests/perf-hud.test.ts` | GAMESTUDIO's Web starter, `studio/engines/web/scaffold/packages/client/src/engine/{dev-tools,perf-hud,breadcrumbs,quality}.ts` (same owner) | Same owner; GAMESTUDIO itself builds on Claude Code Game Studios (MIT) |

Adapted, not copied verbatim: English labels, a renderer adapter instead of a Three.js import, and the project's tokens.
Spector.js is pinned as a dev dependency (`spectorjs` 0.9.33, MIT) and loaded only on `#stats-spector`.
