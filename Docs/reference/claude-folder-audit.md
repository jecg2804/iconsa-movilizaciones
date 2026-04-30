# Auditoría `.claude/**` — Plan de cleanup

**Fecha original:** 2026-04-29
**Última actualización:** 2026-04-30
**Autor:** Claude Chat
**Estado:** Plan ejecutará en Cambio dedicado futuro (BL-CLAUDE-FOLDER-CLEANUP)
**Ubicación en repo:** `Docs/reference/claude-folder-audit.md`

---

## Estado actual y decisiones consolidadas

Este documento es el plan de cleanup del directorio `.claude/**` y `CLAUDE.md`. Surgió durante Cambio 6.5 (refinamiento del modelo de eventos) cuando se identificaron inconsistencias acumuladas en la documentación operativa de Code.

### Decisiones tomadas (al cierre de Cambio 6.5)

1. **Cambio dedicado, no se mezcla con feature work.** El cleanup involucra reescribir `CLAUDE.md`, crear nuevas reglas (`testing.md`, `database-conventions.md`, `context-management.md`, `session-start.md`), reconciliar redundancias, eliminar referencias muertas. Es trabajo estratégico que merece sesión propia con Code.

2. **Item registrado en BACKLOG como `BL-CLAUDE-FOLDER-CLEANUP`.** Code lo encontrará al inicio de la próxima sesión cuando revise `Docs/BACKLOG.md`. La entry de BACKLOG apunta a este documento para contexto completo.

3. **Lo que SÍ se incluyó en Cambio 6.5 (item CL-1):** cleanup de código muerto en `src/lib/utils/format.ts:173,177` (cases `'Pickup Aprobado'` y `'Externo Aprobado'` que nunca disparan post-Cambio 5) y comentario obsoleto en `src/hooks/useSolicitudes.ts:927`. Es deadwood trivial, sin riesgo. El resto queda para el Cambio dedicado.

4. **Item relacionado registrado como `BL-SESSION-START-RULE`.** Crear `.claude/rules/session-start.md` que formaliza la regla "Code lee BACKLOG al inicio de cada sesión, reporta items relevantes, propone si algo entra al scope actual". Ese item se ejecuta junto con el cleanup completo.

### Por qué Cambio dedicado y no piezas sueltas

El Item 1 del análisis (reescribir `CLAUDE.md` para reflejar realidad actual) es de impacto alto pero también de riesgo alto si se hace sin contexto completo. CLAUDE.md es el primer doc que Code lee — un cambio mal calibrado afecta todas las sesiones futuras. Mejor abordarlo con scope dedicado donde Code puede leer todo, validar referencias cruzadas, y proponer la versión nueva completa para revisión.

---

## 🔴 Errores e inconsistencias reales

### E1 — `CLAUDE.md` referencia archivos que NO existen

El `CLAUDE.md` actual lista en su sección "Key Directories":

```
├── rules/
│   ├── commit-after-step.md
│   ├── cost-management.md          ← NO EXISTE
│   └── no-modify-specs.md          ← NO EXISTE (Sistema Tiers)
└── skills/
    ├── crud-page.md
    ├── events-page.md
    ├── supabase-queries.md
    └── self-update.md              ← NO EXISTE
└── suggestions.md                   ← NO EXISTE
```

Estos archivos están en el doc pero no en el filesystem. Code los busca y no los encuentra. Mentira sobre la estructura del proyecto.

**También menciona `BUILD_PLAN.md`, `PROJECT_STATUS.md`, `SYNC_LOG.md`, `BUGS.md`** en la sección de workflow — todos archivos archivados en `Docs/archive/` o eliminados. Code todavía recibe instrucción "Lee `@Docs/BUILD_PLAN.md`" cada sesión.

**Severidad:** alta. CLAUDE.md es el primer doc que Code lee — cada sesión arranca con instrucciones obsoletas.

---

### E2 — Conflictos entre `commit-after-step.md` y `git-workflow.md`

`commit-after-step.md` (versión vieja, líneas 18-20) dice:

```
- Branch de desarrollo: `main` (hasta que se establezca un branch de dev).
```

`git-workflow.md` dice:

```
main — estable, solo código aprobado. Nunca recibe pushes directos.
```

Contradictorio. Hay 2 versiones de `commit-after-step.md` en el repomix — una vieja (que dice "branch de desarrollo: main") y una nueva (que dice "Code commitea en jaime/dev, James pushea manualmente"). El ÚNICO archivo en filesystem es la versión nueva, pero la vieja se está colando en el repomix por algún lado. Verificar.

---

### E3 — `supabase-readonly.md` desactualizado vs HumanOS

Para MovimientOS dice "Code es read-only en Supabase, las 11 tools mutantes están en deny-list".

Pero para HumanOS hay un `supabase-branch.md` que dice:

