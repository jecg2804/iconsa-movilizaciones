# Cambio 6.5 — Refinamiento del modelo de eventos (Events V2) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corregir la semántica del trigger `recalc_qty_for_line` para que entregas con líneas rechazadas liberen al backlog en el momento de la Entrega (no en Retorno). Dar efecto operacional real al `line_status='rejected'` vía nueva columna `qty_rejected` y triggers BD de sincronización (forward + reverse). Reescribir H1 con 3 condiciones de bloqueo. Migrar mutación de `qty_delivered`/`qty_rejected` de frontend a BD. Cleanup de código muerto post-Cambio 5.

**Architecture:** BD es fuente única de verdad de la mutación de assignments. El frontend solo registra eventos (`trip_events` + `trip_event_lines`); triggers BD sincronizan derivados (forward via INSERT en `trip_event_lines`, reverse via INSERT en `trip_events` con `reverts_event_id`). `recalc_qty_for_line` reescrita con orden Entregada > En Tránsito > Parcial > Programada > Pendiente y branch defensivo para preservar `'Cancelada'`. Frontend pierde toda la lógica de mutación duplicada (era razón de race conditions y drift); queda como capa de presentación + validación user-facing.

**Tech Stack:** PostgreSQL (Supabase staging `vonwkciosksqspyljzfy`), Next.js 16 App Router + TypeScript, Playwright E2E. Migration aplicada por Chat via Supabase MCP (Code es read-only en BD per `.claude/rules/supabase-readonly.md`).

**Spec referencia:** `Docs/superpowers/specs/2026-04-30-cambio6-5-event-model-refinement.md` (commit `b323de7`).

---

## Task graph y dependencias

```
T1 (CHANGELOG [bd-pending] + PARADA Chat)
 ↓
T2 (regen types)
 ↓
T3 (tests RED) ─┐
                │
T4-T7 (FE) ─────┤
                │
T8 (cleanup) ───┤
                ↓
T9 (suite verde — check regression Cambio 6 + 6.5)
 ↓
T-final (smoke manual James)

T10 (BACKLOG entries) y T11 (deployment plan) son independientes — pueden hacerse paralelo a T3-T8.
```

---

## Task 1: [bd-pending] entry en CHANGELOG con migración consolidada

**Goal:** Crear entry `[bd-pending]` en `Docs/CHANGELOG.md` con SQL completo de la migración consolidada `cambio6_5_event_model_refinement` + las 4 pre-merge queries. Code escribe, James notifica a Chat, Chat aplica via Supabase MCP en staging, marca `[bd]` y commit. Esta task es bloqueo PARADA.

**Files:**
- Modify: `Docs/CHANGELOG.md` (agregar entry bajo header `## 2026-04-30`)

**Acceptance Criteria:**
- [ ] Entry `[bd-pending]` agregado con título "Cambio 6.5 — refinamiento del modelo de eventos"
- [ ] Las 4 pre-merge queries listadas literal (copy desde spec)
- [ ] SQL completo de la migración consolidada (10 items BD-1 a BD-10) en una sola transacción `BEGIN; ... COMMIT;`
- [ ] Cuerpo completo de las 7 funciones (BD-4, BD-5, BD-6, BD-7, BD-8, BD-10) — copy literal del spec sección "Diseño detallado"
- [ ] Rollback SQL incluido
- [ ] PARADA explícita: "Chat aplica en staging via Supabase MCP. Después regresar para T2."

**Verify:** Entry visible en `Docs/CHANGELOG.md` con `[bd-pending]`. Una vez Chat aplique, marker cambia a `[bd]` y agrega confirmación post-aplicación (timestamp, version migration).

**Steps:**

- [ ] **Step 1: Leer spec y extraer SQL completo de las 7 funciones**

Leer secciones BD-4 a BD-10 de `Docs/superpowers/specs/2026-04-30-cambio6-5-event-model-refinement.md`. Copiar el SQL literal (sin modificar nombres, parámetros, ni comentarios — son source of truth).

- [ ] **Step 2: Escribir entry [bd-pending] en CHANGELOG.md**

Agregar al inicio (bajo header `## 2026-04-30`, fecha más reciente arriba):

````markdown
## 2026-04-30

- [bd-pending] **Cambio 6.5 — refinamiento del modelo de eventos: migración consolidada `cambio6_5_event_model_refinement`.** PARADA: Chat aplica via Supabase MCP en staging (`vonwkciosksqspyljzfy`) tras correr las 4 pre-merge queries (deben retornar 0 rows). Pendiente prod en merge final v2 unificado (post-Cambio 6.5 implementación + smoke OK).

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

  **Migración consolidada (1 transacción):**

  ```sql
  BEGIN;

  -- BD-1: ADD COLUMN qty_rejected en trip_line_assignments
  ALTER TABLE trip_line_assignments ADD COLUMN qty_rejected NUMERIC NOT NULL DEFAULT 0;

  COMMENT ON COLUMN trip_line_assignments.qty_rejected IS
    'Cantidad rechazada en sitio durante Entrega (line_status=rejected). Se preserva como dato histórico junto con qty_dispatched. Suma con qty_delivered debe ser ≤ qty_dispatched.';

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

    IF v_current_status = 'Cancelada' THEN
      RETURN;
    END IF;

    SELECT
      COALESCE((SELECT SUM(qty_delivered) FROM trip_line_assignments WHERE request_line_id = p_request_line_id), 0) +
      COALESCE((SELECT SUM(qty_delivered) FROM pickup_order_lines WHERE request_line_id = p_request_line_id), 0) +
      COALESCE((SELECT SUM(qty_delivered) FROM external_order_lines WHERE request_line_id = p_request_line_id), 0)
    INTO v_qty_delivered_total;

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

    IF NEW.quantity > OLD.quantity THEN
      RETURN NEW;
    END IF;

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

  **Aplicar en:** staging primero (BD wipeada en Cambio 6, las 4 pre-merge queries deben dar 0). Para prod en merge final v2 unificado: aplicar las 4 pre-merge queries; si retornan rows → entender el caso primero; aplicar migración. Spec: `Docs/superpowers/specs/2026-04-30-cambio6-5-event-model-refinement.md` (commit `b323de7`). Plan: `Docs/superpowers/plans/2026-04-30-cambio6-5-event-model-refinement.md`.
````

- [ ] **Step 3: Commit**

```bash
git add Docs/CHANGELOG.md
git commit -m "$(cat <<'EOF'
docs: T1 Cambio 6.5 — [bd-pending] migración consolidada cambio6_5_event_model_refinement

Entry [bd-pending] con SQL completo de la migración consolidada (10 items
BD-1 a BD-10 en una transacción) + 4 pre-merge queries + rollback. PARADA
para que Chat aplique en staging via Supabase MCP.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 4: PARADA — esperar confirmación de Chat**

Notificar a James: *"T1 listo. Entry [bd-pending] commiteada. Por favor pasarle a Chat la migración para que la aplique en staging via Supabase MCP. Cuando Chat confirme aplicación + marque [bd], avísame y procedo con T2."*

---

## Task 2: Regenerar types post-aplicación BD

**Goal:** Regenerar `src/lib/types/database.ts` desde staging para que `qty_rejected` (BD-1) aparezca en los tipos generados de `trip_line_assignments`.

**Files:**
- Modify: `src/lib/types/database.ts` (regenerado completo)

