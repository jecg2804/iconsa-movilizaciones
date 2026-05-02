# Cambio 6.5 — Plan de despliegue a producción

> **PLAN TENTATIVO** — esqueleto generado en T11 del Cambio 6.5. Se actualiza al hacer merge real con detalles concretos de timing, comunicación y validación post-deploy. Las secciones marcadas con **TODO James** requieren decisión humana antes del deploy.

## Estado

- **Branch:** `jaime/dev` con N commits desde tag de release anterior (verificar con `git log <último-tag>..jaime/dev --oneline`).
- **BD staging (`vonwkciosksqspyljzfy`):** Cambio 6.5 + amend aplicados, suite Cambio 6.5 14/14 verde, smoke manual pendiente (T-final).
- **BD prod (`bzeoszympkkicwlfdtcn`):** SIN Cambio 6.5. Pendiente de aplicar las 2 migraciones en orden estricto + backfill.
- **Vercel prod:** sirviendo el código pre-Cambio 6.5 (referencia `main` con su último commit). Bug B (DeliveryModal envía `quantity=0` para rejected) está vivo en prod, pero el impacto es mínimo porque el feature `qty_rejected` no existe pre-Cambio 6.5 — la columna nace inerte aunque el FE enviara el valor correcto. Nadie reportó hoy mismo, pero Charris debería evitar registrar entregas con líneas `'Rechazado'` hasta el merge.

## Pre-deploy (orden estricto)

### 1. BD migrations consolidadas

Aplicar **en orden estricto** vía Supabase SQL Editor (Chat ejecuta, Code valida via MCP read post-aplicación).

| # | Migration name | Version | Aplicada en staging | Pendiente en prod |
|---|---|---|---|---|
| 1 | `cambio6_5_event_model_refinement` | `20260430203756` | ✅ 2026-04-30 ~21:00 UTC | ⏳ |
| 2 | `cambio6_5_recalc_simplify_pendiente_on_rejected_total` | `20260501015941` | ✅ 2026-05-01 ~01:59 UTC | ⏳ |

**Por qué orden estricto:** la #2 (`recalc_simplify_pendiente`) modifica la función `recalc_qty_for_line` que la #1 (`event_model_refinement`) instaló con orden de 6 puntos. Aplicar #2 antes de #1 falla porque la columna `qty_rejected` (BD-1 de #1) no existe aún.

SQL completo de ambas migraciones (incluyendo CHECK constraints, triggers, REPLACE de funciones, BD-1 a BD-10, y rollback) está en `Docs/CHANGELOG.md` entries `[bd]` del 2026-04-30 y 2026-05-01. Copiar de ahí — NO regenerar.

### 2. Pre-merge queries en producción

Correr **antes de aplicar la migración #1** para detectar drift que rompería la migración. Las 4 queries originales del Cambio 6.5 deben retornar 0 rows en prod:

```sql
-- Query 1 — drift previo al CHECK qty_delivered + qty_rejected ≤ qty_dispatched
SELECT id, trip_id, request_line_id, qty_dispatched, qty_delivered, COALESCE(qty_rejected, 0) AS qty_rejected
FROM trip_line_assignments
WHERE qty_delivered + COALESCE(qty_rejected, 0) > qty_dispatched;

-- Query 2 — líneas zombie 'En Transito' sin trip activo
SELECT srl.id, srl.description, srl.status, srl.qty_scheduled, srl.qty_delivered
FROM sm_request_lines srl
WHERE srl.status = 'En Transito'
  AND NOT EXISTS (
    SELECT 1 FROM trip_line_assignments tla
    JOIN trips t ON t.id = tla.trip_id
    WHERE tla.request_line_id = srl.id AND t.status NOT IN ('Cancelado', 'Completado')
  );

-- Query 3 — eventos múltiples revertidos del mismo origen (verificar BD-9 safe)
SELECT reverts_event_id, COUNT(*) AS revert_count
FROM trip_events
WHERE reverts_event_id IS NOT NULL
GROUP BY reverts_event_id
HAVING COUNT(*) > 1;

-- Query 4 — revert Entrega en trips cerrados ya existentes (verificar BD-8 backward compat)
SELECT te.id, te.trip_id, te.event_type, t.status AS trip_status
FROM trip_events te
JOIN trip_events te_orig ON te_orig.id = te.reverts_event_id
JOIN trips t ON t.id = te.trip_id
WHERE te_orig.event_type = 'Entrega'
  AND t.status IN ('Completado', 'Cancelado');
```

