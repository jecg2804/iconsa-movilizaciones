---
name: Cambio 6.5 — Refinamiento del modelo de eventos (Events V2)
description: Corrige semántica del trigger recalc_qty_for_line para que entregas parciales con líneas rechazadas liberen al backlog en el momento de la Entrega (no en Retorno). Da efecto operacional real al line_status='rejected' vía nueva columna qty_rejected y trigger sync de assignments. Reescribe H1 con 3 condiciones de bloqueo. Migra lógica de mutación de qty_delivered de frontend a triggers BD (forward + reverse). Cleanup de código muerto post-Cambio 5.
type: change
status: draft
date: 2026-04-30
---

# Cambio 6.5 — Refinamiento del modelo de eventos (Events V2)

## Resumen

El smoke test post-Cambio 6 reveló que cuando una entrega tiene líneas rechazadas (`line_status='rejected'`), la cantidad rechazada queda fantasma en el assignment hasta que se registra Retorno. Eso es regresión introducida por el Bug #2 fix de Cambio 6 (trigger `recalc_qty_for_line` con orden de evaluación incorrecto), agravada por una semántica débil del campo `line_status` (era metadata visual sin efecto operacional consistente).

Cambio 6.5 corrige la semántica de eventos para que **cada evento tenga responsabilidad clara y única**:

- **Entrega** finaliza el destino de cada línea entregada — `ok` y `with_observations` cuentan a `qty_delivered`; `rejected` libera al backlog vía nueva columna `qty_rejected`.
- **Retorno** sigue siendo no-op en cantidades — solo cierra el trip (ya implementado, no se toca).
- **Reversión** revierte el efecto del evento original simétricamente.

**Invariante a defender:**

```
qty_disponible_backlog = quantity - qty_delivered_total - (qty_dispatched_pendiente_de_retorno_o_entrega)
qty_scheduled_active   = quantity_assigned - qty_delivered - qty_rejected     (en trip_line_assignments)
qty_delivered + qty_rejected ≤ qty_dispatched                                  (defensa BD)
```

**Estrategia:** la BD es fuente única de verdad de la mutación de assignments. Frontend solo registra eventos; triggers BD sincronizan derivados (forward y reverse). Status terminales y status gestionados por cascadas externas se preservan.

## Contexto y motivación

**Cambio 6 (just shipped)** introdujo el trigger `recalc_qty_for_line` con un branch para `'En Transito'` que chequea `v_trip_qty_scheduled_active > 0` antes de evaluar `qty_delivered`. Como `quantity_assigned` no se reduce post-Entrega rejected, el branch siempre encuentra `qty_scheduled_active > 0` y mantiene la línea zombie en `'En Transito'`. Bug #2 que el fix de Cambio 6 introdujo al cambiar la lógica del branch.

**Smoke test reproductor (audit log):** entrega con línea 1 rejected (qty=4) + línea 2 ok parcial (qty=3 de 6). Esperado: línea 1 debería pasar a `'Pendiente'` (los 4 vuelven al backlog) y línea 2 a `'Parcial'` (3 entregados, 3 pendientes). Real: ambas quedan `'En Transito'` hasta que se registra Retorno, momento en el cual el cascade hace algo que las normaliza.

**Decisiones cerradas con James durante el brainstorming:**

- `qty_dispatched` se preserva siempre (Opción α: dato histórico inmutable).
- Modelo event-sourced para columnas de assignment: cada columna refleja un evento específico, no se mutan retroactivamente entre eventos (excepto via reversión).
- `has_observations` flag descartado (sería desnormalización — `delivery_observations` ya es source of truth normalizado).
- Notas obligatorias (≥10 chars) cuando alguna línea del evento Entrega tiene `line_status='with_observations'`.
- H1 reescrito (no eliminado) con 3 condiciones de bloqueo alineadas a patrón Coupa/SAP Ariba.
- Pickup y external **fuera de scope**: no tienen `rejected` por diseño (todo-o-nada v1). El sync trigger nuevo solo cubre flow flota.
- Status `'Pickup Aprobado'`/`'Externo Aprobado'` ya no existen en `sm_request_lines.status` (Cambio 5 los eliminó). Branch defensivo del recalc preserva solo `'Cancelada'`.

## Scope IN

### Diseño BD (10 items, una migración consolidada)

| # | Item | Justificación |
|---|------|---------------|
| **BD-1** | ADD COLUMN `qty_rejected NUMERIC NOT NULL DEFAULT 0` SOLO en `trip_line_assignments` | Pickup/external no tienen flow rejected — agregar la columna ahí sería dead storage |
| **BD-2** | DROP `CHECK qty_delivered_le_dispatched`, ADD `CHECK qty_delivered + qty_rejected <= qty_dispatched` | Lo entregado conforme + lo rechazado nunca puede superar lo despachado |
| **BD-3** | ADD `CHECK qty_rejected >= 0` en `trip_line_assignments` | Defensa básica |
| **BD-4** | REPLACE `recalc_qty_for_line` con: branch defensivo `'Cancelada'` + 6 puntos de orden + descontar `qty_rejected` | Corrige zombie 'En Transito' + maneja qty_rejected + preserva status terminal |
| **BD-5** | CREATE trigger `sync_assignment_on_delivery_event` AFTER INSERT en `trip_event_lines` | Mueve mutación de `qty_delivered`/`qty_rejected` de frontend a BD. Soporta los 3 line_status |
| **BD-6** | CREATE trigger `sync_assignment_on_delivery_revert` AFTER INSERT en `trip_events` WHEN `reverts_event_id IS NOT NULL` | Espejo reverso del sync forward. Lee `trip_event_lines` del evento revertido y aplica inverso por `line_status` |
| **BD-7** | REPLACE `enforce_quantity_immutable_with_active_assignments` (H1) con 3 condiciones de bloqueo | Alinea con patrón Coupa: solo bloquea si rompe realidad física, permite reducciones razonables |
| **BD-8** | CREATE trigger `enforce_revert_only_on_active_trip` BEFORE INSERT en `trip_events` WHEN `reverts_event_id IS NOT NULL` | Bloquea revert Entrega si `trip.status IN ('Completado', 'Cancelado')`. Mensaje claro |
| **BD-9** | CREATE UNIQUE INDEX `one_revert_per_event` en `trip_events(reverts_event_id) WHERE reverts_event_id IS NOT NULL` | Previene doble revert del mismo evento (race condition o doble click) |
| **BD-10** | CREATE trigger `enforce_notes_on_with_observations` BEFORE INSERT en `trip_event_lines` | Bloquea inserción si `line_status='with_observations'` y el `trip_events` padre tiene notes vacías o <10 chars |