**Acceptance Criteria:**
- [ ] `qty_rejected: number` aparece en Row/Insert/Update de `trip_line_assignments`
- [ ] Helper manual `Row<T>` re-appendeado (gen types lo wipea — patrón conocido del proyecto)
- [ ] No `npm warn exec...` líneas en el archivo (limpieza post-comando)
- [ ] `npm run build` pasa sin errores de tipos

**Verify:** `npm run build` → exit code 0.

**Steps:**

- [ ] **Step 1: Regenerar types desde staging**

```bash
npx supabase gen types typescript --project-id vonwkciosksqspyljzfy > src/lib/types/database.ts
```

- [ ] **Step 2: Verificar qty_rejected presente**

```bash
grep -n "qty_rejected" src/lib/types/database.ts
```

Expected: matches en Row/Insert/Update de trip_line_assignments (3 ocurrencias mínimo).

- [ ] **Step 3: Re-appendear helper Row<T> manual**

Patrón conocido: `npx supabase gen types` borra el helper. Verificar el final del archivo y re-añadir si falta:

```typescript
// Helper manual — re-añadido post-regen (gen types lo wipea)
export type Row<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
```

- [ ] **Step 4: Limpiar líneas espurias del comando**

`npx supabase gen types` a veces deja `npm warn exec ...` al inicio del archivo. Verificar y borrar manualmente si aparecen.

- [ ] **Step 5: Run build**

```bash
npm run build
```

Expected: exit 0, sin errores TS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/types/database.ts
git commit -m "$(cat <<'EOF'
chore: T2 Cambio 6.5 — regen types post-migración (qty_rejected en trip_line_assignments)

Tipos regenerados contra staging (vonwkciosksqspyljzfy) post-aplicación
de migración cambio6_5_event_model_refinement. qty_rejected NUMERIC
NOT NULL DEFAULT 0 visible en Row/Insert/Update de trip_line_assignments.
Helper Row<T> manual re-appendeado. Build verde.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Tests híbridos (5 E2E + 8 BD-direct) — escribir RED phase

**Goal:** Crear los 13 tests del spec divididos en 2 archivos: 5 tests E2E (UI completa) en `tests/cambio6-5-event-refinement.spec.ts` + 8 tests BD-direct (INSERT/UPDATE directo) en `tests/cambio6-5-bd-triggers.spec.ts`. División proporcional al riesgo: el riesgo está en (a) integración FE↔BD post-FE-1/FE-2, y (b) flows nuevos UI; resto es lógica BD aislada.

**Por qué híbrido y no todo E2E:** los CHECKs y triggers BD nuevos son lógica autónoma que no necesita pasar por login + crear solicitud + crear trip + dispatch para verificarse. Test BD-direct corre en 2-5s vs 60-90s E2E. Pero los tests que verifican que el FE delega correctamente al BD (post-FE-1/FE-2 borraron UPDATE manual) DEBEN pasar por UI — sino el bug "olvidé borrar el UPDATE manual" pasa silente.

**Files:**
- Create: `tests/cambio6-5-event-refinement.spec.ts` (5 tests E2E)
- Create: `tests/cambio6-5-bd-triggers.spec.ts` (8 tests BD-direct)
- Modify: `tests/helpers.ts` (extensión registerEntrega para Test 3 y Test 5)

**Acceptance Criteria:**
- [ ] 5 tests E2E + 8 BD-direct = 13 total
- [ ] E2E: cleanup obligatorio con `cleanupSolicitud(solicitudId)` en `afterEach`
- [ ] BD-direct: cleanup propio en `afterEach` (ROLLBACK no aplica porque cada operación es una transacción separada — usar `cleanupSolicitud` o `db.from(...).delete()` explícito de las filas insertadas)
- [ ] Imports siguen patrón de tests existentes
- [ ] Tests escritos en español neutro Panamá
- [ ] Helper extendido `registerEntrega(page, opts)` acepta nuevo opt `lines: [{ lineIndex, status: 'ok' | 'rejected' | 'with_observations', qty? }]` para Test 3 (entrega mixta). Lectura previa de DeliveryModal.tsx OBLIGATORIA — armar helper basado en selectores reales, NO inventar
- [ ] Helper nuevo `closeTrip(tripId)` para Test 9 (registra Retorno → trip Completado)

**Verify:** 
```bash
npx playwright test cambio6-5-event-refinement cambio6-5-bd-triggers --list
```
Expected: 13 tests listados (5 + 8).

### Distribución 5 E2E + 8 BD-direct

**E2E (UI completa):**

| # | Test | Por qué E2E |
|---|------|-------------|
| 1 | `entrega_ok_parcial_lleva_a_parcial_inmediato` | Cubre FE-1 + BD-5 + BD-4 en path real. Si FE-1 deja UPDATE manual → doble incremento detectable acá |
| 3 | `entrega_mixta_ok_rejected_libera_solo_rejected` | Reproductor literal del bug MOV-2026-058. Tiene que pasar por UI completa para dar confianza de fix |
| 5 | `entrega_with_observations_requiere_notas` | Validación frontend que bloquea submit (FE-4). BD-direct no aplica — la BD ya tiene BD-10, lo que probamos acá es FE-4 |
| 7 | `revert_entrega_revierte_qty_delivered_y_qty_rejected` | Cubre FE-2 + BD-6 en path real |
| 9 | `revert_entrega_en_trip_cerrado_bloqueado` | Mensaje user-facing FE-3 + BD-8 backstop. Verificar UX requiere UI |

**BD-direct (INSERT/UPDATE directo + verificar resultado):**

