# Ventana Lunar

Static web for the **NASA Space Apps Challenge 2026** (challenge: *CLPS Lunar Mission Browser*, Madrid, 14-15 November
2026). For any lunar south pole landing site and any date it answers two questions: will the lander have **Sun**
(power) and will it **see Earth** (comms)? Where both are yes there is a landing **window**. Extra: which Deep Space
Network antenna (Goldstone, Canberra, Robledo de Chavela) is listening.

Spec and roadmap (the source of truth for scope): Claude Docs «Ventana Lunar · Especificación y roadmap». Framework
epic: `VENT-1` (Dashboard project «Ventana Lunar», prefix `VENT`).

## Hackathon rule: no solution code before 14 November

Space Apps requires the solution to be built during the event, and the submission form asks to declare it. Until the
hackathon opens, this repo only holds **preparation**: tooling, CI, deploy, design rules, a hello world page. Do **not**
write before 14 November: the Horizons script for the real sites, the calendar strip, the polar map, the globe, the DSN
mode. If a task would cross that line, stop and ask.

## Stack

- **Web**: Astro 7 (static output) + React 19 islands + TypeScript (strictest). Three.js joins on the hackathon day for
  the globe (luxury 1). No backend, no login, no database: the browser only reads static JSON.
- **Data**: a Python 3 script in `pipeline/` precomputes everything from JPL Horizons into `public/data/` (hackathon
  day). Never call Horizons from the browser.
- **Deploy**: GitHub Pages from `main` (`.github/workflows/deploy.yml`), base path `/NASASPACEAPPS`
  (`SITE_BASE` overrides it).

## Design: follow the `apple-design` skill

Every visible change follows `.claude/skills/apple-design/SKILL.md` (vendored from `emilkowalski/skills`, MIT; see
`.claude/skills/NOTICE.md`). Load it before touching UI. Project-specific rules from the spec on top of it:

- Dark by default (near-black background). One screen, no menus: the jury must understand it in five seconds.
- Four signal colours with fixed meaning, from `src/styles/tokens.css`, and an always-visible legend: Sun
  (`--signal-sun`), Earth (`--signal-earth`), both = window (`--signal-window`), nothing (`--signal-none`). Never use
  them for decoration.
- System font; tracking and leading change with size. Springs critically damped by default. Honour
  `prefers-reduced-motion`, `prefers-reduced-transparency` and `prefers-contrast`.
- Must run on a laptop without a dedicated GPU (globe: 64-segment sphere, 2K texture). Mobile: the strip goes vertical
  and the globe hides.
- UI text is **English** (the global jury is international): this project's exception to the Language rule below. The local pitch is in Spanish and does not live here.

## Commands

| Command | What |
|---|---|
| `npm run dev` | Dev server at `http://localhost:4321/NASASPACEAPPS/` |
| `npm run lint` | ESLint + the anti-slop preset (`eslint.anti-slop.mjs`) |
| `npm run typecheck` | `astro check` |
| `npm test` | Vitest unit tests (`tests/unit/`) |
| `npm run build` | Static build into `dist/` |
| `npm run e2e` | Playwright smoke against the built site (`tests/e2e/`); in a cloud container set `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium-*/chrome-linux64/chrome` |
| `bash .claude/skills/security-gate/scripts/security-gate.sh --strict .` | Security ladder (gitleaks, semgrep, osv-scanner, npm audit) |

Before delivering: lint, typecheck, unit tests, build and e2e green; CI runs the same plus the English gate and the
security ladder.

## Working agreement

Work here is an AgenticFramework trajectory (`VENT-*`): branch + PR, gates green, `ROADMAP.md` and `CHANGELOG.md`
updated in the same PR when something visible changes, architecture diagram in `docs/diagrams/` kept current.
`ROADMAP.md` and `CHANGELOG.md` are written in Spanish (the human reads them).

<!-- english-gate:start -->
## Language
Write everything technical in English: code, identifiers, comments, tests, commit messages, PR titles and bodies,
branch names, technical docs, config, persisted data (keys, enums, states, file names), internal paths, logs and errors
the end user does not see, and prompts or tool fields for LLM agents. Only what an end user reads is in Spanish: the
UI, notifications, reports. To cite Spanish UI text in English, put it between «», e.g.
`// The card says «Todo correcto» when nothing is broken`. A prompt for an agent whose output a person reads says so
explicitly: "Write in Spanish everything a person will read". The English gate (`.english-gate/`) enforces this in CI
and before each commit; its config lists the interface files, the excluded paths and the proper nouns.
<!-- english-gate:end -->
