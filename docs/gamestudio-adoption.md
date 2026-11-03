# GAMESTUDIO adoption

Ventana Lunar does not start from the GAMESTUDIO template. It carries only the specialist agents it uses, so a session
opened from this repository alone can launch them (VENT-65, the human's decision, 2026-11-03). They were copied from
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

## What stayed out, and why

- `project.yaml` and `.claude/docs/technical-preferences.md` (cited by `ui-programmer` and `web-specialist`): this
  repository's stack, rules and limits are in `CLAUDE.md`; an agent that finds no `project.yaml` reads `CLAUDE.md`.
- `.claude/docs/autopilot-playtest.md` and `.claude/docs/run-and-observe.md` (cited by `web-specialist`,
  `typescript-specialist` and `capacitor-specialist`): they are about games; Ventana Lunar's checks are the commands in
  `CLAUDE.md` (lint, typecheck, unit, build, e2e) and its screenshots.
- The other references in `technical-artist` (Unreal's best practices) belong to engines this project does not use.
- Every GAMESTUDIO skill, hook, template and director gate: AgenticFramework provides the process here.