> **DDL/DML libre en `humanos.*` del branch `humanos-dev` (project_ref `woonbmfmconldxbeqdnr`)**

Implicación: HumanOS sí permite a Code escribir BD, pero solo en su schema/branch. Esto NO está reflejado en MovimientOS. Si James trabaja en ambos proyectos en la misma máquina, hay riesgo de cross-contamination de reglas.

---

### E4 — `tool-usage.md` describe skills que sí existen pero el `CLAUDE.md` describe skills diferentes

`tool-usage.md` lista 8 skills correctos:

```
crud-page, events-page, supabase-queries, partial-delivery, seed-data,
technical-decisions, form-submit-guard, debug-skydata
```

`CLAUDE.md` lista 4 (incluyendo `self-update.md` que no existe).

**Code lee ambos.** Recibe info contradictoria sobre qué skills hay.

---

## 🟠 Redundancias

### R1 — `commit-after-step.md` y `git-workflow.md` se solapan

50% del contenido es el mismo: política de branches, qué Code puede/no puede hacer con git, deny patterns. La separación tiene sentido conceptual (uno es ciclo iterativo, otro es política completa) pero en práctica Code lee los dos y la política aparece duplicada.

**Mejor:** `commit-after-step.md` queda como una página de quick reference (3-5 reglas) que apunta a `git-workflow.md` para política completa. Hoy es 60+ líneas.

---

### R2 — Workflow de feature está en 3 lugares

Aparece en:

1. `tool-usage.md` (sección "Flujo estándar por tipo de tarea")
2. `CLAUDE.md` (sección "Workflow para Claude Code")
3. Implícito en cada `lifecycle.md`

Las 3 versiones están desincronizadas. CLAUDE.md tiene el más viejo (menciona BUILD_PLAN.md, PROJECT_STATUS.md).

**Mejor:** workflow vive en UN solo lugar (recomiendo `tool-usage.md` porque ya tiene el mapping de tools), los otros lo referencian.

---

### R3 — `plan-lifecycle.md` y `spec-lifecycle.md` repiten estructura idéntica

Casi mismo formato:

- Cuándo crear
- Qué contiene / qué NO
- Cuándo limpiar
- Cuándo borrar
- Integración con workflow
- Qué NO hacer nunca

Podría ser un solo `artifacts-lifecycle.md` con sección por tipo (specs vs plans). O al menos sharing de boilerplate.

**Voto Chat:** mantener separados PERO uniformar nomenclatura. Hoy `spec-lifecycle.md` usa "specs" y `plan-lifecycle.md` dice "plan files" — inconsistente.

---

## 🟡 Malas prácticas / problemas que Code está cometiendo

### M1 — Referencias a `Docs/` con rutas inconsistentes

En distintos archivos:

- `Docs/CHANGELOG.md` (correcto)
- `@Docs/CHANGELOG.md` (con @, sintaxis de Claude Code para auto-load)
- `[CHANGELOG.md](http://CHANGELOG.md)` (markdown link rota — ¡apunta a HTTP!)

El último es Code generando markdown links incorrectos al hacer parsing — va a HTTP en lugar de file path. Esto pasó en commits reales (ej. el reporte T11 de Cambio 6 tenía `[CLAUDE.md](http://CLAUDE.md)`).

**Mejor:** convención única. Recomendación: `Docs/CHANGELOG.md` simple, sin `@` ni links markdown, en CONTEXTO de CLAUDE.md y rules. Para CHANGELOG entries sí usar markdown links pero a paths relativos.

---

### M2 — Skills sin frontmatter consistente

Comparativa:

- `crud-page.md` tiene `name:` y `description:` ✓
- `technical-decisions/SKILL.md` tiene `name:` y `description:` ✓
- Otros skills no verificados

El frontmatter es lo que activa el skill. Si falta o está mal, el skill nunca se carga.

**Verificación recomendada:** auditar TODOS los skills para frontmatter válido. Si falta, no se activa nunca.

---

### M3 — `git-release.md` ubicado en `.claude/skills/` cuando debería ser comando

`git-workflow.md` línea 50 referencia "Releases via skill `/release`" pero los slash commands están en `.claude/commands/`, no en `.claude/skills/`. Si `/release` debería ser comando, está en directorio incorrecto.

**Verificar:** ¿`/release` realmente funciona? Si no, política de releases es solo documental.

---

### M4 — Plugins habilitados sin documentación de uso

10 plugins activos en `settings.json`. ¿Todos usados? `ralph-loop` no aparece en `tool-usage.md` ni en ningún workflow. **Plugin habilitado pero sin contexto = ruido potencial en startup.**

**Mejor:** auditar plugins habilitados. Desactivar los que no se usan. Cada plugin habilitado consume tokens al startup.

---