**Si alguna retorna rows:** PARAR. Entender el caso primero. NO aplicar migración hasta cleanup o entender por qué el row no rompe la migración.

**Query adicional pre-amend #2** (debe retornar 0 rows post-aplicación de #1 + backfill, garantía de que no quedan zombies en `'Programada'`):

```sql
-- Líneas en 'Programada' sin assignment activo programable
SELECT srl.id, srl.description, srl.status, srl.qty_scheduled, srl.qty_delivered
FROM sm_request_lines srl
WHERE srl.status = 'Programada'
  AND NOT EXISTS (
    SELECT 1 FROM trip_line_assignments tla
    JOIN trips t ON t.id = tla.trip_id
    WHERE tla.request_line_id = srl.id
      AND t.status NOT IN ('Cancelado', 'Completado')
      AND GREATEST(0, tla.quantity_assigned - COALESCE(tla.qty_delivered, 0) - COALESCE(tla.qty_rejected, 0)) > 0
  );
```

**TODO James:** ¿correr queries adicionales según data específica de prod? Ej: top N clientes con más solicitudes en flight, top N proyectos activos para validar.

### 3. Backfill

La migración #2 incluye backfill automático (`DO $$ ... PERFORM recalc_qty_for_line(r.id) FOR ALL ... $$`). Refresca el status de TODAS las líneas en prod aplicando el orden simplificado de 5 puntos.

**Snapshot pre/post sugerido** para auditar el efecto:

```sql
-- Pre-backfill snapshot
SELECT status, COUNT(*) FROM sm_request_lines GROUP BY status ORDER BY status;
```

Comparar contra el mismo query post-backfill. En staging el snapshot fue idéntico (no había zombies). En prod podría haber líneas que migran de `'Programada'` → `'Pendiente'` si rejected total con assignment vivo existe en data histórica.

### 4. Code deploy (Vercel)

Merge `jaime/dev → main` vía PR. Vercel auto-deploy en main detecta y deploya.

**Pre-merge en GitHub:**
- Verificar todos los commits del Cambio 6.5 con build verde (`.build-status` local + Vercel preview verde por commit).
- PR description con resumen de cambios + link al CHANGELOG entries.

**Post-merge:**
- Verificar Vercel deploy en `main` queda en `READY` (no `ERROR`/`BUILDING` colgado).
- Tag semver: `v{YYYY}.{MM}.{DD}-{N}` (ver `.claude/skills/git-release.md`).

**TODO James:** ventana de deploy. Sugerencia: bajo tráfico (sábado mañana o domingo). Charris debe estar avisado para validar smoke post-deploy.

### 5. Smoke post-deploy en prod

3 escenarios mínimos a validar manualmente en prod (Charris ejecuta, James acompaña en remote):

| # | Escenario | Validación |
|---|---|---|
| 1 | Crear solicitud → asignar a trip → registrar Salida → registrar Entrega ok parcial (qty=N de M, N<M) | Línea queda `'En Transito'` mientras trip activo. Tras Retorno (cierre trip) la línea pasa a `'Parcial'`. |
| 2 | Mismo flow pero línea `'Rechazado'` total (no parcial) | Línea pasa a `'Pendiente'` inmediato post-Entrega (libera al backlog). qty_rejected = qty_dispatched, qty_delivered = 0. |
| 3 | Entrega con línea `'Con observaciones'`, NO escribir nada en notas | Botón "Confirmar Entrega" queda disabled, mensaje "Las notas son obligatorias..." visible. Al escribir ≥10 caracteres, botón se habilita. |

