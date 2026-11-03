# GAMESTUDIO adoption

Ventana Lunar does not start from the GAMESTUDIO template. It carries only the specialist agents and the few skills it
uses, so a session opened from this repository alone has them (VENT-65, the human's decision, 2026-11-03). They were copied from
`JavierCervilla/GAMESTUDIO` at commit `42553a8917c2ff8f2c4905707859f4795a834397`, with `technical-artist` and
`ui-programmer` raised to 80 turns as GAME-26 does there. **What is not listed here is not in Ventana Lunar.** To bring
in another piece, add its row here in the same PR, with its dependencies (`grep` the piece for `.claude/` and `docs/`
paths and check each one exists).

The framework's roles (`arquitecto`, `planificador`, `implementador`, `verificador`, `seguridad`, `qa`,
`qa-adversario`) are not copied: they live in `JavierCervilla/AgenticFramework`, which every session needs anyway for
the vault, the hooks and the Dashboard scripts.

## What came in

| Block | Pieces | Why |
|---|---|---|
| Agents (`.claude/agents/`) | threejs-specialist, technical-artist, ui-programmer, web-specialist (80 turns); typescript-specialist, node-server-specialist, capacitor-specialist, performance-analyst, accessibility-specialist (40) | The specialists this project's trajectories launch: the 3D view and globe, the ground and other rendering work, the interface, the web stack and its sub-specialists, performance and accessibility. Reviewers stay at 40 turns, builders at 80 |
| Engine reference | `docs/engine-reference/web/` | The Web stack reference the specialists read |
| Method docs | `.claude/docs/web-mobile-performance.md`, `.claude/rules/test-standards.md` | Cited by the agents above |
| Skills (`.claude/skills/`) | perf-profile, test-flakiness, code-review, regression-suite | The human's choice for a web 3D app: profile against a budget, find flaky e2e in CI logs, architectural review, regression coverage against fixed bugs |
| Config for those skills | `project.yaml` (written for Ventana Lunar: engine Web, kind `tool`, stage Production), `.claude/hooks/yaml-helper.sh` (`resolve_config`), `.claude/docs/automation-modes.md`, `config-resolution.md`, `workflow-modes.md`, `effects-map.md` (the schema) | Every GAMESTUDIO skill resolves its knobs through `yaml-helper.sh` from `project.yaml` |

## What stayed out, and why

- `project.yaml` and `.claude/docs/technical-preferences.md` (cited by `ui-programmer` and `web-specialist`): this
  repository's stack, rules and limits are in `CLAUDE.md`; an agent that finds no `project.yaml` reads `CLAUDE.md`.
- `.claude/docs/autopilot-playtest.md` and `.claude/docs/run-and-observe.md` (cited by `web-specialist`,
  `typescript-specialist` and `capacitor-specialist`): they are about games; Ventana Lunar's checks are the commands in
  `CLAUDE.md` (lint, typecheck, unit, build, e2e) and its screenshots.
- The other references in `technical-artist` (Unreal's best practices) belong to engines this project does not use.
- Every other GAMESTUDIO skill, hook, template and director gate: they are for making games, and AgenticFramework
  provides the process here (its skills come with the AgenticFramework repository in every session).
- Paths the four skills and the config docs mention that do not exist here and are not needed: game design documents
  and their templates (`design/gdd/`, `.claude/docs/templates/`), `production/` folders the skills write their reports
  into (created on first use), `docs/architecture/` ADRs, director gates, the `gate-check` skill, the v1 config migration
  script and the Godot, Unity and Unreal references. This repository's tests live in `packages/*/tests/` and
  `tests/e2e/`, not in `tests/unit/` or `tests/regression/`.
- `.claude/docs/coding-standards.md` (cited by the web engine reference's `modules/input.md` and `modules/rendering.md`):
  this repository's code rules are the Clean Code section of `CLAUDE.md`.
- `.claude/rules/skill-authoring.md` (cited by `.claude/rules/test-standards.md`): no GAMESTUDIO skills are carried.
- Paths and agents the specialists name that do not exist here and have no effect: `design/accessibility-requirements.md`
  and `production/qa/accessibility/` (accessibility-specialist), `assets/ASSET_LICENSES.md` (threejs-specialist; this
  repository keeps provenance in `ASSETS.md`), the `/perf-profile` skill (performance-analyst), and the studio agents
  ux-designer, art-director, technical-director, lead-programmer, engine-programmer, gameplay-programmer and producer.