### Diseño frontend (4 items)

| # | Item | Detalle |
|---|------|---------|
| **FE-1** | Eliminar UPDATE manual de `qty_delivered` en `mis-viajes/[id]:729-743` | El sync trigger BD-5 es fuente única. Elimina race condition handling (SELECT fresco previo) — innecesario porque trigger corre en misma transacción del INSERT |
| **FE-2** | Eliminar decremento manual de `qty_delivered` en `handleRevert` (líneas 887-930) | El sync trigger reverso BD-6 es fuente única |
| **FE-3** | Guard frontend en `handleRevert` branch `'Entrega'` para revert en trip cerrado | Mensaje user-facing: *"Este viaje ya fue cerrado. Para corregir esta entrega, primero revierte el Retorno desde la sección de eventos del viaje."* Defense-in-depth con BD-8 |
| **FE-4** | DeliveryModal — notas required (≥10 chars) cuando alguna línea seleccionada tiene `line_status='with_observations'` | Validación bloquea submit. Mensaje: *"Las notas son obligatorias (mínimo 10 caracteres) cuando alguna línea tiene observaciones."* |

### Cleanup código muerto (1 item, post-confirmación con James)

| # | Item | Detalle |
|---|------|---------|
| **CL-1** | Eliminar refs muertas a `'Pickup Aprobado'`/`'Externo Aprobado'` post-Cambio 5 | Cases en `src/lib/utils/format.ts:173,177` (statusContextString switch). Comentario obsoleto en `src/hooks/useSolicitudes.ts:927`. Verificar con grep que no quedan más refs vivas — eliminar las que aparezcan |

### Tests E2E (13 nuevos + verificación regresión Cambio 6)

| # | Test | Verifica |
|---|------|----------|
| 1 | `entrega_ok_parcial_lleva_a_parcial_inmediato` | Línea pasa a `'Parcial'` al momento de Entrega ok parcial, sin esperar Retorno |
| 2 | `entrega_rejected_libera_al_backlog_inmediato` | Línea con rejected total pasa a `'Pendiente'` inmediatamente. `qty_rejected` aumenta correctamente. `qty_dispatched` preservado (Opción α) |
| 3 | `entrega_mixta_ok_rejected_libera_solo_rejected_al_backlog` | **Reproductor literal del audit log MOV-2026-058.** Entrega con línea 1 rejected (qty=4) + línea 2 ok parcial (qty=3 de 6). Verifica que línea 1 vuelve a `'Pendiente'` y línea 2 a `'Parcial'`, ambas inmediatamente al registrar Entrega. Es el bug que motivó Cambio 6.5 — sin este test no probamos que el fix resuelve el problema reportado |
| 4 | `entrega_with_observations_inserta_observation` | `delivery_observations` insertado. qty_delivered se incrementa normalmente (igual que `ok`) |
| 5 | `entrega_with_observations_requiere_notas` | Submit rechazado si notes vacías o <10 chars cuando hay líneas with_observations. BD bloquea con error claro (BD-10) |
| 6 | `retorno_no_modifica_lineas` | Snapshot BD antes/después de Retorno: solo cambia `trips.status`. Líneas y assignments idénticos |
| 7 | `revert_entrega_revierte_qty_delivered_y_qty_rejected` | **Verifica BD-6.** Setup: entrega con ok=3 + rejected=2. Revert. Verificar que `qty_delivered` baja en 3 y `qty_rejected` baja en 2. Línea recalcula a status correcto post-revert |
| 8 | `revert_doble_del_mismo_evento_bloqueado` | **Verifica BD-9.** Setup: registrar Entrega → revertir → intentar revertir el mismo evento de nuevo. Esperado: error con código `unique_violation` (23505) |
| 9 | `revert_entrega_en_trip_cerrado_bloqueado` | BD-8 + FE-3 ambos rechazan. Mensaje correcto en frontend ("Este viaje ya fue cerrado. Para corregir esta entrega, primero revierte el Retorno...") |
| 10 | `edit_quantity_permitido_post_envio_pre_salida` | PM puede reducir quantity de línea Programada (con assignment, sin Salida) si nuevo qty ≥ quantity_assigned activa |
| 11 | `edit_quantity_bloqueado_por_qty_dispatched` | Bloqueado con error claro si nuevo qty < qty_dispatched_total |
| 12 | `edit_quantity_bloqueado_por_qty_delivered` | **Verifica condición 2 de H1.** Setup: línea con entrega parcial (qty_delivered=4 de 10). PM intenta reducir quantity a 3. Esperado: error claro mencionando los 4 ya entregados |
| 13 | `edit_quantity_aumentar_siempre_permitido` | Aumentar quantity nunca bloquea, sin importar estado de assignments |

**Adicional:** correr la suite completa de Cambio 6 (18 tests) — los fixes de Cambio 6.5 NO deben romper Cambio 6.

**Cleanup obligatorio en TODOS los tests:** `afterEach` o `afterAll` con `cleanupSolicitud(solicitudId)` (helper ya existe, usado en `tests/entrega-complete.spec.ts:24`). Tests de Cambio 6 dejaron 33 solicitudes huérfanas en staging por falta de cleanup. No repetir.

