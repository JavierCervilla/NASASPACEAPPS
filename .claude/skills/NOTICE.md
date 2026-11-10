# Vendored skills

| Skill | Source | Commit | License |
|---|---|---|---|
| `apple-design` | [emilkowalski/skills](https://github.com/emilkowalski/skills/tree/a81dbca/skills/apple-design) | `a81dbca` | MIT (`apple-design/LICENSE`) |
| `motionsites-web-builder` | [Motionsites-AI/claude-skill](https://github.com/Motionsites-AI/claude-skill) | `faa30d512e3973e58675c72101a7ef42ed37ae83` | Instructions, references and script: MIT. Examples and media: © MotionSites (`motionsites-web-builder/LICENSE`) |

Copied verbatim. To update, copy `skills/apple-design/SKILL.md` from a newer commit and bump the row above.

## motionsites-web-builder

Copied on 2026-11-09 from `JavierCervilla/universelle-web` (branch `claude/UNI-9-design-skills`), itself identical to the
copy reviewed on 2026-11-03 in `JavierCervilla/portfolio`: `SKILL.md` and `scripts/shoot.py` read in full (the script
only takes local screenshots with Playwright and lists page errors); no commands that run on their own, no hidden or
encoded text, and the domains are its website, its media host, Google Fonts and CDNs.

- `SKILL.md`: the «Sponsored by MotionSites» section and the order to add it are removed; a «No promotion» section
  replaces them.
- `examples/` and `media/` are not in the repo: their licence forbids redistributing them.
  `scripts/motionsites-library.sh` downloads them from the reviewed commit, strips the promotion lines and fails if any
  is left.
- Here its default output (one `index.html` with CDN libraries) does not apply: the page's CSP is `default-src 'self'`,
  so its method and techniques are used inside the Astro web, with every file served from the site.

To update: change the commit in the script and in this table only after reviewing `SKILL.md`, `scripts/` and the
promotion of the new commit again.

# Ported code

| Code | Source | License |
|---|---|---|
| `packages/web/src/devtools/` (dev tools: performance readout, breadcrumbs, Spector.js on request), `packages/web/src/lib/quality.ts`, `packages/web/tests/perf-hud.test.ts` | GAMESTUDIO's Web starter, `studio/engines/web/scaffold/packages/client/src/engine/{dev-tools,perf-hud,breadcrumbs,quality}.ts` (same owner) | Same owner; GAMESTUDIO itself builds on Claude Code Game Studios (MIT) |

Adapted, not copied verbatim: English labels, a renderer adapter instead of a Three.js import, and the project's tokens.
Spector.js is pinned as a dev dependency (`spectorjs` 0.9.33, MIT) and loaded only on `#stats-spector`.
