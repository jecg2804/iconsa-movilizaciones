---
name: Cambio 6 — Cancel preservation + integridad de cálculos
description: Fix de 5 bugs identificados en smoke test post-Cambio 5 (cancel borra histórico, trigger zombie 'En Transito', divergencia event_lines/assignments, multi-entrega, cancel sin warning) + 3 hallazgos de auditoría BD (edit quantity con assignments activos, upper bounds qty_dispatched/qty_delivered) + tarifa obligatoria. Defiende invariante qty_disponible = quantity - qty_scheduled - qty_delivered.
type: change
status: draft
date: 2026-04-29
---

# Cambio 6 — Cancel preservation + integridad de cálculos

## Resumen

Cambio 6 es sobre **integridad de cálculos de cantidades**. James lo formuló textualmente: *"Es INACEPTABLE que los cálculos de cantidades no funcionen porque se pueden desaparecer líneas o no desaparecer líneas del backlog."*

El smoke test post-Cambio 5 (con MOV-2026-006 como caso reproductor) expuso 5 bugs que rompen esos cálculos. Auditoría BD subsiguiente identificó 3 hallazgos adicionales del mismo patrón (defensas BD faltantes que dependen del código para el invariante). Sumamos también la decisión de tarifa obligatoria que estaba pendiente.

**Invariante a defender:**

```
qty_disponible = quantity - qty_scheduled - qty_delivered      (siempre coherente)
line.status     ↔ par (qty_delivered, quantity)                (siempre derivable)
qty_dispatched ≤ quantity_assigned                              (defensa BD)
qty_delivered  ≤ qty_dispatched                                 (defensa BD)
```