### Pre-merge queries (4 total)

Corren en staging ANTES de aplicar la migración. Cuando llegue prod, se corren de nuevo allá.

```sql
-- Query 1 — drift previo al CHECK qty_delivered + qty_rejected ≤ qty_dispatched
SELECT id, trip_id, request_line_id, qty_dispatched, qty_delivered, COALESCE(qty_rejected, 0) AS qty_rejected
FROM trip_line_assignments
WHERE qty_delivered + COALESCE(qty_rejected, 0) > qty_dispatched;

-- Query 2 — líneas zombie 'En Transito' sin trip activo (verificar Bug #2 sigue resuelto)
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

Si las 4 retornan 0 rows en staging, la migración aplica limpio. Si alguna retorna rows, hay que limpiar antes (o entender el caso).

**Nota:** la pregunta "¿hay assignments donde el frontend trató rejected como qty_delivered en eventos pasados?" no es chequeable pre-Cambio 6.5 porque `qty_rejected` no existe como columna ni concepto antes de esta migración. La query 1 cubre el caso suficientemente (cualquier drift histórico que rompiera el invariante nuevo aparecería como `qty_delivered > qty_dispatched`, equivalente a `qty_delivered + 0 > qty_dispatched`).

## Scope OUT

| Item | Razón |
|------|-------|
| Pickup orders / external orders touching | Out per brief. Siguen funcionando como en Cambio 6 (todo-o-nada, sin rejected) |
| Notificaciones por email para rejected | Feature separado, no scope |
| UI más amplia del DeliveryModal (más allá de notas obligatorias) | Polish UX queda para sprint futuro |
| Versionamiento de solicitudes con UI de historial | BACKLOG (BL-VERSIONING) |
| Constraint de exclusividad entre 3 modalidades de servicio | BACKLOG (BL-EXCLUSIVITY) — bug pre-existente, requiere diagnóstico en prod primero |
| RPC SQL atómica para `convertLineToPickup`/`convertLineToExternal` | BACKLOG (BL-RPC-CONVERSION) — deuda técnica de Cambios 3/4, riesgo bajo en v1 |
| Auditoría sistémica completa del app | Post-Cambio 6.5 |

## Diseño detallado

### BD-4 — Trigger `recalc_qty_for_line` reescrito

```sql
CREATE OR REPLACE FUNCTION recalc_qty_for_line(p_request_line_id uuid)
RETURNS void AS $$
DECLARE
  v_quantity numeric;
  v_current_status text;
  v_qty_delivered_total numeric;
  v_qty_scheduled_active numeric;
  v_quantity_assigned_active numeric;
  v_new_status text;
BEGIN
  -- 1. Cargar quantity y status actual de la línea
  SELECT quantity, status INTO v_quantity, v_current_status
  FROM sm_request_lines WHERE id = p_request_line_id;

  -- 2. BRANCH DEFENSIVO — preservar status terminal Cancelada
  IF v_current_status = 'Cancelada' THEN
    RETURN;
  END IF;

  -- 3. Calcular qty_delivered_total agregando 3 fuentes (subqueries independientes,
  --    sin FROM principal — cada SUM se evalúa una sola vez)
  SELECT
    COALESCE((SELECT SUM(qty_delivered) FROM trip_line_assignments WHERE request_line_id = p_request_line_id), 0) +
    COALESCE((SELECT SUM(qty_delivered) FROM pickup_order_lines WHERE request_line_id = p_request_line_id), 0) +
    COALESCE((SELECT SUM(qty_delivered) FROM external_order_lines WHERE request_line_id = p_request_line_id), 0)
  INTO v_qty_delivered_total;

  -- 4. Calcular qty_scheduled_active (descontando qty_rejected en assignments,
  --    sin qty_rejected en pickup/external porque allí no aplica)
  SELECT COALESCE(SUM(GREATEST(0,
    tla.quantity_assigned - COALESCE(tla.qty_delivered, 0) - COALESCE(tla.qty_rejected, 0)
  )), 0)
  INTO v_qty_scheduled_active
  FROM trip_line_assignments tla
  JOIN trips t ON t.id = tla.trip_id
  WHERE tla.request_line_id = p_request_line_id
    AND t.status NOT IN ('Cancelado', 'Completado');

  v_qty_scheduled_active := v_qty_scheduled_active +
    COALESCE((
      SELECT SUM(GREATEST(0, pol.quantity_assigned - COALESCE(pol.qty_delivered, 0)))
      FROM pickup_order_lines pol
      JOIN pickup_orders po ON po.id = pol.pickup_order_id
      WHERE pol.request_line_id = p_request_line_id
        AND po.status NOT IN ('Cancelado', 'Entregado')
    ), 0) +
    COALESCE((
      SELECT SUM(GREATEST(0, eol.quantity_assigned - COALESCE(eol.qty_delivered, 0)))
      FROM external_order_lines eol
      JOIN external_orders eo ON eo.id = eol.external_order_id
      WHERE eol.request_line_id = p_request_line_id
        AND eo.status NOT IN ('Cancelado', 'Entregado')
    ), 0);

  -- 5. Calcular quantity_assigned_active total (para distinguir Programada vs Pendiente)
  SELECT COALESCE(SUM(tla.quantity_assigned), 0)
  INTO v_quantity_assigned_active
  FROM trip_line_assignments tla
  JOIN trips t ON t.id = tla.trip_id
  WHERE tla.request_line_id = p_request_line_id
    AND t.status NOT IN ('Cancelado', 'Completado');

  v_quantity_assigned_active := v_quantity_assigned_active +
    COALESCE((
      SELECT SUM(pol.quantity_assigned)
      FROM pickup_order_lines pol
      JOIN pickup_orders po ON po.id = pol.pickup_order_id
      WHERE pol.request_line_id = p_request_line_id
        AND po.status NOT IN ('Cancelado', 'Entregado')
    ), 0) +
    COALESCE((
      SELECT SUM(eol.quantity_assigned)
      FROM external_order_lines eol
      JOIN external_orders eo ON eo.id = eol.external_order_id
      WHERE eol.request_line_id = p_request_line_id
        AND eo.status NOT IN ('Cancelado', 'Entregado')
    ), 0);

  -- 6. Orden de evaluación de status (6 puntos)
  IF v_quantity_assigned_active = 0 AND v_qty_delivered_total = 0 THEN
    v_new_status := 'Pendiente';
  ELSIF v_qty_delivered_total >= v_quantity THEN
    v_new_status := 'Entregada';
  ELSIF v_qty_scheduled_active > 0 THEN
    v_new_status := 'En Transito';
  ELSIF v_qty_delivered_total > 0 THEN
    v_new_status := 'Parcial';
  ELSIF v_quantity_assigned_active > 0 THEN
    v_new_status := 'Programada';
  ELSE
    v_new_status := 'Pendiente';
  END IF;

  -- 7. Update agregados y status
  UPDATE sm_request_lines
  SET
    qty_scheduled = v_qty_scheduled_active,
    qty_delivered = v_qty_delivered_total,
    status = v_new_status,
    delivered_at = CASE WHEN v_new_status = 'Entregada' AND delivered_at IS NULL
                        THEN NOW() ELSE delivered_at END
  WHERE id = p_request_line_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

