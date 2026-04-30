# Changelog

Actualizado con cada commit. Entries > 90 días se archivan.

---

## 2026-04-30

- [bd] **Cambio 6.5 — refinamiento del modelo de eventos: migración consolidada `cambio6_5_event_model_refinement`.** PARADA: Chat aplica via Supabase MCP en staging (`vonwkciosksqspyljzfy`) tras correr las 4 pre-merge queries (deben retornar 0 rows). Pendiente prod en merge final v2 unificado (post-Cambio 6.5 implementación + smoke OK).

  **Resumen del cambio:** corrige la semántica del trigger `recalc_qty_for_line` para que entregas con líneas rechazadas liberen al backlog en el momento de la Entrega (no en Retorno). Da efecto operacional real al `line_status='rejected'` vía nueva columna `qty_rejected` en `trip_line_assignments` y triggers BD de sincronización (forward + reverse). Reescribe H1 con 3 condiciones de bloqueo. UNIQUE INDEX previene doble revert. Trigger BD bloquea revert Entrega en trip cerrado. Trigger BD valida notas obligatorias cuando alguna línea tiene `with_observations`.

  **Pre-merge queries (4 — todas deben retornar 0 rows en staging):**

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

  **Migración consolidada (1 transacción para atomicidad):**

  ```sql
  BEGIN;

  -- BD-1: ADD COLUMN qty_rejected en trip_line_assignments
  ALTER TABLE trip_line_assignments ADD COLUMN qty_rejected NUMERIC NOT NULL DEFAULT 0;

  COMMENT ON COLUMN trip_line_assignments.qty_rejected IS
    'Cantidad rechazada en sitio durante Entrega (line_status=rejected). Se preserva como dato histórico junto con qty_dispatched. Suma con qty_delivered debe ser <= qty_dispatched.';

  -- BD-2 paso a: DROP CHECK qty_delivered_le_dispatched (de Cambio 6 H8)
  ALTER TABLE trip_line_assignments DROP CONSTRAINT IF EXISTS qty_delivered_le_dispatched;

  -- BD-2 paso b + BD-3: ADD CHECKs nuevos
  ALTER TABLE trip_line_assignments
    ADD CONSTRAINT qty_rejected_non_negative CHECK (qty_rejected >= 0),
    ADD CONSTRAINT qty_delivered_plus_rejected_le_dispatched
      CHECK (qty_delivered + qty_rejected <= qty_dispatched);

  -- BD-4: REPLACE recalc_qty_for_line (cuerpo completo)
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
    SELECT quantity, status INTO v_quantity, v_current_status
    FROM sm_request_lines WHERE id = p_request_line_id;

    -- Branch defensivo: preservar status terminal Cancelada
    IF v_current_status = 'Cancelada' THEN
      RETURN;
    END IF;

    -- Calcular qty_delivered_total agregando 3 fuentes (subqueries independientes)
    SELECT
      COALESCE((SELECT SUM(qty_delivered) FROM trip_line_assignments WHERE request_line_id = p_request_line_id), 0) +
      COALESCE((SELECT SUM(qty_delivered) FROM pickup_order_lines WHERE request_line_id = p_request_line_id), 0) +
      COALESCE((SELECT SUM(qty_delivered) FROM external_order_lines WHERE request_line_id = p_request_line_id), 0)
    INTO v_qty_delivered_total;

    -- Calcular qty_scheduled_active (descontando qty_rejected en assignments,
    -- sin qty_rejected en pickup/external porque allí no aplica)
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

    -- Calcular quantity_assigned_active total (para distinguir Programada vs Pendiente)
    SELECT COALESCE(SUM(tla.quantity_assigned), 0) INTO v_quantity_assigned_active
    FROM trip_line_assignments tla
    JOIN trips t ON t.id = tla.trip_id
    WHERE tla.request_line_id = p_request_line_id
      AND t.status NOT IN ('Cancelado', 'Completado');

    v_quantity_assigned_active := v_quantity_assigned_active +
      COALESCE((
        SELECT SUM(pol.quantity_assigned) FROM pickup_order_lines pol
        JOIN pickup_orders po ON po.id = pol.pickup_order_id
        WHERE pol.request_line_id = p_request_line_id AND po.status NOT IN ('Cancelado', 'Entregado')
      ), 0) +
      COALESCE((
        SELECT SUM(eol.quantity_assigned) FROM external_order_lines eol
        JOIN external_orders eo ON eo.id = eol.external_order_id
        WHERE eol.request_line_id = p_request_line_id AND eo.status NOT IN ('Cancelado', 'Entregado')
      ), 0);

    -- Orden de evaluación de status (6 puntos)
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

  -- BD-5: trigger sync_assignment_on_delivery_event
  CREATE OR REPLACE FUNCTION sync_assignment_on_delivery_event()
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

  -- BD-6: trigger sync_assignment_on_delivery_revert
  CREATE OR REPLACE FUNCTION sync_assignment_on_delivery_revert()
  RETURNS TRIGGER AS $$
  DECLARE
    v_reverted_event_type text;
    v_reverted_trip_id uuid;
  BEGIN
    IF NEW.reverts_event_id IS NULL THEN
      RETURN NEW;
    END IF;

    SELECT event_type, trip_id INTO v_reverted_event_type, v_reverted_trip_id
    FROM trip_events WHERE id = NEW.reverts_event_id;

    IF v_reverted_event_type != 'Entrega' THEN
      RETURN NEW;
    END IF;

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

  -- BD-7: REPLACE H1 enforce_quantity_immutable_with_active_assignments con 3 condiciones
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
    SELECT COALESCE(SUM(qty_dispatched), 0) INTO v_qty_dispatched_total
    FROM trip_line_assignments WHERE request_line_id = NEW.id;

    SELECT
      COALESCE((SELECT SUM(qty_delivered) FROM trip_line_assignments WHERE request_line_id = NEW.id), 0) +
      COALESCE((SELECT SUM(qty_delivered) FROM pickup_order_lines WHERE request_line_id = NEW.id), 0) +
      COALESCE((SELECT SUM(qty_delivered) FROM external_order_lines WHERE request_line_id = NEW.id), 0)
    INTO v_qty_delivered_total;

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

  -- BD-8: trigger enforce_revert_only_on_active_trip
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

    -- Solo aplica para revertir Entrega
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

  -- BD-9: UNIQUE INDEX one_revert_per_event
  CREATE UNIQUE INDEX one_revert_per_event
    ON trip_events(reverts_event_id)
    WHERE reverts_event_id IS NOT NULL;

  -- BD-10: trigger enforce_notes_on_with_observations
  CREATE OR REPLACE FUNCTION enforce_notes_on_with_observations()
  RETURNS TRIGGER AS $$
  DECLARE
    v_event_type text;
    v_notes text;
  BEGIN
    IF NEW.line_status != 'with_observations' THEN
      RETURN NEW;
    END IF;

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

  COMMIT;
  ```

  **Rollback (si necesario):**

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
  -- Restaurar versiones Cambio 6 de recalc_qty_for_line y H1 (referenciar CHANGELOG 2026-04-29)
  ALTER TABLE trip_line_assignments
    DROP CONSTRAINT IF EXISTS qty_delivered_plus_rejected_le_dispatched,
    DROP CONSTRAINT IF EXISTS qty_rejected_non_negative;
  ALTER TABLE trip_line_assignments
    ADD CONSTRAINT qty_delivered_le_dispatched CHECK (qty_delivered <= qty_dispatched);
  ALTER TABLE trip_line_assignments DROP COLUMN IF EXISTS qty_rejected;
  COMMIT;
  ```

  **PARADA:** Chat aplica las 4 pre-merge queries. Si las 4 retornan 0 rows, aplica la migración consolidada via `apply_migration` con name `cambio6_5_event_model_refinement`. Después marca `[bd]` con confirmación post-aplicación (timestamp, version, advisors check). Code reanuda con T2.

  **Aplicar en:** staging primero (BD wipeada en Cambio 6, las 4 pre-merge queries deben dar 0). Para prod en merge final v2 unificado: aplicar las 4 pre-merge queries; si retornan rows → entender el caso primero; aplicar migración. Spec: `Docs/superpowers/specs/2026-04-30-cambio6-5-event-model-refinement.md` (commit `b323de7`). Plan: `Docs/superpowers/plans/2026-04-30-cambio6-5-event-model-refinement.md` (commit `1aabcf2` + refinamientos `725a4ff`).

**Aplicada por Chat en staging (`vonwkciosksqspyljzfy`) el 2026-04-30 ~21:00 UTC** vía Supabase MCP. Version `20260430203756`. 1 sola transacción para atomicidad. Pendiente prod en merge final v2 unificado.

  **Pre-aplicación: Q1=0, Q2=0, Q3=0, Q4=2** (los 2 rows de Q4 son data histórica del smoke MOV-2026-058 del 30 de abril; BD-8 es BEFORE INSERT, no afecta data existente).

  **Verificación post-migración (7/7 confirmados):**
  - ✅ Columna `qty_rejected NUMERIC NOT NULL DEFAULT 0` en `trip_line_assignments` (BD-1).
  - ✅ CHECK `qty_rejected_non_negative` + `qty_delivered_plus_rejected_le_dispatched` activos. Viejo `qty_delivered_le_dispatched` eliminado (BD-2, BD-3).
  - ✅ Función `recalc_qty_for_line` REPLACED con branch defensivo Cancelada + 6 puntos de orden + descuento qty_rejected (BD-4). SECURITY DEFINER preservado.
  - ✅ Trigger `sync_assignment_on_delivery_event_trg` AFTER INSERT en `trip_event_lines` (BD-5).
  - ✅ Trigger `sync_assignment_on_delivery_revert_trg` AFTER INSERT en `trip_events` WHEN reverts_event_id NOT NULL (BD-6).
  - ✅ Función `enforce_quantity_immutable_with_active_assignments` REPLACED con 3 condiciones de bloqueo (BD-7). H1 alineado patrón Coupa.
  - ✅ Trigger `enforce_revert_only_on_active_trip_trg` BEFORE INSERT en `trip_events` (BD-8) + UNIQUE INDEX `one_revert_per_event` (BD-9) + Trigger `enforce_notes_on_with_observations_trg` BEFORE INSERT en `trip_event_lines` (BD-10).
  - ✅ `get_advisors` security/performance: sin ERRORs ni nuevos WARNs introducidos por Cambio 6.5.
---

## 2026-04-29

- [bd] **Cambio 6 — migración consolidada `cambio6_cancellation_integrity` (cancel preservation + integridad de cálculos) aplicada en staging.** Aplicada por Chat en staging (`vonwkciosksqspyljzfy`) el 2026-04-29 vía Supabase MCP. Version `20260429204609`. 1 sola transacción para atomicidad. Pendiente prod en merge final v2 unificado (post-Cambio 6 implementación + smoke OK).

  **Pre-aplicación: 4 pre-merge queries retornaron 0 rows** (BD wipeada confirmó compatibilidad).

  **Verificación post-migración (7/7 confirmados):**
  - ✅ `cancellation_reason TEXT` (nullable) en `trips`, `pickup_orders`, `external_orders`.
  - ✅ Triggers `enforce_cancellation_reason_trips` / `_pickup_orders` / `_external_orders` (3 paralelos, BEFORE UPDATE OF status).
  - ✅ Trigger `enforce_one_active_delivery_trg` (BEFORE INSERT en `trip_event_lines`, Bug #4 fix).
  - ✅ Función `recalc_qty_for_line` REPLACE con variable nueva `v_trip_qty_scheduled_active` y branch modificado `ELSIF v_current_status = 'En Transito' AND v_trip_qty_scheduled_active > 0 THEN` (Bug #2 fix). Resto de la función preservado intacto (steps 1-3 lógica de cálculo, step 5 UPDATE, otros branches `'Pendiente'`/`'Parcial'`/`'Entregada'`). SECURITY DEFINER y `SET search_path` mantenidos.
  - ✅ Trigger `enforce_quantity_immutable_trg` (BEFORE UPDATE OF quantity en `sm_request_lines`, H1).
  - ✅ CHECK constraints `qty_dispatched_le_assigned` y `qty_delivered_le_dispatched` (H7+H8) en `trip_line_assignments`.
  - ✅ `trips.rate_id` ahora NOT NULL (tarifa obligatoria).

  **Advisors security post-migración:** sin lints nuevos. Las 5 funciones nuevas son SECURITY INVOKER (correcto). Los lints existentes (`audit_trigger`, `generate_*`, etc.) son pre-Cambio 6 y no relacionados.

  **Pre-merge queries post-migración:** las 4 siguen retornando 0 rows. Sistema consistente.

  **Nota técnica:** durante el primer `apply_migration`, Supabase MCP devolvió un error spurio *"column already exists"* pero la migración SÍ se aplicó completamente (verificado via `list_migrations` + check de existencia de cada objeto). No se requirió retry.

  **SQL aplicado (referencia, en una sola transacción):**

  **Pre-aplicación: 4 queries de validación (todas deben retornar 0 rows):**

  ```sql
  -- Query 1: múltiples entregas activas (Bug #4)
  SELECT te.trip_id, tel.request_line_id, COUNT(*) AS active_deliveries
  FROM trip_event_lines tel
  JOIN trip_events te ON te.id = tel.trip_event_id
  WHERE te.event_type = 'Entrega'
    AND te.reverts_event_id IS NULL
    AND NOT EXISTS (SELECT 1 FROM trip_events te2 WHERE te2.reverts_event_id = te.id)
  GROUP BY te.trip_id, tel.request_line_id
  HAVING COUNT(*) > 1;

  -- Query 2: trips sin rate_id (tarifa)
  SELECT id, trip_id FROM trips WHERE rate_id IS NULL;

  -- Query 3: líneas zombie 'En Transito' sin trip activo (Bug #2)
  SELECT srl.id, srl.description, srl.status, srl.qty_scheduled, srl.qty_delivered
  FROM sm_request_lines srl
  WHERE srl.status = 'En Transito'
    AND NOT EXISTS (
      SELECT 1 FROM trip_line_assignments tla
      JOIN trips t ON t.id = tla.trip_id
      WHERE tla.request_line_id = srl.id AND t.status NOT IN ('Cancelado', 'Completado')
    );

  -- Query 4: drift en qty_dispatched/qty_delivered/quantity_assigned (riesgo H7+H8)
  SELECT id, trip_id, request_line_id, quantity_assigned, qty_dispatched, qty_delivered
  FROM trip_line_assignments
  WHERE qty_delivered > qty_dispatched OR qty_dispatched > quantity_assigned;
  ```

  **Migración consolidada (1 transacción):**

  ```sql
  BEGIN;

  -- 1. Columnas cancellation_reason (nullable)
  ALTER TABLE trips           ADD COLUMN cancellation_reason TEXT;
  ALTER TABLE pickup_orders   ADD COLUMN cancellation_reason TEXT;
  ALTER TABLE external_orders ADD COLUMN cancellation_reason TEXT;

  COMMENT ON COLUMN trips.cancellation_reason IS
    'Razón de cancelación. Obligatoria (≥10 chars) cuando alguna línea del trip tenía qty_delivered>0. Validado por trigger.';
  COMMENT ON COLUMN pickup_orders.cancellation_reason IS
    'Razón de cancelación. Obligatoria (≥10 chars) cuando alguna línea del pickup_order tenía qty_delivered>0. Validado por trigger.';
  COMMENT ON COLUMN external_orders.cancellation_reason IS
    'Razón de cancelación. Obligatoria (≥10 chars) cuando alguna línea del external_order tenía qty_delivered>0. Validado por trigger.';

  -- 2. Triggers BEFORE UPDATE para cancellation_reason condicional (3 paralelos)
  CREATE OR REPLACE FUNCTION enforce_cancellation_reason_trips()
  RETURNS TRIGGER AS $$
  BEGIN
    IF NEW.status != 'Cancelado' OR OLD.status = 'Cancelado' THEN
      RETURN NEW;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM trip_line_assignments tla
      WHERE tla.trip_id = NEW.id AND tla.qty_delivered > 0
    ) THEN
      RETURN NEW;
    END IF;
    IF NEW.cancellation_reason IS NULL OR length(trim(NEW.cancellation_reason)) < 10 THEN
      RAISE EXCEPTION 'cancellation_reason requerido (>=10 chars) cuando alguna línea tiene qty_delivered>0';
    END IF;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql SET search_path = public;

  CREATE TRIGGER enforce_cancellation_reason_trips
  BEFORE UPDATE OF status ON trips
  FOR EACH ROW EXECUTE FUNCTION enforce_cancellation_reason_trips();

  CREATE OR REPLACE FUNCTION enforce_cancellation_reason_pickup_orders()
  RETURNS TRIGGER AS $$
  BEGIN
    IF NEW.status != 'Cancelado' OR OLD.status = 'Cancelado' THEN
      RETURN NEW;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pickup_order_lines pol
      WHERE pol.pickup_order_id = NEW.id AND pol.qty_delivered > 0
    ) THEN
      RETURN NEW;
    END IF;
    IF NEW.cancellation_reason IS NULL OR length(trim(NEW.cancellation_reason)) < 10 THEN
      RAISE EXCEPTION 'cancellation_reason requerido (>=10 chars) cuando alguna línea tiene qty_delivered>0';
    END IF;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql SET search_path = public;

  CREATE TRIGGER enforce_cancellation_reason_pickup_orders
  BEFORE UPDATE OF status ON pickup_orders
  FOR EACH ROW EXECUTE FUNCTION enforce_cancellation_reason_pickup_orders();

  CREATE OR REPLACE FUNCTION enforce_cancellation_reason_external_orders()
  RETURNS TRIGGER AS $$
  BEGIN
    IF NEW.status != 'Cancelado' OR OLD.status = 'Cancelado' THEN
      RETURN NEW;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM external_order_lines eol
      WHERE eol.external_order_id = NEW.id AND eol.qty_delivered > 0
    ) THEN
      RETURN NEW;
    END IF;
    IF NEW.cancellation_reason IS NULL OR length(trim(NEW.cancellation_reason)) < 10 THEN
      RAISE EXCEPTION 'cancellation_reason requerido (>=10 chars) cuando alguna línea tiene qty_delivered>0';
    END IF;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql SET search_path = public;

  CREATE TRIGGER enforce_cancellation_reason_external_orders
  BEFORE UPDATE OF status ON external_orders
  FOR EACH ROW EXECUTE FUNCTION enforce_cancellation_reason_external_orders();

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
  $$ LANGUAGE plpgsql SET search_path = public;

  CREATE TRIGGER enforce_one_active_delivery_trg
  BEFORE INSERT ON trip_event_lines
  FOR EACH ROW EXECUTE FUNCTION enforce_one_active_delivery_per_trip_line();

  -- 4. Trigger Bug #2 fix — modificación de recalc_qty_for_line
  -- IMPORTANTE: REPLACE de la función existente. Lógica del branch ELSIF
  -- v_current_status = 'En Transito' THEN debe chequear v_qty_scheduled_active > 0
  -- calculado sobre trips no-Cancelados/no-Completados:
  --
  --   ELSIF v_current_status = 'En Transito' THEN
  --     SELECT COALESCE(SUM(qty_scheduled), 0) INTO v_qty_scheduled_active
  --     FROM trip_line_assignments tla
  --     JOIN trips t ON t.id = tla.trip_id
  --     WHERE tla.request_line_id = p_request_line_id
  --       AND t.status NOT IN ('Cancelado', 'Completado');
  --
  --     IF v_qty_scheduled_active > 0 THEN
  --       v_new_status := 'En Transito';
  --     ELSE
  --       -- Caer al status según qty_delivered
  --       IF v_total_qty_delivered = 0 THEN
  --         v_new_status := 'Pendiente';
  --       ELSIF v_total_qty_delivered >= v_quantity THEN
  --         v_new_status := 'Entregada';
  --       ELSE
  --         v_new_status := 'Parcial';
  --       END IF;
  --     END IF;
  --   END IF;

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
    ) OR EXISTS (
      SELECT 1 FROM pickup_order_lines pol
      JOIN pickup_orders po ON po.id = pol.pickup_order_id
      WHERE pol.request_line_id = NEW.id
        AND pol.quantity_assigned > 0
        AND po.status != 'Cancelado'
    ) OR EXISTS (
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
  $$ LANGUAGE plpgsql SET search_path = public;

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

  **Rollback (si necesario):**

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
  DROP FUNCTION IF EXISTS enforce_cancellation_reason_trips();
  DROP FUNCTION IF EXISTS enforce_cancellation_reason_pickup_orders();
  DROP FUNCTION IF EXISTS enforce_cancellation_reason_external_orders();
  ALTER TABLE trips           DROP COLUMN IF EXISTS cancellation_reason;
  ALTER TABLE pickup_orders   DROP COLUMN IF EXISTS cancellation_reason;
  ALTER TABLE external_orders DROP COLUMN IF EXISTS cancellation_reason;
  -- Restore previous version of recalc_qty_for_line trigger function (estado pre-Cambio 6)
  COMMIT;
  ```

  **Aplicar en:** staging primero (BD wipeada, todas las pre-merge queries deben dar 0). Para prod en merge final v2 unificado: aplicar las 4 pre-merge queries; si retornan rows → cleanup antes; aplicar migración. Spec: `Docs/superpowers/specs/2026-04-29-cambio6-cancel-integrity.md` (commits `922102b` + `f446fc1`). Plan: `Docs/superpowers/plans/2026-04-29-cambio6-cancel-integrity.md` (commit `2bbed40`).

---

## 2026-04-28

- [bd] **Cambio 5 — `scheduled_date` agregado a `pickup_orders` y `external_orders` (Polish #5b).** Aplicado por Chat en staging (`vonwkciosksqspyljzfy`) el 2026-04-28 vía Supabase MCP. Migration `cambio5_add_scheduled_date_to_orders`:

  ```sql
  ALTER TABLE pickup_orders   ADD COLUMN scheduled_date DATE NOT NULL;
  ALTER TABLE external_orders ADD COLUMN scheduled_date DATE NOT NULL;
  COMMENT ON COLUMN pickup_orders.scheduled_date IS
    'Fecha programada por Logística para ejecutar el pickup. Default al crear: MIN(line.date_required), editable por Charris.';
  COMMENT ON COLUMN external_orders.scheduled_date IS
    'Fecha programada por Logística para ejecutar el viaje externo. Default al crear: MIN(line.date_required), editable por Charris.';
  ```

  Backfill aplicado por Chat: 3 pickup_orders + 5 external_orders existentes seteados a `MIN(line.date_required)` retroactivamente. Todos OK, invariantes BD verificados, datos saneados.

  **Razón del cambio:** el commit `14180b1` (Polish #5a) había agregado un chip de "fecha programada" derivado JS-side de `MIN(line.request.date_required)` por order. Eso era una mala interpretación del feedback de oficina — Charris necesita poder programar la fecha él mismo (independiente del `date_required` de las líneas), igual que ya hace en TripForm para fleet trips. La columna real reemplaza la derivación. Ahora son 6 migraciones de Cambio 5 en orden estricto, no 5 — agregar `cambio5_add_scheduled_date_to_orders` al final del script consolidado para el merge final v2.

- [feat] **Cambio 5 polish #5b — date picker en CreatePickupOrderModal y CreateExternalOrderModal.** Reemplaza la derivación JS-side del Polish #5a (commit `14180b1`) por la columna real BD agregada en la migración paralela. Cambios:

  - **`src/lib/types/database.ts` regenerado** contra staging — tipos generados incluyen `scheduled_date: string` (NOT NULL) en Row/Insert/Update de `pickup_orders` y `external_orders`. Helper manual `Row<T>` re-appendeado (`npx supabase gen types` lo wipea). Limpieza de `npm warn exec...` que el comando dejó en stdout y se metió en el file.
  - **Hooks**: `usePickupOrders.createPickupOrder` agregó parámetro `scheduledDate: string` después de `lines`. `useExternalOrders.createExternalOrder` agregó `scheduledDate: string` después de `invoiceAttachments`. Validación strict: regex `^\d{4}-\d{2}-\d{2}$` antes del INSERT — si el formato no matchea, retorna error sin tocar BD. INSERT incluye `scheduled_date: scheduledDate` en payload.
  - **Modales**: ambos agregaron campo `<input type="date">` requerido con asterisco rojo. Default pre-rellenado con `MIN(selectedLines.map(l => l.request.date_required))` (la fecha requerida más temprana de las líneas seleccionadas en el bulk; fallback a `todayStrInPanama()` si todas son null/inválidas). Editable. Validación blocking en `handleSubmit` antes de invocar el hook. CreatePickupOrderModal usa `dateError` state simple. CreateExternalOrderModal extendió `formErrors.scheduledDate` (consistente con providerName/invoiceAmount/invoiceAttachments).
  - **handlers en `programacion/page.tsx`**: `handleConfirmCreatePickup` y `handleConfirmCreateExternal` aceptan `scheduledDate: string` y lo pasan al hook. Signature de `onConfirm` props de modales actualizada.
  - **Cards**: `PickupOrderCard.PickupOrderWithLines.scheduled_date` cambió de `string | null` a `string` (NOT NULL). `ExternalOrderCard.ExternalOrderWithLines.scheduled_date` igual. Eliminado `date_required` del nested type `PickupOrderLineWithRelations.line.request` (ya no se necesita — el dato viene de la columna del order). Render del chip `<CalendarDays />` quitó el conditional `{order.scheduled_date && ...}` ya que es NOT NULL.
  - **Queries (4 lugares)**: agregado `scheduled_date` al SELECT a nivel del order. Quitado `date_required` del SELECT inner `request:request_id(...)`. Eliminado el cálculo MIN JS-side en los 4 mapping (lectura directa de `row.scheduled_date as string`). `.order('approved_at')` cambiado a `.order('scheduled_date')` para que la lista se ordene por fecha programada (FIFO operacional para Logística), no por orden de aprobación.
  - **Estilo**: same UX que TripForm (`type="date"`, label "Fecha programada", asterisco rojo, focus ring iconsa-blue).

  Files: `src/lib/types/database.ts`, `src/hooks/usePickupOrders.ts`, `src/hooks/useExternalOrders.ts`, `src/components/programacion/CreatePickupOrderModal.tsx`, `src/components/programacion/CreateExternalOrderModal.tsx`, `src/components/programacion/PickupOrderCard.tsx`, `src/components/programacion/ExternalOrderCard.tsx`, `src/app/(app)/programacion/page.tsx`, `src/app/(app)/solicitudes/[id]/page.tsx`. Build verde end-to-end. Commit atómico (cambio coordinado BD+UI: `scheduled_date` es `NOT NULL`, INSERT sin campo falla en runtime). NO push (James pushea al cierre de Cambio 5 v2 tras smoke OK).

- [bd] **Cambio 5 — RLS policies aplicadas en 4 tablas nuevas (BLOCKING smoke test resuelto).** Las 4 migraciones aplicadas por Chat el 2026-04-27 (`cambio5_create_pickup_orders`, `cambio5_create_external_orders`, `cambio5_recalc_qty_scheduled_triggers`, `cambio5_drop_old_columns_simplify_cascade`) crearon las tablas `pickup_orders`, `pickup_order_lines`, `external_orders`, `external_order_lines` con `ENABLE ROW LEVEL SECURITY` pero **sin CREATE POLICY**. Confirmado via `get_advisors` (4 lints `rls_enabled_no_policy` INFO level). Resultado en runtime: cualquier INSERT desde el cliente (incluido admin) falla con `new row violates row-level security policy for table "pickup_orders"` / `"external_orders"`. Smoke test del 2026-04-28 detectó el bug al intentar aprobar bulk pickup y bulk external desde `/programacion`. **Aplicado por Chat en staging (`vonwkciosksqspyljzfy`) el 2026-04-28** vía Supabase MCP. Pendiente prod en merge final v2.

  **Deltas vs propuesta original (4 ajustes detectados por Chat antes de aplicar):**
  1. **`*_order_lines` UPDATE faltaba completamente** — la propuesta original solo incluía SELECT/INSERT/DELETE. Sin UPDATE policy, `usePickupOrders.completePickupOrder` (líneas 724-733 que setean `qty_delivered = quantity_assigned` por línea) y `useExternalOrders.completeExternalOrder` (paralelo) fallarían siempre. Agregado: UPDATE en pickup_order_lines y external_order_lines.
  2. **`*_orders` UPDATE necesita PM además de admin/logistica** — D8/J de Cambio 5 permite que PMs confirmen entrega de orders relacionadas a sus solicitudes desde `/solicitudes/[id]` (helper `checkPmCanConfirmOrder` en T8 con AT LEAST 1 match). Agregado rol `'pm'` al USING/WITH CHECK.
  3. **`*_order_lines` UPDATE/DELETE necesitan PM también** — `cancelSolicitud` (T10) puede ejecutarse por PMs cuando cancelan solicitud parcial con orders activos, lo que dispara DELETE de order_lines + UPDATE status order. Agregado rol `'pm'`.
  4. **Naming refleja el set de roles real** — policies que incluyen PM se renombraron de `logistica_admin_*` a `logistica_admin_pm_*` para que el nombre indique los grants efectivos.

  **Validación de ownership queda en código JS** (`checkPmCanConfirmOrder` con AT LEAST 1 match). RLS solo chequea rol — patrón consistente con `trip_line_assignments.operational_update` que también permite PM aunque PMs solo deben tocar líneas de sus proyectos. La defensa-en-profundidad real es la combinación RLS rol + JS ownership check.

  **SQL final aplicado en staging (14 policies activas — verificado por Chat con SELECT post-aplicación):**

  ```sql
  -- ─────────────── pickup_orders ───────────────
  CREATE POLICY "authenticated_select" ON public.pickup_orders
    FOR SELECT TO authenticated USING (true);

  CREATE POLICY "logistica_admin_insert" ON public.pickup_orders
    FOR INSERT TO authenticated
    WITH CHECK (public.get_my_app_role() IN ('admin', 'logistica'));

  CREATE POLICY "logistica_admin_pm_update" ON public.pickup_orders
    FOR UPDATE TO authenticated
    USING (public.get_my_app_role() IN ('admin', 'logistica', 'pm'))
    WITH CHECK (public.get_my_app_role() IN ('admin', 'logistica', 'pm'));

  -- ─────────────── pickup_order_lines ───────────────
  CREATE POLICY "authenticated_select" ON public.pickup_order_lines
    FOR SELECT TO authenticated USING (true);

  CREATE POLICY "logistica_admin_insert" ON public.pickup_order_lines
    FOR INSERT TO authenticated
    WITH CHECK (public.get_my_app_role() IN ('admin', 'logistica'));

  CREATE POLICY "logistica_admin_pm_update" ON public.pickup_order_lines
    FOR UPDATE TO authenticated
    USING (public.get_my_app_role() IN ('admin', 'logistica', 'pm'))
    WITH CHECK (public.get_my_app_role() IN ('admin', 'logistica', 'pm'));

  CREATE POLICY "logistica_admin_pm_delete" ON public.pickup_order_lines
    FOR DELETE TO authenticated
    USING (public.get_my_app_role() IN ('admin', 'logistica', 'pm'));

  -- ─────────────── external_orders ───────────────
  CREATE POLICY "authenticated_select" ON public.external_orders
    FOR SELECT TO authenticated USING (true);

  CREATE POLICY "logistica_admin_insert" ON public.external_orders
    FOR INSERT TO authenticated
    WITH CHECK (public.get_my_app_role() IN ('admin', 'logistica'));

  CREATE POLICY "logistica_admin_pm_update" ON public.external_orders
    FOR UPDATE TO authenticated
    USING (public.get_my_app_role() IN ('admin', 'logistica', 'pm'))
    WITH CHECK (public.get_my_app_role() IN ('admin', 'logistica', 'pm'));

  -- ─────────────── external_order_lines ───────────────
  CREATE POLICY "authenticated_select" ON public.external_order_lines
    FOR SELECT TO authenticated USING (true);

  CREATE POLICY "logistica_admin_insert" ON public.external_order_lines
    FOR INSERT TO authenticated
    WITH CHECK (public.get_my_app_role() IN ('admin', 'logistica'));

  CREATE POLICY "logistica_admin_pm_update" ON public.external_order_lines
    FOR UPDATE TO authenticated
    USING (public.get_my_app_role() IN ('admin', 'logistica', 'pm'))
    WITH CHECK (public.get_my_app_role() IN ('admin', 'logistica', 'pm'));

  CREATE POLICY "logistica_admin_pm_delete" ON public.external_order_lines
    FOR DELETE TO authenticated
    USING (public.get_my_app_role() IN ('admin', 'logistica', 'pm'));
  ```

  Los triggers de recálculo (`trg_recalc_from_pickup_order_status_change`, `trg_recalc_from_external_order_status_change`) son SECURITY DEFINER → bypassan RLS, no necesitan policy explícita.

  **Rollback (si necesario):**

  ```sql
  DROP POLICY IF EXISTS "authenticated_select" ON public.pickup_orders;
  DROP POLICY IF EXISTS "logistica_admin_insert" ON public.pickup_orders;
  DROP POLICY IF EXISTS "logistica_admin_pm_update" ON public.pickup_orders;
  DROP POLICY IF EXISTS "authenticated_select" ON public.pickup_order_lines;
  DROP POLICY IF EXISTS "logistica_admin_insert" ON public.pickup_order_lines;
  DROP POLICY IF EXISTS "logistica_admin_pm_update" ON public.pickup_order_lines;
  DROP POLICY IF EXISTS "logistica_admin_pm_delete" ON public.pickup_order_lines;
  DROP POLICY IF EXISTS "authenticated_select" ON public.external_orders;
  DROP POLICY IF EXISTS "logistica_admin_insert" ON public.external_orders;
  DROP POLICY IF EXISTS "logistica_admin_pm_update" ON public.external_orders;
  DROP POLICY IF EXISTS "authenticated_select" ON public.external_order_lines;
  DROP POLICY IF EXISTS "logistica_admin_insert" ON public.external_order_lines;
  DROP POLICY IF EXISTS "logistica_admin_pm_update" ON public.external_order_lines;
  DROP POLICY IF EXISTS "logistica_admin_pm_delete" ON public.external_order_lines;
  ```

  **Para prod en merge final v2:** aplicar este SQL final (14 policies), no la propuesta original (que tenía 11 y rompía completePickup/completeExternal/cancelSolicitud para PM).

- [fix] **Cambio 5 polish — UI bulk action toolbar + integer step en quantity inputs.** Tres bugs encontrados durante smoke test post-T10:

  - **UI inconsistente (Bug 3):** los 3 botones de la sección bulk action (Crear Movilización en header navy + Aprobar pickup amber + Aprobar viaje externo blue) vivían en estilos divergentes (Button component vs raw button con clases Tailwind). El `bg-blue-600` del botón "Aprobar viaje externo" además renderizaba invisible (texto blanco sobre sin fondo) — probablemente clase no purgada en otro lugar del codebase, conflicto con override CSS, o issue Tailwind v4 específico al combinar con otras clases en el mismo elemento. **Fix:** rediseño completo de la toolbar bulk action — los 3 botones ahora viven en el mismo toolbar (no distribuidos en header + toolbar), todos usan el componente `<Button>` con `variant="primary"` + `size="sm"` + `className` override para color (navy default = Crear Movilización, `!bg-amber-500` = Aprobar pickup, `!bg-blue-600` = Aprobar viaje externo). Header simplificado: solo muestra "Nueva Movilización" cuando NO hay selección. Cuando hay selección, header solo tiene el título + el botón "Limpiar" se mueve al toolbar como link. Resultado: un solo bloque visual con jerarquía clara, los 3 botones tienen mismo size/padding/rounded, los colores diferenciados reflejan la naturaleza de la acción (navy=fleet, amber=pickup, blue=externo) consistente con el sistema de badges del proyecto.

  - **Quantity input spinners decimales (Bug 2):** `CreatePickupOrderModal.tsx:112` y `CreateExternalOrderModal.tsx:139` tenían `step="0.01"` en los inputs de cantidad — el spinner del number input subía/bajaba 0.01 en 0.01 (4.98, 4.99, 5.00) cuando el caso 99% es enteros (cemento bolsas, varillas, equipos). **Fix:** `step="1"` en los inputs de cantidad. Conservado `step="0.01"` en el input de Costo del Servicio (`CreateExternalOrderModal.tsx:184`) que sí es dinero. El input sigue siendo `type="number"` así que escribir decimales a mano sigue funcionando si se necesita (ej: kg fraccionarios) — solo cambia el comportamiento del spinner.

  - **RLS BLOCKING (Bug 1):** ver entry `[bd-pending]` arriba — fix de BD, no de código.

  Files: `src/app/(app)/programacion/page.tsx` (toolbar refactor), `src/components/programacion/CreatePickupOrderModal.tsx` (step), `src/components/programacion/CreateExternalOrderModal.tsx` (step). Build verde. NO push (James pushea al cierre de Cambio 5 v2).

---

## 2026-04-27
- [feat] **Cambio 3 — Pickup nuevo (modelo bandera-en-línea) shippeado.** Eliminación completa del modelo viejo de pickup-via-trip-especial. Pickup ahora es flag a nivel de línea (`sm_request_lines.pickup_by_project`) sin trip, sin tarifa, sin código. Tres superficies UX nuevas: (1) **Aprobar pickup desde backlog** (`/programacion`) con botón 🤝 + modal mínimo para logistica/admin → línea pasa a `'Pickup Aprobado'` y desaparece del backlog (cascade trigger lleva solicitud padre a 'En Proceso'); (2) **Convertir línea Programada a pickup** (`/programacion/viaje/[id]`) con botón 🤝 en cada AssignmentRow + modal con dos variantes (última línea cancela trip; otras solo sacan línea); bloqueo si `qty_delivered>0` (E2/Q7); UPDATE atómico evita round-trip Pendiente→Pickup Aprobado en cascade; (3) **Sección "Pickups Pendientes de Retiro"** en `/programacion` listando líneas con `pickup_by_project=true AND pickup_completed_at IS NULL` ordenadas FIFO por `pickup_approved_at` → modal "Registrar entrega" con receptor (dropdown personas + texto fallback, validación XOR Q6), notas opcional, attachments opcional persistidos en `sm_request_lines.attachments` JSONB → línea pasa a 'Entregada' con `qty_delivered=quantity` (todo-o-nada Q4) y cascade cierra solicitud si todas las líneas están Entregadas. **Eliminaciones de código viejo** (~700 líneas): `PreparationModal.tsx`, `PickupModal.tsx`, eventos `Preparacion`/`Retiro` (icons/colors EventTimeline + TripEventType union + EVENT_CONFIG en EventButton), handlers `handlePreparation`/`handlePickup` (mis-viajes/[id]), branch `Retiro` en `handleRevert`, refs a `complete_pickup_trip` RPC, `PICKUP_STEPS` y `isPickup` en `TripCard`/ProgressBar, badge "Retiro" en `/solicitudes` (table + mobile), `is_self_pickup` en TripForm + nuevo trip page + GPS API route + 10 archivos más, `fulfillment_type` en SolicitudForm + useSolicitudes + initial states, validación J1 obsoleta. Tests legacy: `tests/pickup-flow.spec.ts` borrado entero (~250 líneas), helpers `registerPreparation`/`registerRetiro` eliminados, opt `isPickup` y bloque toggle pickup en `createTrip` removidos. **Polish/fixes pre-existentes:** `cancelSolicitud` ahora incluye `'Pickup Aprobado'` en filtro de cancelación (fix I1/E8 — antes líneas pickup-aprobadas quedaban huérfanas en solicitud Cancelada). Badge "🤝 PICKUP" en LineRow de `/solicitudes/[id]` con tooltip de fecha aprobación; badge "🤝 RETIRADO" cuando línea completada con receptor + fecha. GPS API route sin branch `'pickup'` (solo not_in_route/no_gps/stale/live). **Decisiones cerradas:** Q1=eliminar badge agregado en lista solicitudes; Q2=DELETE pickup-flow.spec.ts; Q3=eliminar badge TripCard sin reemplazo; Q4=todo-o-nada; Q5=todas personas activas + texto fallback; Q6=XOR receptor; Q7=NO permitir pickup si `qty_delivered>0`; Q8=modal mínimo de confirmación al aprobar. **Edge cases cubiertos:** E1 Pendiente sin trip → Pickup Aprobado directo; E2 Programada con `qty_delivered>0` bloqueada; E3 solicitud mixta (cascade trigger ya updateado por Chat); E4 trip con N>1 assignments NO se cancela; E5 pickup parcial NO soportado v1; E6 solicitante NO puede iniciar pickup; E7 línea pickup en trip con campaign no aplica; E8 cancelar solicitud con líneas Pickup Aprobado (I1 fix); E9 NO reversible v1; E10 borrador con líneas Pickup Aprobado no posible. **Deuda técnica conocida:** `convertLineToPickup` (Surface 2) NO es atómico server-side — DELETE assignment + UPDATE línea son 2 queries separadas. Riesgo bajo en v1 (1 Charris operando, sin concurrencia). Si una falla mid-flow, la otra queda aplicada. Polish post-merge: convertir a RPC SQL con SECURITY DEFINER y transacción server-side. Tests E2E del flow nuevo quedan como AD-5 follow-up. Cierra items: **J1** (Pickup flow bloqueado → BORRADO), **D4** (Pickup + fleet lines mezcladas → CERRADO), **AD-1** (PickupOrder vs Trip → OBSOLETO; Decisión 11/3). Plan: `Docs/superpowers/plans/2026-04-27-cambio3-pickup-redesign.md` (borrado al cierre per `plan-lifecycle.md`). Commits: `c3ed958..` (T1) → último commit T11.

- [bd] **Cambio 3 BD aplicada por Chat en staging.** Migration `cambio3_pickup_redesign`:
  - 6 columnas pickup nuevas en `sm_request_lines`: `pickup_by_project boolean DEFAULT false NOT NULL`, `pickup_approved_at timestamptz`, `pickup_approved_by uuid REFERENCES people(id)`, `pickup_completed_at timestamptz`, `pickup_received_by_id uuid REFERENCES people(id)`, `pickup_received_by_name text`.
  - Status nuevo `'Pickup Aprobado'` aceptado en validación de status (no hay CHECK constraint en BD — validación solo en código TypeScript).
  - DROP `trips.is_self_pickup`, `sm_requests.fulfillment_type`, función `complete_pickup_trip`. Verificación pre-aplicación: 0 trips con `is_self_pickup=true`, 0 solicitudes con `fulfillment_type='pickup'` — modelo viejo no tenía uso real.
  - `cascade_request_status` actualizado para tratar `'Pickup Aprobado'` como `in_progress` (igual que `'Programada'`). Verificado funcionalmente con seeding (Solicitud B `26-604-SM-006` pasó a 'En Proceso' al actualizar líneas a 'Programada').
  - **Adicional:** migración separada `cambio3_pickup_add_attachments_to_lines` aplicada por Chat post-brainstorming: `ALTER TABLE sm_request_lines ADD COLUMN attachments JSONB DEFAULT '[]'::jsonb NOT NULL`. Razón: persistir evidencias de pickup completion per-línea (foto receptor, condiciones del material). El hook `completePickup` y `PickupDeliveryModal` persisten directamente en este campo.
  - Pendiente aplicar a prod: ambas migraciones (`cambio3_pickup_redesign` + `cambio3_pickup_add_attachments_to_lines`) en el merge final v2 del branch `jaime/dev`.

- [fix] Sigla `ATT` → `ATTT` en UI (typo). Renombre de la sigla del permiso de la Autoridad de Tránsito en todos los strings visibles: badge label en TripForm/TripCard/mis-viajes/[id], chip ámbar en solicitudes/[id], tooltips desktop+mobile en programacion, checkbox "Requiere Permiso ATTT" + mensaje informativo de adjunto en TripForm. Comentarios JSX de TripForm también actualizados para consistencia. **No tocado:** columna BD `att_permit` ni prop interno `attPermit` (son nombres internos estables, no UI). Specs en `Docs/` no editados (regla `no-modify-specs`).
- [bd] Cambio 2 cost code Etapa BD-2 — `ALTER TABLE sm_request_lines DROP COLUMN cost_code_id, DROP COLUMN cost_category_id` aplicado en staging (`vonwkciosksqspyljzfy`) via Chat MCP. Migration `cambio2_cost_code_to_request_etapa2_drop_legacy`. FK constraints auto-eliminados. Code regenerado contra staging confirma cleanup: `sm_request_lines.Row` sin las columnas, `sm_requests.Row` mantiene `cost_code_id`/`cost_category_id` (BD-1). Build verde sin cambios de código adicionales (Task 4 del plan de Cambio 2 había eliminado los consumers preventivamente). Cierra J9 del BACKLOG (cost_code refactor per-línea → per-solicitud). Pendiente prod en merge final v2.
- [bd] Cambio 2 cost code Etapa BD-1 — `ALTER TABLE sm_requests ADD COLUMN cost_code_id UUID, cost_category_id UUID` aplicado en staging (`vonwkciosksqspyljzfy`) via Chat MCP. Data migrada con UPDATE desde primera línea de cada solicitud (`SELECT cost_code_id FROM sm_request_lines WHERE request_id = sr.id ORDER BY line_number LIMIT 1`). Resultado: 6/6 solicitudes seteadas, sanity check MATCH (0 inconsistencias entre primera línea y resto). Solicitud histórica `24-404-SM-150` quedó con `cost_code_id=NULL` (legacy Completada con líneas todas NULL — render `—` en displays). Trigger `generate_full_code()` verificado: dispara en tabla `cost_codes` master, NO en `sm_request_lines` — BD-2 seguro.

## 2026-04-26
- [bd] Cambio 1 Parada — `ALTER TABLE trip_events DROP COLUMN stop_type` aplicado en staging (`vonwkciosksqspyljzfy`) via Chat MCP. Migration `drop_stop_type_from_trip_events`. Justificación: toda Parada es retiro de proveedor por diseño (decisión 17 del rediseño Events V2). Verificado pre-aplicación: 0 filas con stop_type. `oc_reference` NO existe como columna (era prefijo a notes en modal). Pendiente aplicar a prod en el merge final.

## 2026-04-20
- [bd] **Fix `notification_log.valid_event_type` constraint desincronizado**: aplicado a staging (`vonwkciosksqspyljzfy`) y prod (`bzeoszympkkicwlfdtcn`) 2026-04-20. Staging tenía 13 event_types, prod tenía 15, pero el código emite 18. Los huérfanos globales (`viaje_editado`, `material_preparado`, `reversion_registrada`) hacían que el INSERT al audit trail fallara y la dedup de 5min quedara rota para esos 3 tipos. Staging además no tenía `solicitud_urgente_nueva` y `alerta_diaria_urgentes` (hotfix histórico aplicado solo a prod sin documentar). El ALTER es aditivo (DROP + ADD con superset de 18), ninguna fila existente violaba el constraint nuevo.

  ```sql
  ALTER TABLE public.notification_log DROP CONSTRAINT valid_event_type;
  ALTER TABLE public.notification_log ADD CONSTRAINT valid_event_type
    CHECK (event_type = ANY (ARRAY[
      'solicitud_enviada','solicitud_editada','solicitud_cancelada',
      'solicitud_completada','lineas_programadas','viaje_cancelado',
      'viaje_reprogramado','viaje_editado','viaje_asignado_conductor',
      'entrega_confirmada','salida_registrada','incidencia_ruta',
      'sugerencia_fallback','retorno_registrado','solicitud_urgente_nueva',
      'alerta_diaria_urgentes','material_preparado','reversion_registrada'
    ]));
  ```

- [feat] **ActiveTripPanel — vista operativa consolidada del trip activo en `/solicitudes/[id]`**: nuevo componente `src/components/solicitudes/ActiveTripPanel.tsx` que encapsula las 6 secciones operativas (header MOV + badge + hora salida, metadata conductor/vehículo/remolque, líneas filtradas por En Transito/Parcial, mapa `<TripLiveMap variant="compact">`, código de verificación gated por rol pm/logistica/admin, botón "Confirmar Recepción →" como Link a `/mis-viajes/[id]?action=deliver`). Se renderiza 0..N veces (una por trip activo con al menos una línea En Transito o Parcial) inmediatamente antes del `<SolicitudForm>`, ordenado por Salida descendente. Tres cambios coordinados: (1) tipos `TripLineInfo`/`TripEventInfo`/`AssociatedTrip` extraídos de inline a `src/components/solicitudes/types.ts` compartido (commit `186e7b0`); (2) banner azul "Material en camino" del top de page.tsx eliminado (commit `70940a4`) — toda la info operativa ahora vive en el panel, imports huérfanos de `Link` y `formatTimePanama` removidos tras grep; (3) `<TripLiveMap>` embedded dentro de la card histórica "Movilizaciones Programadas" eliminado junto con la import huérfana (commit `b6c81e5`) — el mapa vive **exclusivamente** en el panel arriba, sin duplicación. Card histórica mantiene header/metadata/líneas/código/timeline. Componente nuevo en commit `cfdeb3f`. Spec: `Docs/superpowers/specs/2026-04-20-active-trip-panel-design.md` (v1.1).

- [bd] **GPS live tracking — columna `equipment.gps_vehicle_id`**: ejecutado en staging (`vonwkciosksqspyljzfy`) 2026-04-20. Pendiente ejecutar en prod (`bzeoszympkkicwlfdtcn`). Dos migraciones consecutivas: (1) `gps_vehicle_id_column_and_bootstrap` — ALTER TABLE + índice parcial + 13 UPDATEs match por `spectrum_code`, 10 impactaron; (2) `gps_vehicle_id_bootstrap_by_plate` — 3 UPDATEs match por `plate` para los vehículos donde SkyData usaba placa como identificador en vez de spectrum_code (ED8244 / EM0539 / ES3830 son placas de los equipos PUP244 / SUV539 / BUS830 respectivamente). Resultado: 13/13 vehículos con GPS mapeados. Verificado: filas pobladas, 0 huérfanos, índice parcial creado. Spec: `Docs/superpowers/specs/2026-04-20-gps-live-tracking-design.md`.

  ```sql
  -- Migración 1 — columna + índice + bootstrap por spectrum_code (10 de 13 matchean)
  ALTER TABLE public.equipment
  ADD COLUMN gps_vehicle_id text NULL;

  COMMENT ON COLUMN public.equipment.gps_vehicle_id IS
  'ID interno del vehículo en SkyData/SkyGlobal (campo `id`, no `unit_id`). Solo los 13 vehículos con dispositivo GPS tienen valor. NULL para equipos sin GPS.';

  CREATE INDEX idx_equipment_gps_vehicle_id
  ON public.equipment (gps_vehicle_id)
  WHERE gps_vehicle_id IS NOT NULL;

  UPDATE public.equipment SET gps_vehicle_id = '118'  WHERE spectrum_code = 'CAB444';
  UPDATE public.equipment SET gps_vehicle_id = '119'  WHERE spectrum_code = 'CAB930';
  UPDATE public.equipment SET gps_vehicle_id = '120'  WHERE spectrum_code = 'CAM839';
  UPDATE public.equipment SET gps_vehicle_id = '121'  WHERE spectrum_code = 'CAM837';
  UPDATE public.equipment SET gps_vehicle_id = '123'  WHERE spectrum_code = 'BUS009';
  UPDATE public.equipment SET gps_vehicle_id = '124'  WHERE spectrum_code = 'BUS010';
  UPDATE public.equipment SET gps_vehicle_id = '126'  WHERE spectrum_code = 'CAM430';
  UPDATE public.equipment SET gps_vehicle_id = '5061' WHERE spectrum_code = 'PUP467';
  UPDATE public.equipment SET gps_vehicle_id = '5062' WHERE spectrum_code = 'PUP468';
  UPDATE public.equipment SET gps_vehicle_id = '5063' WHERE spectrum_code = 'PUP245';

  -- Migración 2 — corrección por plate para los 3 vehículos donde SkyData usa placa en vez de spectrum_code.
  -- SkyData description: "ED8244" / "EM0539" / "ES3830" corresponden a equipos PUP244 / SUV539 / BUS830.
  UPDATE public.equipment SET gps_vehicle_id = '5067' WHERE plate = 'ED8244';
  UPDATE public.equipment SET gps_vehicle_id = '6218' WHERE plate = 'EM0539';
  UPDATE public.equipment SET gps_vehicle_id = '6612' WHERE plate = 'ES3830';
  ```

## 2026-04-19
- [fix] **J2 — Eliminar `requires_code` del código**: la columna `requires_code` fue dropeada en BD (prod + staging) pero el frontend seguía enviándola en inserts/updates → error PGRST204 "Could not find the 'requires_code' column of 'sm_request_lines' in the schema cache" al agregar líneas a solicitudes. Fix: eliminar todas las referencias en código y tests. Cambios: (1) `src/components/solicitudes/LineEditor.tsx` — quitado del payload de `handleSave`. (2) `src/app/(app)/solicitudes/nueva/page.tsx` — simplificado `handleLineSave` (ya no wrappa con `requires_code: true`). (3) `src/app/(app)/solicitudes/[id]/page.tsx` — quitado del mapper de línea para editar. (4) `src/hooks/useSolicitudes.ts` — `LineWithRelations` y `LineInput` sin `requires_code`; 3 inserts/updates limpios. (5) `src/hooks/useTrips.ts` — interface `TripLine` sin `requires_code`; 2 mappers + 2 SELECTs limpios (ya no se consulta la columna). (6) `src/lib/types/database.ts` — edición quirúrgica: quitadas las 3 ocurrencias de `requires_code` en Row/Insert/Update de `sm_request_lines` (NO regeneré con `gen types` porque destapaba drift de `qty_dispatched` entre prod y staging — ver nota abajo). (7) Tests: `tests/helpers.ts` sin opt `requiresCode`, `tests/solicitud-creation.spec.ts` sin test "All lines have requires_code=true by default", `tests/entrega-complete.spec.ts` sin comentario obsoleto. **Nota drift BD:** al intentar regenerar tipos con `npx supabase gen types` desde prod (`bzeoszympkkicwlfdtcn`), descubrí que prod NO tiene la columna `qty_dispatched` en `trip_line_assignments`, mientras que staging (`vonwkciosksqspyljzfy`) SÍ la tiene. El código frontend usa `qty_dispatched` intensivamente (Dispatch, Pickup, Delivery modals + mis-viajes flow) — no tocar sin decisión explícita de James. Documentado para investigación futura.
- [audit] **Drift prod/staging detectado**: `trip_line_assignments.qty_dispatched` existe en staging pero no en prod. Impacto: potencialmente los flows de Dispatch/Pickup/Delivery en prod están fallando silenciosamente. Requiere investigación — ¿prod realmente no tiene la columna, o el snapshot del MCP es incompleto? James debe decidir: (a) dropear `qty_dispatched` en staging para alinear, o (b) aplicar migración en prod para añadirla.

## 2026-04-17
- [chore] **Tooling upgrade**: Repomix v1.13.1 instalado globalmente + config `repomix.config.ts` (compress, tree-sitter, security check). Para dar contexto completo del codebase a Claude Chat con un solo archivo.
- [chore] **Superpowers enforcement**: `tool-usage.md` reescrito con reglas de uso obligatorio — brainstorming ANTES de features, systematic-debugging para bugs, Context7 ANTES de APIs, Repomix antes de Chat. Plan mode nativo desactivado (`EnterPlanMode` en deny list) — todo planning pasa por Superpowers.
- [chore] **Swap Superpowers pendiente**: cambio de obra/superpowers a pcvelz/superpowers (fork Claude Code-specific con task management nativo y hooks de enforcement). Requiere ejecución manual en terminal.

## 2026-04-16
- [fix] **G1 — Reversion guard valida registered_by**: `handleRevert` en `mis-viajes/[id]/page.tsx` ahora verifica que `registered_by.id === person.id` antes de permitir revertir. Admin bypasea (puede revertir cualquiera). Logistica solo puede revertir eventos que registró ella misma. TripEvent interface + loadEvents query actualizados para incluir `id` en registered_by (antes solo `name`).
- [fix] **G6 — Dashboard "En Tránsito Ahora" clickeable**: cada trip en el widget de dashboard es ahora un `<a>` con href a `/mis-viajes/{id}`. Hover: `bg-blue-100/60`.
- [fix] **G7 — DeliveryModal badge 🔑 per-line**: cada línea con `requires_code === true` muestra emoji 🔑 al lado del nombre. El usuario ve de entrada qué líneas pedirán código.
- [fix] **G10 — Incidencia min 10 chars**: EventModal valida `notes.trim().length >= 10` cuando `eventType === 'Incidencia'`. Error visible en rojo. No afecta otros event types.
- [docs] **G17+G18+G19 — Cleanup EVENTS_V2.md**: G17 `stop_location` → `location` (nombre real). G18 orden handleDelivery corregido (INSERT checkpoint primero, no UPDATE primero). G19 conteo notificaciones aclarado (2 de 4 planificadas implementadas, 2 pendientes G3/G4).
- [docs] **Decisión: códigos de entrega siempre obligatorios** — James + jefe decidieron que el código de confirmación de 4 dígitos es obligatorio en toda entrega y retiro, sin excepción. El feature `requires_code` per-line (que permitía hacer códigos opcionales por línea) se elimina como concepto. Actualizados: BACKLOG.md (J2 cerrado), TRAIL.md (J2 decidido, G7 badge obsoleto), EVENTS_V2.md (7 secciones actualizadas), CLAUDE.md regla #15. Implementación de código pendiente (eliminar checkboxes, simplificar DeliveryModal, limpiar hooks/tests).

## 2026-04-15
- [fix] **J4-B — Sort server-side (bug preexistente)**: el sort de columnas en DataTable operaba client-side sobre la página actual (`solicitudes`/`trips` ya paginados), entonces "sort por fecha más reciente" solo ordenaba dentro de la página visible. Bug introducido por la paginación server-side original, no por J4. **Fix:** contrato `externalSort` en `src/components/ui/DataTable.tsx` — cuando se provee, DataTable delega el sort al parent. Nuevo campo `Column.serverSortKey?: string` marca qué columnas se pueden ordenar server-side (las que tienen ese valor se hacen clickeables en modo externalSort; las que no, quedan solo display). `SolicitudesFilter` y `TripsFilter` ganan `sortColumn` + `sortDirection`; los hooks aplican `.order(filters.sortColumn ?? default, { ascending: ... })` en la query. Default: `date_required asc` (solicitudes), `scheduled_date desc` (trips). `src/app/(app)/solicitudes/page.tsx` marca `serverSortKey` en `request_id`, `date_required`, `date_submitted`, `status`. `src/app/(app)/programacion/page.tsx` marca `trip_id`, `scheduled_date`, `status` (driver queda solo-display en externalSort). Sort client-side en otras páginas (admin/masters) se mantiene como fallback cuando `externalSort` no se provee. **Resultado:** click en header sortea toda la data en BD y re-fetchea.
- [fix] **J4-A — Regresión click-día: separar `singleDay` de `dateFrom`/`dateTo`**: mi fix original de J4 (a80cf36) unificó demasiado el estado — el click en un día del calendario seteaba `dateFrom=dateTo=día`, lo cual aplicaba a la query de la tabla Y del calendario. Resultado: al clickear día 14, el calendario colapsaba a solo día 14 y perdías la vista semanal. **Fix:** agregué `singleDay` como campo separado en `SolicitudesFilter` y `TripsFilter`. Es un filtro ortogonal: el click-día setea solo `singleDay`, los inputs Desde/Hasta siguen seteando `dateFrom`/`dateTo`. Los hooks (`useSolicitudes.refetchList`, `useTrips.refetchTrips`) aplican AMBOS filtros al query de la tabla (intersección). La query del calendario SOLO aplica `dateFrom`/`dateTo` (ignora `singleDay`) → el calendario sigue mostrando los otros días aunque haya un día clickeado. Los chips del click-día y del rango Desde/Hasta son independientes y pueden coexistir. `clearAllFilters` limpia también `singleDay`. Archivos: `src/hooks/useSolicitudes.ts`, `src/hooks/useTrips.ts`, `src/app/(app)/solicitudes/page.tsx`, `src/app/(app)/programacion/page.tsx`.
- [fix] **J7-ext — Código de costo completo requerido (3 campos)**: el fix previo de J7 (d2d4733) solo hacía requerida la Fase. El usuario aclaró que "código de costo" se refiere a los 3 campos que lo componen: Extra/Sección (solo si el proyecto tiene extras), Fase, y Categoría. `src/components/solicitudes/LineEditor.tsx` — `validate()` ahora rechaza guardar si falta cualquiera de los 3: `extra` (condicional `hasExtras`), `cost_code` (fase), `cost_category`. Los 3 labels muestran asterisco `*` y el Select correspondiente muestra el error. CLAUDE.md regla #14 actualizada.
- [fix] **J4 — Calendarios y filtros unificados (rediseño)**: el calendario y la tabla en `/solicitudes` y `/programacion` ahora son una sola "vista de datos" con un set de filtros unificado server-side. Bug raíz: el `dateFilter` (y `tripProjectFilter` en programación) eran estado local que filtraba client-side sobre `solicitudes`/`trips` ya paginados — items en página 2+ no eran visibles cuando se hacía click en su día del calendario o se aplicaba un rango Desde/Hasta. **Cambios:** (1) `src/hooks/useTrips.ts` — nueva propiedad `projectId` en `TripsFilter` interface + `DEFAULT_FILTER`; `refetchTrips` ahora hace 2-step query cuando hay `projectId` (resuelve trip_ids via `trip_line_assignments → line → request → project_id` con inner joins, después filtra `trips.id IN (...)`) porque trips no tiene `project_id` directo. (2) `src/app/(app)/solicitudes/page.tsx` — eliminado tipo `DateFilter` + estado `dateFilter` + memo `displayedSolicitudes`; `calendarDate` se deriva de `filters.dateFrom === filters.dateTo`; click en día llama `setFilters({ dateFrom: day, dateTo: day, page: 0 })` con toggle (deselecciona si es el mismo día); inputs Desde/Hasta llaman `setFilters` directo; el query del calendario `calendarItems` ahora aplica TODOS los filtros (status, search, requesterId, dateFrom, dateTo, projectId) en lugar de solo `projectId`; tabla usa `solicitudes` directo (server ya filtró); chips de fechas y `clearAllFilters` adaptados. (3) `src/app/(app)/programacion/page.tsx` — eliminados `tripProjectFilter` local + `dateFilter` local + memo `filteredTrips`; el select de proyecto llama `setTripFilters({ projectId, page: 0 })`; handlers de fecha llaman `setTripFilters` directo; el query `calendarItems` aplica el 2-step de projectId + status + conductor + dateFrom + dateTo + search; tabla usa `trips` directo. **Resultado:** click en día del calendario, rango Desde/Hasta, status chip, proyecto, search — todos modifican el mismo `tripFilters`/`solicitudFilters` server-side y el calendario refleja exactamente el mismo conjunto que la tabla. Items en cualquier página son visibles via filter. Confirmado con James que: (Duda 1) `dateFrom === dateTo` colapsa a "día único", (Duda 2) click en día sobreescribe rango previo, (Duda 3) calendario respeta el filtro pero conserva su navegador < > Hoy de 2 semanas (3A).
- [feat] **J8b — Duplicar líneas en solicitud** (feedback Jacome): `src/components/solicitudes/LineRow.tsx` expone nuevo prop `onDuplicate?: () => void` y renderiza botón `Copy` (icon lucide) entre Editar y Eliminar cuando el callback está presente. `src/app/(app)/solicitudes/nueva/page.tsx` — nuevo `handleDuplicateLine` que `setLines(prev => [...prev, { ...prev[index] }])`. `src/app/(app)/solicitudes/[id]/page.tsx` — mismo handler pero solo activo cuando `canAddLines === true` (solicitud en Borrador, regla #2 CLAUDE.md). La copia se agrega al final de la lista sin abrir el editor; el usuario puede editarla después si quiere. En modo edición de solicitud post-Borrador, el botón se oculta automáticamente.
- [fix] **J8a — Scroll/zoom modales en mobile**: feedback de Jacome sobre "componentes que no tienen scroll y bloquean vista". Aplicado fix consistente a los 6 modales de viajes en jaime/dev: (1) `DeliveryModal.tsx` — agregado `max-h-[90vh] overflow-y-auto` al empty-state (primer modal de "No hay líneas pendientes") que no lo tenía; padding `p-6` → `p-4 sm:p-6` en ambos modales (body y empty-state); (2) `DispatchModal.tsx` — padding responsive; (3) `PickupModal.tsx` — padding responsive; (4) `ParadaModal.tsx` — padding responsive; (5) `PreparationModal.tsx` — agregado `max-h-[90vh] overflow-y-auto` (faltaba) + padding responsive; (6) `RevertModal.tsx` — agregado `max-h-[90vh] overflow-y-auto` (faltaba) + padding responsive. Efecto combinado: en mobile el padding se reduce de 24px a 16px (shrink → más content visible), y si aún así el contenido excede el viewport, hay scroll como fallback. El flujo viejo en main (EventModal en `mis-viajes/[id]/page.tsx`) se aplica en commit paralelo separado al worktree main.
- [fix] **J7 — Código de costo requerido en líneas de solicitud**: `src/components/solicitudes/LineEditor.tsx` — `validate()` ahora rechaza guardar si `costCodeId` es null. El Select de "Fase / Código de Costo" muestra asterisco (`Fase / Código de Costo *`) y error "El código de costo es requerido" si falta. Antes era opcional (default null aceptado). Convención de regla #14 CLAUDE.md actualizada. La categoría de costo (`cost_category_id`) sigue siendo opcional — solo la fase es obligatoria.
- [fix] **J6 — Costo read-only cuando hay tarifa seleccionada**: en `src/components/programacion/TripForm.tsx`, el Input de costo ahora tiene `disabled={fieldsDisabled || !!rateId}`. `handleRateChange` simplificado: cuando se selecciona tarifa, siempre sobreescribe el costo con `rate.amount` sin confirmación (el campo no es editable mientras haya tarifa, así que no hay valor manual que preservar). Para editar un costo custom, el usuario debe deseleccionar la tarifa primero. Antes el campo seguía editable con diálogo de confirmación "¿Reemplazar el costo manual con la tarifa?". CLAUDE.md regla #9 actualizada.
- [fix] **J3 — RBAC conductores (security)**: el rol `campo` solo puede acceder a `/mis-viajes`, y solo ve los viajes donde es el driver asignado. 4 cambios coordinados: (1) `src/lib/utils/constants.ts` — `ROLE_ROUTES.campo` reducido a `['/mis-viajes']` (antes incluía `/dashboard`); (2) `src/proxy.ts` — tras auth, consulta `people.app_role`, y si es `campo` enforza que `pathname` empiece con `/mis-viajes` o sea `/change-password` (resto → redirect a `/mis-viajes`); además `/login` y `/` redirigen a `/mis-viajes` en vez de `/dashboard` para este rol; (3) `src/hooks/useMyTrips.ts` — lee `useAuth`, y si `role === 'campo'` agrega `.eq('driver_id', person.id)` al query (defense-in-depth sobre RLS, espera a `authLoading=false` antes del primer fetch); (4) `src/app/(app)/mis-viajes/[id]/page.tsx` — nuevo `useEffect` que redirige a `/mis-viajes` si un `campo` accede por URL directa a un trip ajeno (ownership guard post-carga); (5) `src/app/(app)/mis-viajes/page.tsx` — oculta el filtro de conductor cuando `role === 'campo'` (no tiene sentido filtrar por otros conductores si solo ves los tuyos). **Pending:** test manual por James con user real de rol campo antes de cherry-pick a main. Automated test `tests/role-permissions.spec.ts` solo cubre admin, no campo.

## 2026-04-14
- [verify] Hallazgo #5 audit pre-fase cerrado — `handleRevert` branch `Entrega` verificado por análisis estático contra 4 escenarios de entregas parciales. Lógica correcta para qty/status/delivered_at/trip_line_assignments. Escenarios: (E1) entrega parcial única qty=6 de 10 → revert la deja en `En Transito` con `qty_scheduled=10, qty_delivered=0`; (E2) última de 2 parciales qty=3 tras qty=4 → revert la deja `Parcial` con `qty_delivered=4, qty_scheduled=6` (primera sobrevive); (E3) entrega que completó la línea qty=2 tras qty=3 total=5 → revert vuelve a `Parcial` con `qty_delivered=3, qty_scheduled=2, delivered_at=null` (cascade_request_status lleva el parent de `Completada` a `En Proceso`); (E4) entrega con observaciones → qty vuelve atrás como E1 y las filas de `delivery_observations` sobreviven intactas (evidencia histórica inmutable, por diseño). Comentario JSDoc agregado al branch en `mis-viajes/[id]/page.tsx` documentando la verificación. Cierre completo del audit del 2026-04-13/14.
- [chore] BACKLOG: nuevo item **AD-5** — `tests/helpers.ts` `createSolicitud`/`createTrip` rotos (crean solicitud vacía Enviada, `createTrip` falla por `assignments.length===0`). Rompe todos los tests E2E que crean data fresca. Detectado durante Bloque 3 tras intentar correr el test de revert parcial. Necesita investigación con `--headed` — sospecha de drift de selectores, no de regresión de código reciente.
- [fix] Pre-push hook race con post-commit background build — pre-push caía en sync fallback mientras el background build del post-commit todavía tenía `.next/lock`, causando `⨯ Unable to acquire lock`. Fix: pre-push ahora poll-ea `.build-status` cada 5s hasta 120s antes de caer en sync fallback, y chequea `.next/lock` antes de arrancar sync como último recurso. Bug descubierto al commitear el parking mismo. `38030bd`
- [chore] Parking Git/GitHub practices cerrado — enforcement client-side de 3 capas activo: documental (`.claude/rules/git-workflow.md`), tool deny patterns (13 nuevos en `.claude/settings.json` — push a main, force, no-verify, reset hard, rebase -i), Husky hooks (pre-commit bloquea main, pre-push bloquea main+force y gatea por `.build-status`, post-commit lanza `npm run build` en background tras cada commit). Skill `/release` nuevo en `.claude/skills/git-release.md` — valida Vercel READY antes de crear PR + squash merge + tag semver `v{YYYY}.{MM}.{DD}-{N}` + push del tag. Capa server-side (GitHub branch protection) NO activa: requiere upgrade a GitHub Team para repos privados — probado con Rulesets y Branch Protection Rules clásico, ninguno enforza en plan gratuito. Los 3 layers client-side cubren a James y Claude Code, los únicos actores con write access al repo. `cba86e3` + `7faed7a` (docs honestos capa 4)
- [test] Fase E — `tests/audit-gates.spec.ts` nuevo: 5 tests BD-first para validar los gates de Fase B.1 sin depender de UI. SEC2 (trigger genera confirmation_code), BD-F7 (enforce_line_add_delete_only_in_borrador), BD-X1 (qty_invariant), N_R2_1 (enforce_trip_immutable_post_departure), audit_log RLS. Todos verdes en staging.
- [docs] CLAUDE.md — 44 → 47 tablas, target tsconfig ES2022, staging branch `vonwkciosksqspyljzfy` añadida al header Stack.
- [fix] `alerta_diaria_urgentes` referencia a variable local `today` eliminada en C.4 — causa del build rojo en Vercel en todos los commits de Fase C. Reemplazada por `daysBetweenInPanama(todayStr, req.date_required)`. `099fe17`
- [feat] Fase C.7 — smells cleanup: storage.ts console.log gated a dev (B1), useAuth getUser().catch() previene loading colgado (B5), tsconfig target ES2017 → ES2022 (N_R3_11). `e247ce6`
- [feat] Fase C.6 — event edges: revert Llegada bloqueado si hay Entrega/Retiro/Parada posteriores (N5); Pickup/Dispatch/Delivery/Preparation modals regeneran eventIdRef en catch (B2); generateRequestIdFallback eliminado — confiar en trigger BD (A3). `6a7ce94`
- [feat] Fase C.5 — admin masters: toggleStatus, addPersonProject, removePersonProject wrapped en useSubmitGuard (N_R3_4); handleSave valida required fields por tabla antes de insert (N_R3_5). `3a8bea5`
- [feat] Fase C.3 — forms UX: canDeleteLines gate explícito en solicitudes/[id] (N6/M2); scheduled_date Input min=hoy Panamá + guard server-side en saveTrip (N_R2_2); rate auto-fill pide confirmación si hay costo manual distinto (M1); pickup toggle pide confirmación si borra driver/vehicle/trailer (N_R2_7). `81ec148`
- [feat] Fase C.2 — notificaciones: A4 status filter en 12 notify* functions (early-return si trip/request/line ya no aplica); N_R3_7 dedup por recipient_email en TEST_EMAIL mode; N_R3_8 fail-closed si dedup query falla. `89c5f87`
- [feat] Fase C.1 — seguridad: SEC1 sentryBeforeSend redact hook (PII/tokens/headers/cookies) en server/edge/client; SEC2 eliminada generación client-side de confirmation_code — trigger BD única fuente; XSS1 escapeHtml() helper + wrap de 16 templates de notificación email. `ea0603c`
- [feat] Fase C.4 — timezone unificado: nuevo `src/lib/utils/datetime.ts` con helpers Panamá-safe; refactor de format.ts, calendario/page.tsx, notifications/actions.ts. Cubre N_R2_3, N_R2_4, N_R3_1, N_R3_3, N_R3_14, N4. `28cdb4d`
- [bd] Fase B.1 completa (staging) — audit BD aplicado en 4 bloques vía Supabase SQL Editor:
  - Bloque 1.A: RLS habilitada en 22 tablas (21 del subsystem equipment/workshop/procurement + `equipment_assemblies`) con policy `admin_all` baseline. BD-C1 cerrado.
  - Bloque 1.B: `ALTER FUNCTION ... SET search_path` en 7 funciones flagged (`enforce_qty_integrity`, `cascade_request_status`, `complete_pickup_trip`, `update_equipment_location_on_delivery`, `update_equipment_location_on_custody_transfer`, `generate_internal_asset_tag`, `log_equipment_status_change`). BD-C3 cerrado.
  - Bloque 1.C: `audit_log.read_all` reemplazada por `admin_read` — cierra leak de PII histórica. BD-F9 cerrado.
  - Bloque 2.A: Trigger `enforce_line_add_delete_only_in_borrador` en `sm_request_lines` — enforza la regla "no add/delete líneas después de Enviada" a nivel BD. BD-F7 cerrado.
  - Bloque 2.B: Trigger `enforce_trip_immutable_post_departure` en `trips` — bloquea cambios de vehicle/driver/trailer en trips En Ruta/Completado/Cancelado. N_R2_1 cerrado.
  - Bloque 2.C: 4 CHECK constraints duros en `sm_request_lines` (`qty_positive`, `qty_delivered_nonneg`, `qty_scheduled_nonneg`, `qty_invariant`) — el invariante combinado qty_scheduled+qty_delivered<=quantity es nuevo a nivel BD (trigger enforce_qty_integrity lo validaba por columna pero no combinado). BD-X1 cerrado. Data repair pre-aplicado sin violaciones en staging.
  - Bloque 3: 10 indexes FK en tablas core (`sm_request_lines`, `trips`, `trip_events`, `trip_event_lines`, `delivery_observations`). BD-H1 cerrado.
  - Bloque 4: Storage `attachments` policies `authenticated_upload` y `authenticated_update` ahora validan MIME type + tamaño ≤ 10MB contra `metadata`. BD-S1 parcial cerrado (fix stretch path-ownership + delete via API queda para Fase C).
- [audit] Audit extensivo consolidado (código + BD) — 3+ rondas de hallazgos, ~65 items accionables, fases A–F documentadas en plan. Nuevos hallazgos BD: 22 tablas con RLS disabled, 7 funciones con search_path mutable, 12 FKs sin índice en core tables. Plan guardado para ejecución por fases.
- [chore] X0 (middleware huérfano) descartado — `proxy.ts` es la convención correcta en Next.js 16, `middleware.ts` deprecado. Verificado con build real.
- [fix] Fase A.1 — handlePickup idempotencia + N8 + M6. INSERT trip_events como checkpoint con event_id pre-generado en PickupModal. Retry bajo red mala retorna early sin duplicar qty_delivered. Throw en trip_event_lines failure. notifyEntregaConfirmada loop por cada línea. (e232777)
- [fix] Fase A.2 — handleDelivery race + M6. Fresh SELECT de `trip_line_assignments.qty_delivered` antes del UPDATE para reducir race window bajo entregas concurrentes. notifyEntregaConfirmada loop por cada línea (mismo fix M6). Race completo requiere RPC atómica en Fase B. (a384f99)
- [feat] Fase A.3 — handleRevert branch Retiro (N1 fix). Espejo de Entrega para revertir qty_delivered/qty_scheduled/status, más rollback del trip de Completado a En Ruta. Antes el revert solo insertaba el Reversion event sin tocar la BD — ahora deshace todo. TODO: verificar body de complete_pickup_trip en Fase B.0 por si setea otros campos. (328810e)
- [fix] Fase A.4 — handleParada throw + handlePreparation idempotency (N7 + N9). Parada ahora throw en trip_event_lines failure (antes silencioso). PreparationModal expone event_id pre-generado; handlePreparation usa checkpoint pattern con 23505 early return. (5c3bdd0)
- [test] Fase A.5 — pickup-flow.spec.ts. Tests E2E para validar A.1, A.3, A.4: happy path Preparación → Retiro completa el trip + qty actualizadas; revert Retiro recalcula qty_delivered + trip vuelve a En Ruta + Reversion event. Helpers nuevos: registerPreparation, registerRetiro. (760d785)

## 2026-04-13
- [fix] handleRevert Entrega: status dinámico (Parcial si aún hay qty_delivered > 0, no hardcode 'En Transito'); delivered_at condicional.
- [fix] handleRevert Retorno: NO limpia actual_arrival (era bug — ese campo pertenece a Llegada).
- [feat] Dashboard widget "Entregas pendientes" visible para todos los roles (antes solo logistica/admin). Cancelar línea sigue gated a logistica/admin.
- [refactor] Event system — Retorno no-op (no toca cantidades), guard dialog cuando hay líneas En Transito, ConfirmDialog component reusable.
- [feat] Dashboard widget "Entregas pendientes en viajes cerrados" — listado accionable con Registrar Entrega tardía o Cancelar línea + razón.
- [feat] Entrega tardía — mis-viajes/[id] soporta action=Entrega en URL y botón "Registrar Entrega Tardía" visible en trips Completados con líneas En Transito.
- [fix] handleDispatch + handleDelivery idempotentes — INSERT trip_events con UUID pre-generado como checkpoint; retry bajo red mala retorna early sin duplicar cantidades.
- [fix] (main/prod) Entrega parcial resta qtyThisTrip, no quantity_assigned — evita qty_scheduled inflada (b7ebf1a)
- [feat] DispatchModal role-based editing — campo solo confirma, logistica/admin editan vehículo/conductor/líneas/cantidades. Defensive override en handleDispatch para rol campo.

## 2026-04-09
- [fix] Calendar shows ALL items independent of table pagination + default collapsed (20f98d6) — cherry-picked to main/production
- [fix] Quitar columna Remolque + Tarifa solo precio con tooltip en tabla programación (b97a83d)
- [feat] Sentry error monitoring con source maps y session replay (15d3a3e)
- [feat] E2E test suite — 12 files, 100+ tests con Playwright (af9be5e → 638cf72)

## 2026-04-08
- [feat] Parada Level 1 — intermediate stop event for supplier pickups (446b0c7)
- [fix] AD-4 — PM cannot see confirmation code on pickup trips (6b92458)
- [fix] Remove pickup radio from solicitud form — decided at programming level (2faf6e2)
- [fix] 2 bugs found in code audit — Parada error handling + saveTrip busyRef (e936e5b)
- [chore] Finalize workflow — clean reference docs, simplify CLAUDE.md (0e759cb)
- [chore] Simplify docs workflow — CHANGELOG + BACKLOG replace 4 stale files (e664838)
- [bd-pending] Crear tabla custody_transfers (vacía, con función sin trigger activo). Ver prompt abajo.

## 2026-04-06
- [docs] Audit cleanup — fix refs, reduce context bloat, sync 17 days of docs (f7e5683)
- [fix] Include En Transito lines in backlog for partial scheduling (697af3e)

## 2026-04-01
- [fix] Audit #2 — busyRef finally, notifyRetorno PMs, deliveredQuantities dead code, Retorno filter, suggestions error log, qty_scheduled clamp (7302a7c)
- [fix] Audit #1 — qty_dispatched reset on Retorno, terminal status guard, orphan trip cleanup, cron Bearer-only, Math.min clamp, eventError rename, PII dev-only logs (84b305c)

## 2026-03-25
- [fix] 8 pre-production issues — event revert qty, Retorno undelivered lines, notification placeholders, registerEvent guards, fulfillment_type preserved, viaje_editado eventType, entrega receiver name, Llegada revertible (296f2cf)
- [fix] Filter reverted events from has* checks, show qty_dispatched, timeline detail (54a44db)

## 2026-03-24
- [feat] Batch 11 — dashboard En Tránsito, pickup badges, 2 new notifications (c3216e0)
- [feat] Batch 10 — self-pickup flow with Preparation and Pickup modals (ed58c67)
- [feat] Batch 9 — event reversion + bulkRequiresCode fix (ebc6dce)
- [feat] Batch 8 — DeliveryModal with per-line status, trip_event_lines, conditional code (a6e5b48)
- [feat] Batch 7 — editable DispatchModal replaces simple Salida confirmation (1f9c1e9)
- [fix] React error #310 — useEffect before early returns, Suspense wrapper (e001512, b14ba4c, dfc605b)
- [fix] Missing fields in LineWithRelations, SolicitudWithRelations (a267467)

## 2026-03-23
- [feat] Batch 6 — fulfillment_type, requires_code, receiver per line (aeb14ea)
- [feat] Batch 5 — sub-status operativo, banner entrega, shortcuts, URL params (f821946)

## 2026-03-21
- [fix] Retorno button available after Salida without requiring Entrega (8de9637)
- [fix] Timezone America/Panama in salida and retorno notifications (8511124)
- [fix] PM role only sees Entrega and Incidencia buttons (3cba071)
- [fix] Allow PM role to register trip events (fe305f9)
- [fix] Skip alerta diaria urgentes on Sundays (658eebc)
- [fix] Cron auth — exclude /api/cron from middleware (e3241ef, 1dfa9f5)

## 2026-03-20
- [feat] 2 notificaciones urgentes — alerta inmediata + cron diario (5594728)
- [feat] Notification preferences — filtrado por prefs + admin UI tab (f90abe5)

## 2026-03-19
- [feat] Password reset flow — forgot-password, auth/confirm, change-password, proxy.ts, login link (f981c70→43ee9fc)

## 2026-03-18
- [docs] Reestructuración docs — CLAUDE.md fijo, skills con frontmatter, refs actualizadas (554f61b)
- [fix] Charris notificaciones — agregar a 1-3,9-12 (2153593, 68cd569)

## 2026-03-17
- [feat] Paginación server-side solicitudes + client-side viajes/admin (81b9deb)
- [feat] Filtro de fechas con rango Desde/Hasta (641b90a)
- [fix] DataTable expand/collapse controlled state (1b7e080)
- [fix] Bugs UX batch — loop infinito, layout line card, time picker (d3933fe, 49cb4c2)
- [feat] Renombrar Viaje → Movilización en toda la UI (0eae231)

## 2026-03-15
- [feat] File attachments — storage helper, FileUploader, FileDisplay (83b6977→f0a84d6)
- [feat] Columna Fecha Enviada en lista solicitudes (4f7dd68)

## 2026-03-12
- [feat] Entregas parciales — qty_delivered acumulado, backlog Parcial, guard Salida (38854f6→3bde6e9)
- [fix] Bugs #18-27 — timezone, días completadas, KPI, En Transito acento, receptores (6249867→7de6658)
- [feat] Prioridad eliminada de UI — columna Días es suficiente (d17771f)
- [feat] Admin mode sin restricciones — editar cualquier estado (86a222c)
- [feat] Extras en cascada + Admin Masters 6 tabs CRUD (5d7a6fb, 67875dd)

## BD changes (via Claude Chat — no en código)
- [bd] 2026-03-20: notification_preferences JSONB + prefs para 14 usuarios
- [bd] 2026-03-18: auth.users fields NULL→'' para 16 usuarios
- [bd] 2026-03-17: DB expansion 22→44 tablas, equipment 12 cols + auto-tag
- [bd] 2026-03-15: Storage bucket attachments + 4 RLS policies
- [bd] 2026-03-15: Email notifications — generate_request_id/trip_id SECURITY DEFINER
- [bd] 2026-03-12: RLS sm_request_lines operational_update, cascade_request_status fix
- [bd] 2026-03-12: trip_line_assignments.qty_delivered, cascade Parcial fix
- [bd] 2026-03-09: received_by_id, generate_confirmation_code trigger, generate_full_code dashes
