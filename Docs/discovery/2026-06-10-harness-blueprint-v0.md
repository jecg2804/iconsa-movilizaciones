<!-- Generado del discovery 360 (workflow wf_7e3ade5d-588, 17 agentes, 2026-06-10). -->
<!-- STATUS: discovery — entendimiento, no decisiones. Caveats del critico adversarial en Docs/discovery/README.md -->

# HARNESS BLUEPRINT v0 — el foundation duradero

> **Qué es:** input de discusión, NO decisión. Tabla a-la-carta de qué pieza cubre cada necesidad del workflow, cherry-pickeada del framework que mejor la resuelve, con gaps que justifican piezas propias y conflictos a evitar. Criterio rector: **durabilidad y simplicidad > novedad**. Todo lo afirmado sobre los setups actuales fue verificado contra el filesystem el 2026-06-10 (regla de oro #1: código > docs).

---

## 0. Estado verificado de los dos harnesses (hoy)

### movimientOS (`C:\Users\Jaime Cucalon\Documents\iconsa_apps\movimientOS\.claude\`)

| Capa | Estado verificado |
|---|---|
| **Plugins** | 10 habilitados en `settings.json`: superpowers-extended-cc (fork pcvelz), sentry, code-review, code-simplifier, feature-dev, playwright, skill-creator, **ralph-loop**, security-guidance, commit-commands |
| **Hooks nativos CC** | **NINGUNO** (no hay key `hooks` en settings.json) |
| **Subagents** | **NINGUNO** (no existe `.claude/agents/`) |
| **Skills propias** | 10: crud-page, events-page, supabase-queries, partial-delivery, seed-data, technical-decisions, form-submit-guard, git-release, debug-skydata, fe-bd-integration-tests |
| **Rules** | 6: commit-after-step, git-workflow, plan-lifecycle, spec-lifecycle, supabase-readonly, tool-usage |
| **Enforcement** | Deny-list (11 tools Supabase mutantes + git push main/force/no-verify/reset-hard/rebase-i + EnterPlanMode) + Husky (pre-commit, pre-push con gate de build-status, post-commit build en background) |
| **Verificación** | `package.json` **sin `typecheck` ni `verify`**; `test` = Playwright **roto** (AD-5 + BL-E2E-AUTH-BLOCKED en BACKLOG) |

### HumanOS (`c:\Users\Jaime Cucalon\Documents\iconsa_apps\HumanOS\.claude\`)

| Capa | Estado verificado |
|---|---|
| **Hooks nativos CC** | 6 en PowerShell: SessionStart (inyecta framing de schemas/reglas), UserPromptSubmit (**skill-router** contra `skill-rules.json` v2.0 con niveles de enforcement y word-boundary matching), PreToolUse (**bloquea writes Supabase MCP a schemas prohibidos con wildcard de namespace** — fix HOOK-MCP-GAP), PostToolUse (`tsc --noEmit` con debounce 30s tras Edit/Write de .ts/.tsx), PreCompact (HANDOFF.json con estado git + archivos recientes), Stop (recordatorio advisory de `npm run verify`, debounce 10 min, respeta `stop_hook_active`) |
| **Subagents** | 4: migration-reviewer, rls-reviewer, sop-chain-auditor, test-runner (los 3 reviewers son read-only por diseño) |
| **Skills** | 8: grill-with-docs / diagnose / handoff (mattpocock vendoreadas; grill ya tiene el **seam Superpowers**: lee `docs/superpowers/specs/`, solo escribe CONTEXT.md y ADRs) + 5 iconsa-* propias (business-rules, supabase-migration, rls-validation, form-implementation, library-docs-check) |
| **Verificación** | `npm run verify` = typecheck && lint && vitest && **docs:check** && build. `docs:check` = `scripts/check-docs.mjs` — **el op LINT de Karpathy ya existe parcialmente aquí** |
| **Plugins** | Solo `claude-code-setup` a nivel proyecto. Superpowers NO aparece en el settings.json del repo (posiblemente a nivel usuario — **no verificado**, ver Q9) |

**Lectura:** los dos repos resolvieron problemas distintos y son complementarios casi perfectos. movimientOS tiene la capa de **proceso** (Superpowers + rules + docs vivos); HumanOS tiene la capa de **enforcement y verificación** (hooks + reviewers + verify gate + docs lint). El blueprint es, en esencia, cruzar lo mejor de cada uno y empaquetarlo para la app #3.

---

## 1. Principios (de los dos researches, validados)

1. **Robar ideas, no sistemas.** GSD (repo original archivado), gstack, ECC y Ralph-como-workflow quedan rechazados como sistemas — decisión HumanOS 2026-05-29 re-ratificada por el research (la migración forzosa de GSD materializó el riesgo exacto).
2. **Hooks = enforcement, CLAUDE.md = advisory.** "Guardrails in hooks, not in CLAUDE.md" (doctrina oficial). HumanOS ya lo vive; movimientOS depende de deny-list + disciplina documental.
3. **Verificación es el elemento de mayor leverage.** "Give Claude a check it can run." Sin check ejecutable, James ES el loop de verificación y nada escala.
4. **Contexto: smallest set of high-signal tokens.** CLAUDE.md ~200 líneas efectivas; el auto-load actual de movimientOS (CLAUDE.md + TRAIL + CHANGELOG con SQL completo + BACKLOG + 6 rules) excede esto por mucho — soporte cuantitativo externo a BL-CLAUDE-FOLDER-CLEANUP.
5. **Un solo dueño por stage del pipeline.** El anti-pattern #1 documentado es 2+ skills/frameworks compitiendo por el mismo momento del workflow.

---

## 2. LA TABLA A-LA-CARTA

| # | Necesidad | Pieza que la cubre mejor | Cherry-pick de | Estado mOS / HumanOS | ¿Skill PROPIA? |
|---|---|---|---|---|---|
| 1 | **Planning** | `superpowers:brainstorming` → `writing-plans` → `executing-plans`; **grill-with-docs ANTES del plan** para decisiones hard-to-reverse | Superpowers (pcvelz, instalado) + mattpocock (vendoreado HumanOS, seam ~12 líneas ya diseñado) | mOS: Superpowers sí, grill NO / HumanOS: ambos | No. Portar grill a mOS con su seam (requiere crear CONTEXT.md/ADRs allí o adaptar a TRAIL+specs) |
| 2 | **TDD** | `superpowers:test-driven-development` + gates ejecutables reales | Superpowers (ya instalado) | mOS: skill existe pero **sin check que correr** (sin typecheck, E2E roto) / HumanOS: vitest + verify operativos | No. El gap es **infra**, no skill: `npm run typecheck` + unit runner en mOS, y cerrar AD-5/BL-E2E-AUTH-BLOCKED |
| 3 | **Debugging** | `superpowers:systematic-debugging` (3+ archivos) + `fix-bug` command local (1-2 archivos) + evidencia vía Supabase `get_logs`/Sentry MCP/Chrome DevTools | Superpowers + command propio ya existente | mOS: ambos / HumanOS: usa `diagnose` (mattpocock) — **solapamiento C1** | No |
| 4 | **Review** | Escalera: self-review (`requesting-code-review`) → **subagents especializados read-only** (migration-reviewer, rls-reviewer) → plugin `code-review` en PR/release → `codex:rescue` como segundo modelo bajo pedido | Subagents: **HumanOS → mOS** (adaptados a public.*); resto ya instalado | mOS: solo genéricos / HumanOS: especializados sí | No. Portar los 2 reviewers; definir frontera de la escalera (C2) |
| 5 | **DB changes** | Convención `[bd-pending]→[bd]` + deny-list + **PreToolUse hook con wildcard de namespace** (defensa en profundidad) + migration-reviewer + skill de workflow de migración | Hook y reviewer: **HumanOS → mOS**; convención: mOS (ya validada externamente por guía Supabase) | mOS: deny-list por nombre exacto de tool (frágil ante renames de namespace) / HumanOS: hook robusto | **Sí (adaptación):** versión mOS de `iconsa-supabase-migration` que formalice pre-merge queries + rollback + `[bd-pending]` (hoy vive disperso en rules + CHANGELOG) |
| 6 | **Docs sync** | **Op LINT de Karpathy** = `check-docs.mjs` dentro de `verify` + Stop hook advisory que recuerda CHANGELOG/TRAIL pendientes | **HumanOS → mOS** (`scripts/check-docs.mjs` ya corre allí; mOS no tiene nada y es donde los docs más se contradicen — origen de la regla de oro #1) | mOS: nada / HumanOS: live | **Sí — gap propio #1:** docs-lint para mOS (TRAIL cap 1 página, refs a archivos existentes, estados canónicos como 'En Transito' sin acento, contradicciones CLAUDE.md↔BACKLOG↔TRAIL) |
| 7 | **Context / memoria** | TRAIL.md (structured note-taking, patrón oficial) + `handoff` skill + **PreCompact hook (HANDOFF.json)** + **SessionStart(compact) re-inject** + MEMORY.md (auto-memory, ya activo) | TRAIL: mOS (ya alineado con Anthropic); hooks: **HumanOS → mOS** | mOS: TRAIL sí, hooks NO (hoy compactar pierde TRAIL/reglas) / HumanOS: completo | No. Pero sí **poda**: CHANGELOG auto-cargado con SQL completo viola el presupuesto de contexto (Q4) |
| 8 | **Verificación** | `npm run verify` compuesto + PostToolUse tsc debounced + test-runner subagent + Husky build gate (ya existe) + `verification-before-completion` (ya instalado) | Patrón verify + hook + subagent: **HumanOS → mOS** | mOS: solo build vía Husky / HumanOS: gate completo de 5 pasos | No. Es infra. **Prerequisito duro de todo lo demás:** AD-5 + BL-E2E-AUTH-BLOCKED |
| 9 | **Evals** | `skill-creator` modos Eval/Benchmark (plugin ya habilitado) + 20-50 assertions binarias derivadas de fallos reales (acento 'En Transito', tarifa obligatoria, no-líneas-post-Borrador, RLS por rol) corridas con `claude -p` | Anthropic (doctrina "Demystifying evals") | Ninguno tiene nada | **Sí, pero ÚLTIMO:** carpeta `harness-evals/` + runner. Diferible hasta que 1-8 estén estables |
| 10 | **Multi-CLI (Codex)** | `AGENTS.md` <150 líneas (build/test/estilo/commits/estados canónicos) + import `@AGENTS.md` en CLAUDE.md (Windows: NO symlink) | Estándar agents.md | Codex YA audita mOS (audit-C/D-codex en git status) sin archivo de instrucciones | **Sí — gap propio #2:** escribir AGENTS.md a mano (los autogenerados degradan performance según el research) |
| 11 | **Packaging multi-app** | **Plugin interno ICONSA** (marketplace = repo git propio): rules compartidas (supabase-readonly, git-workflow), hooks (PreToolUse guard, PostToolUse tsc, PreCompact, Stop), skills transversales, subagents reviewers | Doctrina oficial: "a second repo needs the same setup → plugin" | Hoy: copy-paste implícito y **drift ya materializado** (los dos repos divergieron en todo) | **Sí — gap propio #3 y la pieza de durabilidad más importante** para el norte multi-app (app de inventario viene) |

---

## 3. Conflictos y solapamientos a evitar

- **C1 — `diagnose` vs `systematic-debugging`:** compiten por el mismo stage (bug → método). Hoy conviven porque viven en repos distintos, pero el plugin interno los pondría en colisión. Hay que elegir UN dueño del stage (la opción simple: systematic-debugging, porque viene con el plugin que ya se auto-mantiene; diagnose se retira o queda como referencia).
- **C2 — tres reviewers genéricos:** `requesting-code-review` (Superpowers) + plugin `code-review` + `codex:rescue` se pisan si no hay frontera. Propuesta de frontera para discutir: Superpowers al cerrar cada task; plugin code-review solo en PR/release; Codex solo bajo pedido explícito de James. Los subagents especializados (migration/rls) NO conflictúan — revisan otra cosa.
- **C3 — `ralph-loop` habilitado en mOS:** contraindicado para brownfield con BD de producción según el propio inventor de la técnica. O se deshabilita, o se deja con regla escrita de "solo refactors mecánicos acotados con done-gate objetivo".
- **C4 — plugins que duplican stages en mOS:** `feature-dev` solapa con brainstorming→writing-plans (mismo stage de planning); `commit-commands` solapa con la rule commit-after-step (y `commit-push-pr` violaría la política Code-no-pushea). Candidatos a poda dentro de BL-CLAUDE-FOLDER-CLEANUP.
- **C5 — skill-router (UserPromptSubmit) vs auto-invocación nativa de skills:** dos mecanismos de selección de skills activos a la vez es el anti-pattern de competencia por el pipeline. El router de HumanOS existe para *enforcement levels* (critical/high/suggest), no solo para descubrimiento. Decidir si es pieza del blueprint multi-app o particularidad de HumanOS — NO portarlo a mOS por defecto.
- **C6 — presupuesto de contexto en mOS:** CLAUDE.md (~300 líneas) + CHANGELOG completo con cuerpos SQL + BACKLOG + TRAIL + 6 rules auto-cargados. No es conflicto de piezas sino de presupuesto: la doctrina y la literatura coinciden en que esto diluye las instrucciones reales. La poda es prerequisito para que cualquier pieza nueva tenga señal.
- **C7 — NO-conflicto a proteger de falsa poda:** Husky (git-time) y hooks CC (tool-time) NO se solapan — son capas complementarias de momentos distintos. Igual deny-list (capa settings) + PreToolUse hook (capa runtime): los hooks solo endurecen, nunca aflojan. Layered defense correcto, mantener ambos.
- **C8 — frameworks rechazados siguen rechazados:** GSD/gstack/ECC/Ralph-sistema. El único steal pendiente del research era el LINT de Karpathy — y HumanOS ya lo tiene embrionario en `check-docs.mjs`, así que el steal es interno (HumanOS → mOS), no externo.

---

## 4. Gaps que justifican pieza PROPIA (solo 4)

1. **docs-lint para mOS** (necesidad #6): adaptación de `check-docs.mjs` a los docs vivos de mOS. Es la respuesta de proceso a la regla de oro #1 de este discovery.
2. **AGENTS.md** (necesidad #10): escrito a mano, <150 líneas, con import en CLAUDE.md. Codex ya trabaja en el repo sin instrucciones — el gap es real hoy, no especulativo.
3. **Plugin interno ICONSA** (necesidad #11): el vehículo que convierte todo lo anterior en foundation reutilizable para la app #3 (inventario) sin drift. Sin esto, cada cherry-pick HumanOS→mOS se hace dos veces y diverge.
4. **harness-evals/** (necesidad #9): diferible, último en la cola.

Todo lo demás se cubre cherry-pickeando lo ya existente: **ninguna pieza de framework externo nuevo entra al blueprint.**

## 5. Secuencia de dependencia sugerida (para discutir, no ejecutar)

```
(0) Poda de contexto mOS (C6, BL-CLAUDE-FOLDER-CLEANUP) ── prerequisito de señal
(1) Verificación mOS: typecheck + verify script + AD-5/BL-E2E-AUTH ── prerequisito de todo gate
(2) Port de hooks HumanOS→mOS (PreToolUse guard, PostToolUse tsc, PreCompact, Stop)
(3) Port de reviewers (migration/rls adaptados) + docs-lint mOS + AGENTS.md
(4) Plugin interno ICONSA (empaqueta 2+3 para la app #3)   ←── decidir si 2-3 se hacen
(5) Evals                                                        directo DENTRO del plugin (Q5)
```



---

## Key points

- Verificado contra filesystem (no docs): movimientOS tiene proceso (Superpowers pcvelz + 10 skills + 6 rules + deny-list + Husky) pero CERO hooks CC, cero subagents, sin typecheck/verify y E2E roto; HumanOS tiene enforcement (6 hooks PS1 nativos, 4 subagents read-only, skill-router, verify de 5 pasos con docs lint) — son complementos casi perfectos y el blueprint es cruzarlos, no adoptar nada externo nuevo.
- El op LINT de Karpathy — el unico steal nuevo que ambos researches recomendaban — ya existe embrionario en HumanOS (scripts/check-docs.mjs dentro de npm run verify); el steal es interno HumanOS→movimientOS, donde los docs contradictorios son justamente el origen de la regla de oro #1 del discovery.
- El gap #1 de movimientOS segun la doctrina oficial es verificacion: sin npm run typecheck, sin verify compuesto, y con la suite E2E rota (AD-5 + BL-E2E-AUTH-BLOCKED), Claude no tiene 'a check it can run' — esto es prerequisito de cualquier hook de gate, TDD real, CI agent o eval.
- Solo 4 piezas propias se justifican: docs-lint mOS, AGENTS.md escrito a mano (Codex ya audita el repo sin instrucciones), plugin interno ICONSA (la pieza de durabilidad #1 para la app #3 de inventario — el drift entre repos ya se materializo), y harness-evals (ultimo en la cola, diferible).
- Conflictos concretos a resolver antes de portar nada: diagnose vs systematic-debugging (mismo stage, elegir UN dueño), 3 reviewers genericos sin frontera (Superpowers/plugin code-review/codex), ralph-loop habilitado en brownfield con BD de prod (contraindicado por su propio inventor), plugins feature-dev y commit-commands que duplican stages ya cubiertos, y el skill-router de HumanOS que NO debe portarse a mOS por defecto.
- NO-conflictos a proteger de falsa poda: Husky (git-time) + hooks CC (tool-time) y deny-list (settings) + PreToolUse hook (runtime) son capas complementarias correctas — los hooks solo endurecen; mantener ambas.
- La poda de contexto de movimientOS (CLAUDE.md ~300 lineas + CHANGELOG autocargado con SQL completo + BACKLOG + 6 rules) es prerequisito de señal para todo lo demas — coincide con BL-CLAUDE-FOLDER-CLEANUP ya en BACKLOG y con el limite efectivo de ~200 lineas documentado en la literatura 2026.
- Dato no verificado que requiere chequeo: Superpowers no aparece en el settings.json de proyecto de HumanOS (solo claude-code-setup) — posiblemente habilitado a nivel usuario; confirmar antes de asumir paridad de harness entre repos.

## Preguntas abiertas para James

1. C1 debugging: ¿estandarizamos en superpowers:systematic-debugging como unico dueño del stage (y diagnose de HumanOS se retira/queda como referencia), o preferis diagnose y excluimos systematic-debugging alli? El plugin interno fuerza esta decision.
2. C3 ralph-loop: ¿lo deshabilitamos en movimientOS hasta que aparezca un caso de uso real (refactor mecanico con done-gate objetivo), o lo dejamos habilitado con regla escrita de uso excepcional?
3. Q4 CHANGELOG: ¿movemos los cuerpos SQL completos de las entries [bd] a archivos referenciables (just-in-time) dejando entries de ~5 lineas? Rompe la convencion actual que Chat tambien usa para aplicar migraciones — hay que coordinar el cambio con Chat.
4. Q5 orden de empaquetado: ¿portamos hooks/reviewers HumanOS→movimientOS directamente (rapido, pero se hace dos veces), o creamos primero el plugin interno ICONSA y movimientOS lo consume desde el dia 1 (mas lento, cero drift)?
5. Verificacion: ¿arreglar BL-E2E-AUTH-BLOCKED + AD-5 es prerequisito del blueprint, o aceptamos por ahora gates menores (tsc --noEmit + build + unit tests para logica pura) como 'check ejecutable' suficiente?
6. C2 frontera de reviewers: ¿te sirve la propuesta Superpowers-al-cerrar-task / plugin-code-review-en-PR-release / Codex-solo-bajo-pedido, o queres otra division?
7. C4 poda de plugins: ¿confirmas retirar feature-dev y commit-commands de movimientOS (solapan con Superpowers y con la politica Code-no-pushea)? ¿Algun otro de los 10 que quieras conservar si o si?
8. C5 skill-router: ¿lo consideras pieza del blueprint multi-app (porque los enforcement levels critical/high te importan) o particularidad de HumanOS que no se exporta?
9. Evals: ¿diferimos harness-evals hasta post-merge-v2 como propone el blueprint, o hay algun fallo recurrente que te gustaria capturar como assertion ya mismo?
10. Verificar: ¿Superpowers esta habilitado a nivel usuario en tu maquina para HumanOS? En el settings.json del repo solo aparece claude-code-setup, y grill-with-docs asume artefactos de Superpowers en docs/superpowers/specs/.