**Notas:**
- `SECURITY DEFINER` y `SET search_path` preservados del trigger original (consistente con resto de funciones).
- Branch `'Cancelada'` al inicio previene que cancelar la línea + recalcular dispare después la pise a `'Pendiente'`.
- Orden de 6 puntos: `'En Transito'` gana sobre `'Parcial'` cuando ambos coexisten (decisión: muestra actividad presente, no histórica).
- `delivered_at` se setea en transición a `'Entregada'` si todavía es NULL — preserva timestamp existente si ya fue seteado.

### BD-5 — Trigger `sync_assignment_on_delivery_event`

```sql
CREATE OR REPLACE FUNCTION sync_assignment_on_delivery_event()
RETURNS TRIGGER AS $$
DECLARE
  v_event_type text;
  v_trip_id uuid;
BEGIN
  SELECT event_type, trip_id INTO v_event_type, v_trip_id
  FROM trip_events WHERE id = NEW.trip_event_id;

  -- Solo eventos de Entrega disparan sync (otros eventos no tienen trip_event_lines o no requieren sync)
  IF v_event_type != 'Entrega' THEN
    RETURN NEW;
  END IF;

  IF NEW.line_status IN ('ok', 'with_observations') THEN
    UPDATE trip_line_assignments
    SET qty_delivered = COALESCE(qty_delivered, 0) + NEW.quantity
    WHERE trip_id = v_trip_id
      AND request_line_id = NEW.request_line_id;
  ELSIF NEW.line_status = 'rejected' THEN
    UPDATE trip_line_assignments
    SET qty_rejected = qty_rejected + NEW.quantity
    WHERE trip_id = v_trip_id
      AND request_line_id = NEW.request_line_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER sync_assignment_on_delivery_event_trg
AFTER INSERT ON trip_event_lines
FOR EACH ROW EXECUTE FUNCTION sync_assignment_on_delivery_event();
```

**Notas:**
- Corre en misma transacción del INSERT a `trip_event_lines`. UPDATE de `trip_line_assignments` dispara `recalc_qty_for_line` (que está atado a UPDATE de assignments). Cascade automática: la línea queda con status correcto al final de la transacción.
- `qty_dispatched` no se toca — preservado per Opción α.

### BD-6 — Trigger `sync_assignment_on_delivery_revert`

```sql
CREATE OR REPLACE FUNCTION sync_assignment_on_delivery_revert()
RETURNS TRIGGER AS $$
DECLARE
  v_reverted_event_type text;
  v_reverted_trip_id uuid;
BEGIN
  -- Solo procesar inserts que son reversiones (WHEN clause del trigger ya filtra, pero defense)
  IF NEW.reverts_event_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Obtener tipo del evento revertido (si es Entrega, hay que sincronizar)
  SELECT event_type, trip_id INTO v_reverted_event_type, v_reverted_trip_id
  FROM trip_events WHERE id = NEW.reverts_event_id;

  IF v_reverted_event_type != 'Entrega' THEN
    RETURN NEW;
  END IF;

  -- Aplicar inverso: leer trip_event_lines del evento original (preservadas, no se borraron)
  -- y restar qty_delivered/qty_rejected según line_status de cada una
  UPDATE trip_line_assignments tla
  SET
    qty_delivered = GREATEST(0, qty_delivered - COALESCE((
      SELECT SUM(tel.quantity) FROM trip_event_lines tel
      WHERE tel.trip_event_id = NEW.reverts_event_id
        AND tel.request_line_id = tla.request_line_id
        AND tel.line_status IN ('ok', 'with_observations')
    ), 0)),
    qty_rejected = GREATEST(0, qty_rejected - COALESCE((
      SELECT SUM(tel.quantity) FROM trip_event_lines tel
      WHERE tel.trip_event_id = NEW.reverts_event_id
        AND tel.request_line_id = tla.request_line_id
        AND tel.line_status = 'rejected'
    ), 0))
  WHERE tla.trip_id = v_reverted_trip_id
    AND tla.request_line_id IN (
      SELECT request_line_id FROM trip_event_lines
      WHERE trip_event_id = NEW.reverts_event_id
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER sync_assignment_on_delivery_revert_trg
AFTER INSERT ON trip_events
FOR EACH ROW
WHEN (NEW.reverts_event_id IS NOT NULL)
EXECUTE FUNCTION sync_assignment_on_delivery_revert();
```

