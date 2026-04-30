# Auditoría `.claude/**` — MovimientOS

**Fecha:** 2026-04-29
**Autor:** Claude Chat (sesión Cambio 6)
**Scope:** evaluación completa de `.claude/**` para identificar errores, redundancias, malas prácticas, y oportunidades de mejora.
**Estado:** propuesta — pendiente de priorización con James.

---

## 🔴 Errores e inconsistencias reales

### E1 — `CLAUDE.md` referencia archivos que NO existen

El CLAUDE.md actual lista en su sección "Key Directories":

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

**También menciona `BUILD_PLAN.md`, `PROJECT_STATUS.md`, `SYNC_LOG.md`, `BUGS.md`** en la sección de workflow — todos archivos que están **archivados** en `Docs/archive/` o eliminados. Code todavía recibe instrucción "Lee `@Docs/BUILD_PLAN.md`" cada vez.

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

**Contradictorio.** Hay 2 versiones de `commit-after-step.md` en el repomix — una vieja (que dice "branch de desarrollo: main") y una nueva (que dice "Code commitea en jaime/dev, James pushea manualmente"). El ÚNICO archivo en filesystem es la versión nueva, pero la vieja se está colando en el repomix por algún lado. Verificar.

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

**Mejor:** `commit-after-step.md` queda como **una página de quick reference** (3-5 reglas) que apunta a `git-workflow.md` para política completa. Hoy es 60+ líneas.

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

Podría ser **un solo `artifacts-lifecycle.md`** con sección por tipo (specs vs plans). O al menos sharing de boilerplate.

**Mi voto:** mantener separados PERO uniformar nomenclatura. Hoy `spec-lifecycle.md` usa "specs" y `plan-lifecycle.md` dice "plan files" — inconsistente.

---

## 🟡 Malas prácticas / things Code está haciendo mal

### M1 — Referencias a `Docs/` con rutas inconsistentes

Veo en distintos archivos:

- `Docs/CHANGELOG.md` (correcto)
- `@Docs/CHANGELOG.md` (con @, sintaxis de Claude Code para auto-load)
- `[CHANGELOG.md](http://CHANGELOG.md)` (markdown link rota — ¡apunta a HTTP!)

El último es Code generando markdown links incorrectos al hacer parsing — va a HTTP en lugar de file path. **Esto pasó en commits reales** (ver el reporte T11 donde aparece `[CLAUDE.md](http://CLAUDE.md)`).

**Mejor:** convención única. Recomiendo `Docs/CHANGELOG.md` simple, sin `@` ni links markdown, en CONTEXTO de CLAUDE.md y rules. Para CHANGELOG entries sí usar markdown links pero a paths relativos.

---

### M2 — Skills NO tienen frontmatter consistente

Comparo:

- `crud-page.md` tiene `name:` y `description:` ✓
- `technical-decisions/SKILL.md` tiene `name:` y `description:` ✓
- `supabase-queries.md` — no verifiqué pero hay sospecha de inconsistencia

El frontmatter es lo que activa el skill. Si falta o está mal, el skill nunca se carga.

**Verificación recomendada:** auditar TODOS los skills para que tengan frontmatter válido. Si falta, no se activa nunca.

---

### M3 — `git-release.md` referenciado en `git-workflow.md` línea 50, pero no verifiqué que el `/release` command realmente esté implementado

`git-workflow.md` dice "Releases via skill `/release` (ver `.claude/skills/git-release.md`)". Pero los **slash commands** están en `.claude/commands/`, no en `.claude/skills/`. Si `/release` debería ser comando, está en el directorio incorrecto.

**Verificar:** ¿`/release` realmente funciona? Si no, política de releases es solo documental.

---

### M4 — `settings.json` permite plugin `ralph-loop` pero no veo uso documentado

10 plugins habilitados. ¿Todos usados? `ralph-loop` no aparece en `tool-usage.md` ni en ningún workflow. **Plugin habilitado pero sin contexto = ruido potencial en startup.**

**Mejor:** auditar plugins habilitados. Desactivar los que no se usan. Cada plugin habilitado consume tokens al startup.

---

### M5 — No hay documentación sobre `Docs/superpowers/` vs `Docs/feature-specs/`

Hay 2 directorios para specs:

- `Docs/superpowers/specs/` — usado activamente
- `Docs/feature-specs/` — existe en HumanOS, mencionado en `spec-lifecycle.md` línea 4

**¿Cuál usar cuándo?** No está documentado. Code ha estado escribiendo todo en `Docs/superpowers/specs/`.

**Mejor:** elegir uno y eliminar el otro. O documentar la diferencia (mi voto: `Docs/superpowers/` es plugin-managed, `Docs/feature-specs/` es manual — pero hay que clarificarlo).

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

**¿Por qué la diferencia?** Probablemente histórica. Carpetas con SKILL.md son la convención nueva (permite assets adjuntos como ejemplos de código, snippets); archivos sueltos son la vieja.

**Mejor:** estándar único. Mi voto: **migrar todos a carpeta con `SKILL.md`** porque es lo que Anthropic recomienda (extensibilidad) y consistencia.

