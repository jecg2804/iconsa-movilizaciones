# Rule: Acceso de Claude Code a Supabase (modelo 2026-06-11)

> **DEPRECADO el three-actor model** (Code read-only / Chat aplica SQL / James decide)
> por directiva de James 2026-06-11. Chat queda FUERA del workflow de BD.
> El flujo `[bd-pending]` → Chat-aplica está MUERTO. Code tiene read/write.
> (Renombrado de `supabase-readonly.md` el 2026-06-11 — el rol ya no es solo lectura.)
>
> **INTERINO:** el diseño completo del harness (hooks, routers, skills, MCPs,
> Codex/agents, doc system) se decide en el paquete H1 y puede refinar estos
> boundaries. Control real hoy: permission prompt (= GO de James antes de
> cada write) + planificar-y-comunicar antes de ejecutar.

## El modelo vigente

| Operación | Permitido | Condición |
|---|---|---|
| **Lectura** (SELECT, pg_catalog, advisors, logs, tipos) | ✅ Cualquier schema, staging y prod | Sin restricción — anunciar en chat cuándo se consulta prod |
| **Escritura/DDL** (INSERT/UPDATE/DELETE/CREATE/ALTER/DROP) | ✅ SOLO schema `public` | **SIEMPRE con confirmación previa de James** — explicar QUÉ y POR QUÉ antes de ejecutar |
| Escritura a CUALQUIER otro schema (`hr.*`, `core.*`, `payroll.*`, `requests.*`, `auth.*`, `storage.*`, `backup.*`...) | ❌ NUNCA | Son territorio de HumanOS / plataforma de datos / sistema |
| Operaciones destructivas de proyecto (pause/restore/reset/merge branch, delete branch, create project) | ❌ deny-list en settings.json | Revisar en paquete H1 |

## Enforcement (interino → harness)

1. **Hoy:** permission prompts de Claude Code (cada `execute_sql`/`apply_migration` pide aprobación interactiva de James = la "confirmación previa") + esta regla + disciplina.
2. **Fase harness (próximo):** hook PreToolUse que inspecciona el SQL y BLOQUEA writes fuera de `public.*` y operaciones sin WHERE en tablas sensibles (modelo HumanOS invertido — allí protegen `public.*` DE HumanOS; aquí es lo único escribible) + reglas en el CLAUDE.md nuevo.

## Convenciones de escritura

- **Staging primero** (`vonwkciosksqspyljzfy`), prod (`bzeoszympkkicwlfdtcn`) solo cambios ya validados en staging.
- Todo cambio de schema nace como **archivo de migración versionado** (`supabase/migrations/`) — el CHANGELOG lo referencia, no lo embebe (reforma en curso).
- Cada DDL lleva: rollback + queries de verificación + entry en CHANGELOG (formato corto).
- Tipos: regenerar `database.ts` tras cambios de schema (contra staging).

## Principio de validación (regla dura, James 2026-06-11)

**NUNCA confiar en documentos ni snippets como verdad** — ni los del repo
(CLAUDE.md, CHANGELOG, auditorías, discovery), ni carpetas de prueba
(`spectrum-tests/`), ni reconstrucciones. SIEMPRE validar contra la FUENTE:
la BD viva (Supabase MCP), el código, y la API/SDX/ODBC cuando aplique.
Los docs son pistas con fecha; la fuente es la BD/código/sistema externo.
Esta sesión ya cazó 3 mentiras documentales por validar contra la fuente
(stats fabricados, "Events V2 en prod", bias del doc system).

## Lo que NO cambia

- Lectura eficiente: queries puntuales, no SELECTs masivos de data.
- Prod se anuncia explícitamente en el chat antes de consultarse.
- Tools de lectura del MCP (list_tables, get_advisors, etc.) siguen siendo la vía preferida para schema; `execute_sql` para lo que ellas no cubren (pg_policies, function bodies, data diagnostics).