**Notas:**
- `GREATEST(0, ...)` defensivo contra cualquier inconsistencia — nunca dejar valores negativos.
- Reversión de reversión NO está soportada — el evento de reversión tiene `reverts_event_id` apuntando al original (no a otra reversión). UNIQUE INDEX BD-9 lo protege a nivel BD.

### BD-7 — H1 reescrito

```sql
CREATE OR REPLACE FUNCTION enforce_quantity_immutable_with_active_assignments()
RETURNS TRIGGER AS $$
DECLARE
  v_qty_dispatched_total numeric;
  v_qty_delivered_total numeric;
  v_quantity_assigned_active numeric;
BEGIN
  IF NEW.quantity = OLD.quantity THEN
    RETURN NEW;
  END IF;

  -- Aumentar quantity siempre permitido
  IF NEW.quantity > OLD.quantity THEN
    RETURN NEW;
  END IF;

  -- Para reducciones, calcular los 3 totales y bloquear si nuevo qty rompe alguno

  -- 1. Total despachado en assignments (trip_line_assignments — única fuente con qty_dispatched)
  SELECT COALESCE(SUM(qty_dispatched), 0) INTO v_qty_dispatched_total
  FROM trip_line_assignments
  WHERE request_line_id = NEW.id;

  -- 2. Total entregado en las 3 fuentes
  SELECT
    COALESCE((SELECT SUM(qty_delivered) FROM trip_line_assignments WHERE request_line_id = NEW.id), 0) +
    COALESCE((SELECT SUM(qty_delivered) FROM pickup_order_lines WHERE request_line_id = NEW.id), 0) +
    COALESCE((SELECT SUM(qty_delivered) FROM external_order_lines WHERE request_line_id = NEW.id), 0)
  INTO v_qty_delivered_total;

  -- 3. Total asignado activo en las 3 fuentes (orders/trips no-cancelados/no-completados/no-entregados)
  SELECT COALESCE(SUM(tla.quantity_assigned), 0) INTO v_quantity_assigned_active
  FROM trip_line_assignments tla
  JOIN trips t ON t.id = tla.trip_id
  WHERE tla.request_line_id = NEW.id
    AND t.status NOT IN ('Cancelado', 'Completado');

  v_quantity_assigned_active := v_quantity_assigned_active +
    COALESCE((
      SELECT SUM(pol.quantity_assigned) FROM pickup_order_lines pol
      JOIN pickup_orders po ON po.id = pol.pickup_order_id
      WHERE pol.request_line_id = NEW.id AND po.status NOT IN ('Cancelado', 'Entregado')
    ), 0) +
    COALESCE((
      SELECT SUM(eol.quantity_assigned) FROM external_order_lines eol
      JOIN external_orders eo ON eo.id = eol.external_order_id
      WHERE eol.request_line_id = NEW.id AND eo.status NOT IN ('Cancelado', 'Entregado')
    ), 0);

  -- Bloquear si rompe alguna condición
  IF NEW.quantity < v_qty_dispatched_total THEN
    RAISE EXCEPTION 'No se puede reducir la cantidad por debajo de % (cantidad ya despachada en viajes activos). Coordina con logística si necesitas reducir más.', v_qty_dispatched_total;
  END IF;

  IF NEW.quantity < v_qty_delivered_total THEN
    RAISE EXCEPTION 'No se puede reducir la cantidad por debajo de % (cantidad ya entregada).', v_qty_delivered_total;
  END IF;

  IF NEW.quantity < v_quantity_assigned_active THEN
    RAISE EXCEPTION 'No se puede reducir la cantidad por debajo de % (cantidad ya programada en viajes/órdenes activos). Coordina con logística si necesitas reducir más.', v_quantity_assigned_active;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
```

**Notas:**
- Mensajes de error en español neutro Panamá (sin voseo).
- "Coordina con logística" implica que el PM debe avisar a Charris y Charris ajusta el assignment, después PM puede reducir.

### BD-8 — Trigger `enforce_revert_only_on_active_trip`

```sql
CREATE OR REPLACE FUNCTION enforce_revert_only_on_active_trip()
RETURNS TRIGGER AS $$
DECLARE
  v_reverted_event_type text;
  v_trip_status text;
BEGIN
  IF NEW.reverts_event_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT event_type, t.status INTO v_reverted_event_type, v_trip_status
  FROM trip_events te
  JOIN trips t ON t.id = te.trip_id
  WHERE te.id = NEW.reverts_event_id;

  -- Solo aplica para revertir Entrega (otros eventos pueden revertirse en trip cerrado, ej. Retorno mismo)
  IF v_reverted_event_type != 'Entrega' THEN
    RETURN NEW;
  END IF;

  IF v_trip_status IN ('Completado', 'Cancelado') THEN
    RAISE EXCEPTION 'No se puede revertir una Entrega de un viaje cerrado (status %). Revierte primero el Retorno desde la sección de eventos del viaje.', v_trip_status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER enforce_revert_only_on_active_trip_trg
BEFORE INSERT ON trip_events
FOR EACH ROW
WHEN (NEW.reverts_event_id IS NOT NULL)
EXECUTE FUNCTION enforce_revert_only_on_active_trip();
```

### BD-10 — Trigger `enforce_notes_on_with_observations`

```sql
CREATE OR REPLACE FUNCTION enforce_notes_on_with_observations()
RETURNS TRIGGER AS $$
DECLARE
  v_event_type text;
  v_notes text;
BEGIN
  -- Solo aplica para line_status='with_observations'
  IF NEW.line_status != 'with_observations' THEN
    RETURN NEW;
  END IF;

  -- Validar que el evento padre es Entrega y tiene notas suficientes
  SELECT event_type, COALESCE(notes, '') INTO v_event_type, v_notes
  FROM trip_events WHERE id = NEW.trip_event_id;

  IF v_event_type != 'Entrega' THEN
    RETURN NEW;
  END IF;

  IF length(trim(v_notes)) < 10 THEN
    RAISE EXCEPTION 'Las notas son obligatorias (mínimo 10 caracteres) cuando alguna línea tiene observaciones.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER enforce_notes_on_with_observations_trg
BEFORE INSERT ON trip_event_lines
FOR EACH ROW EXECUTE FUNCTION enforce_notes_on_with_observations();
```