| # | Test | Approach BD-direct |
|---|------|--------------------|
| 2 | `entrega_rejected_libera_al_backlog` | Setup: insert solicitud + trip + assignment con qty_dispatched=5. Insert trip_event + trip_event_lines con line_status='rejected', qty=5. Verificar: assignment.qty_rejected=5, qty_delivered=0; línea.status='Pendiente' |
| 4 | `entrega_with_observations_inserta_observation` | Setup similar. Insert con line_status='with_observations'. Verificar: trigger BD-5 actualiza qty_delivered. (delivery_observations es responsabilidad del frontend, no del trigger — cubierto en E2E #5) |
| 6 | `retorno_no_modifica_lineas` | Setup: trip con Entrega ya completada. Snapshot BD. Insert trip_event(event_type='Retorno', notes='...') manual. Verificar snapshot líneas/assignments idéntico, solo trip.status='Completado' |
| 8 | `revert_doble_del_mismo_evento_bloqueado` | Setup: trip con Entrega registrada. Insert primer revert (trip_event con reverts_event_id). Insert segundo revert con mismo reverts_event_id. Esperar PostgrestError code='23505' (UNIQUE INDEX BD-9) |
| 10 | `edit_quantity_permitido_post_envio_pre_salida` | Setup: solicitud Enviada + trip Programado (assignment quantity_assigned=8) sin Salida. UPDATE sm_request_lines.quantity de 10 a 8. Esperar éxito |
| 11 | `edit_quantity_bloqueado_por_qty_dispatched` | Setup: trip con Salida (qty_dispatched=10). UPDATE quantity de 10 a 5. Esperar PostgrestError "cantidad ya despachada" (H1 condición 1) |
| 12 | `edit_quantity_bloqueado_por_qty_delivered` | Setup: trip con Entrega parcial (qty_delivered=4). UPDATE quantity de 10 a 3. Esperar "cantidad ya entregada" (H1 condición 2) |
| 13 | `edit_quantity_aumentar_siempre_permitido` | Setup: cualquier estado. UPDATE quantity +5. Esperar éxito sin importar dispatched/delivered |

### Helper extensions (modificar `tests/helpers.ts`)

**Lectura previa OBLIGATORIA:** antes de escribir helpers nuevos, leer `src/components/viajes/DeliveryModal.tsx` para entender selectores reales (probablemente dropdown o radio per línea con `data-testid` específicos). NO inventar selectores.

**Nuevo overload `registerEntrega`:**

```typescript
// Firma actual (NO romper):
export async function registerEntrega(
  page: Page,
  opts: { receiverName?: string; confirmationCode?: string },
)

// Firma extendida (agregar opcionales):
export async function registerEntrega(
  page: Page,
  opts: {
    receiverName?: string
    confirmationCode?: string
    // Nuevo: per-line status. Si se omite, todas las líneas quedan 'ok'.
    // lineIndex es 0-based dentro del modal.
    lines?: Array<{ lineIndex: number; status: 'ok' | 'rejected' | 'with_observations'; qty?: number }>
    // Nuevo: notas a nivel del evento (requeridas si hay with_observations)
    notes?: string
    // Nuevo: para Test 5 — flag para verificar que submit queda disabled cuando notes vacías + with_observations
    expectSubmitBlocked?: boolean
  },
)
```

Si `lines` se omite, comportamiento actual (todo ok). Si se provee, iterar selectores per-línea según el JSX real.

**Helper nuevo `closeTrip(tripId)`:**

```typescript
// Para Test 9: cerrar trip via UI (registrar Retorno) para que quede 'Completado'.
// Asume el page ya está en /mis-viajes/{tripId}.
export async function closeTrip(page: Page, tripId: string) {
  await openTripDetail(page, tripId)
  await registerRetorno(page)
  // Verificar BD: trip.status='Completado'
  const { data } = await db.from('trips').select('status').eq('id', tripId).single()
  if (data?.status !== 'Completado') {
    throw new Error(`closeTrip: trip ${tripId} sigue en status ${data?.status}, esperado 'Completado'`)
  }
}
```

**Steps:**

- [ ] **Step 1: Leer DeliveryModal.tsx para selectores reales**

```bash
grep -n "data-testid\|line_status\|with_observations\|<select\|<input" src/components/viajes/DeliveryModal.tsx | head -40
```

OBLIGATORIO antes de extender `registerEntrega`. Identificar selectores por línea (probablemente `data-testid` con índice o `getByRole`). Documentar en comentarios del helper qué selectores usa y por qué.

- [ ] **Step 2: Extender `registerEntrega` y crear `closeTrip` en `tests/helpers.ts`**

Mantener firma actual sin romper tests existentes. Agregar opcionales `lines: [{ lineIndex, status, qty? }]`, `notes`, `expectSubmitBlocked` según sección "Helper extensions" del header del Task. Crear `closeTrip(page, tripId)` que registra Retorno y verifica trip.status='Completado'.

Verificar que tests existentes (Cambio 6) siguen verde tras la extensión:

```bash
npx playwright test entrega-complete --list
```

Expected: 1+ tests listados. Si falla porque cambió la firma, revertir y rediseñar el overload.

- [ ] **Step 3: Crear `tests/cambio6-5-event-refinement.spec.ts` con 5 tests E2E**

Tests #1, #3, #5, #7, #9 según tabla de la sección "Distribución 5 E2E + 8 BD-direct" del header. Cada test:

1. `await login(page)`
2. `const { dbId, displayId } = await createSolicitud(page, { project, lines, costCode })` — usar firma REAL del helper (verificar `tests/helpers.ts:66-93`)
3. Setup adicional: query lineIds desde BD usando dbId (helper no los retorna)
4. `const { dbId: tripId, confirmationCode } = await createTrip(page, { solicitudId: dbId })` — pasar `solicitudId` para evitar collision
5. Operaciones según test (dispatch, registerEntrega con lines per-line, etc.)
6. Verificar BD con `db.from('table').select(...).eq(...)` — NUNCA `db('SQL', [params])`
7. Cleanup en `afterEach` con `cleanupSolicitud(solicitudId)`

Imports siguiendo patrón de `tests/entrega-complete.spec.ts`. Mensajes/comentarios en español neutro Panamá.

- [ ] **Step 4: Crear `tests/cambio6-5-bd-triggers.spec.ts` con 8 tests BD-direct**

Tests #2, #4, #6, #8, #10, #11, #12, #13 según tabla. Cada test:

1. Setup BD-direct vía `db.from(...).insert(...)` (skip UI completamente)
   - Crear sm_request, sm_request_lines, trip, trip_line_assignments según necesidad
   - Estado inicial específico al test (ej: trip con qty_dispatched=10 si test es de dispatched-bound)
2. Operación bajo test: INSERT trip_event + trip_event_lines, o UPDATE quantity, etc.
3. Verificar resultado con `db.from(...).select(...)`
4. Para tests que esperan error (8, 11, 12): catch `PostgrestError` y verificar `error.code` ('23505') o `error.message` (regex de mensaje BD)
5. Cleanup en `afterEach` con `cleanupSolicitud(dbId)` o `db.from(...).delete()` explícito de las filas

Patrón de cleanup OBLIGATORIO — tests de Cambio 6 dejaron 33 solicitudes huérfanas por falta de cleanup. NO repetir.

Ejemplo de setup BD-direct (referencia, no copy literal):

```typescript
const { data: req } = await db.from('sm_requests').insert({
  request_id: `26-506-SM-T${Date.now() % 1000}`,
  project_id: '<uuid>',
  // ... resto de columnas requeridas
}).select('id').single()

const { data: line } = await db.from('sm_request_lines').insert({
  request_id: req.id,
  description: 'Test BD-direct',
  quantity: 10,
  // ...
}).select('id').single()

// ... etc
```

NO inventar columnas — leer schema actual via `src/lib/types/database.ts` (tipos generados post-T2).

- [ ] **Step 5: Verificar listado de los 13 tests**

```bash
npx playwright test cambio6-5-event-refinement cambio6-5-bd-triggers --list
```

Expected: 13 tests listados (5 + 8). Si menos, falta alguno; si más, hay duplicación.

- [ ] **Step 6: NO correr verde aún — espera T9**

Los tests E2E pueden fallar parcialmente hasta que FE-1 a FE-4 (T4-T7) eliminen el doble UPDATE y agreguen guards. Tests BD-direct deberían pasar verde desde el inicio (BD ya está aplicada en T1).

- [ ] **Step 7: Commit**

```bash
git add tests/cambio6-5-event-refinement.spec.ts tests/cambio6-5-bd-triggers.spec.ts tests/helpers.ts
git commit -m "$(cat <<'EOF'
test: T3 Cambio 6.5 — 13 tests híbridos (5 E2E + 8 BD-direct)

División proporcional al riesgo (Opción B aprobada por James):
- 5 E2E (cambio6-5-event-refinement.spec.ts): tests #1, #3, #5, #7, #9 —
  cubren integración FE↔BD post-FE-1/FE-2 y flows nuevos UI
- 8 BD-direct (cambio6-5-bd-triggers.spec.ts): tests #2, #4, #6, #8,
  #10-13 — verifican lógica BD pura sin UI overhead

Helpers extendidos: registerEntrega acepta opt nuevo lines: [{lineIndex,
status, qty?}] para entrega mixta (Test 3, reproductor del bug
MOV-2026-058). closeTrip helper nuevo para Test 9.

Cleanup obligatorio en afterEach (E2E + BD-direct). Tests de Cambio 6
dejaron 33 solicitudes huérfanas; no repetir.

Tests RED phase para los E2E hasta T9. BD-direct pueden ya estar verde
(BD aplicada en T1).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```


## Task 4: FE-1 — Eliminar UPDATE manual qty_delivered en handleDelivery

**Goal:** El sync trigger BD-5 ya actualiza `qty_delivered`/`qty_rejected` en `trip_line_assignments` automáticamente al INSERT de `trip_event_lines`. Eliminar el código duplicado del frontend (`mis-viajes/[id]:729-743`) que hacía `UPDATE qty_delivered += quantity` manualmente — ese doble UPDATE generaría incrementos duplicados.

**Files:**
- Modify: `src/app/(app)/mis-viajes/[id]/page.tsx` (líneas ~729-743 — el bloque de UPDATE manual)

**Acceptance Criteria:**
- [ ] El bloque de SELECT fresco + UPDATE qty_delivered en handleDelivery está eliminado
- [ ] handleDelivery sigue insertando trip_events + trip_event_lines + delivery_observations (esos sí siguen)
- [ ] handleDelivery sigue ejecutando el UPDATE de delivered_at (el trigger no setea ese campo desde frontend — hace el cálculo en recalc_qty_for_line)
- [ ] handleDelivery sigue disparando notificaciones (notifyEntregaConfirmada, notifySolicitudCompletada)
- [ ] `npm run build` pasa

**Verify:** `npm run build` exit 0. Manual: registrar Entrega de 1 línea, verificar en BD que `qty_delivered` se incrementó UNA VEZ (no doble).

**Steps:**

- [ ] **Step 1: Leer el bloque actual de handleDelivery**

```bash
grep -n "handleDelivery\|qty_delivered" src/app/\(app\)/mis-viajes/\[id\]/page.tsx | head -30
```

Localizar las líneas exactas (~729-743) que hacen:
- `SELECT qty_delivered FROM trip_line_assignments WHERE ...`
- `UPDATE trip_line_assignments SET qty_delivered = ... WHERE ...`

- [ ] **Step 2: Eliminar el bloque de UPDATE manual**

Remover las líneas que hacen el SELECT fresco + UPDATE qty_delivered. Mantener:
- INSERT trip_events
- INSERT trip_event_lines (el trigger BD-5 dispara desde acá)
- INSERT delivery_observations
- UPDATE delivered_at (si la línea pasó a Entregada — el trigger BD-4 ya lo hace internamente, pero verificar que el setting desde frontend no rompe nada — más seguro eliminarlo también)
- Notificaciones

**Verificación importante:** después del INSERT a `trip_event_lines`, el sync trigger BD-5 dispara automáticamente, y luego el UPDATE de `trip_line_assignments` dispara `recalc_qty_for_line` (BD-4) que actualiza el status + delivered_at de la línea. El frontend NO necesita hacer nada manual con qty_delivered ni delivered_at.

- [ ] **Step 3: Verificar imports — eliminar imports huérfanos si quedan**

```bash
grep -n "import" src/app/\(app\)/mis-viajes/\[id\]/page.tsx | head -20
```

Si algún import era usado solo por el bloque eliminado, removerlo.

- [ ] **Step 4: Build**

```bash
npm run build
```

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/mis-viajes/\[id\]/page.tsx
git commit -m "$(cat <<'EOF'
refactor: T4 Cambio 6.5 — FE-1 eliminar UPDATE manual qty_delivered en handleDelivery

El sync trigger BD-5 (sync_assignment_on_delivery_event) ahora actualiza
qty_delivered/qty_rejected automáticamente al INSERT de trip_event_lines.
Eliminar el bloque duplicado del frontend que generaría doble incremento.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: FE-2 — Eliminar decremento manual qty_delivered en handleRevert

**Goal:** El sync trigger BD-6 (`sync_assignment_on_delivery_revert`) ahora revierte `qty_delivered`/`qty_rejected` automáticamente al INSERT de `trip_events` con `reverts_event_id NOT NULL`. Eliminar el branch `Entrega` de handleRevert que hacía decremento manual (`mis-viajes/[id]:887-930`).

**Files:**
- Modify: `src/app/(app)/mis-viajes/[id]/page.tsx` (branch `Entrega` de handleRevert, ~líneas 887-930)

**Acceptance Criteria:**
- [ ] handleRevert branch `Entrega` ya no decrementa `qty_delivered` manualmente
- [ ] handleRevert sigue insertando el evento `Reversion` con `reverts_event_id`
- [ ] El UPDATE de `delivered_at = null` en sm_request_lines ya no es necesario (recalc_qty_for_line lo maneja)
- [ ] Otros branches de handleRevert (Salida, Llegada, Retorno) sin cambios
- [ ] `npm run build` pasa

**Verify:** `npm run build` exit 0.

**Steps:**

- [ ] **Step 1: Leer branch Entrega actual de handleRevert**

```bash
grep -n "handleRevert\|case 'Entrega'\|qty_delivered" src/app/\(app\)/mis-viajes/\[id\]/page.tsx | head -30
```

Localizar el branch `case 'Entrega':` o equivalente que hace decremento.

- [ ] **Step 2: Reducir el branch Entrega a no-op (BD se encarga)**

El branch debe quedar mínimo: posiblemente solo el INSERT del evento Reversion + UPDATE local del estado UI. Sin tocar `trip_line_assignments.qty_delivered` ni `sm_request_lines.delivered_at`.

```typescript
// Branch Entrega — simplificado: BD-6 trigger se encarga de revertir qty_delivered/qty_rejected
case 'Entrega':
  // No-op a nivel frontend: el INSERT de trip_events con reverts_event_id (más arriba en handleRevert)
  // dispara el trigger sync_assignment_on_delivery_revert que revierte qty_delivered y qty_rejected
  // de los trip_line_assignments correspondientes. recalc_qty_for_line dispara cascada y actualiza
  // status + delivered_at de sm_request_lines.
  break
```

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/mis-viajes/\[id\]/page.tsx
git commit -m "$(cat <<'EOF'
refactor: T5 Cambio 6.5 — FE-2 eliminar decremento manual qty_delivered en handleRevert

El sync trigger BD-6 (sync_assignment_on_delivery_revert) revierte
qty_delivered/qty_rejected automáticamente al INSERT de trip_events
con reverts_event_id NOT NULL. handleRevert branch Entrega queda
no-op a nivel frontend.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: FE-3 — Guard frontend para revert Entrega en trip cerrado

**Goal:** Antes de enviar el INSERT del evento de Reversión al BD (que sería bloqueado por BD-8 con error genérico), el frontend chequea proactivamente si el trip está `'Completado'`/`'Cancelado'` y muestra un mensaje claro al usuario explicando el siguiente paso.

**Files:**
- Modify: `src/app/(app)/mis-viajes/[id]/page.tsx` (handleRevert, antes del INSERT del evento)

**Acceptance Criteria:**
- [ ] handleRevert chequea `trip.status` antes del INSERT cuando se está revirtiendo Entrega
- [ ] Si `trip.status IN ('Completado', 'Cancelado')`: mostrar toast/mensaje claro y abortar el revert sin INSERT
- [ ] Mensaje user-facing en español neutro Panamá: *"Este viaje ya fue cerrado. Para corregir esta entrega, primero revierte el Retorno desde la sección de eventos del viaje."*
- [ ] Si BD-8 dispara igual (defense-in-depth), el error visible es legible
- [ ] **Verificación enforcement español neutro:** `grep -nE "querés|podés|tenés|necesitás|registrá|tomá|verificá|ejecutá|mandá|confirmá" src/app/\(app\)/mis-viajes/\[id\]/page.tsx` → 0 matches en líneas tocadas por este task
- [ ] `npm run build` pasa

**Verify:** `npm run build` exit 0 + grep español neutro = 0 matches. Manual: cerrar trip con Retorno, intentar revertir Entrega, verificar que aparece el mensaje sin INSERT a BD.

**Steps:**

- [ ] **Step 1: Localizar handleRevert + el branch Entrega**

```bash
grep -n "handleRevert\|case 'Entrega'" src/app/\(app\)/mis-viajes/\[id\]/page.tsx | head
```

- [ ] **Step 2: Agregar guard antes del INSERT**

En handleRevert, antes del INSERT a `trip_events`, agregar:

```typescript
// FE-3 guard: revert Entrega solo en trip activo (defense-in-depth con BD-8)
if (revertEvent.event_type === 'Entrega' && (trip?.status === 'Completado' || trip?.status === 'Cancelado')) {
  toast.error(
    'Este viaje ya fue cerrado. Para corregir esta entrega, primero revierte el Retorno desde la sección de eventos del viaje.',
  )
  return
}
```

(Ajustar nombre del state `trip` y patrón `toast.error` según el código existente — verificar imports.)

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/mis-viajes/\[id\]/page.tsx
git commit -m "$(cat <<'EOF'
feat: T6 Cambio 6.5 — FE-3 guard frontend revert Entrega en trip cerrado

Defense-in-depth con BD-8. Antes del INSERT del evento Reversion,
chequea trip.status. Si Completado/Cancelado, muestra mensaje claro
en español neutro Panamá explicando el siguiente paso (revertir
Retorno primero).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: FE-4 — DeliveryModal validación notas required

**Goal:** Cuando el usuario marca alguna línea con `line_status='with_observations'`, el campo `notes` (a nivel del evento Entrega) pasa a ser requerido (mínimo 10 caracteres). Validación bloquea submit si no se cumple. BD-10 es defense-in-depth con un mensaje genérico; el frontend muestra mensaje user-friendly.

**Files:**
- Modify: `src/components/viajes/DeliveryModal.tsx` (función validate o handleSubmit)

**Acceptance Criteria:**
- [ ] Si alguna línea seleccionada tiene `status === 'with_observations'`, el campo notes muestra asterisco rojo y placeholder claro
- [ ] handleSubmit valida `notes.trim().length >= 10` cuando hay líneas con observations
- [ ] Mensaje de error visible en español neutro Panamá: *"Las notas son obligatorias (mínimo 10 caracteres) cuando alguna línea tiene observaciones."*
- [ ] Submit button disabled si validación falla
- [ ] **Verificación enforcement español neutro:** `grep -nE "querés|podés|tenés|necesitás|registrá|tomá|verificá|ejecutá|mandá|confirmá" src/components/viajes/DeliveryModal.tsx` → 0 matches
- [ ] `npm run build` pasa

**Verify:** `npm run build` exit 0 + grep español neutro = 0 matches. Manual: abrir DeliveryModal con línea, marcar `with_observations`, verificar que el botón submit queda disabled hasta que notes tenga ≥10 chars.

**Steps:**

- [ ] **Step 1: Leer DeliveryModal validate actual**

```bash
grep -n "validate\|handleSubmit\|with_observations" src/components/viajes/DeliveryModal.tsx | head
```

- [ ] **Step 2: Agregar validación en validate o handleSubmit**

```typescript
// FE-4 validación: notas required cuando hay líneas con observations
const hasObservations = lines.some((l) => l.status === 'with_observations')
if (hasObservations && notes.trim().length < 10) {
  setErrorMessage('Las notas son obligatorias (mínimo 10 caracteres) cuando alguna línea tiene observaciones.')
  return false
}
```

(Ajustar nombres de state — `notes`, `lines`, `setErrorMessage` — según código existente.)

- [ ] **Step 3: Visual hint en el campo notes**

Cuando `hasObservations === true`:
- Label del campo notes muestra `*` rojo
- Placeholder cambia a "Describe las observaciones (mín. 10 caracteres)"

- [ ] **Step 4: Build**

```bash
npm run build
```

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/components/viajes/DeliveryModal.tsx
git commit -m "$(cat <<'EOF'
feat: T7 Cambio 6.5 — FE-4 DeliveryModal valida notas required cuando hay observations

Cuando alguna línea seleccionada tiene line_status='with_observations',
el campo notes a nivel del evento pasa a ser requerido (mínimo 10
caracteres). Validación frontend bloquea submit con mensaje claro;
BD-10 es defense-in-depth con error genérico.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: CL-1 — Cleanup código muerto refs a 'Pickup Aprobado'/'Externo Aprobado'

**Goal:** Eliminar referencias muertas a los status `'Pickup Aprobado'` y `'Externo Aprobado'` que fueron eliminados en Cambio 5 pero el código aún tiene cases de switch y filtros que nunca se ejecutan. Reduce confusión para futuros desarrolladores.

**Files:**
- Modify: `src/lib/utils/format.ts` (cases en switch de statusContextString, ~líneas 173-179)
- Modify: `src/hooks/useSolicitudes.ts` (comentario obsoleto en línea ~927)
- Verificar con grep: si hay más refs, eliminar

**Acceptance Criteria:**
- [ ] `grep -r "Pickup Aprobado" src/` solo retorna el código que SÍ está vivo (verificado en exploración previa: solo en hooks de pickup_orders, no en sm_request_lines status)
- [ ] `grep -r "Externo Aprobado" src/` igual
- [ ] Cases muertos en `format.ts:173,177` eliminados
- [ ] Comentario obsoleto en `useSolicitudes.ts:927` eliminado o actualizado
- [ ] `npm run build` pasa
- [ ] Tests E2E existentes siguen pasando (no regresión)

**Verify:** `npm run build` + `grep -rn "'Pickup Aprobado'" src/` muestra solo refs vivos legítimos.

**Steps:**

- [ ] **Step 1: Listar todas las refs**

```bash
grep -rn "'Pickup Aprobado'\|'Externo Aprobado'\|Pickup Aprobado\|Externo Aprobado" src/
```

Catalogar cada match: ¿está vivo (lee de pickup_orders.status o external_orders.status — esos siguen existiendo) o muerto (lee de sm_request_lines.status — eliminado en Cambio 5)?

- [ ] **Step 2: Eliminar cases muertos en format.ts**

Buscar el switch de `statusContextString`. Los cases que reciben `status` desde `sm_request_lines.status` NUNCA serán `'Pickup Aprobado'` ni `'Externo Aprobado'` (Cambio 5 los eliminó). Eliminar:

```typescript
// Eliminar:
case 'Pickup Aprobado':
  return info.pickup_approved_at
    ? `Pickup Aprobado el ${formatDate(info.pickup_approved_at)}`
    : status
case 'Externo Aprobado':
  if (info.external_provider_name && info.external_invoice_amount != null) {
    ...
  }
  ...
```

**Importante:** verificar que `statusContextString` se llama desde donde el `status` SÍ puede ser `'Pickup Aprobado'`/`'Externo Aprobado'`. Si la función se usa también en `pickup_orders.status` displays, los cases SÍ son vivos — NO eliminar. Confirmar con grep `statusContextString` en el codebase.

- [ ] **Step 3: Limpiar comentario en useSolicitudes.ts:927**

```bash
grep -n -C 3 "post-Migration 4: status 'Pickup Aprobado'" src/hooks/useSolicitudes.ts
```

Si el comentario existe, eliminarlo o reemplazar por algo más útil (ej. explicar qué statuses son válidos hoy).

- [ ] **Step 4: Buscar más refs muertas con grep amplio**

```bash
grep -rn "Pickup Aprobado\|Externo Aprobado" src/ tests/
```

Catalogar y eliminar las muertas (solo en sm_request_lines context).

- [ ] **Step 5: Build + tests no-regresión**

```bash
npm run build
npx playwright test --list | head -5  # solo verificar que listing funciona, no correr
```

Expected: build exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/lib/utils/format.ts src/hooks/useSolicitudes.ts
git commit -m "$(cat <<'EOF'
chore: T8 Cambio 6.5 — CL-1 cleanup código muerto refs a 'Pickup Aprobado'/'Externo Aprobado'

Status eliminados de sm_request_lines en Cambio 5 (modelo cambió a tablas
pickup_orders/external_orders). Refs en format.ts y useSolicitudes.ts
eran código muerto que nunca disparaba. Cleanup pre-merge para evitar
confusión.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Suite completa verde — regression check Cambio 6 + 6.5

**Goal:** Verificar que TODOS los tests E2E (Cambio 6 = 18 tests + Cambio 6.5 = 13 tests = 31 total) pasan verde. Si alguno falla, debugging sistemático.

**Files:**
- No code changes esperados (solo verificación). Si hay fixes necesarios por edge cases descubiertos, modificar lo necesario.

**Acceptance Criteria:**
- [ ] Suite Cambio 6.5 (13 tests) verde
- [ ] Suite Cambio 6 existente (18 tests) sigue verde — sin regresión
- [ ] Total: 31 tests pasando
- [ ] **Límite de retries:** si después de 3 intentos de fix iterativo no se logra verde, PARAR y reportar incidente al usuario. NO continuar a T-final con tests rojos. Tests rojos persistentes = señal de bug en diseño, no de problema de tests — requiere re-discusión con James/Chat antes de proceder.

**Verify:**
```bash
npx playwright test cambio6 entrega-complete cancellation-integrity quantity-immutable
```
Expected: All passed.

**Steps:**

- [ ] **Step 1: Correr suite Cambio 6.5 sola**

```bash
npx playwright test cambio6-5-event-refinement.spec.ts --reporter=list
```

Expected: 13 passed.

Si fallan tests:
- Tests 1-3 (entrega ok/rejected/mixta): verificar que el sync trigger BD-5 dispara y recalc_qty_for_line evalúa con el nuevo orden. Debug con `db()` calls intermediarios.
- Test 7 (revert qty): verificar BD-6 trigger funciona — leer trip_event_lines del evento revertido.
- Test 8 (doble revert): verificar UNIQUE INDEX está creado y error 23505 se devuelve.
- Test 9 (revert en cerrado): verificar BD-8 dispara con mensaje correcto + FE-3 muestra toast.
- Tests 10-13 (H1): verificar que las 3 condiciones del trigger reescrito devuelven los mensajes esperados.

- [ ] **Step 2: Correr suite Cambio 6 sola**

```bash
npx playwright test entrega-complete retorno-complete cancellation-integrity quantity-immutable backlog-quantities --reporter=list
```

Expected: 18 passed (mismo que post-Cambio 6).

Si fallan tests por regresión:
- Si el problema es que el frontend ya no actualiza qty_delivered manual (FE-1) y algún test viejo asumía ese comportamiento, revisar el test — el comportamiento BD post-trigger debe ser equivalente.
- Si el problema es FE-2 (revert), verificar que el trigger BD-6 hace lo mismo que el código eliminado.

- [ ] **Step 3: Si todo verde, marcar T9 done. Si hay fallos, fix iterativo (MÁXIMO 3 intentos)**

Cada fix debe ir en commit separado del task que originó el problema. Por ejemplo, si FE-1 (T4) introdujo regresión, el fix va en commit con prefijo `fix: T9 — regresión FE-1 ajuste...`.

**Límite estricto de 3 intentos:** si después del tercer intento todavía hay tests rojos, STOP. NO continuar a T-final. Reportar a James:
- Qué tests siguen rojos
- Qué fixes intenté
- Hipótesis de root cause (probablemente bug de diseño, no de implementación)

Tests rojos persistentes son señal de que algo en el diseño BD/FE necesita re-evaluación con James/Chat. Forzar verde con hacks (skip, .only, mocks) está PROHIBIDO — produce false positives que se descubren en producción.

- [ ] **Step 4: Commit final de T9 (solo verificación, sin code changes esperados)**

Si no hubo cambios de código en T9, NO commitear empty. Solo notificar avance en el chat al usuario.

Si hubo fixes, commit:

```bash
git add <files-modified>
git commit -m "fix: T9 Cambio 6.5 — fixes de regresión post-suite verde

[detallar fixes específicos]

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: BACKLOG entries — 4 nuevos items

**Goal:** Agregar a `Docs/BACKLOG.md` los 4 items que se decidieron mover ahí (no scope de Cambio 6.5 pero importantes para sprint futuro).

**Files:**
- Modify: `Docs/BACKLOG.md` (agregar 4 entries en sección apropiada)

**Acceptance Criteria:**
- [ ] BL-EXCLUSIVITY agregado con: descripción, query SQL diagnóstico (CTE multi_modality), edge cases, nota explícita "correr en prod ANTES de diseñar y aplicar el constraint"
- [ ] BL-RPC-CONVERSION agregado: descripción, razón (atomicidad), prioridad (post-merge polish)
- [ ] BL-SESSION-START-RULE agregado: scope (crear .claude/rules/session-start.md o agregar a tool-usage.md)
- [ ] BL-CLAUDE-FOLDER-CLEANUP agregado: referencia al doc auditoría `Docs/reference/claude-folder-audit.md` (ya existe per git status)

**Verify:** `grep -E "BL-EXCLUSIVITY|BL-RPC-CONVERSION|BL-SESSION-START-RULE|BL-CLAUDE-FOLDER-CLEANUP" Docs/BACKLOG.md` retorna 4 matches.

**Steps:**

- [ ] **Step 1: Leer estructura actual de BACKLOG.md**

```bash
head -100 Docs/BACKLOG.md
```

Identificar dónde encajan los nuevos items (sección "Items pendientes" o equivalente, ordenados por prioridad).

- [ ] **Step 2: Agregar las 4 entries**

Copiar el contenido literal de las entries del spec sección "Items para BACKLOG", asegurando que cada entry tenga:
- Título con prefijo `BL-`
- Descripción concisa
- Para BL-EXCLUSIVITY: bloque SQL completo + 3 edge cases (transiciones, double-click, legacy)
- Para todas: nota de prioridad (post-merge / sprint futuro)

- [ ] **Step 3: Commit**

```bash
git add Docs/BACKLOG.md
git commit -m "$(cat <<'EOF'
docs: T10 Cambio 6.5 — BACKLOG entries (BL-EXCLUSIVITY, BL-RPC-CONVERSION, BL-SESSION-START-RULE, BL-CLAUDE-FOLDER-CLEANUP)

4 items movidos de scope Cambio 6.5 a BACKLOG. BL-EXCLUSIVITY incluye
query SQL de diagnóstico para correr en prod ANTES de diseñar el
constraint. BL-CLAUDE-FOLDER-CLEANUP referencia el doc de auditoría
ya existente en Docs/reference/.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Crear deployment-plan-prod.md esqueleto

**Goal:** Crear `Docs/reference/deployment-plan-prod.md` con estructura tentativa del plan de aplicación a producción cuando llegue el merge final v2 unificado. Este documento se ACTUALIZA en sesión separada (no en Cambio 6.5) cuando se haga el merge real, con detalles concretos de migrations y orden.

**Files:**
- Create: `Docs/reference/deployment-plan-prod.md`

**Acceptance Criteria:**
- [ ] Documento creado con secciones: Estado actual prod, Estado jaime/dev (Cambios 1-6.5), Orden de aplicación de migraciones, Pre-merge queries, Validación post-cada-migration, Rollback plan
- [ ] Cada sección con texto explicativo + placeholder claro de lo que se completará en sesión de merge
- [ ] Nota explícita "este documento es PLAN TENTATIVO — se actualiza al hacer el merge real"

**Verify:** `cat Docs/reference/deployment-plan-prod.md | head -20` muestra el header del documento.

**Steps:**

- [ ] **Step 1: Crear el archivo con estructura completa**

```markdown
# Plan de deployment a producción — merge v2 unificado

> **NOTA IMPORTANTE:** Este documento es PLAN TENTATIVO. Se actualiza con detalles
> concretos de migrations y orden cuando se haga el merge real `jaime/dev → main`.
> Última actualización: 2026-04-30 (esqueleto inicial post-Cambio 6.5).
>
> **Para la sesión de merge:** usar AMBOS repomix para diff exhaustivo —
> `repomix-MovimientOS-main.xml` (snapshot de main) y `repomix-MovimientOS.xml`
> (snapshot de jaime/dev). Ambos disponibles en project knowledge. Sin esa
> comparación, fácil olvidar diferencias entre lo que está en prod y lo que
> queremos aplicar.

## Estado actual de prod (verificado 2026-04-30)

- Última migration aplicada: `create_humanos_schema` (2026-04-28).
- **Sin Cambios 1-6.5 aplicados todavía.** Prod corre con schema pre-Cambio 1.
- Project ID: `bzeoszympkkicwlfdtcn`.

## Estado de jaime/dev al cierre de Cambio 6.5

Cambios integrados (en orden cronológico):

1. **Cambio 1** (2026-04-26) — Parada redesign (DROP stop_type).
2. **Cambio 2** (2026-04-27) — Cost code refactor a sm_requests (BD-1 + BD-2).
3. **Cambio 3** (2026-04-27) — Pickup nuevo modelo bandera-en-línea.
4. **Cambio 4** (2026-04-28) — External orders bulk (Cambio 5 lo reemplazó parcialmente).
5. **Cambio 5** (2026-04-28) — Bulk fulfillment (pickup_orders + external_orders + DROP pickup_by_project + DROP exclusividad constraint).
6. **Cambio 6** (2026-04-29) — Cancel preservation + integridad de cálculos.
7. **Cambio 6.5** (2026-04-30) — Refinamiento del modelo de eventos (esta sesión).

## Orden estricto de aplicación de migraciones a prod

> A llenar en sesión de merge final usando ambos repomix:
> - `repomix-MovimientOS.xml` (jaime/dev — disponible)
> - `repomix-MovimientOS-main.xml` (main — disponible en project knowledge)

Patrón esperado (a confirmar con análisis de drift):

1. Aplicar migrations de Cambio 1 (1-2 migrations).
2. Aplicar migrations de Cambio 2 (BD-1 + BD-2).
3. Aplicar migrations de Cambio 3 (cambio3_pickup_redesign + cambio3_pickup_add_attachments_to_lines).
4. Aplicar migrations de Cambio 4 (cambio4 sequence — verificar cuáles sobreviven post-Cambio 5).
5. Aplicar migrations de Cambio 5 (5-6 migrations en orden estricto, incluye cambio5_add_scheduled_date_to_orders al final).
6. Aplicar migration de Cambio 6 (cambio6_cancellation_integrity).
7. Aplicar migration de Cambio 6.5 (cambio6_5_event_model_refinement).

**Cada migration corre con sus pre-merge queries previas.** Si alguna retorna rows en prod, STOP — entender el caso antes de aplicar.

## Pre-merge queries por migración

> A consolidar en sesión de merge — copy literal de cada `[bd]` entry de
> `Docs/CHANGELOG.md` (ordenadas cronológicamente).

Formato esperado:

```sql
-- Migración cambio6_5_event_model_refinement (4 queries)
-- ... copy de CHANGELOG 2026-04-30 ...

-- Migración cambio6_cancellation_integrity (4 queries)
-- ... copy de CHANGELOG 2026-04-29 ...

-- ... etc para cada cambio ...
```

## Validación post-cada-migration

Para cada migration aplicada:

1. `list_migrations` confirma version + name correctos.
2. `get_advisors` para detectar lints nuevos (especialmente RLS, search_path).
3. Re-correr las pre-merge queries — deben seguir retornando 0 rows.
4. Smoke query del invariante específico de la migración (ej. para Cambio 6.5: una entrega rejected de prueba en data fresca).

## Rollback plan

Cada migration tiene su rollback documentado en su `[bd]` entry de `Docs/CHANGELOG.md`. Si una migration falla mid-aplicación o smoke posterior detecta corrupción:

1. Aplicar el rollback de esa migration específica (NO de todas — rollback es por migration).
2. Verificar estado BD coincide con pre-aplicación.
3. Investigar root cause antes de re-intentar.

**Importante:** rollbacks de Cambio 5+ pueden requerir manualmente restaurar versiones previas de funciones (ej. `recalc_qty_for_line` versión Cambio 6 vs versión Cambio 6.5). Documentado entry-by-entry en CHANGELOG.

## Comunicación con stakeholders

- James notifica a usuarios (Charris, ingenieros de proyecto) la ventana de mantenimiento.
- Aplicar en horario de bajo tráfico (sugerencia: tarde-noche horario Panamá, fin de semana).
- Verificar acceso bloqueado o read-only durante la ventana.

## Post-merge

1. Crear tag semver: `v2026.MM.DD-1` (per `.claude/rules/git-workflow.md`).
2. Actualizar este documento con el resultado real de la aplicación (timestamps, advisors, smoke).
3. Mover este documento a `Docs/reference/archive/` con fecha de aplicación en el nombre.
```

- [ ] **Step 2: Commit**

```bash
git add Docs/reference/deployment-plan-prod.md
git commit -m "$(cat <<'EOF'
docs: T11 Cambio 6.5 — deployment-plan-prod.md esqueleto

Plan tentativo del merge final v2 unificado a producción. Se actualiza
en sesión de merge real usando ambos repomix (jaime/dev y main).
Cubre: estado actual prod, Cambios 1-6.5 integrados en jaime/dev,
orden de migraciones, pre-merge queries, validación, rollback.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task T-final: PARADA smoke manual por James

**Goal:** James corre smoke manual del flow completo en staging antes de cerrar Cambio 6.5 y declararlo listo para merge final v2.

**Relación con T9:** T9 verifica lógica BD/funcional con 31 tests automatizados (PRECONDICIÓN — sin T9 verde, no se llega a T-final). T-final es **validación VISUAL de UX**: que los mensajes son legibles, los modales no están rotos, el flow operativo se siente correcto al usuario real. No sustituyen a los 13 tests E2E — los complementan en la dimensión que automated testing no cubre.

**Files:**
- No code changes. Solo verificación manual + actualización TRAIL/CHANGELOG.

**Acceptance Criteria:**
- [ ] T9 verde como precondición (31 tests passed)
- [ ] James verifica los 3 escenarios críticos visualmente en UI staging:
  - Entrega ok parcial → línea pasa a Parcial inmediato (sin esperar Retorno)
  - Entrega mixta ok+rejected → línea rejected pasa a Pendiente, línea ok a Parcial, ambas inmediatas
  - Entrega with_observations sin notas → bloqueada con mensaje claro
- [ ] No hay solicitudes huérfanas en staging post-tests (cleanup funcionó)
- [ ] `Docs/TRAIL.md` actualizado con posición post-Cambio 6.5
- [ ] `Docs/CHANGELOG.md` `[bd-pending]` ya está marcado como `[bd]` por Chat (de T1)
- [ ] Entry final `[feat]` en `Docs/CHANGELOG.md` resumiendo Cambio 6.5 completo

**Verify:** James confirma OK en chat. Solo entonces se considera Cambio 6.5 cerrado.

**Steps:**

- [ ] **Step 1: Notificar a James que Cambio 6.5 está listo para smoke**

Mensaje al usuario: *"Cambio 6.5 implementado completamente. Suite de 31 tests verde. Listo para tu smoke manual en staging. Por favor verifica los 3 escenarios críticos: (1) entrega ok parcial → Parcial inmediato; (2) entrega mixta ok+rejected → línea rejected vuelve al backlog inmediato; (3) entrega with_observations sin notas → bloqueada con mensaje claro. Cuando confirmes OK, escribo entry final [feat] en CHANGELOG y actualizo TRAIL."*

- [ ] **Step 2: Esperar respuesta de James**

Si James reporta bug → debugging + fix iterativo. Volver a T9 con el fix específico.

Si James confirma OK → continuar.

- [ ] **Step 3: Escribir entry final [feat] en CHANGELOG.md**

```markdown
## 2026-04-30

- [feat] **Cambio 6.5 — Refinamiento del modelo de eventos (Events V2) shippeado.**
  Corrige semántica del trigger recalc_qty_for_line para que entregas con
  líneas rechazadas liberen al backlog en el momento de Entrega (no en
  Retorno). Da efecto operacional real al line_status='rejected' vía nueva
  columna qty_rejected en trip_line_assignments y triggers BD de sync
  (forward + reverse). Reescribe H1 con 3 condiciones de bloqueo (alineado
  patrón Coupa). Migra mutación de qty_delivered/qty_rejected de frontend
  a BD (FE-1, FE-2). Cleanup de código muerto post-Cambio 5 (CL-1).
  
  **10 items BD** + **4 items FE** + 1 cleanup + **13 tests E2E**
  (cleanup obligatorio en cada uno). Suite total Cambio 6 + 6.5 = 31
  tests verde. Plan: `Docs/superpowers/plans/2026-04-30-cambio6-5-event-model-refinement.md`.
  Spec: `Docs/superpowers/specs/2026-04-30-cambio6-5-event-model-refinement.md`
  (commit b323de7). [feat status: shipped, status: shipped]
```

- [ ] **Step 4: Actualizar Docs/TRAIL.md**

```markdown
## Position actual

```
Perfeccionar movilizaciones
 └─ Sistema de eventos y sus registros
     ├─ [✅] (... items previos sin cambio ...)
     ├─ [✅] Cambio 6.5 Refinamiento modelo eventos (2026-04-30) — qty_rejected
     │   columna + triggers BD sync forward/reverse + recalc reescrito + H1
     │   alineado Coupa + cleanup código muerto post-Cambio 5
     └─ [⏳] Siguiente: merge v2 staging → prod (cuando James decida)
```
```

- [ ] **Step 5: Actualizar status del spec a shipped**

Editar frontmatter de `Docs/superpowers/specs/2026-04-30-cambio6-5-event-model-refinement.md`:

```yaml
---
status: shipped
shipped_commits: <commit hash range desde T1 hasta T-final>
---
```

- [ ] **Step 6: Borrar plan file (per plan-lifecycle.md)**

```bash
rm Docs/superpowers/plans/2026-04-30-cambio6-5-event-model-refinement.md
rm Docs/superpowers/plans/2026-04-30-cambio6-5-event-model-refinement.md.tasks.json
```

- [ ] **Step 7: Commit final consolidado**

```bash
git add Docs/CHANGELOG.md Docs/TRAIL.md Docs/superpowers/specs/2026-04-30-cambio6-5-event-model-refinement.md
git rm Docs/superpowers/plans/2026-04-30-cambio6-5-event-model-refinement.md
git rm Docs/superpowers/plans/2026-04-30-cambio6-5-event-model-refinement.md.tasks.json
git commit -m "$(cat <<'EOF'
docs: T-final Cambio 6.5 — shipped + cleanup plan + actualizar TRAIL

Smoke manual confirmado por James. Spec frontmatter status:shipped con
shipped_commits range. TRAIL actualizado con posición post-Cambio 6.5.
Plan file borrado per plan-lifecycle.md (la historia queda en CHANGELOG
+ commits).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-review

**Spec coverage:**
- [✓] BD-1 a BD-10 (10 items): cubiertos en T1 (todos juntos en migración consolidada).
- [✓] FE-1 a FE-4: cubiertos en T4-T7 (uno por task).
- [✓] CL-1: cubierto en T8.
- [✓] 13 tests E2E: cubiertos en T3 (escritos), verificados en T9.
- [✓] 4 pre-merge queries: incluidas en T1.
- [✓] BACKLOG entries: cubiertos en T10.
- [✓] deployment-plan-prod.md: cubierto en T11.
- [✓] PARADA smoke manual: cubierto en T-final.

**Placeholder scan:**
- No "TBD" / "TODO" en steps.
- T11 deployment plan tiene placeholders explícitos ("a llenar en sesión de merge final") — eso es POR DISEÑO, el documento es esqueleto, no completo. El task contiene el contenido completo del esqueleto.
- T9 dice "fix iterativo si fallan tests" — esto es legítimo porque debugging real depende del fallo específico. No es placeholder.

**Type consistency:**
- Nombres de funciones SQL consistentes (`sync_assignment_on_delivery_event`, `sync_assignment_on_delivery_revert`, etc.) — verificado match con spec BD-5 a BD-10.
- Nombres de columnas (`qty_rejected`, `qty_delivered`, `qty_dispatched`, `quantity_assigned`) consistentes en todas las tasks.
- Test names (Test 3 = entrega_mixta_ok_rejected) match con tabla de tests del spec.

**Notas operativas:**
- T1 es PARADA — Code no aplica BD, escribe el [bd-pending] y espera Chat.
- T2 depende de Chat aplicar T1 — Code reanuda cuando Chat confirma.
- T3 puede empezar antes de T1 estrictamente (escribir tests no requiere BD aplicada) pero los tests no corren verde hasta T9.
- T10 y T11 son independientes — pueden hacerse paralelo a T3-T8.
- T-final requiere smoke manual real de James — no se puede automatizar.