### M5 — No hay documentación sobre `Docs/superpowers/` vs `Docs/feature-specs/`

Hay 2 directorios para specs:

- `Docs/superpowers/specs/` — usado activamente
- `Docs/feature-specs/` — existe en HumanOS, mencionado en `spec-lifecycle.md` línea 4

¿Cuál usar cuándo? No está documentado. Code ha estado escribiendo todo en `Docs/superpowers/specs/`.

**Mejor:** elegir uno y eliminar el otro. O documentar la diferencia (recomendación: `Docs/superpowers/` es plugin-managed, `Docs/feature-specs/` es manual — pero hay que clarificarlo).

---

### M6 — Naming inconsistente de skills

Algunos son carpetas con `SKILL.md`:

- `partial-delivery/SKILL.md`
- `seed-data/SKILL.md`
- `technical-decisions/SKILL.md`

Otros son archivos sueltos:

- `crud-page.md`
- `events-page.md`
- `supabase-queries.md`
- `form-submit-guard.md`
- `debug-skydata.md`
- `git-release.md`

Probablemente histórico. Carpetas con SKILL.md son convención nueva (permite assets adjuntos como ejemplos de código, snippets); archivos sueltos son la vieja.

**Mejor:** estándar único. Recomendación: migrar todos a carpeta con `SKILL.md` porque es lo que Anthropic recomienda (extensibilidad) y consistencia.

---

## 🔵 General improvements (oportunidades estratégicas)

### I1 — Falta `.claude/rules/testing.md`

Cleanup obligatorio, dotenv, T-final no se reporta sin tests passing, `.env.local.example` sincronizado, etc.

Detalle ya discutido en sesión Cambio 6.5:

- Cleanup obligatorio (`afterEach` o `afterAll` que limpia data creada por el test)
- `dotenv.config()` al inicio de todo `.spec.ts` que use env vars
- Auto-resolve dinámico de IDs (no hardcoded, no env var ciega)
- Test data namespacing (sufijo único por test run para evitar colisión si cleanup falla)
- Tests deben fallar ruidoso, nunca skipped silently
- TDD: tests RED primero, código después, GREEN al final
- T-final NO se reporta sin haber corrido la suite completa
- `.env.local.example` debe tener TODA env var nueva que un test introduzca
- Naming: `{feature-name}-{descripción}.spec.ts`, no `cambio6-*` (queda mejor `integrity-quantities.spec.ts` o similar)

---

### I2 — Falta regla operativa de "context management"

`Docs/reference/Claude Code Setup Research.md` y `Docs/reference/The vibecoder's honest guide to Claude.md` tienen recomendaciones explícitas sobre `/compact`, `/clear`, sesiones de 30-45 min, "Document & Clear pattern".

Pero estas recomendaciones NO están en `.claude/rules/`. Quedan en docs de referencia que Code no carga automáticamente.

**Mejor:** extraer las reglas operativas concretas a `.claude/rules/context-management.md`:

- Cuándo `/compact` (al alcanzar 50%)
- Cuándo `/clear` (cambio de feature)
- Document & Clear pattern al final de sesión larga
- Sesiones cortas focused

---

### I3 — Falta `.claude/rules/database-conventions.md`

Hoy las convenciones BD están dispersas:

- `supabase-readonly.md` cubre solo política read-only
- `partial-delivery/SKILL.md` cubre cálculos
- `technical-decisions/SKILL.md` cubre triggers
- `seed-data/SKILL.md` cubre orden de FKs
- Convención `[bd-pending]` → `[bd]` está solo mencionada en supabase-readonly

**Mejor:** un `.claude/rules/database-conventions.md` que centralice:

- Esquema de naming (snake_case, plurales, etc.)
- Convención `[bd-pending]` → `[bd]` con flujo completo
- RLS policy obligatoria en toda nueva tabla
- COMMENT ON COLUMN obligatorio en columnas no-triviales
- Triggers BEFORE vs AFTER convenciones
- search_path en functions

---

### I4 — Falta `.claude/rules/error-handling.md`

Code ha tenido inconsistencias en cómo maneja errores en hooks, cómo los muestra en UI, etc. Bug #4 en Cambio 6 mostraba PostgreSQL exception cruda — eso se previene con regla.

**Mejor:** un archivo que estandarice:

- Errores BD se capturan y traducen a mensaje legible
- Toast pattern (sonner)
- Errores de constraint específicos tienen mapping a UX-friendly messages
- Defense-in-depth: frontend valida, BD valida también

---

### I5 — `tool-usage.md` no menciona Sentry aunque está habilitado

Plugin `sentry` está activo en settings.json. Pero `tool-usage.md` no menciona cuándo Code debe consultar Sentry (errores en prod, durante debugging, etc.). Plugin habilitado sin convención de uso = no se usa.