## Migración consolidada (PARADA Chat aplica via MCP)

Una sola transacción para atomicidad. Migration: `cambio6_5_event_model_refinement`.

El SQL completo de la migración consolidada se transcribirá en el entry `[bd-pending]` de `Docs/CHANGELOG.md` durante T1 del plan ejecutable. El cuerpo de cada función (BD-4 a BD-10) viene literal de la sección "Diseño detallado" arriba — sin modificaciones, copy-paste directo.

Esqueleto de la transacción (orden importa):

```sql
BEGIN;

-- 1. ADD COLUMN qty_rejected en trip_line_assignments (BD-1)
ALTER TABLE trip_line_assignments ADD COLUMN qty_rejected NUMERIC NOT NULL DEFAULT 0;

COMMENT ON COLUMN trip_line_assignments.qty_rejected IS
  'Cantidad rechazada en sitio durante Entrega (line_status=rejected). Se preserva como dato histórico junto con qty_dispatched. Suma con qty_delivered debe ser ≤ qty_dispatched.';

-- 2. DROP CHECK qty_delivered_le_dispatched (de Cambio 6 H8) — BD-2 paso a
ALTER TABLE trip_line_assignments DROP CONSTRAINT IF EXISTS qty_delivered_le_dispatched;

-- 3. ADD CHECKs nuevos (BD-2 paso b + BD-3)
ALTER TABLE trip_line_assignments
  ADD CONSTRAINT qty_rejected_non_negative CHECK (qty_rejected >= 0),
  ADD CONSTRAINT qty_delivered_plus_rejected_le_dispatched
    CHECK (qty_delivered + qty_rejected <= qty_dispatched);

-- 4. CREATE OR REPLACE FUNCTION recalc_qty_for_line (BD-4)
-- ... cuerpo completo de "Diseño detallado BD-4" ...

-- 5. CREATE OR REPLACE FUNCTION sync_assignment_on_delivery_event + trigger (BD-5)
-- ... cuerpo completo de "Diseño detallado BD-5" ...

-- 6. CREATE OR REPLACE FUNCTION sync_assignment_on_delivery_revert + trigger (BD-6)
-- ... cuerpo completo de "Diseño detallado BD-6" ...

-- 7. CREATE OR REPLACE FUNCTION enforce_quantity_immutable_with_active_assignments (BD-7)
-- ... cuerpo completo de "Diseño detallado BD-7" ...
-- (la función reemplaza la versión Cambio 6 con el mismo nombre — el trigger existente
-- enforce_quantity_immutable_trg sigue apuntando al nombre, no requiere recreate)

-- 8. CREATE OR REPLACE FUNCTION enforce_revert_only_on_active_trip + trigger (BD-8)
-- ... cuerpo completo de "Diseño detallado BD-8" ...

-- 9. CREATE UNIQUE INDEX one_revert_per_event (BD-9)
CREATE UNIQUE INDEX one_revert_per_event
  ON trip_events(reverts_event_id)
  WHERE reverts_event_id IS NOT NULL;

-- 10. CREATE OR REPLACE FUNCTION enforce_notes_on_with_observations + trigger (BD-10)
-- ... cuerpo completo de "Diseño detallado BD-10" ...

COMMIT;
```

**Orden importa:** la columna `qty_rejected` debe existir antes de los CHECKs que la mencionan, los CHECKs deben aplicarse antes del REPLACE de `recalc_qty_for_line` (que la lee), y los triggers se crean al final.

**Rollback:**

```sql
BEGIN;

DROP INDEX IF EXISTS one_revert_per_event;
DROP TRIGGER IF EXISTS enforce_notes_on_with_observations_trg ON trip_event_lines;
DROP TRIGGER IF EXISTS enforce_revert_only_on_active_trip_trg ON trip_events;
DROP TRIGGER IF EXISTS sync_assignment_on_delivery_revert_trg ON trip_events;
DROP TRIGGER IF EXISTS sync_assignment_on_delivery_event_trg ON trip_event_lines;

DROP FUNCTION IF EXISTS enforce_notes_on_with_observations();
DROP FUNCTION IF EXISTS enforce_revert_only_on_active_trip();
DROP FUNCTION IF EXISTS sync_assignment_on_delivery_revert();
DROP FUNCTION IF EXISTS sync_assignment_on_delivery_event();

-- Restaurar versión Cambio 6 de recalc_qty_for_line y H1 (referenciar CHANGELOG 2026-04-29)

ALTER TABLE trip_line_assignments
  DROP CONSTRAINT IF EXISTS qty_delivered_plus_rejected_le_dispatched,
  DROP CONSTRAINT IF EXISTS qty_rejected_non_negative;

-- Restaurar CHECK qty_delivered_le_dispatched (versión Cambio 6 H8)
ALTER TABLE trip_line_assignments
  ADD CONSTRAINT qty_delivered_le_dispatched CHECK (qty_delivered <= qty_dispatched);

ALTER TABLE trip_line_assignments DROP COLUMN IF EXISTS qty_rejected;

COMMIT;
```

## Riesgos identificados y mitigaciones