**TODO James:** ¿agregar escenarios específicos al contexto de Charris? Ej: solicitudes con líneas mezcla equipo + material, multi-trip por solicitud, etc.

## Rollback plan

**Si algo falla post-deploy** (smoke manual reporta inconsistencia, error en Sentry, Charris reporta bug):

### Rollback de código

Revert del PR en GitHub. Vercel auto-deploy del revert en `main`. Toma ~3-5 min.

### Rollback de BD

Aplicar **en orden inverso** al deploy:

```sql
-- Paso 1: rollback amend (cambio6_5_recalc_simplify_pendiente_on_rejected_total)
-- Restaura recalc_qty_for_line con orden de 6 puntos (step 5 'Programada' restaurado).
-- SQL completo en Docs/CHANGELOG.md entry [bd] 2026-05-01 sección "Rollback (si necesario)".

-- Paso 2: rollback event model refinement (cambio6_5_event_model_refinement)
-- Drop triggers + functions + CHECKs + columna qty_rejected.
-- SQL completo en Docs/CHANGELOG.md entry [bd] 2026-04-30 sección "Rollback (si necesario)".
```

**Nota crítica:** rollback BD requiere que NO haya rows que dependan de `qty_rejected`. Si post-deploy ya se registraron Entregas con `'Rechazado'` (qty_rejected > 0), el rollback **pierde esa data histórica**. Decisión: ¿restaurar la data como qty_delivered en TLAs (semántica diferente pero preserva la cantidad) o aceptar pérdida si el rollback es inmediato y no hubo entregas rejected aún? **TODO James** decidir si hace falta script de migración inversa pre-rollback.

## Comunicación

**TODO James:** definir lista de personas a notificar y cuándo.

Sugerencias:

- **Pre-deploy (24h antes):**
  - Charris (logística): "Mañana sábado/domingo aplicaremos el fix del bug de entregas. Espero que estés disponible para validar 3 escenarios entre 9:00-11:00."
  - Astrid (incidente original MOV-2026-058 si está identificada): "El bug que detectaste se arregla este fin de semana."

- **Post-deploy (inmediato):**
  - Charris: "Deploy completo. Por favor ejecuta los 3 escenarios del smoke."
  - James valida resultado de Charris y reporta a stakeholder relevante (PM del proyecto afectado por MOV-2026-058).

- **Post-validation (24-48h):**
  - Mensaje de cierre al equipo: "Cambio 6.5 en producción y validado. Resumen breve: rejected ahora libera al backlog, observaciones requieren notas, revert de Entrega bloqueado en trip cerrado."

## Post-merge

- Actualizar `Docs/TRAIL.md` (cerrar Cambio 6.5 en el árbol de tareas).
- `Docs/superpowers/specs/2026-04-30-cambio6-5-event-model-refinement.md` frontmatter `status: shipped` + `shipped_commits: <hash range>`.
- Borrar plan files (`Docs/superpowers/plans/2026-04-30-cambio6-5-event-model-refinement.md` + `.tasks.json`) per `.claude/rules/plan-lifecycle.md`.
- CHANGELOG entry `[feat]` final consolidando el Cambio 6.5.

## Referencias

- `Docs/CHANGELOG.md` — entries `[bd]` del 2026-04-30 y 2026-05-01 con SQL completo de las 2 migraciones + rollback.
- `Docs/superpowers/specs/2026-04-30-cambio6-5-event-model-refinement.md` — spec con 13 decisiones cerradas.
- `Docs/superpowers/plans/2026-04-30-cambio6-5-event-model-refinement.md` — plan ejecutable con T1-T-final + notas T3 post-implementación.
- `tests/cambio6-5-bd-triggers.spec.ts` + `tests/cambio6-5-event-refinement.spec.ts` — suite 14/14 verde validando el cambio en staging.
- `.claude/skills/git-release.md` — skill `/release` para el flujo de PR + tag.