**Estrategia:** la BD es la fuente de verdad de los cálculos. El código emite operaciones, el trigger recalcula, los CHECK constraints atrapan violaciones. Cambio 6 cierra los huecos donde el código violenta el invariante (Bug #1 borra evidencia, Bug #4 acumula doble) y donde el trigger tenía edge cases mal cubiertos (Bug #2 zombie). Defense-in-depth UI complementa.

## Contexto y motivación

**Cambio 5 (just shipped en `jaime/dev`)** introdujo el modelo bulk de fulfillment con 3 pivote tables (`trip_line_assignments` + `pickup_order_lines` + `external_order_lines`) y un trigger BD `recalc_qty_for_line` que es la fuente de verdad de `qty_scheduled` y `qty_delivered` en `sm_request_lines`. El smoke test del 2026-04-29 expuso bugs preexistentes en el cancel flow de trips (Bug #1, #2, #3) que el rediseño de Cambio 5 no abordó porque no eran scope, y bugs nuevos (Bug #4, #5) que aparecieron al expandir el surface area.

**Wipe staging (2026-04-29):** Chat ejecutó wipe completo de data operativa en staging. Master data (people, projects, equipment, locations) intacta. Generators arrancan en 001 (MOV-2026-001, PKP-2026-001, EXT-2026-001, 26-XXX-SM-001). Tests E2E corren con BD limpia.

**Cambio 6 precede T11 final de Cambio 5** (decisión de James). Razón: si Cambio 6 modifica trigger / agrega constraint en trip_event_lines / cambia lógica de cancelación, esos cambios afectan el spec consolidado de Cambio 5. Mejor doc unificado al final.

## Scope IN

### Los 5 bugs originales

| # | Severidad | Síntoma | Fix |
|---|-----------|---------|-----|
| **1** | 🔴 Crítico | `cancelTrip` borra `trip_line_assignments` con `qty_delivered>0` → pérdida histórica | NO DELETE; solo UPDATE status='Cancelado'. Opción α: assignment preservado intacto, sobrante NO regresa a backlog |
| **2** | 🔴 Crítico | Trigger `recalc_qty_for_line` preserva 'En Transito' zombie cuando assignments se borran | Branch 'En Transito' chequea `v_qty_scheduled_active > 0` calculado sobre trips no-Cancelados/no-Completados |
| **3** | 🟠 Alto | `trip_event_lines` y `trip_line_assignments` divergen post-cancel | Síntoma de #1 — se resuelve fixeando #1 |
| **4** | 🔴 Crítico | Sistema permite múltiples eventos `Entrega` para misma `(trip_id, request_line_id)` → double-count `qty_delivered` | Trigger BD `BEFORE INSERT` en `trip_event_lines` rechaza si ya existe Entrega no-revertida + filtro UI en `DeliveryModal` |
| **5** | 🟠 Alto | UI cancel sin warning ni razón requerida cuando hay `qty_delivered>0` | `cancellation_reason TEXT` nullable con CHECK condicional (NOT NULL ≥10 chars si alguna línea tiene `qty_delivered>0`); modal con textarea, contador de chars, botón disabled hasta válido |

### 3 hallazgos de auditoría BD adicionales

**🟠 H1 — Editar `quantity` de línea con assignments activos rompe estado**

Síntoma: trigger `enforce_qty_integrity` rechaza el UPDATE si rompe invariant, pero deja assignment con `quantity_assigned` huérfano del valor original. Estado inconsistente posible.

Fix: trigger `BEFORE UPDATE` en `sm_request_lines` que rechaza cambio de `quantity` cuando existe assignment activo (`quantity_assigned > 0`) en cualquiera de las 3 tablas pivote.

Mensaje: *"No se puede editar la cantidad de una línea con asignaciones activas. Cancele las asignaciones primero."*

**Importante:** este fix es solo el bloqueo BD para el invariant. Las reglas más amplias de "cuándo se puede editar quantity" (ej: solo en Borrador, post-envío bloqueado siempre) **NO son scope de Cambio 6** — son auditoría sistémica posterior.

**🟠 H7 — `qty_dispatched` sin upper bound contra `quantity_assigned`**

Síntoma: defensa BD faltante. Bug en código podría meter `qty_dispatched=10` con `quantity_assigned=5`.

Fix: CHECK constraint `qty_dispatched ≤ quantity_assigned` en `trip_line_assignments`.

**🟠 H8 — `qty_delivered` sin upper bound contra `qty_dispatched`**

Síntoma: defensa BD faltante crítica. Bug podría registrar entrega de 8 cuando dispatched=5.

Fix: CHECK constraint `qty_delivered ≤ qty_dispatched` en `trip_line_assignments`.

**Edge case verificado:** flow actual setea `qty_dispatched` en Salida (`handleDispatch`) y `qty_delivered` en Entrega (`handleDelivery`). Salida precede temporalmente a Entrega. No hay path donde delivered se UPDATEa antes de dispatched. Constraint safe.

### Tarifa obligatoria (decisión confirmada)

`rate_id` SIEMPRE requerido en crear y editar trip. `DispatchModal` no afectado (ya bloqueado por inmutabilidad post-Salida).

| Capa | Cambio |
|---|---|
| BD | `ALTER TABLE trips ALTER COLUMN rate_id SET NOT NULL` |
| Hooks | `useTrips.saveTrip` y `updateTrip` rechazan `rate_id=null` con error claro |
| Validate | `/programacion/viaje/nuevo/page.tsx` y `/programacion/viaje/[id]/page.tsx` agregan validación pre-submit |
| Cost | Auto-rellena con `rate.amount` (ya implementado, mantener); validar `cost > 0` defense-in-depth |
| Docs | CLAUDE.md regla #9: cambiar *"Tarifa y Costo OPCIONALES"* → *"Tarifa OBLIGATORIA. Costo se auto-rellena con rate.amount y es read-only mientras haya tarifa."* |

### Tests E2E (no opcional — regression guard)

18 tests totales. Cada uno verifica el invariante después de la operación.

| # | Test | Verifica | Bug |
|---|------|----------|-----|
| 1 | `cancel_trip_with_partial_delivery_preserves_qty` | qty_delivered preserva, línea queda 'Parcial' | #1 |
| 2 | `cancel_trip_with_full_delivery_preserves_qty` | qty_delivered=quantity preserva, línea 'Entregada' | #1 |
| 3 | `cancel_trip_with_zero_delivery_releases_to_backlog` | qty_scheduled=0, línea vuelve a 'Pendiente' | #1 |
| 4 | `trigger_no_zombie_en_transito` | sin assignments activos, línea NO queda 'En Transito' | #2 |
| 5 | `multi_entrega_blocked_at_db_level` | segundo INSERT rechaza con error claro | #4 |
| 6 | `multi_entrega_allowed_after_revert` | INSERT permitido si Entrega previa fue revertida | #4 |
| 7 | `cancel_pickup_preserves_qty` | regression guard pickup_orders | audit |
| 8 | `cancel_external_preserves_qty` | regression guard external_orders | audit |
| 9 | `complete_pickup_idempotent` | segunda llamada no duplica qty_delivered | audit |
| 10 | `backlog_calculation_consistent_after_cancel` | invariante `qty_disponible = quantity - qty_scheduled - qty_delivered` | global |
| 11 | `line_status_consistent_with_qty` | status derivado correctamente del par (qty_delivered, quantity) | global |
| 12 | `edit_quantity_blocked_with_active_assignments` | UPDATE rechaza con error claro | H1 |
| 13 | `edit_quantity_allowed_without_assignments` | UPDATE funciona normal | H1 |
| 14 | `qty_dispatched_cannot_exceed_assigned` | INSERT/UPDATE con dispatched > assigned rechaza | H7 |
| 15 | `qty_delivered_cannot_exceed_dispatched` | INSERT/UPDATE con delivered > dispatched rechaza | H8 |
| 16 | `create_trip_without_rate_blocked` | saveTrip con rate_id=null rechaza | tarifa |
| 17 | `edit_trip_remove_rate_blocked` | updateTrip que setea rate_id=null rechaza | tarifa |
| 18 | `revert_salida_blocked_when_deliveries_exist` | revert Salida con qty_delivered>0 rechaza con mensaje claro; permitido tras revertir Entregas (D8) | H8 |

**AD-5 (helpers `tests/helpers.ts` rotos)** queda sin resolver — los tests usan seed manual hasta que AD-5 se cierre en otro cambio.

### Pre-merge prod check (4 queries)

Antes del merge final v2 a prod (`bzeoszympkkicwlfdtcn`), Chat ejecuta:

**Query 1 — múltiples entregas (Bug #4):**

```sql
SELECT te.trip_id, tel.request_line_id, COUNT(*) AS active_deliveries
FROM trip_event_lines tel
JOIN trip_events te ON te.id = tel.trip_event_id
WHERE te.event_type = 'Entrega'
  AND te.reverts_event_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM trip_events te2 WHERE te2.reverts_event_id = te.id)
GROUP BY te.trip_id, tel.request_line_id
HAVING COUNT(*) > 1;
```

Expectativa: 0 rows (Cambio 5 no está mergeado a main, prod no debería tener el flow nuevo). Si retorna rows → script de cleanup antes de aplicar el constraint Bug #4.

**Query 2 — trips sin `rate_id`:**

```sql
SELECT id, trip_id, status, scheduled_date
FROM trips
WHERE rate_id IS NULL;
```

Si retorna rows → decidir cleanup: setear rate_id retroactivo, o cancelar esos trips, antes del `SET NOT NULL`.

**Query 3 — líneas zombie 'En Transito' sin trip activo:**

```sql
SELECT srl.id, srl.description, srl.status, srl.qty_scheduled, srl.qty_delivered
FROM sm_request_lines srl
WHERE srl.status = 'En Transito'
  AND NOT EXISTS (
    SELECT 1
    FROM trip_line_assignments tla
    JOIN trips t ON t.id = tla.trip_id
    WHERE tla.request_line_id = srl.id
      AND t.status NOT IN ('Cancelado', 'Completado')
  );
```

Expectativa: 0 rows. Si retorna rows → líneas a reconciliar manualmente antes del trigger fix Bug #2 (de lo contrario el trigger fix no las normaliza automáticamente — solo evita que aparezcan nuevas).

**Query 4 — drift en qty_dispatched / qty_delivered / quantity_assigned (riesgo H7+H8):**

```sql
SELECT id, trip_id, request_line_id, quantity_assigned, qty_dispatched, qty_delivered
FROM trip_line_assignments
WHERE qty_delivered > qty_dispatched
   OR qty_dispatched > quantity_assigned;
```

Expectativa: 0 rows. Si retorna rows → reconciliar manualmente (trim al valor permitido, o eliminar el assignment) antes de aplicar los CHECK constraints H7/H8 — de lo contrario la migración falla.

## Scope OUT (intencional)

NO se aborda en Cambio 6:

- Reglas de cuándo se puede editar otros campos de líneas (descripción, fechas, locations) más allá del fix H1 técnico.
- Reglas de quién puede cancelar qué en qué estado (PM vs logistica vs admin) — el comportamiento actual se mantiene.
- Reglas de reversión de eventos más allá de lo ya implementado.
- Edge cases de race conditions multi-trip, decimales, multi-PM coordinated cancellations.
- Auditoría sistémica de todos los flows de eventos.

Estos van a auditoría sistémica separada **post-Cambio 6**. Cambio 6 es scope contenido y ejecutable: 5 bugs originales + 3 hallazgos BD + tarifa + sus tests E2E.

## Decisiones arquitectónicas

### D1 — Bug #1 Opción α: assignment preservado, sobrante NO regresa a backlog automático

Cuando se cancela un trip:

- `trip_line_assignments` quedan persistidos en BD (NO DELETE).
- `trips.status='Cancelado'` dispara `trg_recalc_from_trip_status_change` (existe desde Cambio 5).
- Trigger `recalc_qty_for_line` excluye trips Cancelados/Completados al sumar `qty_scheduled` y `qty_delivered`.
- **Resultado:**
  - Línea con `qty_delivered>0` (preservado en assignment del trip Cancelado): trigger ve `qty_scheduled=0` para esa línea, `qty_delivered>0` (suma desde assignment intacto). Línea queda `'Parcial'`. NO regresa a backlog (filtro backlog excluye Parcial).
  - Línea con `qty_delivered=0` en el trip Cancelado: trigger ve `qty_scheduled=0` y `qty_delivered=0`. Línea queda `'Pendiente'`. SÍ vuelve al backlog (no hay "sobrante" porque nada se entregó).

Justificación: escenarios reales no garantizan dónde quedó el sobrante físicamente. Charris decide manualmente reprogramar consultando inventario, no automático.

### D2 — Bug #4 constraint excluye revertidos

```sql
-- Pseudo-código de la lógica del trigger:
WHERE te_existing.reverts_event_id IS NULL                    -- el existing no es Reversion
  AND NOT EXISTS (                                            -- y no existe Reversion que apunte al existing
    SELECT 1 FROM trip_events te_rev
    WHERE te_rev.reverts_event_id = te_existing.id
  )
```

Resultado: 1 sola Entrega activa por `(trip_id, request_line_id)` en cualquier momento. Charris puede revertir y registrar otra. Documentado explícitamente para reviewers.

### D3 — Bug #2 trigger explicit branch

```sql
-- Branch ELSIF v_current_status = 'En Transito' THEN ahora chequea:
SELECT COALESCE(SUM(qty_scheduled), 0) INTO v_qty_scheduled_active
FROM trip_line_assignments tla
JOIN trips t ON t.id = tla.trip_id
WHERE tla.request_line_id = p_request_line_id
  AND t.status NOT IN ('Cancelado', 'Completado');

IF v_qty_scheduled_active > 0 THEN
  -- Mantener 'En Transito' (caso normal)
ELSE
  -- Caer al status según qty_delivered: 'Entregada' / 'Parcial' / 'Pendiente'
END IF;
```

Calculado sobre trips no-Cancelados/no-Completados (los Cancelados/Completados son histórico inactivo). Sin assignments activos → línea NO queda zombie 'En Transito'.

### D4 — Bug #5 cancellation_reason condicional

`cancellation_reason TEXT` nullable en las 3 tablas (`trips`, `pickup_orders`, `external_orders`). CHECK constraint condicional valida la regla:

```sql
ALTER TABLE trips
ADD CONSTRAINT cancellation_reason_required_when_delivered CHECK (
  status != 'Cancelado'
  OR NOT EXISTS (
    SELECT 1 FROM trip_line_assignments tla
    WHERE tla.trip_id = trips.id AND tla.qty_delivered > 0
  )
  OR (cancellation_reason IS NOT NULL AND length(trim(cancellation_reason)) >= 10)
);
```

**Nota técnica importante:** PostgreSQL CHECK constraints **no pueden referenciar otras tablas via subquery** en versiones anteriores a 18 (mecanismo: solo `IMMUTABLE` allowed). Implementación real: **trigger BEFORE INSERT/UPDATE** en cada tabla con la misma lógica, no CHECK constraint. Documentado explícitamente para evitar trampear al implementador.

Razón de la regla condicional: cancelar trip Programado sin Salida (qty_delivered=0 todas) es operación frecuente (Charris arma, falta algo, cancela y rearma). Pedir razón obligatoria ahí es fricción. Cancelar con qty_delivered>0 es la excepción real que requiere razón documentada.

### D5 — Bug #4 UI defense-in-depth

`DeliveryModal` muestra todas las líneas del trip. Las que tienen Entrega activa (no revertida) se muestran con:
- Checkbox `disabled`
- Badge `✓ Entregada — {cantidad} a {receptor}`
- Tooltip: *"Entregada {fecha}. Para corregir, reversá la Entrega anterior primero."*

Greyed disabled (NO ocultas). Razones: visibilidad operativa del progreso, permite revertir desde mismo lugar, consistencia con DispatchModal.

### D6 — Tarifa obligatoria (rate_id NOT NULL)

`ALTER TABLE trips ALTER COLUMN rate_id SET NOT NULL`. Backfill no necesario (BD wipeada). Para prod: pre-merge query 2 confirma 0 trips sin rate_id; si hay rows, cleanup antes del NOT NULL.

`DispatchModal` ya está protegido por `enforce_trip_immutable_post_departure` (existe desde audit Fase B.1, abril 2026): trips post-Salida no permiten cambios de vehicle/driver/trailer. `rate_id` está bajo el mismo trigger, no se puede cambiar post-Salida.

### D7 — Orden de triggers BEFORE UPDATE en `sm_request_lines` (post-migración)

PostgreSQL ejecuta triggers BEFORE UPDATE en orden alfabético ASCII por nombre. Tras aplicar la migración, `sm_request_lines` tiene 3 triggers BEFORE UPDATE en este orden:

| Orden | Trigger | Función | Cuándo se introdujo |
|-------|---------|---------|---------------------|
| 1 | `enforce_quantity_immutable_trg` | Bloquea cambio de `quantity` si hay assignments activos (H1) | Cambio 6 |
| 2 | `sm_request_lines_updated_at` | Setea `updated_at = now()` | Pre-existente |
| 3 | `trg_enforce_qty_integrity` | Valida invariant `qty_scheduled + qty_delivered ≤ NEW.quantity` | Pre-existente |

**Por qué este orden importa para UX:** si Charris intenta editar `quantity` de una línea con assignments, el primer trigger (1) rechaza con mensaje específico *"No se puede editar la cantidad de una línea con asignaciones activas. Cancele las asignaciones primero."* — antes de que el trigger genérico (3) lance un mensaje sobre invariant violation. Mensaje específico = mejor debugging.

**Para no romper este orden en cambios futuros:** el nombre del trigger H1 debe quedar alfabéticamente antes de `s`. `enforce_quantity_immutable_trg` cumple. Si se agregan triggers nuevos a esta tabla, mantener este orden documentado.

### D8 — Efecto colateral de H8 sobre reversión de Salida (invariante deseado)

El constraint H8 (`qty_delivered ≤ qty_dispatched`) impone indirectamente: **no se puede revertir Salida mientras existan Entregas registradas en el trip.**

Razón: `handleRevert` para evento Salida (`mis-viajes/[id]/page.tsx:842-858`) hace `UPDATE trip_line_assignments SET qty_dispatched = 0` para todos los assignments. Si alguna línea tenía qty_delivered>0 (hubo Entrega antes), post-UPDATE quedaría qty_delivered>0 con qty_dispatched=0, violando H8 → BD rechaza UPDATE.

**Esto es semánticamente correcto, no es bug.** Si el camión llegó y entregó, el camión sí salió. El flow correcto para reversar Salida con Entregas registradas es:

1. Reversar cada Entrega individualmente (libera `qty_delivered` en cada assignment).
2. Una vez `qty_delivered = 0` en todos los assignments, reversar Salida funciona normalmente.

Este orden es coherente con el modelo Events V2 (eventos inmutables, reversiones puntuales que se aplican en orden inverso al original).

**Defense-in-depth UX:** `handleRevert` para evento Salida debe agregar pre-flight check antes del UPDATE bulk. Si encuentra `qty_delivered > 0` en algún assignment del trip, abortar con mensaje claro:

> *"Para revertir Salida, reversá primero las Entregas registradas. Hay {N} líneas con entregas activas en este viaje."*

Sin pre-flight, el UPDATE falla con error genérico de constraint H8 — el mensaje claro es UX, no semántica.

## Cambios BD

### Migración `cambio6_cancellation_integrity` (1 sola migración consolidada)

**Orden de operaciones:**

```sql
BEGIN;

-- 1. Columnas cancellation_reason (nullable)
ALTER TABLE trips           ADD COLUMN cancellation_reason TEXT;
ALTER TABLE pickup_orders   ADD COLUMN cancellation_reason TEXT;
ALTER TABLE external_orders ADD COLUMN cancellation_reason TEXT;

COMMENT ON COLUMN trips.cancellation_reason IS
  'Razón de cancelación. Obligatoria (≥10 chars) cuando alguna línea del trip tenía qty_delivered>0 al momento del cancel. Validado por trigger enforce_cancellation_reason_when_delivered.';
-- Idem para pickup_orders y external_orders

-- 2. Triggers BEFORE INSERT/UPDATE para cancellation_reason condicional
-- (3 triggers paralelos, uno por tabla)
CREATE OR REPLACE FUNCTION enforce_cancellation_reason_when_delivered()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo aplica en transición a 'Cancelado'
  IF NEW.status != 'Cancelado' THEN
    RETURN NEW;
  END IF;

  -- Si nada se entregó, razón es opcional
  IF NOT EXISTS (
    SELECT 1 FROM trip_line_assignments tla  -- ajustar tabla según el trigger
    WHERE tla.trip_id = NEW.id AND tla.qty_delivered > 0
  ) THEN
    RETURN NEW;
  END IF;

  -- Si hay qty_delivered>0, exigir razón válida
  IF NEW.cancellation_reason IS NULL OR length(trim(NEW.cancellation_reason)) < 10 THEN
    RAISE EXCEPTION 'cancellation_reason requerido (≥10 chars) cuando alguna línea tiene qty_delivered>0';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_cancellation_reason_trips
BEFORE INSERT OR UPDATE OF status ON trips
FOR EACH ROW EXECUTE FUNCTION enforce_cancellation_reason_when_delivered();

-- (paralelo para pickup_orders con pickup_order_lines, external_orders con external_order_lines)

-- 3. Trigger Bug #4 — BEFORE INSERT en trip_event_lines
CREATE OR REPLACE FUNCTION enforce_one_active_delivery_per_trip_line()
RETURNS TRIGGER AS $$
DECLARE
  v_event_type text;
  v_trip_id uuid;
BEGIN
  SELECT event_type, trip_id INTO v_event_type, v_trip_id
  FROM trip_events WHERE id = NEW.trip_event_id;

  IF v_event_type != 'Entrega' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM trip_event_lines tel_x
    JOIN trip_events te_x ON te_x.id = tel_x.trip_event_id
    WHERE te_x.trip_id = v_trip_id
      AND te_x.event_type = 'Entrega'
      AND te_x.id != NEW.trip_event_id
      AND te_x.reverts_event_id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM trip_events te_rev
        WHERE te_rev.reverts_event_id = te_x.id
      )
      AND tel_x.request_line_id = NEW.request_line_id
  ) THEN
    RAISE EXCEPTION 'Línea % ya tiene una Entrega activa en este trip. Reversá la Entrega anterior antes de registrar otra.', NEW.request_line_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_one_active_delivery_trg
BEFORE INSERT ON trip_event_lines
FOR EACH ROW EXECUTE FUNCTION enforce_one_active_delivery_per_trip_line();

-- 4. Trigger Bug #2 fix — modificación de recalc_qty_for_line
-- (replace de la función existente con nueva lógica del branch 'En Transito')
-- Lógica: SUM(qty_scheduled) FROM tla JOIN trips WHERE NOT IN ('Cancelado','Completado')
-- IF v_qty_scheduled_active > 0 THEN preservar 'En Transito' ELSE caer al status calculado

-- 5. Trigger H1 — BEFORE UPDATE en sm_request_lines.quantity
CREATE OR REPLACE FUNCTION enforce_quantity_immutable_with_active_assignments()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantity = OLD.quantity THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM trip_line_assignments tla
    JOIN trips t ON t.id = tla.trip_id
    WHERE tla.request_line_id = NEW.id
      AND tla.quantity_assigned > 0
      AND t.status NOT IN ('Cancelado', 'Completado')
    UNION ALL
    SELECT 1 FROM pickup_order_lines pol
    JOIN pickup_orders po ON po.id = pol.pickup_order_id
    WHERE pol.request_line_id = NEW.id
      AND pol.quantity_assigned > 0
      AND po.status != 'Cancelado'
    UNION ALL
    SELECT 1 FROM external_order_lines eol
    JOIN external_orders eo ON eo.id = eol.external_order_id
    WHERE eol.request_line_id = NEW.id
      AND eol.quantity_assigned > 0
      AND eo.status != 'Cancelado'
  ) THEN
    RAISE EXCEPTION 'No se puede editar la cantidad de una línea con asignaciones activas. Cancele las asignaciones primero.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_quantity_immutable_trg
BEFORE UPDATE OF quantity ON sm_request_lines
FOR EACH ROW EXECUTE FUNCTION enforce_quantity_immutable_with_active_assignments();

-- 6. CHECK constraints H7 + H8
ALTER TABLE trip_line_assignments
  ADD CONSTRAINT qty_dispatched_le_assigned CHECK (qty_dispatched <= quantity_assigned),
  ADD CONSTRAINT qty_delivered_le_dispatched CHECK (qty_delivered <= qty_dispatched);

-- 7. Tarifa obligatoria
ALTER TABLE trips ALTER COLUMN rate_id SET NOT NULL;

COMMIT;
```

**Una sola migración consolidada** para mantener atomicidad — si algo falla a mitad, rollback transaccional. Pre-merge prod check (3 queries) corre antes de aplicar.

### Rollback (si necesario)

```sql
BEGIN;
ALTER TABLE trip_line_assignments
  DROP CONSTRAINT IF EXISTS qty_dispatched_le_assigned,
  DROP CONSTRAINT IF EXISTS qty_delivered_le_dispatched;
ALTER TABLE trips ALTER COLUMN rate_id DROP NOT NULL;
DROP TRIGGER IF EXISTS enforce_quantity_immutable_trg ON sm_request_lines;
DROP TRIGGER IF EXISTS enforce_one_active_delivery_trg ON trip_event_lines;
DROP TRIGGER IF EXISTS enforce_cancellation_reason_trips ON trips;
DROP TRIGGER IF EXISTS enforce_cancellation_reason_pickup_orders ON pickup_orders;
DROP TRIGGER IF EXISTS enforce_cancellation_reason_external_orders ON external_orders;
DROP FUNCTION IF EXISTS enforce_quantity_immutable_with_active_assignments();
DROP FUNCTION IF EXISTS enforce_one_active_delivery_per_trip_line();
DROP FUNCTION IF EXISTS enforce_cancellation_reason_when_delivered();
ALTER TABLE trips           DROP COLUMN IF EXISTS cancellation_reason;
ALTER TABLE pickup_orders   DROP COLUMN IF EXISTS cancellation_reason;
ALTER TABLE external_orders DROP COLUMN IF EXISTS cancellation_reason;
-- Restore previous version of recalc_qty_for_line trigger function
COMMIT;
```

## Cambios código

### a) `src/hooks/useTrips.ts` — `cancelTrip`

```typescript
const cancelTrip = useCallback(
  async (id: string, cancellationReason: string | null): Promise<boolean> => {
    if (busyRef.current) return false
    busyRef.current = true
    setSaving(true)
    setSaveError(null)

    try {
      // Bug #1 fix: NO MORE DELETE assignments.
      // Trigger trg_recalc_from_trip_status_change recalcula líneas
      // automáticamente al cambio de status. Trigger Bug #2 fix asegura
      // que líneas sin assignments activos no quedan zombie 'En Transito'.
      const { error: cancelError } = await supabase
        .from('trips')
        .update({
          status: 'Cancelado',
          cancellation_reason: cancellationReason?.trim() || null,
        })
        .eq('id', id)

      if (cancelError) {
        // Trigger BD enforce_cancellation_reason_when_delivered_trips puede
        // rechazar si qty_delivered>0 y razón inválida.
        setSaveError(
          cancelError.message.includes('cancellation_reason requerido')
            ? 'Debes proveer una razón (≥10 caracteres) para cancelar este viaje porque tiene entregas registradas.'
            : cancelError.message,
        )
        return false
      }

      notifyViajeCancelado(id).catch(console.error)
      return true
    } catch (err) {
      // ...
    }
  },
  [supabase],
)
```

### b) `src/hooks/usePickupOrders.ts` — `cancelPickupOrder`

Agrega parámetro `cancellationReason: string | null`. UPDATE incluye campo. Mismo error handling para mensaje del trigger.

### c) `src/hooks/useExternalOrders.ts` — `cancelExternalOrder`

Paralelo a pickup. Mismo error handling.

### d) `src/components/programacion/CancelTripModal.tsx` (nuevo o existente extendido)

```tsx
// Pseudo-código:
const [reason, setReason] = useState('')
const requiresReason = stats.deliveredCount > 0
const reasonValid = !requiresReason || reason.trim().length >= 10

return (
  <Modal>
    <h3>Cancelar viaje</h3>
    {stats.deliveredCount > 0 && (
      <p className="text-amber-700">
        Este viaje tiene {stats.deliveredCount} líneas con {stats.deliveredQty} unidades entregadas.
        El histórico se preserva. La razón es obligatoria.
      </p>
    )}
    <textarea
      value={reason}
      onChange={(e) => setReason(e.target.value)}
      placeholder={requiresReason ? "Razón de cancelación (mínimo 10 caracteres)..." : "Razón opcional..."}
      minLength={requiresReason ? 10 : 0}
    />
    {requiresReason && (
      <p className="text-xs text-iconsa-gray">
        {reason.trim().length}/10 caracteres mínimos
      </p>
    )}
    <Button disabled={!reasonValid} onClick={() => onConfirm(reason.trim() || null)}>
      Cancelar viaje
    </Button>
  </Modal>
)
```

### e) Modales paralelos

`CancelPickupOrderModal` y `CancelExternalOrderModal` (que ya existen con stats pre-flight de Cambio 5) extienden el mismo patrón.

### f) `src/components/viajes/DeliveryModal.tsx` filtro UI (Bug #4)

Pre-flight SELECT busca líneas con Entrega activa en este trip:

```typescript
const activeDeliveries = await supabase
  .from('trip_event_lines')
  .select(`
    request_line_id,
    quantity,
    trip_event:trip_event_id!inner(
      event_type,
      reverts_event_id,
      received_by_name
    )
  `)
  .eq('trip_event.trip_id', trip.id)
  .eq('trip_event.event_type', 'Entrega')
  .is('trip_event.reverts_event_id', null)
  // Filter en JS post-fetch para excluir las que tienen Reversion apuntando

const alreadyDeliveredLineIds = new Set(/* ... */)
```

Render: cada línea del trip se renderiza. Si está en `alreadyDeliveredLineIds` → checkbox disabled, badge `✓ Entregada — {qty} a {receptor}`, tooltip explicativo.

### g) `src/app/(app)/mis-viajes/[id]/page.tsx` — `handleDelivery` error handling

```typescript
catch (err) {
  const errMsg = err instanceof Error ? err.message : 'Error al registrar entrega'
  if (errMsg.includes('ya tiene una Entrega activa')) {
    setEventError('Esta línea ya fue entregada en este viaje. Reversá la Entrega anterior primero si necesitás corregir.')
  } else {
    setEventError(errMsg)
  }
}
```

### g2) `src/app/(app)/mis-viajes/[id]/page.tsx` — `handleRevert` Salida pre-flight (D8)

```typescript
if (eventType === 'Salida') {
  // D8 pre-flight: H8 constraint rechazaría UPDATE si hay qty_delivered>0.
  // Damos mensaje claro al usuario antes de que la BD falle.
  const linesWithDeliveries = trip.assignments.filter((a) => (a.qty_delivered ?? 0) > 0)
  if (linesWithDeliveries.length > 0) {
    setEventError(
      `Para revertir Salida, reversá primero las Entregas registradas. Hay ${linesWithDeliveries.length} líneas con entregas activas en este viaje.`,
    )
    setReverting(false)
    return
  }
  // ... resto del handler existente (UPDATE trip + UPDATE assignments)
}
```

### h) `src/app/(app)/programacion/viaje/nuevo/page.tsx` y `[id]/page.tsx` — validate

Agregar a la función `validate()` existente:

```typescript
if (!rateId) {
  errors.rateId = 'La tarifa es obligatoria'
}
if (cost == null || cost <= 0) {
  errors.cost = 'El costo debe ser mayor a cero'
}
```

### i) `CLAUDE.md` regla #9 actualizada

```markdown
9. **Tarifa OBLIGATORIA.** Costo se auto-rellena con `rate.amount` y queda **read-only**
   (deseleccionar tarifa NO posible — es requerida). Validación bloquea guardar/editar
   sin tarifa. **Cambio 2026-04-29 (Cambio 6):** antes la tarifa era opcional;
   ahora es requerida en todo trip nuevo y editado.
```

## Riesgos y mitigaciones

### R1 — Cambio de signature de `cancelTrip`/`cancelPickupOrder`/`cancelExternalOrder`

Los 3 hooks cambian signature: agregan `cancellationReason: string | null` como segundo parámetro. **Callers a actualizar:**

- `src/app/(app)/programacion/viaje/[id]/page.tsx` (cancelTrip)
- `src/app/(app)/programacion/page.tsx` (cancelPickupOrder, cancelExternalOrder)
- `src/app/(app)/solicitudes/[id]/page.tsx` (cancelPickupOrder, cancelExternalOrder)

Mitigación: TypeScript fuerza la actualización en build. Build verde es prerequisito.

### R2 — Trigger Bug #2 fix puede afectar líneas existentes en staging

Con BD wipeada (0 rows operativas), no hay efecto. Pre-merge prod query 3 detecta líneas zombie 'En Transito' antes del merge a prod.

### R3 — H7/H8 constraints pueden bloquear data legacy en prod

Si prod tiene assignments con `qty_delivered > qty_dispatched` o `qty_dispatched > quantity_assigned` (drift histórico de bugs antiguos), la migración falla al aplicar los CHECK constraints. Mitigación: pre-merge query 4 (incluida en el set oficial) confirma 0 rows. Si retorna rows → reconciliar antes de aplicar.

### R4 — DeliveryModal pre-flight extra query agrega latencia

El SELECT extra de líneas con Entrega activa agrega un round-trip al abrir el modal. Mitigación: query liviano (1 join), trip-scoped, no afecta trips chicos. Trips con 50+ líneas son inusuales.

### R5 — Trigger BD CHECK condicional vs subquery

PostgreSQL no soporta subqueries en CHECK. Implementación real es trigger BEFORE INSERT/UPDATE OF status (no CHECK). Documentado en D4 para evitar trampear al implementador.

### R6 — Edge case H8: ¿hay flow donde delivered se UPDATEa antes de dispatched?

Verificado: handleDispatch (Salida) precede a handleDelivery (Entrega) por orden temporal del flow. No hay path operativo que viole el orden EN DIRECCIÓN FORWARD.

**En dirección reverse (revertir Salida con Entregas activas):** H8 actúa como guard implícito — ver D8. El UPDATE bulk `qty_dispatched=0` en handleRevert para Salida falla con constraint H8 si alguna línea tiene qty_delivered>0. Esto es semánticamente correcto (mismo invariante, dirección reversa) y se documenta como invariante deseado, no bug. Test #18 verifica el comportamiento. Pre-flight UX en handleRevert da mensaje claro al usuario antes de que el constraint falle.

## Plan de aplicación

1. **Brainstorming aprobado** (este spec).
2. **`writing-plans`** genera plan ejecutable con 11–13 tasks (estimado).
3. **Implementación TDD + Playwright:**
   - T1: Migración BD aplicada por Chat en staging vía Supabase MCP (`cambio6_cancellation_integrity`).
   - T2: Tests E2E suite (los 17 tests escribirse en orden, fallan inicialmente — RED).
   - T3–T8: Code changes (cancelTrip, modales, DeliveryModal, validate, error handling) — tests pasan progresivamente (GREEN).
   - T9: Auditoría replicación (verifica pickup/external no replican).
   - T10: Smoke fresh con BD limpia post-wipe.
   - T11: PARADA por James para smoke retest manual.
4. **Post-smoke OK → T11 final unificado** (Cambio 5 + Cambio 6 docs):
   - CHANGELOG entries combinados.
   - Spec maestro v3.4 con secciones 5 y 6.
   - BACKLOG cierra AD-3 (si aplica).
   - Frontmatters: Cambio 5 + Cambio 6 specs `status: shipped`.
   - Plans deletion (Cambio 5 + Cambio 6).
   - TRAIL update.
   - Working tree leftover cleanup (cambio4 tasks.json, cambio5 tasks.json, supabase/.temp/cli-latest).

## Referencias

- Spec Cambio 5 (precedente): `Docs/superpowers/specs/2026-04-29-cambio5-bulk-fulfillment.md`
- Plan Cambio 5 (shippeado, pending T11): `Docs/superpowers/plans/2026-04-29-cambio5-bulk-fulfillment.md`
- CHANGELOG entries Cambio 5 (4 polish rounds incluidos): `Docs/CHANGELOG.md` 2026-04-27 y 2026-04-28
- TRAIL.md (posición actual): `Docs/TRAIL.md`
- CLAUDE.md regla #9 (tarifa actual): proyecto root