**Mejor:** sección en `tool-usage.md` o regla nueva sobre cuándo Code consulta Sentry.

---

### I6 — No hay regla sobre `.env.local` y `.env.local.example`

Cambio 6 expuso esto: Code agregó `TEST_CHARRIS_ID` a `.env.local` pero olvidó actualizar `.env.local.example`. Patrón obvio que debería estar codificado.

Esto va naturalmente como parte de `.claude/rules/testing.md` (sub-sección sobre env vars) o como regla independiente.

---

### I7 — Naming convention de archivos en superpowers

Hoy:

- `2026-04-29-cambio6-cancel-integrity.md`
- `2026-04-20-active-trip-panel-design.md`

Inconsistente. Algunos son `cambioN-descripción`, otros son `feature-name-design`. No hay estándar.

**Mejor:** elegir convención. Recomendación: `YYYY-MM-DD-feature-name.md` siempre, sin "cambio" — los Cambios son referencias de CHANGELOG, no de filesystem.

---

### I8 — Workflow falla silently cuando build NO se corre

`commit-after-step.md` dice "el hook post-commit lanza npm run build en background". Pero si el build falla, "la siguiente operación git te lo muestra".

Eso es muy débil. Si Code commitea 5 cambios seguidos, el build falla en el #2, pero los #3-5 se hacen igual sin saber. Hay que esperar al final para ver el problema.

**Mejor:** hook PRE-commit que blockee si build falla. Slow pero honest. Hoy es post-commit que es informativo no bloqueante.

---

### I9 — Falta `.claude/rules/session-start.md` (BL-SESSION-START-RULE)

**Item nuevo agregado durante Cambio 6.5.** Code debe leer `Docs/BACKLOG.md` al inicio de cada sesión, reportar items relevantes al cambio actual y críticos sin progreso, y proponer si algo entra al scope. Sin esto, items de BACKLOG son cementerio.

Este item se ejecuta junto con el cleanup completo en el Cambio dedicado.

---

## 📋 Resumen priorizado para el Cambio dedicado futuro

Cuando se aborde `BL-CLAUDE-FOLDER-CLEANUP`, este es el orden sugerido de ataque:

| # | Acción | Tipo | Impacto |
|---|--------|------|---------|
| 1 | Reescribir `CLAUDE.md` para reflejar realidad actual (eliminar refs a archivos que no existen, BUILD_PLAN, PROJECT_STATUS, SYNC_LOG, BUGS) | E1 fix | 🔴 Alto |
| 2 | Crear `.claude/rules/testing.md` | I1 | 🔴 Alto |
| 3 | Crear `.claude/rules/session-start.md` (BL-SESSION-START-RULE) | I9 | 🔴 Alto |
| 4 | Reconciliar `commit-after-step.md` (eliminar versión vieja del repomix, dejar solo la actual) | E2 fix | 🟠 Medio |
| 5 | Crear `.claude/rules/database-conventions.md` que centralice convenciones BD | I3 | 🟠 Medio |
| 6 | Crear `.claude/rules/context-management.md` con reglas de `/compact`, `/clear`, Document & Clear | I2 | 🟢 Bajo pero valioso |
| 7 | Crear `.claude/rules/error-handling.md` | I4 | 🟢 Bajo |
| 8 | Auditar frontmatter de todos los skills (M2) | 🟡 | 🟢 Bajo |
| 9 | Migrar skills a carpeta SKILL.md uniforme (M6) | 🟡 | 🟢 Bajo |
| 10 | Auditar plugins habilitados sin uso (M4) | 🟡 | 🟢 Bajo |
| 11 | Documentar diferencia `superpowers/` vs `feature-specs/` (M5) | 🟡 | 🟢 Bajo |
| 12 | Mover `git-release.md` de skills/ a commands/ (M3) | 🟡 | 🟢 Bajo |

**Las acciones 1, 2 y 3 son lo más crítico** — habilitan que las reglas operativas de testing y session-start funcionen, y eliminan las instrucciones obsoletas que confunden a Code en cada sesión.

---

## Notas finales

- El item `CL-1` (cleanup deadwood en `format.ts` y comentario en `useSolicitudes.ts`) ya se ejecutó como parte de Cambio 6.5. No incluido en el scope de este documento.
- Algunas observaciones requieren verificación de filesystem real cuando se aborde el Cambio dedicado:
  - E2: confirmar si la versión vieja de `commit-after-step.md` está en el repomix por bug del config o si efectivamente coexisten dos archivos
  - M2: auditar frontmatter de todos los skills
  - M3: verificar si `/release` está implementado o solo documentado
  - M4: identificar plugins habilitados sin uso real
- Este documento es input para Code cuando se le pida ejecutar `BL-CLAUDE-FOLDER-CLEANUP`. Code lee, propone plan, James valida, Code implementa.
