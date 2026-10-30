# Ventana Lunar

Static web for the **NASA Space Apps Challenge 2026** (challenge: *Lunar Landing Site Navigator*, Madrid, 14-15 November
2026). For any lunar south pole landing site and any date it answers two questions: will the lander have **Sun**
(power) and will it **see Earth** (comms)? Where both are yes there is a landing **window**. Extra: which Deep Space
Network antenna (Goldstone, Canberra, Robledo de Chavela) is listening.

Spec and roadmap (the source of truth for scope): Claude Docs «Ventana Lunar · Especificación y roadmap». Framework
epic: `VENT-1` (Dashboard project «Ventana Lunar», prefix `VENT`).

## Stack

- **Monorepo** (npm workspaces, layout of GAMESTUDIO's Web starter): `packages/web`, `packages/sim` and
  `packages/server`. Web and server import the same `@ventana/sim` and its data contract types.
- **Web** (`packages/web`): Astro 7 (static output) + React 19 islands + TypeScript (strictest). Three.js joins with
  the globe (luxury 1). No login and no user accounts.
- **Sim** (`packages/sim`): pure TypeScript, no network, disk or DOM: the site data contract and the
  visibility, window and DSN logic.
- **Backend** (`packages/server`, Node + Hono; decided 2026-10-29): one service on Dokploy serves all site data, for the
  curated sites and for custom coordinates. It queries JPL Horizons and caches the responses on disk, because Horizons
  is slow and rate limited and the spec wants answers in under 3 s. The browser never calls Horizons directly.
- **Deploy**: Dokploy builds the `Dockerfile` (static build served by nginx, `nginx.conf`) from `main`, at the domain
  root (`SITE_BASE` sets a sub-path if ever needed). The API has its own `packages/server/Dockerfile` (built from the
  repo root, port 3000). Operate it with the framework's `dokploy` skill.

## Design: follow the `apple-design` skill

Every visible change follows `.claude/skills/apple-design/SKILL.md` (vendored from `emilkowalski/skills`, MIT; see
`.claude/skills/NOTICE.md`). Load it before touching UI. Project-specific rules from the spec on top of it:

- Dark by default (near-black background). One screen, no menus: the jury must understand it in five seconds.
- Four signal colours with fixed meaning, from `packages/web/src/styles/tokens.css`, and an always-visible legend: Sun
  (`--signal-sun`), Earth (`--signal-earth`), both = window (`--signal-window`), nothing (`--signal-none`). Never use
  them for decoration.
- System font; tracking and leading change with size. Springs critically damped by default. Honour
  `prefers-reduced-motion`, `prefers-reduced-transparency` and `prefers-contrast`.
- Must run on a laptop without a dedicated GPU (globe: 64-segment sphere, 2K texture). Phones (below 768 px): the globe
  fills the screen at the low or medium tier (1K texture, pixel ratio capped), one finger turns it and two pinch; a glass
  top bar holds the title and the site pill, a draggable bottom sheet (peek, half with four widgets, full with the site
  picker) follows apple-design's sheet physics, and a floating tab bar switches views. Under Save-Data the globe waits
  for a «Load the 3D globe» button.
- UI text is **English** (the global jury is international): this project's exception to the Language rule below. The local pitch is in Spanish and does not live here.

## Clean Code

The code follows Clean Code, and the size limits are enforced by lint:

- **Single responsibility per module**: one reason to change per file. Split by responsibility with clear names,
  never mechanically to fit a limit.
- **Small functions with intention-revealing names**: a reader knows what a function does from its name.
- **Dependencies injected, no hidden globals**: clocks, `fetch`, the file system roots and limits come in as
  parameters or options, so every unit is testable on its own.
- **No dead code, and no comments that restate the code**: comments explain why, not what.
- **Enforced limits**, from the 42 school Norm adapted to TypeScript, as ESLint errors on `packages/*/src/**` in
  `eslint.config.mjs`: `max-lines` 200 per file and `max-lines-per-function` 25 (both skipping blank lines and
  comments), `max-len` 80 columns for code and comments (URLs, strings, template literals and regular expressions
  exempt), `max-params` 4 (pass an options object for more), at most 5 named functions per file (the local rule
  `eslint-rules/max-functions-per-file.mjs`, tested next to it), and `sonarjs/cognitive-complexity` 15. Tests are
  exempt from all of these size limits (they apply to `packages/*/src/**` only). Do not disable a limit inline: if one
  forces something clearly worse, raise it with the human.
- **Leave it cleaner**: every change leaves the code at least as clean as it found it.

## Commands

| Command | What |
|---|---|
| `npm run dev` | Web dev server at `http://localhost:4321/` |
| `npm run server` | API server (`packages/server`, after `npm run build`) at `http://localhost:3000/api/v1/health` |
| `npm run lint` | ESLint + the anti-slop preset (`eslint.anti-slop.mjs`) over every package |
| `npm run typecheck` | `astro check` for the web, `tsc` for sim, server and the root configs and e2e |
| `npm test` | Vitest unit tests of every package (`packages/*/tests/`) |
| `npm run build` | Static web into `packages/web/dist/`, compiled server into `packages/server/dist/` |
| `npm run e2e` | Playwright smoke against the built web (`tests/e2e/`); in a cloud container set `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium-*/chrome-linux64/chrome` |
| `bash .claude/skills/security-gate/scripts/security-gate.sh --strict .` | Security ladder (gitleaks, semgrep, osv-scanner, npm audit) |

Before delivering: lint, typecheck, unit tests, build and e2e green; CI runs the same plus the English gate and the
security ladder.

## Working agreement

Work here is an AgenticFramework trajectory (`VENT-*`): branch + PR, gates green, `ROADMAP.md` and `CHANGELOG.md`
updated in the same PR when something visible changes, architecture diagram in `docs/diagrams/` kept current.
`ROADMAP.md` and `CHANGELOG.md` are written in Spanish (the human reads them).

**Guardián during the hackathon** (human decision, 2026-10-29): `verificador` and `seguridad`, launched by hand
with the round message published by the orchestrator; only a security finding blocks the merge, and everything else
merges and goes to a fix-forward trajectory. QA (human decision, 2026-10-30): `qa` runs on every trajectory that
touches the interface (ephemeral staging, Playwright walkthroughs, screenshots), and `qa-adversario` only at three
milestones: the draggable pin (VENT-10), the MVP close (globe + DSN) and before launch. `qa` findings go to fix
forward. At those milestones a break that `qa-adversario` reproduces in a red test blocks the merge until it is fixed,
and its test then stays as a permanent gate.

**Roadmap canvas** (https://claude.ai/artifact/Sm8QoCwg7DqLbuCSHLPfBg): the live, visual roadmap. It is part of the
definition of done of every step, together with the Dashboard and the vault: when a trajectory or TODO changes state,
update the canvas in the same step with the `ArtifactData` tool (`items/*` status and note, `meta/state` cards and
`updatedAt`; `phases/*` and `milestones/*` when the plan changes). Its data lives in the artifact's database, not in
this repo; only the owner and editors write it. Its text is Spanish (the human reads it).

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