| # | Riesgo | Mitigación |
|---|--------|------------|
| 1 | Sync trigger en BD genera UPDATE recursivo con recalc_qty_for_line | Recalc dispara solo en UPDATE de qty_scheduled/qty_delivered, sync UPDATEa qty_rejected y qty_delivered. Recalc → UPDATE sm_request_lines (otra tabla), no recursivo |
| 2 | Race condition entre múltiples eventos Entrega concurrentes | Trigger Bug #4 de Cambio 6 (`enforce_one_active_delivery_per_trip_line`) ya bloquea al primer INSERT. El segundo recibe error |
| 3 | UNIQUE INDEX falla si data prod tiene drift (revert duplicados históricos) | Pre-merge query 3 detecta antes de aplicar. Si retorna rows, cleanup primero |
| 4 | Frontend FE-1/FE-2 tienen casos edge no cubiertos por sync trigger | Cleanup defensivo: dejar handlers que no toquen `qty_delivered`/`qty_rejected` en absoluto. Si trigger falla, INSERT falla y handler reporta error normal |
| 5 | Performance del recalc con 3 fuentes vs 1 | Líneas tienen ≤ 3-5 assignments + ≤ 1-2 pickup + ≤ 1-2 external típicamente. Subqueries con FK indexada. No issue a escala actual |
| 6 | Test E2E para revert en trip cerrado requiere setup complejo | Helper nuevo `closeTrip(tripId)` que registra Retorno y deja trip en Completado. Reusable |

## Items para BACKLOG

Estos NO entran al Cambio 6.5 pero deben quedar trackeados con detalle suficiente para que un sprint futuro los retome.

### BL-EXCLUSIVITY — Bug pre-existente: línea sin constraint de exclusividad entre 3 modalidades

Línea (`sm_request_lines`) puede tener simultáneamente entradas en `trip_line_assignments` + `pickup_order_lines` + `external_order_lines`. NO hay CHECK constraint que lo impida. Si data corrupta llega a este estado, `recalc_qty_for_line` cuenta cantidades 3 veces — backlog miente, status incorrecto.

**Diagnóstico SQL — correr en prod ANTES de diseñar el constraint y ANTES de aplicarlo:**

```sql
WITH multi_modality AS (
  SELECT srl.id, srl.request_id,
    EXISTS (SELECT 1 FROM trip_line_assignments WHERE request_line_id = srl.id) AS in_trips,
    EXISTS (SELECT 1 FROM pickup_order_lines WHERE request_line_id = srl.id) AS in_pickup,
    EXISTS (SELECT 1 FROM external_order_lines WHERE request_line_id = srl.id) AS in_external
  FROM sm_request_lines srl
)
SELECT * FROM multi_modality
WHERE (in_trips::int + in_pickup::int + in_external::int) > 1;
```

Si retorna 0 rows, constraint seguro de agregar. Si retorna rows, entender el caso primero — puede ser:
- Transiciones legítimas (línea fue de fleet → pickup, dejó assignment cancelado pero no borrado).
- Bug que duplicó por double-click.
- Data legacy de pre-Cambio 5 cuando el modelo era distinto.

Considerar al diseñar el constraint: ¿incluir status del assignment/order? Quizás el constraint debe excluir entries con `qty_delivered=0 AND order/trip Cancelado`. Si el diagnóstico en prod retorna rows, el constraint NO se aplica hasta entender (y posiblemente cleanup) el caso.

### BL-RPC-CONVERSION — Deuda técnica de Cambios 3/4

`convertLineToPickup` (Cambio 3) y `convertLineToExternal` (Cambio 4) NO son atómicos server-side. Hacen DELETE assignment + UPDATE línea como 2 queries separadas. Si una falla mid-flow, la otra queda aplicada. Riesgo bajo en v1 (1 Charris operando, sin concurrencia real). Polish post-merge: convertir a RPC SQL con SECURITY DEFINER y transacción server-side.

### BL-SESSION-START-RULE — Regla operativa de lectura de BACKLOG al inicio

Crear `.claude/rules/session-start.md` (o agregar sección a `tool-usage.md`): Code lee BACKLOG al inicio de cada sesión, reporta items relevantes al contexto de la tarea en curso, y propone si algo entra al scope actual.

### BL-CLAUDE-FOLDER-CLEANUP — Cleanup completo de .claude/** y CLAUDE.md

Cambio dedicado, no se mezcla con feature work. James agrega documento de auditoría completo en `Docs/reference/claude-folder-audit.md` (el archivo ya existe en `Docs/reference/2026-04-29-claude-folder-audit.md` per git status). Cubre 16 hallazgos: archivos referenciados que no existen, redundancias entre `commit-after-step.md` y `git-workflow.md`, naming inconsistente de skills, plugins habilitados sin uso, etc.

## Entregable adicional T-final — Plan de deployment a prod

Crear `Docs/reference/deployment-plan-prod.md` con:

- Estado actual de prod confirmado: última migration `create_humanos_schema` (2026-04-28). Sin Cambios 1-6.
- Estado de `jaime/dev` al cierre de Cambio 6.5: con Cambios 1, 2, 3, 4, 5, 6, 6.5 todos integrados.
- Orden estricto de aplicación de migraciones a prod cuando llegue el merge final (lista enumerada con cada `apply_migration`).
- Pre-merge queries que correr ANTES de cada migration en prod.
- Validación post-cada-migration.
- Rollback plan para cada migration.

**Nota:** este documento se ACTUALIZA en sesión separada cuando se haga el merge final usando ambos repomix (jaime/dev y `repomix-MovimientOS-main.xml` ya disponible en project knowledge). En el T-final de Cambio 6.5 se crea el esqueleto con plan tentativo basado en lo conocido hoy.

## Recordatorios bloqueantes para el plan ejecutable

1. **Cleanup obligatorio en TODOS los tests nuevos.** `afterEach` o `afterAll` con `cleanupSolicitud(solicitudId)`. Tests de Cambio 6 dejaron 33 solicitudes huérfanas en staging por falta de cleanup. No repetir.
2. **Mensajes user-facing en español neutro Panamá**, sin voseo. Aplica a errores BD traducidos, toasts, validaciones frontend, copy UI.
3. **Pre-merge queries (5)** corren ANTES de aplicar migración en staging. Cuando llegue prod, se corren de nuevo allá.
4. **PARADA T-final smoke manual por James** antes de cerrar el Cambio.