---

## 🔵 General improvements (oportunidades estratégicas)

### I1 — Falta `.claude/rules/testing.md`

Cleanup obligatorio, dotenv, T-final no se reporta sin tests passing, `.env.local.example` sincronizado, etc.

Detalle ya discutido en sesión:

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

**Pero estas recomendaciones NO están en `.claude/rules/`**. Quedan en docs de referencia que Code no carga automáticamente.

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

Plugin `sentry` está activo en settings.json. Pero `tool-usage.md` no menciona cuándo Code debe consultar Sentry (¿errores en prod? ¿durante debugging?). Plugin habilitado sin convención de uso = no se usa.

**Mejor:** sección en `tool-usage.md` o regla nueva sobre cuándo Code consulta Sentry.

---

### I6 — No hay regla sobre `.env.local` y `.env.local.example`

Cambio 6 expuso esto: Code agregó `TEST_CHARRIS_ID` a `.env.local` pero olvidó actualizar `.env.local.example`. **Patrón obvio que debería estar codificado.**

Esto va naturalmente como parte de `.claude/rules/testing.md` (sub-sección sobre env vars) o como regla independiente.

---

### I7 — Naming convention de archivos en superpowers

Hoy:

- `2026-04-29-cambio6-cancel-integrity.md`
- `2026-04-20-active-trip-panel-design.md`

Inconsistente. Algunos son `cambioN-descripción`, otros son `feature-name-design`. No hay estándar.

**Mejor:** elegir convención. Mi voto: `YYYY-MM-DD-feature-name.md` siempre, sin "cambio" — los Cambios son referencias de CHANGELOG, no de filesystem.

---

### I8 — Workflow falla silently cuando build NO se corre

`commit-after-step.md` dice "el hook post-commit lanza npm run build en background". Pero si el build falla, "la siguiente operación git te lo muestra".

**Eso es muy débil.** Si Code commitea 5 cambios seguidos, el build falla en el #2, pero los #3-5 se hacen igual sin saber. Hay que esperar al final para ver el problema.

**Mejor:** hook PRE-commit que blockee si build falla. Slow pero honest. Hoy es post-commit que es informativo no bloqueante.

---

## 📋 Resumen priorizado

Si tuviera que priorizar 5 acciones para el T-final del Cambio 6:

| # | Acción | Tipo | Impacto |
|---|--------|------|---------|
| 1 | Reescribir `CLAUDE.md` para reflejar realidad actual (eliminar refs a archivos que no existen, BUILD_PLAN, PROJECT_STATUS, SYNC_LOG, BUGS) | E1 fix | 🔴 Alto |
| 2 | Crear `.claude/rules/testing.md` (lo que ya discutimos) | I1 | 🔴 Alto |
| 3 | Reconciliar `commit-after-step.md` (eliminar versión vieja del repomix, dejar solo la actual) | E2 fix | 🟠 Medio |
| 4 | Crear `.claude/rules/database-conventions.md` que centralice convenciones BD | I3 | 🟠 Medio |
| 5 | Crear `.claude/rules/context-management.md` con reglas de `/compact`, `/clear`, Document & Clear | I2 | 🟢 Bajo pero valioso |

**Las acciones 1 y 2 son lo más crítico.** El resto puede ser Cambio 7+ chico.

---

## Opciones de ejecución

**Opción α — Cambio 7 dedicado a `.claude/` cleanup**
Después de mergear Cambio 6 a main, abrimos sesión nueva con Code para limpiar todo `.claude/**` sistemáticamente. Output: nuevo CLAUDE.md, rules nuevas (`testing.md`, `database-conventions.md`, `context-management.md`), reconciliación de redundancias.

**Opción β — Distribuir en T-final + Cambio 7**
T-final agrega solo lo crítico (acciones 1 y 2). Cambio 7 hace el resto.

**Opción γ — Auditoría sistémica + cleanup**
Cuando se haga auditoría sistémica del app, el `.claude/**` cleanup va junto. Una sola sesión grande.

**Voto Chat: α (Cambio 7 dedicado).** Razones:

- T-final ya tiene scope cargado (CHANGELOG entries, spec maestro v3.4, plans deletion, frontmatters, TRAIL, leftover cleanup). Agregarle 5 acciones más lo satura.
- `.claude/**` cleanup es estratégico, no implementación. Code propone, James valida. Bien para sesión dedicada.
- La auditoría sistémica del app (γ) es mucho más grande, no conviene mezclarla con `.claude/**` que es relativamente acotado.

---

## Notas finales

Este reporte cubre estado al cierre de sesión Cambio 6 implementación + smoke. Algunas observaciones requieren verificación de filesystem real:

- E2: confirmar si la versión vieja de `commit-after-step.md` está en el repomix por bug del config o si efectivamente coexisten dos archivos
- M2: auditar frontmatter de todos los skills
- M3: verificar si `/release` está implementado o solo documentado
- M4: identificar plugins habilitados sin uso real

La acción primaria es decidir entre opciones α/β/γ y enfocar el smoke de Cambio 6 + T-final docs sin contaminar con este scope.