## Workflow del plan ejecutable

Anticipo siguiendo patrón de Cambio 6:

- **T1** [bd-pending] migración consolidada en `Docs/CHANGELOG.md` con SQL completo y queries pre-merge → PARADA Chat aplica via MCP en staging → marca `[bd]` y commit.
- **T2** Regen types: `npx supabase gen types typescript --project-id vonwkciosksqspyljzfy > src/lib/types/database.ts` (staging post-aplicación).
- **T3** Tests E2E nuevos (9), todos con cleanup. Verde antes de avanzar.
- **T4** FE-1: eliminar UPDATE manual qty_delivered en handleDelivery + simplificación.
- **T5** FE-2: eliminar decremento manual qty_delivered en handleRevert.
- **T6** FE-3: guard frontend revert Entrega en trip cerrado + mensaje claro.
- **T7** FE-4: DeliveryModal validación notas required cuando hay with_observations.
- **T8** CL-1: cleanup código muerto refs a 'Pickup Aprobado'/'Externo Aprobado'.
- **T9** Mensajes de error H1 actualizados con español neutro (verificación final post-implementación).
- **T10** Suite completa Cambio 6 (18 tests) + suite nueva Cambio 6.5 (9 tests) verde.
- **T11** BACKLOG entries: BL-EXCLUSIVITY, BL-RPC-CONVERSION, BL-SESSION-START-RULE, BL-CLAUDE-FOLDER-CLEANUP.
- **T12** Crear `Docs/reference/deployment-plan-prod.md` esqueleto.
- **T-final** PARADA smoke manual por James antes de cerrar.

## Decisiones cerradas (no re-litigar)

1. Opción α para `qty_dispatched` de líneas rejected: preservar como dato histórico, NO resetear a 0.
2. Modelo event-sourced: cada columna del assignment refleja un evento, no se mutan retroactivamente entre eventos (excepto via reversión).
3. `has_observations` flag descartado — `delivery_observations` ya es source of truth normalizado.
4. Notas obligatorias en evento Entrega cuando hay líneas with_observations (BD-10 + FE-4).
5. Trigger BD para sync forward y reverse — frontend solo registra eventos.
6. H1 reescrito (no eliminado) con 3 condiciones de bloqueo.
7. `qty_rejected` SOLO en `trip_line_assignments` (no en pickup/external — sería dead storage).
8. Branch defensivo en recalc basado en STATUS, preserva solo `'Cancelada'` (status terminal). 'Pickup Aprobado'/'Externo Aprobado' eliminados en Cambio 5.
9. UNIQUE INDEX para prevenir double revert (vs trigger BEFORE INSERT con EXISTS).
10. Bloqueo de revert Entrega en trip cerrado vía trigger BD + guard frontend (defense-in-depth).
11. CL-1 incluido en scope tras decisión de James (era BACKLOG, ahora se hace en este Cambio).
12. **Caso edge "rejected total con assignment vivo" → `status='Pendiente'` (no `'Programada'`).** Decisión emergida durante T3 testing (Test 3 reproductor MOV-2026-058 reveló que el step 5 del recalc original mapeaba este caso a `'Programada'`, contradiciendo el spec literal "rejected libera al backlog"). Amend BD aplicado: migración `cambio6_5_recalc_simplify_pendiente_on_rejected_total` (orden simplificado de 6 a 5 puntos, elimina step 5). Justificación tripartita: (a) spec literal, (b) industria construcción (Procore/Sage/e-Builder mapean rejected → "open requirements"), (c) state machines limpias (evita filtro `qty_scheduled_active>0` distribuido en cada consumer). Documentado en CHANGELOG entry `[bd]` 2026-05-01 con SQL completo + rollback.
13. **Status `'Parcial'` requiere ausencia de scheduled activo.** La transición a `'Parcial'` ocurre cuando `qty_scheduled_active = 0` AND `0 < qty_delivered_total < quantity` — es decir, no hay material pendiente de entregarse en ningún viaje/orden activa, y se entregó algo pero no todo. Operacionalmente esto significa: la línea quedó incompleta y requiere replanificación. Durante un trip activo con material en camino, la línea es `'En Transito'` (step 3 del recalc gana sobre step 4 por diseño). El "Parcial inmediato" mencionado en el reproductor del spec era atajo conceptual; reemplazar por la regla operacional explícita arriba. Cubre los dos caminos a `'Parcial'`: (a) cierre de trip natural (Retorno consume scheduled del último TLA activo), y (b) rejected total que libera scheduled sin cerrar el trip (línea con 2 viajes, viaje #1 entregó parcial, viaje #2 rechaza el resto → línea queda `'Parcial'` con el viaje #2 todavía técnicamente "abierto" desde el punto de vista del trip, pero scheduled_active=0 a nivel línea).

## Referencias

- **Cambio 6 spec:** `Docs/superpowers/specs/2026-04-29-cambio6-cancel-integrity.md` (introduce `qty_dispatched`/`qty_delivered` triggers que Cambio 6.5 modifica/extiende).
- **Brief original Cambio 6.5:** entregado por James 2026-04-30 vía chat (4 problemas + decisiones ya tomadas).
- **Brainstorming consolidado:** sesión Code+Chat+James 2026-04-30 — desambiguó Problema 4 (Retorno ya es no-op), refinó Problema 3 (qty_rejected vs mutar quantity_assigned), descubrió que pickup_by_project fue eliminado en Cambio 5.
- **CHANGELOG entry pendiente:** `Docs/CHANGELOG.md` 2026-04-30 con `[bd-pending]` + SQL completo de la migración consolidada (T1 del plan ejecutable).
