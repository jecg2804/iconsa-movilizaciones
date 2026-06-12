# Cambio 6 — Cancel preservation + integridad de cálculos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers-extended-cc:subagent-driven-development` (recommended) or `superpowers-extended-cc:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Defender el invariante de cálculos de cantidades (`qty_disponible = quantity - qty_scheduled - qty_delivered`) vía 1 migración BD consolidada (3 triggers nuevos + 2 CHECK constraints + 1 NOT NULL + 1 columna nullable + 1 trigger existente modificado) + cambios coordinados en hooks/modales/UI + 18 tests E2E como regression guard.

**Architecture:** BD = fuente de verdad de los cálculos. Triggers BD enforzan invariantes (Bug #1, #2, #4, H1). CHECK constraints (H7, H8) son defense-in-depth. Frontend valida pre-submit (UX) pero la BD es la última palabra. Migración consolidada en una sola transacción para atomicidad — pre-merge queries validan compatibilidad antes de aplicar a prod.

**Tech Stack:** Next.js 16 App Router + TypeScript strict ES2022 + Supabase PostgreSQL + Tailwind v4 + Playwright E2E + Resend (notifications, sin cambio).

**Spec:** [`Docs/superpowers/specs/2026-04-29-cambio6-cancel-integrity.md`](../specs/2026-04-29-cambio6-cancel-integrity.md) — commits `922102b` + `f446fc1`.

**NOTA importante:** PARADA obligatoria entre T11 y T-final docs (post-Cambio 6). T-final docs es **unificado** (Cambio 5 + Cambio 6) y se ejecuta en sesión separada después del smoke OK definitivo. T-final NO es parte de este plan.

---

## File Structure

| Archivo | Responsabilidad | Operación |
|---------|-----------------|-----------|
| `Docs/CHANGELOG.md` | Entries `[bd-pending]` → `[bd]` migración + entries `[feat]` por fix | Modify |
| `src/lib/types/database.ts` | Types regenerados post-migración + helper `Row<T>` re-appendeado | Modify (regen) |
| `src/hooks/useTrips.ts` | `cancelTrip` refactor (no DELETE) + `cancellationReason` param + `saveTrip`/`updateTrip` validation rate_id | Modify |
| `src/hooks/usePickupOrders.ts` | `cancelPickupOrder` + `cancellationReason` param | Modify |
| `src/hooks/useExternalOrders.ts` | `cancelExternalOrder` + `cancellationReason` param | Modify |
| `src/app/(app)/programacion/viaje/[id]/page.tsx` | Caller `cancelTrip` con reason + cancel modal inline extendido | Modify |
| `src/app/(app)/programacion/viaje/nuevo/page.tsx` | `validate()` requiere rate_id | Modify |
| `src/app/(app)/programacion/page.tsx` | Callers `cancelPickupOrder`/`cancelExternalOrder` con reason + modales inline extendidos | Modify |
| `src/app/(app)/solicitudes/[id]/page.tsx` | Callers `cancelPickupOrder`/`cancelExternalOrder` con reason + modales inline extendidos | Modify |
| `src/components/viajes/DeliveryModal.tsx` | Pre-flight SELECT activo + filter UI greyed disabled | Modify |
| `src/app/(app)/mis-viajes/[id]/page.tsx` | `handleDelivery` error específico Bug #4 + `handleRevert` Salida pre-flight D8 | Modify |
| `tests/cambio6-integrity.spec.ts` | 18 tests E2E regression guard | Create |
| `CLAUDE.md` | Regla #9 actualizada (tarifa obligatoria) | Modify |

**Ningún archivo nuevo de componente** — los cancel modals son inline en sus respectivas pages. Extendemos el inline existente, no creamos componentes separados (sigue patrón pre-existente).

---

## Tasks

### Task 1: Migración BD consolidada `cambio6_cancellation_integrity`

**Goal:** Aplicar la migración BD consolidada en staging vía Chat MCP, dejando entry `[bd]` confirmando aplicación.

**Files:**
- Modify: `Docs/CHANGELOG.md`

**Acceptance Criteria:**
- [ ] Entry `[bd-pending]` escrita con SQL completo + rollback + 4 pre-merge queries (orden de la sección "Cambios BD" del spec).
- [ ] Chat aplica vía Supabase MCP en staging (`vonwkciosksqspyljzfy`).
- [ ] `mcp__claude_ai_Supabase__get_advisors security` confirma triggers nuevos.
- [ ] Entry editada `[bd-pending]` → `[bd]` con confirmación de aplicación.

**Verify:** `npx supabase gen types typescript --project-id vonwkciosksqspyljzfy | grep -E '(cancellation_reason|qty_dispatched_le_assigned)'` → output muestra `cancellation_reason` en `trips`/`pickup_orders`/`external_orders`.

**Steps:**

- [ ] **Step 1: Escribir entry `[bd-pending]` en `Docs/CHANGELOG.md` bajo sección `## 2026-04-29`**

```markdown
## 2026-04-29

- [bd-pending] **Cambio 6 — migración consolidada `cambio6_cancellation_integrity` (cancel preservation + integridad de cálculos).** SQL aplicar por Chat en staging (`vonwkciosksqspyljzfy`). 1 sola transacción para atomicidad — pre-merge queries validan compatibilidad antes de aplicar a prod.

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

  **Migración consolidada:**

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
      RAISE EXCEPTION 'cancellation_reason requerido (≥10 chars) cuando alguna línea tiene qty_delivered>0';
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
      RAISE EXCEPTION 'cancellation_reason requerido (≥10 chars) cuando alguna línea tiene qty_delivered>0';
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
      RAISE EXCEPTION 'cancellation_reason requerido (≥10 chars) cuando alguna línea tiene qty_delivered>0';
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
  -- IMPORTANTE: este es REPLACE de la función existente. Chat aplica reemplazando
  -- la lógica del branch ELSIF v_current_status = 'En Transito' THEN para chequear
  -- v_qty_scheduled_active > 0 calculado sobre trips no-Cancelados/no-Completados.
  -- Pseudocódigo:
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
  --       -- Caer al status según qty_delivered (Pendiente / Parcial / Entregada)
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
  -- Restore previous version of recalc_qty_for_line trigger function
  COMMIT;
  ```

  **Aplicar en:** staging primero (BD wipeada, todas las pre-merge queries deben dar 0). Para prod en merge final v2 unificado: aplicar las 4 pre-merge queries; si retornan rows → cleanup antes; aplicar migración.
```

- [ ] **Step 2: Notificar a Chat (vía James) que la entry `[bd-pending]` está lista para aplicar.**

PARADA: el siguiente step depende de que Chat aplique la migración en staging via Supabase MCP. Esperar confirmación de James.

- [ ] **Step 3: Una vez confirmada aplicación, editar entry `[bd-pending]` → `[bd]`**

Cambiar el `[bd-pending]` por `[bd]` en la línea inicial. Agregar al final de la entry:

```markdown
  **Aplicado por Chat en staging (`vonwkciosksqspyljzfy`) el 2026-04-29** vía Supabase MCP. Pre-merge queries 1-4 retornaron 0 rows (BD wipeada confirma). Migración consolidada exitosa. Triggers nuevos verificados via `get_advisors`: `enforce_quantity_immutable_trg`, `enforce_one_active_delivery_trg`, `enforce_cancellation_reason_*` (3). CHECK constraints H7+H8 activos. `trips.rate_id` ahora NOT NULL. Pendiente prod en merge final v2 (post Cambio 6 implementación + smoke OK).
```

- [ ] **Step 4: Commit**

```bash
git add Docs/CHANGELOG.md
git commit -m "$(cat <<'EOF'
docs: bd Cambio 6 migración consolidada aplicada en staging

cambio6_cancellation_integrity aplicada por Chat. 14 cambios coordinados
en una transacción:
  - 3 columnas cancellation_reason (nullable) con triggers condicionales
  - 1 trigger BEFORE INSERT trip_event_lines (Bug #4)
  - 1 trigger recalc_qty_for_line modificado (Bug #2 fix)
  - 1 trigger BEFORE UPDATE sm_request_lines (H1)
  - 2 CHECK constraints H7+H8
  - 1 NOT NULL en trips.rate_id (tarifa obligatoria)

Pre-merge queries 1-4 retornaron 0 rows. BD wipeada confirma.
Pendiente prod en merge final v2 unificado post Cambio 6.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Regen types post-migración + helper preservation

**Goal:** `src/lib/types/database.ts` regenerado contra staging incluye `cancellation_reason: string | null`, `rate_id: string` (NOT NULL), helper `Row<T>` preservado.

**Files:**
- Modify: `src/lib/types/database.ts`

**Acceptance Criteria:**
- [ ] `pickup_orders`/`external_orders`/`trips` tienen `cancellation_reason: string | null` en Row + Insert + Update.
- [ ] `trips.rate_id: string` (sin `| null`) en Row.
- [ ] Helper `Row<T>` preservado al final del archivo.
- [ ] `npm warn exec` no aparece como primera línea (cleanup post-regen).
- [ ] `npm run build` verde.

**Verify:** `npm run build 2>&1 | grep -E '(Failed|error)'` → output vacío. `grep -E "cancellation_reason" src/lib/types/database.ts | wc -l` → 9 (3 cols × 3 modes Row/Insert/Update).

**Steps:**

- [ ] **Step 1: Regenerar tipos contra staging**

```bash
npx supabase gen types typescript --project-id vonwkciosksqspyljzfy > src/lib/types/database.ts
```

- [ ] **Step 2: Limpieza del `npm warn exec` line 1 si aparece**

Leer línea 1. Si dice `npm warn exec ...`, eliminarla con Edit tool:

```typescript
// old (si aplica): npm warn exec The following package was not found...
// new: (línea eliminada)
```

- [ ] **Step 3: Re-appendear helper `Row<T>` al final del archivo**

```bash
echo "
// Helper type for row access
export type Row<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']" >> src/lib/types/database.ts
```

- [ ] **Step 4: Build verify**

```bash
npm run build 2>&1 | tail -10
```
Expected: `✓ Compiled successfully`. Sin errores TypeScript.

- [ ] **Step 5: Commit**

```bash
git add src/lib/types/database.ts
git commit -m "chore: regen types Cambio 6 — cancellation_reason + rate_id NOT NULL

Types regenerados post-migración cambio6_cancellation_integrity.
Helper Row<T> re-appendeado tras regen (npx supabase gen types lo wipea).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Test E2E suite escrita (18 tests, baseline antes de fixes)

**Goal:** Crear `tests/cambio6-integrity.spec.ts` con los 18 tests del spec. Algunos pasan inmediatamente (BD-driven post-T1, ej. constraint H7/H8). Otros fallan hasta T4-T9 (code-driven). Suite completa documentada para que pase post-T9.

**Files:**
- Create: `tests/cambio6-integrity.spec.ts`

**Acceptance Criteria:**
- [ ] 18 `test()` declarados con descripción clara.
- [ ] Cada test verifica el invariante (`qty_disponible = quantity - qty_scheduled - qty_delivered`) o el comportamiento específico documentado en el spec.
- [ ] Helper `seedSolicitudWithLine()` y `seedTripWithAssignment()` definidos al inicio del archivo (AD-5 helpers existentes están rotos — usamos seed manual via supabase client).
- [ ] Tests usan `test.describe()` agrupados por bug (`Bug #1`, `Bug #2`, `Bug #4`, `Audit pickup`, `Audit external`, `H1`, `H7`, `H8`, `Tarifa`).
- [ ] Tests #5, #6, #14, #15 (BD-driven) pasan POST-T1 (sin code change adicional).
- [ ] Tests #1-3, #4, #7-13, #16-18 fallan POST-T1 hasta los respectivos fixes en T4-T9.

**Verify:** `npx playwright test tests/cambio6-integrity.spec.ts --reporter=list` → output muestra 18 tests, ~6 pasan, ~12 fallan (esto es expected baseline RED del TDD).

**Steps:**

- [ ] **Step 1: Crear `tests/cambio6-integrity.spec.ts` con todos los tests**

Archivo completo (helpers + 18 tests). Largo pero atómico — no se rompe en sub-files dado que toda la suite es un set coherente de regression guards.

```typescript
import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../src/lib/types/database'

// ─────────────────────────────────────────────────────────────────────
// Setup: cliente Supabase admin con service_role para bypass RLS en seeds.
// Tests assume staging BD limpia post-wipe (generators arrancan en 001).
// ─────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!
const admin = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE)

// Charris (logistica) seed user — created via /admin/masters in staging
const CHARRIS_ID = process.env.TEST_CHARRIS_ID!
const PROJECT_ID = process.env.TEST_PROJECT_ID!  // 26-604 Inyecciones Metro
const REQUESTER_ID = process.env.TEST_PM_ID!     // PM seed
const RATE_ID = process.env.TEST_RATE_ID!        // Rate seed

// ─────────────────────────────────────────────────────────────────────
// Helpers (AD-5 helpers existentes están rotos, usamos seed manual)
// ─────────────────────────────────────────────────────────────────────

interface SeedLineOpts {
  quantity: number
  description?: string
}

async function seedSolicitudWithLines(opts: SeedLineOpts[]): Promise<{
  requestId: string
  lineIds: string[]
}> {
  const { data: req, error: reqErr } = await admin
    .from('sm_requests')
    .insert({
      project_id: PROJECT_ID,
      requester_id: REQUESTER_ID,
      status: 'Enviada',
      date_required: new Date().toISOString().slice(0, 10),
      cost_code_id: null,
      cost_category_id: null,
    })
    .select('id')
    .single()
  if (reqErr || !req) throw new Error(`seed solicitud failed: ${reqErr?.message}`)

  const lines = opts.map((o, i) => ({
    request_id: req.id,
    line_number: i + 1,
    description: o.description ?? `Test line ${i + 1}`,
    line_type: 'Material' as const,
    quantity: o.quantity,
    unit_text: 'und',
    from_text: 'Origen test',
    to_text: 'Destino test',
    status: 'Pendiente' as const,
    qty_scheduled: 0,
    qty_delivered: 0,
  }))

  const { data: lineRows, error: linesErr } = await admin
    .from('sm_request_lines')
    .insert(lines)
    .select('id')
  if (linesErr || !lineRows) throw new Error(`seed lines failed: ${linesErr?.message}`)

  return { requestId: req.id, lineIds: lineRows.map((l) => l.id) }
}

async function seedTripWithAssignment(
  lineId: string,
  qty: number,
  scheduledDate: string = new Date().toISOString().slice(0, 10),
): Promise<{ tripId: string; assignmentId: string }> {
  const { data: trip, error: tripErr } = await admin
    .from('trips')
    .insert({
      scheduled_date: scheduledDate,
      driver_id: null,
      vehicle_id: null,
      trailer_id: null,
      rate_id: RATE_ID,  // tarifa obligatoria post-T1
      cost: 100,
      created_by: CHARRIS_ID,
      status: 'Programado',
    })
    .select('id')
    .single()
  if (tripErr || !trip) throw new Error(`seed trip failed: ${tripErr?.message}`)

  const { data: assign, error: assignErr } = await admin
    .from('trip_line_assignments')
    .insert({
      trip_id: trip.id,
      request_line_id: lineId,
      quantity_assigned: qty,
      qty_dispatched: 0,
      qty_delivered: 0,
    })
    .select('id')
    .single()
  if (assignErr || !assign) throw new Error(`seed assignment failed: ${assignErr?.message}`)

  return { tripId: trip.id, assignmentId: assign.id }
}

async function dispatchTrip(tripId: string, lineId: string, qty: number): Promise<void> {
  await admin.from('trips').update({ status: 'En Ruta', actual_departure: new Date().toISOString() }).eq('id', tripId)
  await admin.from('trip_line_assignments').update({ qty_dispatched: qty }).eq('trip_id', tripId).eq('request_line_id', lineId)
  await admin.from('trip_events').insert({
    trip_id: tripId,
    event_type: 'Salida',
    event_timestamp: new Date().toISOString(),
    registered_by: CHARRIS_ID,
  })
}

async function deliverInTrip(tripId: string, lineId: string, qty: number): Promise<string> {
  const { data: ev } = await admin.from('trip_events').insert({
    trip_id: tripId,
    event_type: 'Entrega',
    event_timestamp: new Date().toISOString(),
    registered_by: CHARRIS_ID,
    received_by_name: 'Test receptor',
  }).select('id').single()
  if (!ev) throw new Error('insert trip_event Entrega failed')

  await admin.from('trip_event_lines').insert({
    trip_event_id: ev.id,
    request_line_id: lineId,
    quantity: qty,
    line_status: 'accepted',
  })
  await admin.from('trip_line_assignments').update({ qty_delivered: qty }).eq('trip_id', tripId).eq('request_line_id', lineId)
  return ev.id
}

async function getLineStatus(lineId: string): Promise<{ status: string; qty_scheduled: number; qty_delivered: number; quantity: number }> {
  const { data, error } = await admin
    .from('sm_request_lines')
    .select('status, qty_scheduled, qty_delivered, quantity')
    .eq('id', lineId)
    .single()
  if (error || !data) throw new Error(`getLineStatus failed: ${error?.message}`)
  return data
}

async function cleanup(requestIds: string[], tripIds: string[]) {
  // Order matters: events_lines → events → assignments → trips → lines → request
  for (const tid of tripIds) {
    await admin.from('trip_event_lines').delete().in('trip_event_id',
      (await admin.from('trip_events').select('id').eq('trip_id', tid)).data?.map(e => e.id) ?? []
    )
    await admin.from('trip_events').delete().eq('trip_id', tid)
    await admin.from('trip_line_assignments').delete().eq('trip_id', tid)
    await admin.from('trips').delete().eq('id', tid)
  }
  for (const rid of requestIds) {
    await admin.from('sm_request_lines').delete().eq('request_id', rid)
    await admin.from('sm_requests').delete().eq('id', rid)
  }
}

// ─────────────────────────────────────────────────────────────────────
// Bug #1 — Cancel trip preserva trip_line_assignments
// ─────────────────────────────────────────────────────────────────────

test.describe('Bug #1 cancel preservation', () => {
  test('cancel_trip_with_partial_delivery_preserves_qty', async () => {
    const { requestId, lineIds: [lineId] } = await seedSolicitudWithLines([{ quantity: 10 }])
    const { tripId } = await seedTripWithAssignment(lineId, 10)
    await dispatchTrip(tripId, lineId, 10)
    await deliverInTrip(tripId, lineId, 4)  // entrega parcial

    // Cancel con razón requerida
    await admin.from('trips').update({
      status: 'Cancelado',
      cancellation_reason: 'Test cancel partial preserva qty_delivered',
    }).eq('id', tripId)

    // Verify: assignment NO borrado, qty_delivered=4 preservado
    const { data: assign } = await admin
      .from('trip_line_assignments')
      .select('qty_delivered, quantity_assigned')
      .eq('trip_id', tripId)
      .single()
    expect(assign?.qty_delivered).toBe(4)
    expect(assign?.quantity_assigned).toBe(10)

    // Línea queda Parcial (qty_delivered=4 < quantity=10, qty_scheduled=0 post-cancel)
    const line = await getLineStatus(lineId)
    expect(line.status).toBe('Parcial')
    expect(line.qty_delivered).toBe(4)
    expect(line.qty_scheduled).toBe(0)

    await cleanup([requestId], [tripId])
  })

  test('cancel_trip_with_full_delivery_preserves_qty', async () => {
    const { requestId, lineIds: [lineId] } = await seedSolicitudWithLines([{ quantity: 5 }])
    const { tripId } = await seedTripWithAssignment(lineId, 5)
    await dispatchTrip(tripId, lineId, 5)
    await deliverInTrip(tripId, lineId, 5)  // entrega total

    await admin.from('trips').update({
      status: 'Cancelado',
      cancellation_reason: 'Test cancel full preserva qty_delivered=quantity',
    }).eq('id', tripId)

    const line = await getLineStatus(lineId)
    expect(line.status).toBe('Entregada')
    expect(line.qty_delivered).toBe(5)

    await cleanup([requestId], [tripId])
  })

  test('cancel_trip_with_zero_delivery_releases_to_backlog', async () => {
    const { requestId, lineIds: [lineId] } = await seedSolicitudWithLines([{ quantity: 8 }])
    const { tripId } = await seedTripWithAssignment(lineId, 8)
    // Sin dispatch ni delivery (trip Programado)

    await admin.from('trips').update({
      status: 'Cancelado',
      cancellation_reason: null,  // sin razón porque qty_delivered=0
    }).eq('id', tripId)

    const line = await getLineStatus(lineId)
    expect(line.status).toBe('Pendiente')
    expect(line.qty_scheduled).toBe(0)
    expect(line.qty_delivered).toBe(0)

    await cleanup([requestId], [tripId])
  })
})

// ─────────────────────────────────────────────────────────────────────
// Bug #2 — Trigger no zombie 'En Transito'
// ─────────────────────────────────────────────────────────────────────

test.describe('Bug #2 trigger zombie prevention', () => {
  test('trigger_no_zombie_en_transito', async () => {
    const { requestId, lineIds: [lineId] } = await seedSolicitudWithLines([{ quantity: 6 }])
    const { tripId } = await seedTripWithAssignment(lineId, 6)
    await dispatchTrip(tripId, lineId, 6)
    // Línea ahora 'En Transito' (qty_scheduled=6, qty_delivered=0)

    let line = await getLineStatus(lineId)
    expect(line.status).toBe('En Transito')

    // Cancel trip — sin assignments activos, línea NO debe quedar zombie
    await admin.from('trips').update({
      status: 'Cancelado',
      cancellation_reason: null,
    }).eq('id', tripId)

    line = await getLineStatus(lineId)
    expect(line.status).toBe('Pendiente')  // No zombie 'En Transito'
    expect(line.qty_scheduled).toBe(0)

    await cleanup([requestId], [tripId])
  })
})

// ─────────────────────────────────────────────────────────────────────
// Bug #4 — Constraint multi-entrega
// ─────────────────────────────────────────────────────────────────────

test.describe('Bug #4 multi-entrega blocked', () => {
  test('multi_entrega_blocked_at_db_level', async () => {
    const { requestId, lineIds: [lineId] } = await seedSolicitudWithLines([{ quantity: 10 }])
    const { tripId } = await seedTripWithAssignment(lineId, 10)
    await dispatchTrip(tripId, lineId, 10)
    await deliverInTrip(tripId, lineId, 4)

    // Segundo INSERT trip_event_lines con misma línea-trip → debe fallar
    const { data: ev2 } = await admin.from('trip_events').insert({
      trip_id: tripId,
      event_type: 'Entrega',
      event_timestamp: new Date().toISOString(),
      registered_by: CHARRIS_ID,
      received_by_name: 'Receptor 2',
    }).select('id').single()

    const { error } = await admin.from('trip_event_lines').insert({
      trip_event_id: ev2!.id,
      request_line_id: lineId,
      quantity: 6,
      line_status: 'accepted',
    })
    expect(error).not.toBeNull()
    expect(error?.message).toContain('ya tiene una Entrega activa')

    await cleanup([requestId], [tripId])
  })

  test('multi_entrega_allowed_after_revert', async () => {
    const { requestId, lineIds: [lineId] } = await seedSolicitudWithLines([{ quantity: 10 }])
    const { tripId } = await seedTripWithAssignment(lineId, 10)
    await dispatchTrip(tripId, lineId, 10)
    const eventId1 = await deliverInTrip(tripId, lineId, 4)

    // Revertir el evento Entrega
    await admin.from('trip_events').insert({
      trip_id: tripId,
      event_type: 'Reversion',
      event_timestamp: new Date().toISOString(),
      registered_by: CHARRIS_ID,
      reverts_event_id: eventId1,
    })

    // Ahora segundo INSERT debe funcionar
    const { data: ev2 } = await admin.from('trip_events').insert({
      trip_id: tripId,
      event_type: 'Entrega',
      event_timestamp: new Date().toISOString(),
      registered_by: CHARRIS_ID,
      received_by_name: 'Receptor 2',
    }).select('id').single()

    const { error } = await admin.from('trip_event_lines').insert({
      trip_event_id: ev2!.id,
      request_line_id: lineId,
      quantity: 5,
      line_status: 'accepted',
    })
    expect(error).toBeNull()

    await cleanup([requestId], [tripId])
  })
})

// ─────────────────────────────────────────────────────────────────────
// Audit pickup_orders/external_orders (regression guard)
// ─────────────────────────────────────────────────────────────────────

test.describe('Audit pickup/external regression guard', () => {
  test('cancel_pickup_preserves_qty', async () => {
    const { requestId, lineIds: [lineId] } = await seedSolicitudWithLines([{ quantity: 5 }])

    const { data: po } = await admin.from('pickup_orders').insert({
      status: 'Aprobado',
      approved_by: CHARRIS_ID,
      approved_at: new Date().toISOString(),
      scheduled_date: new Date().toISOString().slice(0, 10),
      created_by: CHARRIS_ID,
    }).select('id').single()

    await admin.from('pickup_order_lines').insert({
      pickup_order_id: po!.id,
      request_line_id: lineId,
      quantity_assigned: 5,
      qty_delivered: 3,  // simular entrega parcial
    })

    // Cancel pickup — debe preservar qty_delivered
    await admin.from('pickup_orders').update({
      status: 'Cancelado',
      cancellation_reason: 'Test pickup cancel preserva qty_delivered',
    }).eq('id', po!.id)

    const { data: pol } = await admin
      .from('pickup_order_lines')
      .select('qty_delivered')
      .eq('pickup_order_id', po!.id)
      .single()
    expect(pol?.qty_delivered).toBe(3)

    await admin.from('pickup_order_lines').delete().eq('pickup_order_id', po!.id)
    await admin.from('pickup_orders').delete().eq('id', po!.id)
    await cleanup([requestId], [])
  })

  test('cancel_external_preserves_qty', async () => {
    const { requestId, lineIds: [lineId] } = await seedSolicitudWithLines([{ quantity: 5 }])

    const { data: eo } = await admin.from('external_orders').insert({
      status: 'Aprobado',
      approved_by: CHARRIS_ID,
      approved_at: new Date().toISOString(),
      scheduled_date: new Date().toISOString().slice(0, 10),
      provider_name: 'Test Provider',
      invoice_amount: 100,
      invoice_attachments: [{ path: 'test.pdf', name: 'test.pdf', size: 100, type: 'application/pdf' }],
      created_by: CHARRIS_ID,
    }).select('id').single()

    await admin.from('external_order_lines').insert({
      external_order_id: eo!.id,
      request_line_id: lineId,
      quantity_assigned: 5,
      qty_delivered: 2,
    })

    await admin.from('external_orders').update({
      status: 'Cancelado',
      cancellation_reason: 'Test external cancel preserva qty_delivered',
    }).eq('id', eo!.id)

    const { data: eol } = await admin
      .from('external_order_lines')
      .select('qty_delivered')
      .eq('external_order_id', eo!.id)
      .single()
    expect(eol?.qty_delivered).toBe(2)

    await admin.from('external_order_lines').delete().eq('external_order_id', eo!.id)
    await admin.from('external_orders').delete().eq('id', eo!.id)
    await cleanup([requestId], [])
  })

  test('complete_pickup_idempotent', async () => {
    const { requestId, lineIds: [lineId] } = await seedSolicitudWithLines([{ quantity: 5 }])

    const { data: po } = await admin.from('pickup_orders').insert({
      status: 'Aprobado',
      approved_by: CHARRIS_ID,
      approved_at: new Date().toISOString(),
      scheduled_date: new Date().toISOString().slice(0, 10),
      created_by: CHARRIS_ID,
    }).select('id').single()

    await admin.from('pickup_order_lines').insert({
      pickup_order_id: po!.id,
      request_line_id: lineId,
      quantity_assigned: 5,
      qty_delivered: 0,
    })

    // Primera completada
    await admin.from('pickup_order_lines').update({ qty_delivered: 5 }).eq('pickup_order_id', po!.id)
    await admin.from('pickup_orders').update({
      status: 'Entregado',
      completed_at: new Date().toISOString(),
      completed_by: CHARRIS_ID,
    }).eq('id', po!.id).eq('status', 'Aprobado')

    // Segunda llamada — el WHERE .eq('status', 'Aprobado') no matchea ('Entregado' ya)
    const { data: noUpdate } = await admin.from('pickup_orders').update({
      status: 'Entregado',
      completed_at: new Date().toISOString(),
    }).eq('id', po!.id).eq('status', 'Aprobado').select()

    expect(noUpdate).toEqual([])  // No row updated — idempotente

    const { data: pol } = await admin
      .from('pickup_order_lines')
      .select('qty_delivered')
      .eq('pickup_order_id', po!.id)
      .single()
    expect(pol?.qty_delivered).toBe(5)  // Sin double count

    await admin.from('pickup_order_lines').delete().eq('pickup_order_id', po!.id)
    await admin.from('pickup_orders').delete().eq('id', po!.id)
    await cleanup([requestId], [])
  })
})

// ─────────────────────────────────────────────────────────────────────
// Invariantes globales
// ─────────────────────────────────────────────────────────────────────

test.describe('Invariantes globales', () => {
  test('backlog_calculation_consistent_after_cancel', async () => {
    const { requestId, lineIds: [lineId] } = await seedSolicitudWithLines([{ quantity: 10 }])
    const { tripId } = await seedTripWithAssignment(lineId, 10)
    await dispatchTrip(tripId, lineId, 10)
    await deliverInTrip(tripId, lineId, 3)

    await admin.from('trips').update({
      status: 'Cancelado',
      cancellation_reason: 'Test invariante backlog',
    }).eq('id', tripId)

    const line = await getLineStatus(lineId)
    const qtyDisponible = line.quantity - line.qty_scheduled - line.qty_delivered
    expect(qtyDisponible).toBe(7)  // 10 - 0 - 3 = 7
    expect(qtyDisponible).toBeGreaterThanOrEqual(0)  // Nunca negativo

    await cleanup([requestId], [tripId])
  })

  test('line_status_consistent_with_qty', async () => {
    // Verificar que status derivado del par (qty_delivered, quantity) es coherente
    // tras múltiples operaciones (dispatch, partial deliver, cancel)
    const { requestId, lineIds: [lineId] } = await seedSolicitudWithLines([{ quantity: 10 }])
    const { tripId } = await seedTripWithAssignment(lineId, 10)
    await dispatchTrip(tripId, lineId, 10)
    await deliverInTrip(tripId, lineId, 10)  // entrega total

    let line = await getLineStatus(lineId)
    expect(line.status).toBe('Entregada')

    await admin.from('trips').update({
      status: 'Cancelado',
      cancellation_reason: 'Test cancel post-entrega total',
    }).eq('id', tripId)

    line = await getLineStatus(lineId)
    expect(line.status).toBe('Entregada')  // Sigue Entregada porque qty_delivered=quantity

    await cleanup([requestId], [tripId])
  })
})

// ─────────────────────────────────────────────────────────────────────
// H1 — Edit quantity con assignments
// ─────────────────────────────────────────────────────────────────────

test.describe('H1 quantity immutable with active assignments', () => {
  test('edit_quantity_blocked_with_active_assignments', async () => {
    const { requestId, lineIds: [lineId] } = await seedSolicitudWithLines([{ quantity: 10 }])
    const { tripId } = await seedTripWithAssignment(lineId, 10)

    const { error } = await admin
      .from('sm_request_lines')
      .update({ quantity: 15 })
      .eq('id', lineId)

    expect(error).not.toBeNull()
    expect(error?.message).toContain('No se puede editar la cantidad')

    await cleanup([requestId], [tripId])
  })

  test('edit_quantity_allowed_without_assignments', async () => {
    const { requestId, lineIds: [lineId] } = await seedSolicitudWithLines([{ quantity: 10 }])
    // Sin assignments

    const { error } = await admin
      .from('sm_request_lines')
      .update({ quantity: 15 })
      .eq('id', lineId)

    expect(error).toBeNull()

    const line = await getLineStatus(lineId)
    expect(line.quantity).toBe(15)

    await cleanup([requestId], [])
  })
})

// ─────────────────────────────────────────────────────────────────────
// H7 + H8 — CHECK constraints
// ─────────────────────────────────────────────────────────────────────

test.describe('H7 H8 CHECK constraints', () => {
  test('qty_dispatched_cannot_exceed_assigned', async () => {
    const { requestId, lineIds: [lineId] } = await seedSolicitudWithLines([{ quantity: 10 }])
    const { tripId } = await seedTripWithAssignment(lineId, 5)

    const { error } = await admin
      .from('trip_line_assignments')
      .update({ qty_dispatched: 6 })  // > quantity_assigned=5
      .eq('trip_id', tripId)
      .eq('request_line_id', lineId)

    expect(error).not.toBeNull()
    expect(error?.message).toContain('qty_dispatched_le_assigned')

    await cleanup([requestId], [tripId])
  })

  test('qty_delivered_cannot_exceed_dispatched', async () => {
    const { requestId, lineIds: [lineId] } = await seedSolicitudWithLines([{ quantity: 10 }])
    const { tripId } = await seedTripWithAssignment(lineId, 10)
    await dispatchTrip(tripId, lineId, 5)  // dispatched=5

    const { error } = await admin
      .from('trip_line_assignments')
      .update({ qty_delivered: 6 })  // > qty_dispatched=5
      .eq('trip_id', tripId)
      .eq('request_line_id', lineId)

    expect(error).not.toBeNull()
    expect(error?.message).toContain('qty_delivered_le_dispatched')

    await cleanup([requestId], [tripId])
  })
})

// ─────────────────────────────────────────────────────────────────────
// Tarifa obligatoria
// ─────────────────────────────────────────────────────────────────────

test.describe('Tarifa obligatoria rate_id NOT NULL', () => {
  test('create_trip_without_rate_blocked', async () => {
    const { error } = await admin.from('trips').insert({
      scheduled_date: new Date().toISOString().slice(0, 10),
      driver_id: null,
      vehicle_id: null,
      trailer_id: null,
      rate_id: null,  // NOT NULL violation
      cost: null,
      created_by: CHARRIS_ID,
      status: 'Programado',
    })

    expect(error).not.toBeNull()
    expect(error?.message).toContain('null value in column "rate_id"')
  })

  test('edit_trip_remove_rate_blocked', async () => {
    const { data: trip } = await admin.from('trips').insert({
      scheduled_date: new Date().toISOString().slice(0, 10),
      driver_id: null,
      vehicle_id: null,
      trailer_id: null,
      rate_id: RATE_ID,
      cost: 100,
      created_by: CHARRIS_ID,
      status: 'Programado',
    }).select('id').single()

    const { error } = await admin
      .from('trips')
      .update({ rate_id: null })
      .eq('id', trip!.id)

    expect(error).not.toBeNull()
    expect(error?.message).toContain('null value in column "rate_id"')

    await admin.from('trips').delete().eq('id', trip!.id)
  })
})

// ─────────────────────────────────────────────────────────────────────
// Test #18 — D8 H8 vs revert Salida
// ─────────────────────────────────────────────────────────────────────

test.describe('D8 revert Salida con Entregas', () => {
  test('revert_salida_blocked_when_deliveries_exist', async () => {
    const { requestId, lineIds: [lineId] } = await seedSolicitudWithLines([{ quantity: 10 }])
    const { tripId } = await seedTripWithAssignment(lineId, 10)
    await dispatchTrip(tripId, lineId, 10)
    await deliverInTrip(tripId, lineId, 4)  // Entrega activa

    // Intentar revertir Salida (UPDATE qty_dispatched=0) → H8 rechaza
    const { error } = await admin
      .from('trip_line_assignments')
      .update({ qty_dispatched: 0 })
      .eq('trip_id', tripId)
      .eq('request_line_id', lineId)

    expect(error).not.toBeNull()
    expect(error?.message).toContain('qty_delivered_le_dispatched')

    // Tras revertir Entrega (qty_delivered=0), revert Salida funciona
    await admin.from('trip_line_assignments').update({ qty_delivered: 0 }).eq('trip_id', tripId).eq('request_line_id', lineId)
    const { error: errAfterRevertDelivery } = await admin
      .from('trip_line_assignments')
      .update({ qty_dispatched: 0 })
      .eq('trip_id', tripId)
      .eq('request_line_id', lineId)

    expect(errAfterRevertDelivery).toBeNull()

    await cleanup([requestId], [tripId])
  })
})
```

- [ ] **Step 2: Configurar `.env.test` con seed IDs (si no existen)**

Documentar en plan que James necesita:

```env
TEST_CHARRIS_ID=<uuid de Charris en staging>
TEST_PROJECT_ID=<uuid de proyecto 26-604>
TEST_PM_ID=<uuid de un PM seed>
TEST_RATE_ID=<uuid de una tarifa seed>
SUPABASE_SERVICE_ROLE_KEY=<de Supabase staging settings>
```

Si no existen seeds: crear via `/admin/masters` UI o seed manual (NO scope de este plan — pre-requisito).

- [ ] **Step 3: Run baseline test suite (RED — algunos pasan, otros fallan)**

```bash
npx playwright test tests/cambio6-integrity.spec.ts --reporter=list
```

Expected baseline post-T1+T2 (sin code changes T4-T9):
- ✅ Pasan (BD-driven): #5 multi_entrega_blocked, #6 multi_entrega_allowed_after_revert, #12 edit_quantity_blocked, #13 edit_quantity_allowed, #14 qty_dispatched, #15 qty_delivered, #16 create_trip_without_rate, #17 edit_trip_remove_rate, #18 revert_salida_blocked
- ❌ Fallan (code-driven, hasta T4-T9): #1, #2, #3 (cancel_trip preserves), #4 (zombie), #7, #8 (cancel pickup/external preserves), #9 (idempotent), #10, #11 (invariantes globales)

Documentar baseline en notas del task.

- [ ] **Step 4: Commit**

```bash
git add tests/cambio6-integrity.spec.ts
git commit -m "test: tests E2E suite Cambio 6 (18 tests regression guard)

Suite con seed manual (AD-5 helpers existentes están rotos).
Baseline post-T1+T2: 9 tests pasan (BD-driven), 9 fallan
(code-driven, fixes en T4-T9).

Tests agrupados por bug con describe blocks:
  - Bug #1 cancel preservation (3 tests)
  - Bug #2 trigger zombie prevention (1 test)
  - Bug #4 multi-entrega (2 tests)
  - Audit pickup/external regression (3 tests)
  - Invariantes globales (2 tests)
  - H1 quantity immutable (2 tests)
  - H7+H8 CHECK constraints (2 tests)
  - Tarifa obligatoria (2 tests)
  - D8 revert Salida (1 test)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Fix Bug #1 — `useTrips.cancelTrip` refactor + caller update

**Goal:** `cancelTrip` no borra `trip_line_assignments`, acepta `cancellationReason`, caller en `programacion/viaje/[id]/page.tsx` lo provee.

**Files:**
- Modify: `src/hooks/useTrips.ts:957-1005` (función `cancelTrip`)
- Modify: `src/app/(app)/programacion/viaje/[id]/page.tsx:622-628` (caller `handleCancelTrip`)

**Acceptance Criteria:**
- [ ] `cancelTrip(id, cancellationReason)` no contiene `DELETE FROM trip_line_assignments`.
- [ ] UPDATE incluye `cancellation_reason: cancellationReason?.trim() || null`.
- [ ] Si BD rechaza con mensaje "cancellation_reason requerido", `setSaveError` muestra mensaje user-friendly.
- [ ] `handleCancelTrip` recibe reason del modal extendido (T8) y la pasa.
- [ ] Tests E2E #1, #2, #3, #10 pasan post-T4.

**Verify:** `npx playwright test tests/cambio6-integrity.spec.ts -g "cancel_trip|backlog_calculation" --reporter=list` → 4 tests pasan.

**Steps:**

- [ ] **Step 1: Modificar `cancelTrip` en `src/hooks/useTrips.ts`**

```typescript
const cancelTrip = useCallback(
  async (id: string, cancellationReason: string | null): Promise<boolean> => {
    if (busyRef.current) return false
    busyRef.current = true
    setSaving(true)
    setSaveError(null)

    try {
      // Cambio 6 Bug #1 fix: NO MORE DELETE assignments.
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
        // Trigger BD enforce_cancellation_reason_trips puede rechazar
        // si qty_delivered>0 y razón inválida.
        const friendly = cancelError.message.includes('cancellation_reason requerido')
          ? 'Debes proveer una razón (≥10 caracteres) para cancelar este viaje porque tiene entregas registradas.'
          : cancelError.message
        setSaveError(friendly)
        return false
      }

      notifyViajeCancelado(id).catch(console.error)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado al cancelar viaje'
      setSaveError(message)
      return false
    } finally {
      busyRef.current = false
      setSaving(false)
    }
  },
  [supabase],
)
```

- [ ] **Step 2: Modificar `handleCancelTrip` en `src/app/(app)/programacion/viaje/[id]/page.tsx`**

```typescript
// El estado para el modal extendido (la lógica del modal está en T8)
const [cancelReason, setCancelReason] = useState('')

// --- Cancelar viaje ---
const handleCancelTrip = guard(async () => {
  if (!trip) return
  const success = await cancelTrip(trip.id, cancelReason.trim() || null)
  if (success) {
    router.push('/programacion')
  }
})
```

- [ ] **Step 3: Build verify**

```bash
npm run build 2>&1 | tail -10
```
Expected: `✓ Compiled successfully`. TypeScript fuerza la actualización del signature (R1 mitigation).

- [ ] **Step 4: Run targeted tests**

```bash
npx playwright test tests/cambio6-integrity.spec.ts -g "cancel_trip|backlog_calculation|line_status" --reporter=list
```
Expected: 4-5 tests pasan (cancel_trip × 3 + backlog × 1 + line_status × 1).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useTrips.ts "src/app/(app)/programacion/viaje/[id]/page.tsx"
git commit -m "fix: Cambio 6 Bug #1 — cancelTrip preserva trip_line_assignments

useTrips.cancelTrip ya no hace DELETE de trip_line_assignments. Solo
UPDATE status='Cancelado' + cancellation_reason. Trigger
trg_recalc_from_trip_status_change recalcula líneas automáticamente.

Caller programacion/viaje/[id]/page.tsx pasa cancelReason al hook.
Lógica del modal con razón viene en T8.

Tests E2E que pasan post-T4:
  - cancel_trip_with_partial_delivery_preserves_qty
  - cancel_trip_with_full_delivery_preserves_qty
  - cancel_trip_with_zero_delivery_releases_to_backlog
  - backlog_calculation_consistent_after_cancel
  - line_status_consistent_with_qty

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Fix Bug #4 + D8 — `handleDelivery` error UX + `handleRevert` Salida pre-flight

**Goal:** UX claro cuando el trigger Bug #4 rechaza un INSERT duplicado de Entrega + pre-flight check antes de UPDATE bulk en revert Salida que evita el error genérico de constraint H8.

**Files:**
- Modify: `src/app/(app)/mis-viajes/[id]/page.tsx` — `handleDelivery` catch + `handleRevert` Salida branch

**Acceptance Criteria:**
- [ ] `handleDelivery` catch detecta substring "ya tiene una Entrega activa" y muestra mensaje user-friendly.
- [ ] `handleRevert` con `eventType==='Salida'` hace pre-flight `trip.assignments.filter(a => a.qty_delivered > 0)` antes del UPDATE.
- [ ] Si hay líneas con qty_delivered>0, aborta con mensaje claro (no llega al UPDATE bulk).
- [ ] Test E2E #18 (`revert_salida_blocked_when_deliveries_exist`) pasa con error claro de constraint (BD-driven, ya pasaba).
- [ ] Test manual confirma mensaje UX claro al usuario (no error genérico de constraint).

**Verify:** `npm run build` verde. Test manual: navegar a `/mis-viajes/[id]` post-Salida + Entrega registrada, intentar revertir Salida → mensaje claro, no constraint error.

**Steps:**

- [ ] **Step 1: Modificar catch en `handleDelivery`**

Buscar en `src/app/(app)/mis-viajes/[id]/page.tsx` el bloque catch al final de `handleDelivery` (línea ~780-786):

```typescript
} catch (err) {
  const errMsg = err instanceof Error ? err.message : 'Error al registrar entrega'
  // Cambio 6 Bug #4: trigger BD enforce_one_active_delivery_trg rechaza
  // segundo INSERT en trip_event_lines si ya hay Entrega no-revertida.
  if (errMsg.includes('ya tiene una Entrega activa')) {
    setEventError('Esta línea ya fue entregada en este viaje. Reversá la Entrega anterior primero si necesitás corregir.')
  } else {
    setEventError(errMsg)
  }
} finally {
  setDelivering(false)
}
```

- [ ] **Step 2: Pre-flight check en `handleRevert` branch Salida**

Buscar el bloque `if (eventType === 'Salida') {` (línea ~842-858) y modificar:

```typescript
if (eventType === 'Salida') {
  // Cambio 6 D8 pre-flight: H8 constraint rechazaría UPDATE qty_dispatched=0
  // si hay qty_delivered>0. Damos mensaje claro al usuario antes de que
  // la BD falle con error genérico de constraint.
  const linesWithDeliveries = trip.assignments.filter((a) => (a.qty_delivered ?? 0) > 0)
  if (linesWithDeliveries.length > 0) {
    setEventError(
      `Para revertir Salida, reversá primero las Entregas registradas. Hay ${linesWithDeliveries.length} línea${linesWithDeliveries.length === 1 ? '' : 's'} con entregas activas en este viaje.`,
    )
    setReverting(false)
    return
  }

  // Trip → Programado
  await supabase
    .from('trips')
    .update({ status: 'Programado', actual_departure: null })
    .eq('id', trip.id)

  // Reset qty_dispatched en assignments. El trigger BD recalc_qty_for_line
  // se dispara al UPDATE y reconcilia qty_scheduled + status='Programada'
  // en sm_request_lines.
  for (const a of trip.assignments) {
    await supabase
      .from('trip_line_assignments')
      .update({ qty_dispatched: 0 })
      .eq('trip_id', trip.id)
      .eq('request_line_id', a.request_line_id)
  }
}
```

- [ ] **Step 3: Build verify**

```bash
npm run build 2>&1 | tail -5
```
Expected: `✓ Compiled successfully`.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/mis-viajes/[id]/page.tsx"
git commit -m "fix: Cambio 6 Bug #4 + D8 — UX errors handleDelivery + revert Salida

Bug #4 (handleDelivery catch): si trigger BD rechaza segundo INSERT en
trip_event_lines con 'ya tiene una Entrega activa', muestro mensaje
específico al usuario en lugar del error genérico.

D8 (handleRevert Salida pre-flight): antes del UPDATE bulk
qty_dispatched=0, detecto líneas con qty_delivered>0 y aborto con
mensaje claro. Sin pre-flight, el UPDATE fallaría con error genérico
del constraint H8 (qty_delivered_le_dispatched).

Comportamiento semántico: para revertir Salida, reversá primero las
Entregas registradas. Coherente con modelo Events V2.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Fix Bug #4 defense-in-depth — `DeliveryModal` filter UI

**Goal:** Modal lista todas las líneas del trip; las que tienen Entrega activa (no revertida) aparecen greyed disabled con badge `✓ Entregada — {qty} a {receptor}` y tooltip explicativo.

**Files:**
- Modify: `src/components/viajes/DeliveryModal.tsx`

**Acceptance Criteria:**
- [ ] Pre-flight SELECT `trip_event_lines` + `trip_events` con filtro Entrega activa no-revertida.
- [ ] Set `alreadyDeliveredLineIds` calculado desde el SELECT.
- [ ] Líneas en el set: checkbox `disabled`, badge "✓ Entregada — {qty} a {receptor}", tooltip "Entregada {fecha}. Para corregir, reversá la Entrega anterior primero.".
- [ ] Líneas NO en el set: checkbox normal, comportamiento previo.
- [ ] Visual confirmado vía Playwright snapshot.

**Verify:** `npm run build` verde. Visual test manual: trip con 1 Entrega registrada → DeliveryModal abierto muestra esa línea greyed disabled con badge.

**Steps:**

- [ ] **Step 1: Read `src/components/viajes/DeliveryModal.tsx` completo para mapear secciones**

```bash
# Read tool con offset/limit segun necesidad
```

- [ ] **Step 2: Agregar pre-flight SELECT al `useEffect` de mount o al click handler que abre el modal**

```typescript
// En el componente o useEffect de mount, post receive props { trip }:
const [alreadyDeliveredLineIds, setAlreadyDeliveredLineIds] = useState<Map<string, { qty: number; receivedBy: string; date: string }>>(new Map())

useEffect(() => {
  if (!trip || !isOpen) return

  async function loadActiveDeliveries() {
    // SELECT trip_event_lines de eventos Entrega no-revertidos
    const { data: events } = await supabase
      .from('trip_events')
      .select(`
        id,
        event_timestamp,
        received_by_name,
        reverts_event_id,
        trip_event_lines(request_line_id, quantity)
      `)
      .eq('trip_id', trip.id)
      .eq('event_type', 'Entrega')

    if (!events) return

    // Filtrar: events que son Entrega + no son Reversion + no fueron revertidos
    const reversionTargets = new Set(
      events.filter((e) => e.reverts_event_id).map((e) => e.reverts_event_id),
    )

    const map = new Map<string, { qty: number; receivedBy: string; date: string }>()
    for (const ev of events) {
      if (ev.reverts_event_id) continue  // skip Reversiones
      if (reversionTargets.has(ev.id)) continue  // skip eventos revertidos
      const lines = ev.trip_event_lines as Array<{ request_line_id: string; quantity: number }> | null
      if (!lines) continue
      for (const tel of lines) {
        map.set(tel.request_line_id, {
          qty: tel.quantity,
          receivedBy: ev.received_by_name ?? '(no captado)',
          date: ev.event_timestamp,
        })
      }
    }
    setAlreadyDeliveredLineIds(map)
  }

  void loadActiveDeliveries()
}, [trip, isOpen, supabase])
```

- [ ] **Step 3: Modificar render de cada línea**

En el bucle `trip.assignments.map((a) => ...)` o equivalente:

```typescript
{trip.assignments.map((a) => {
  const alreadyDelivered = alreadyDeliveredLineIds.get(a.request_line_id)
  const isDisabled = !!alreadyDelivered

  return (
    <div
      key={a.id}
      className={`flex items-start gap-3 rounded-lg border p-3 ${
        isDisabled ? 'border-gray-200 bg-gray-50 opacity-60' : 'border-gray-200 bg-white'
      }`}
    >
      <input
        type="checkbox"
        checked={isDisabled ? false : selected.has(a.request_line_id)}
        disabled={isDisabled}
        onChange={() => toggleLine(a.request_line_id)}
      />
      <div className="flex-1">
        <p className={`text-sm font-medium ${isDisabled ? 'text-gray-500' : 'text-gray-900'}`}>
          {a.line.description}
        </p>
        {alreadyDelivered ? (
          <p
            className="text-xs text-emerald-700 mt-1"
            title={`Entregada ${formatDate(alreadyDelivered.date)}. Para corregir, reversá la Entrega anterior primero.`}
          >
            ✓ Entregada — {formatQty(alreadyDelivered.qty)} a {alreadyDelivered.receivedBy}
          </p>
        ) : (
          // ... render existente para líneas no entregadas (qty input, observation, etc.)
        )}
      </div>
    </div>
  )
})}
```

- [ ] **Step 4: Build verify**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 5: Commit**

```bash
git add src/components/viajes/DeliveryModal.tsx
git commit -m "fix: Cambio 6 Bug #4 defense-in-depth — DeliveryModal filter UI

Modal hace pre-flight SELECT de trip_event_lines de eventos Entrega
activos (no-revertidos) al montarse. Las líneas con Entrega activa
se renderizan greyed disabled con badge:
  ✓ Entregada — {cantidad} a {receptor}

Tooltip: 'Entregada {fecha}. Para corregir, reversá la Entrega
anterior primero.'

UX: Charris ve progreso del trip operativo (consistencia con
DispatchModal que también muestra todas las líneas). Defense-in-depth
sobre el trigger BD (Bug #4) — el trigger es la fuente de verdad,
el UI evita que el usuario llegue al error en el primer lugar.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Tarifa obligatoria — `saveTrip` + `updateTrip` + validate

**Goal:** Crear/editar trip rechaza `rate_id=null` con mensaje claro. `validate()` en ambas pages bloquea submit. `saveTrip`/`updateTrip` agregan defense-in-depth.

**Files:**
- Modify: `src/hooks/useTrips.ts:749-859` (`saveTrip` y `updateTrip`)
- Modify: `src/app/(app)/programacion/viaje/nuevo/page.tsx` (validate)
- Modify: `src/app/(app)/programacion/viaje/[id]/page.tsx` (validate)

**Acceptance Criteria:**
- [ ] `saveTrip` valida `rate_id` no-null antes del INSERT con mensaje "La tarifa es obligatoria.".
- [ ] `updateTrip` valida `rate_id` no-null antes del UPDATE con mismo mensaje.
- [ ] `validate()` en nuevo + edit page setea error si `rateId == null`, bloquea submit.
- [ ] Cost > 0 también validado (defense-in-depth, ya implementado pero confirmar).
- [ ] Tests E2E #16, #17 pasan (BD-driven, ya pasaban; ahora también UX bloquea antes).

**Verify:** `npx playwright test tests/cambio6-integrity.spec.ts -g "create_trip_without_rate|edit_trip_remove_rate" --reporter=list` → 2 tests pasan. Build verde.

**Steps:**

- [ ] **Step 1: Modificar `saveTrip` en `src/hooks/useTrips.ts`**

Agregar validación al inicio del try:

```typescript
const saveTrip = useCallback(
  async (input: TripInput, lines: LineAssignmentInput[]): Promise<string | null> => {
    if (busyRef.current) return null
    busyRef.current = true
    setSaving(true)
    setSaveError(null)

    try {
      // Cambio 6: tarifa obligatoria (defense-in-depth, también validado en frontend)
      if (!input.rate_id) {
        setSaveError('La tarifa es obligatoria.')
        return null
      }
      if (input.cost == null || input.cost <= 0) {
        setSaveError('El costo debe ser mayor a cero.')
        return null
      }

      // ... resto del saveTrip existente
    }
  }
)
```

- [ ] **Step 2: Modificar `updateTrip` en `src/hooks/useTrips.ts`**

Mismo patrón:

```typescript
const updateTrip = useCallback(
  async (id: string, input: TripInput, ...): Promise<boolean> => {
    if (busyRef.current) return false
    busyRef.current = true
    setSaving(true)
    setSaveError(null)

    try {
      // Cambio 6: tarifa obligatoria
      if (!input.rate_id) {
        setSaveError('La tarifa es obligatoria.')
        return false
      }
      if (input.cost == null || input.cost <= 0) {
        setSaveError('El costo debe ser mayor a cero.')
        return false
      }

      // ... resto del updateTrip existente
    }
  }
)
```

- [ ] **Step 3: Modificar `validate()` en `src/app/(app)/programacion/viaje/nuevo/page.tsx`**

Buscar la función `validate()` y agregar:

```typescript
const validate = useCallback((): { valid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {}

  // ... validaciones existentes (driverId, vehicleId, etc.)

  // Cambio 6: tarifa obligatoria
  if (!tripData.rate_id) {
    errors.rate_id = 'La tarifa es obligatoria.'
  }
  if (tripData.cost == null || tripData.cost <= 0) {
    errors.cost = 'El costo debe ser mayor a cero.'
  }

  return { valid: Object.keys(errors).length === 0, errors }
}, [tripData /* + deps */])
```

- [ ] **Step 4: Mismo cambio en `src/app/(app)/programacion/viaje/[id]/page.tsx`**

Identical change to validate(). Confirmar que ambas pages tienen la misma function shape y que la validación se aplica.

- [ ] **Step 5: Build verify**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 6: Run targeted tests**

```bash
npx playwright test tests/cambio6-integrity.spec.ts -g "rate" --reporter=list
```
Expected: 2 tests pasan.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useTrips.ts "src/app/(app)/programacion/viaje/nuevo/page.tsx" "src/app/(app)/programacion/viaje/[id]/page.tsx"
git commit -m "feat: Cambio 6 — tarifa obligatoria en trips

useTrips.saveTrip y updateTrip validan rate_id no-null antes del
INSERT/UPDATE con mensaje 'La tarifa es obligatoria.'. Validación cost
> 0 mantiene defense-in-depth.

validate() en /programacion/viaje/nuevo/page.tsx y .../[id]/page.tsx
agrega rate_id required check para bloquear submit en frontend.

CHECK constraint BD trips.rate_id NOT NULL (T1) es la fuente de
verdad — frontend valida primero por UX, BD ataja si frontend falla.

Tests E2E:
  - create_trip_without_rate_blocked
  - edit_trip_remove_rate_blocked

CLAUDE.md regla #9 update viene en T10.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Cancel modals con razón (3 lugares inline)

**Goal:** Los 3 cancel modals inline (trip + pickup_order + external_order) extienden con `<textarea>` requerido condicional según `qty_delivered>0`. Botón disabled hasta razón válida ≥10 chars cuando es requerida.

**Files:**
- Modify: `src/app/(app)/programacion/viaje/[id]/page.tsx` (modal inline cancel trip)
- Modify: `src/app/(app)/programacion/page.tsx` (modales inline cancel pickup + external)
- Modify: `src/app/(app)/solicitudes/[id]/page.tsx` (modales inline cancel pickup + external)

**Acceptance Criteria:**
- [ ] Modal cancel trip muestra textarea + counter chars cuando hay líneas con `qty_delivered>0` (`stats.deliveredCount > 0`).
- [ ] Si `deliveredCount=0`, textarea es opcional (sin asterisco, placeholder "Razón opcional...").
- [ ] Botón "Cancelar movilización" disabled si `requiresReason && reason.trim().length < 10`.
- [ ] Mismo patrón para `cancelPickupOrder` y `cancelExternalOrder` inline modals (5 lugares totales: 1 trip + 2 pickup + 2 external).
- [ ] Mensaje contextual cuando hay deliveries: "Este viaje tiene N líneas con M unidades entregadas. El histórico se preserva. La razón es obligatoria."

**Verify:** Visual manual con Playwright: cancelar trip post-Entrega → modal abre, botón disabled hasta escribir 10 chars; cancelar trip Programado sin Salida → botón habilitado de inicio.

**Steps:**

- [ ] **Step 1: Pre-flight stats en `programacion/viaje/[id]/page.tsx`**

Calcular stats al abrir el modal (en `setShowCancelConfirm(true)` callback o en useEffect cuando `showCancelConfirm`):

```typescript
const [showCancelConfirm, setShowCancelConfirm] = useState(false)
const [cancelStats, setCancelStats] = useState<{ deliveredCount: number; deliveredQty: number }>({ deliveredCount: 0, deliveredQty: 0 })
const [cancelReason, setCancelReason] = useState('')

const handleOpenCancelConfirm = useCallback(() => {
  if (!trip) return
  const lines = trip.assignments.filter((a) => (a.qty_delivered ?? 0) > 0)
  setCancelStats({
    deliveredCount: lines.length,
    deliveredQty: lines.reduce((sum, a) => sum + (a.qty_delivered ?? 0), 0),
  })
  setCancelReason('')
  setShowCancelConfirm(true)
}, [trip])

// El botón "Cancelar viaje" en el header llama setShowCancelConfirm(true) — cambiarlo a handleOpenCancelConfirm
```

- [ ] **Step 2: Extender el modal inline (~líneas 911-943) en `programacion/viaje/[id]/page.tsx`**

Reemplazar el modal existente con la versión extendida:

```typescript
{showCancelConfirm && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
      <h3 className="text-lg font-semibold text-gray-900">
        Cancelar Movilización
      </h3>

      {cancelStats.deliveredCount > 0 ? (
        <p className="mt-2 text-sm text-amber-700">
          Este viaje tiene <strong>{cancelStats.deliveredCount} línea{cancelStats.deliveredCount === 1 ? '' : 's'}</strong> con <strong>{formatQty(cancelStats.deliveredQty)} unidades</strong> entregadas. El histórico se preserva. La razón es obligatoria.
        </p>
      ) : (
        <p className="mt-2 text-sm text-gray-600">
          ¿Estás seguro de que querés cancelar esta movilización? Las líneas asignadas vuelven al backlog como pendientes.
        </p>
      )}

      <div className="mt-4">
        <label htmlFor="cancel-reason" className="mb-1 block text-sm font-medium text-gray-700">
          Razón de cancelación
          {cancelStats.deliveredCount > 0 && <span className="text-red-600"> *</span>}
        </label>
        <textarea
          id="cancel-reason"
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          placeholder={cancelStats.deliveredCount > 0 ? 'Razón de cancelación (mínimo 10 caracteres)...' : 'Razón opcional...'}
          rows={3}
          maxLength={500}
          disabled={saving}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue"
        />
        {cancelStats.deliveredCount > 0 && (
          <p className="mt-1 text-xs text-iconsa-gray">
            {cancelReason.trim().length}/10 caracteres mínimos
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-end gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowCancelConfirm(false)}
          disabled={saving}
        >
          No, volver
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={handleCancelTrip}
          loading={saving}
          disabled={cancelStats.deliveredCount > 0 && cancelReason.trim().length < 10}
        >
          Sí, cancelar movilización
        </Button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 3: Modal cancel pickup en `programacion/page.tsx`**

Buscar el bloque que renderiza `cancelPickupModal` (~líneas 1200-1230). Agregar estado de razón paralelo + pre-flight stats ya existentes:

```typescript
const [cancelPickupReason, setCancelPickupReason] = useState('')

// Reset al abrir
const handleOpenCancelPickup = useCallback(
  (order: PickupOrderWithLines) => {
    setCancelPickupReason('')
    setCancelPickupModal({
      orderId: order.id,
      pickupId: order.pickup_id,
      stats: {
        deliveredCount: order.lines.filter((l) => l.qty_delivered > 0).length,
        deliveredQty: order.lines.reduce((sum, l) => sum + l.qty_delivered, 0),
      },
    })
  },
  [],
)

// confirmCancelPickup: pasa razón
const confirmCancelPickup = useCallback(async () => {
  if (!cancelPickupModal || !person?.id) return
  const result = await pickupOrders.cancelPickupOrder(
    cancelPickupModal.orderId,
    person.id,
    cancelPickupReason.trim() || null,
  )
  if (result.ok) {
    setCancelPickupModal(null)
    void refetchPendingPickupOrders()
    refetchBacklog()
  }
}, [cancelPickupModal, person, pickupOrders, cancelPickupReason, refetchPendingPickupOrders, refetchBacklog])
```

Y el render del modal:

```typescript
{cancelPickupModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
      <h3 className="text-lg font-semibold text-gray-900">
        Cancelar pickup {cancelPickupModal.pickupId}
      </h3>

      {cancelPickupModal.stats.deliveredCount > 0 ? (
        <p className="mt-2 text-sm text-amber-700">
          Este pickup tiene <strong>{cancelPickupModal.stats.deliveredCount} línea{cancelPickupModal.stats.deliveredCount === 1 ? '' : 's'}</strong> con <strong>{formatQty(cancelPickupModal.stats.deliveredQty)} unidades</strong> entregadas. El histórico se preserva. La razón es obligatoria.
        </p>
      ) : (
        <p className="mt-2 text-sm text-gray-600">¿Estás seguro de cancelar este pickup?</p>
      )}

      <div className="mt-4">
        <label htmlFor="cancel-pickup-reason" className="mb-1 block text-sm font-medium text-gray-700">
          Razón de cancelación
          {cancelPickupModal.stats.deliveredCount > 0 && <span className="text-red-600"> *</span>}
        </label>
        <textarea
          id="cancel-pickup-reason"
          value={cancelPickupReason}
          onChange={(e) => setCancelPickupReason(e.target.value)}
          placeholder={cancelPickupModal.stats.deliveredCount > 0 ? 'Razón de cancelación (mínimo 10 caracteres)...' : 'Razón opcional...'}
          rows={3}
          maxLength={500}
          disabled={pickupOrders.loading}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue"
        />
        {cancelPickupModal.stats.deliveredCount > 0 && (
          <p className="mt-1 text-xs text-iconsa-gray">
            {cancelPickupReason.trim().length}/10 caracteres mínimos
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-end gap-3">
        <Button variant="ghost" size="sm" onClick={() => setCancelPickupModal(null)} disabled={pickupOrders.loading}>
          No, volver
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={confirmCancelPickup}
          loading={pickupOrders.loading}
          disabled={cancelPickupModal.stats.deliveredCount > 0 && cancelPickupReason.trim().length < 10}
        >
          Sí, cancelar pickup
        </Button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 4: Modal cancel external en `programacion/page.tsx`**

Patrón paralelo. `cancelExternalReason` state + render extendido idéntico (cambiar "pickup" → "viaje externo" en copy).

- [ ] **Step 5: Mismo patrón en `solicitudes/[id]/page.tsx`**

Si la page renderiza modales cancel inline (T8 Cambio 5 los introdujo), aplicar el mismo cambio. Si delega a programacion/page handlers, no hay nada que tocar acá. Verificar con grep.

- [ ] **Step 6: Build verify**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 7: Commit**

```bash
git add "src/app/(app)/programacion/viaje/[id]/page.tsx" "src/app/(app)/programacion/page.tsx" "src/app/(app)/solicitudes/[id]/page.tsx"
git commit -m "feat: Cambio 6 — cancel modals con razón condicional ≥10 chars

Los 3 cancel modals inline (trip + pickup_order + external_order)
extienden con textarea requerido cuando deliveredCount > 0.

UX:
  - deliveredCount=0: textarea opcional (sin asterisco)
  - deliveredCount>0: textarea required ≥10 chars, contador visible,
                      botón disabled hasta válido.

Stats pre-flight ya existían en pickup/external (Cambio 5 T7).
Nuevo: stats pre-flight en cancel trip modal de programacion/viaje/[id].

Trigger BD enforce_cancellation_reason_* (T1) ataja en defense-in-depth.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: `cancellationReason` param en hooks pickup/external + callers

**Goal:** `usePickupOrders.cancelPickupOrder` y `useExternalOrders.cancelExternalOrder` aceptan `cancellationReason: string | null`. UPDATE incluye campo. Callers actualizados.

**Files:**
- Modify: `src/hooks/usePickupOrders.ts:299-353` (`cancelPickupOrder`)
- Modify: `src/hooks/useExternalOrders.ts:288-340` (`cancelExternalOrder`)
- Callers ya actualizados en T8 (programacion/page.tsx + solicitudes/[id]/page.tsx)

**Acceptance Criteria:**
- [ ] `cancelPickupOrder(orderId, cancelledById, cancellationReason)` con nuevo param.
- [ ] UPDATE incluye `cancellation_reason: cancellationReason?.trim() || null`.
- [ ] `cancelExternalOrder` paralelo.
- [ ] Si BD rechaza con "cancellation_reason requerido", error mostrado user-friendly.
- [ ] Tests E2E #7, #8 pasan (regression guard).

**Verify:** `npx playwright test tests/cambio6-integrity.spec.ts -g "cancel_pickup|cancel_external" --reporter=list` → 2 tests pasan.

**Steps:**

- [ ] **Step 1: Modificar `cancelPickupOrder` en `src/hooks/usePickupOrders.ts`**

```typescript
const cancelPickupOrder = useCallback(
  async (
    orderId: string,
    cancelledById: string,
    cancellationReason: string | null,
  ): Promise<CancelPickupResult> => {
    setLoading(true)
    setError(null)

    try {
      // Pre-flight stats (sin cambio)
      const { data: lines, error: fetchError } = await supabase
        .from('pickup_order_lines')
        .select('id, qty_delivered')
        .eq('pickup_order_id', orderId)

      if (fetchError || !lines) {
        const msg = fetchError?.message ?? 'Pickup order no encontrado'
        setError(msg)
        return { ok: false, error: msg }
      }

      const deliveredLines = lines.filter((l) => (l.qty_delivered ?? 0) > 0)
      const deliveredCount = deliveredLines.length
      const deliveredQty = deliveredLines.reduce((sum, l) => sum + (l.qty_delivered ?? 0), 0)

      // UPDATE con cancellation_reason
      const { error: updateError } = await supabase
        .from('pickup_orders')
        .update({
          status: 'Cancelado',
          cancelled_at: new Date().toISOString(),
          cancelled_by: cancelledById,
          cancellation_reason: cancellationReason?.trim() || null,
        })
        .eq('id', orderId)
        .eq('status', 'Aprobado')
        .select('id')

      if (updateError) {
        const friendly = updateError.message.includes('cancellation_reason requerido')
          ? 'Debes proveer una razón (≥10 caracteres) para cancelar este pickup porque tiene entregas registradas.'
          : updateError.message
        setError(friendly)
        return { ok: false, error: friendly }
      }

      return { ok: true, deliveredCount, deliveredQty }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado al cancelar pickup order'
      setError(message)
      return { ok: false, error: message }
    } finally {
      setLoading(false)
    }
  },
  [supabase],
)
```

- [ ] **Step 2: Modificar `cancelExternalOrder` en `src/hooks/useExternalOrders.ts`**

Patrón idéntico. UPDATE incluye `cancellation_reason`. Mismo error handling. NO setea `invoice_attachments` a NULL (preservar Q4 Cambio 4).

- [ ] **Step 3: Build verify**

```bash
npm run build 2>&1 | tail -5
```

TypeScript fuerza la actualización de los callers (programacion/page.tsx + solicitudes/[id]/page.tsx — ya tocados en T8 con el state `cancelPickupReason` y `cancelExternalReason`).

- [ ] **Step 4: Run targeted tests**

```bash
npx playwright test tests/cambio6-integrity.spec.ts -g "cancel_pickup|cancel_external|complete_pickup" --reporter=list
```
Expected: 3 tests pasan.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/usePickupOrders.ts src/hooks/useExternalOrders.ts
git commit -m "feat: Cambio 6 — cancellationReason param en cancel pickup/external orders

usePickupOrders.cancelPickupOrder y useExternalOrders.cancelExternalOrder
agregan parámetro cancellationReason: string | null. UPDATE incluye el
campo. Trigger BD enforce_cancellation_reason_pickup_orders/external_orders
(T1) ataja en defense-in-depth si frontend bypassa.

Error message friendly cuando trigger BD rechaza.

Tests E2E:
  - cancel_pickup_preserves_qty
  - cancel_external_preserves_qty
  - complete_pickup_idempotent

Auditoría confirma: pickup/external NO replican Bug #1 (no DELETE
order_lines en cancel) ni Bug #4 (idempotencia via .eq('status',
'Aprobado') WHERE defensive).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: `CLAUDE.md` regla #9 update

**Goal:** Convención del proyecto refleja que tarifa es obligatoria.

**Files:**
- Modify: `CLAUDE.md` (sección "Reglas Críticas", regla #9)

**Acceptance Criteria:**
- [ ] Regla #9 actualizada de "Tarifa y Costo OPCIONALES" a "Tarifa OBLIGATORIA. Costo se auto-rellena con rate.amount y es read-only mientras haya tarifa.".
- [ ] Nota de cambio 2026-04-29 (Cambio 6) agregada.

**Verify:** `grep -A 5 "9\." CLAUDE.md | head -20` muestra el nuevo texto.

**Steps:**

- [ ] **Step 1: Modificar regla #9 en `CLAUDE.md`**

Buscar:

```markdown
9. **Tarifa y Costo OPCIONALES.** No toda movilización tiene tarifa formal. Si se selecciona tarifa, Costo se auto-rellena con `rate.amount` y queda **read-only** (deseleccionar tarifa para editar manualmente). Sin confirmación de sobreescritura: el campo no es editable mientras haya tarifa. **Cambio 2026-04-15 (J6):** antes el campo seguía editable con diálogo de confirmación.
```

Reemplazar con:

```markdown
9. **Tarifa OBLIGATORIA.** Toda movilización requiere tarifa seleccionada al crear y editar. Costo se auto-rellena con `rate.amount` y queda **read-only** (deseleccionar tarifa NO posible — es requerida). Validación bloquea guardar/editar sin tarifa. **Cambio 2026-04-29 (Cambio 6):** antes la tarifa era opcional; ahora es requerida en todo trip nuevo y editado. BD: `trips.rate_id` NOT NULL. **Cambio 2026-04-15 (J6, contexto histórico):** se introdujo el read-only del costo cuando hay tarifa, antes el campo seguía editable con diálogo de confirmación.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: CLAUDE.md regla #9 — tarifa obligatoria (Cambio 6)

Regla #9 actualizada de 'Tarifa y Costo OPCIONALES' a
'Tarifa OBLIGATORIA. Costo se auto-rellena con rate.amount y es
read-only mientras haya tarifa.'.

BD trips.rate_id NOT NULL (T1). validate() en frontend bloquea
submit sin tarifa (T7). Histórico de J6 (read-only del costo)
preservado en la nota.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: PARADA — Smoke test fresh por James (BD limpia post-wipe)

**Goal:** James verifica el flow completo end-to-end con BD limpia. Si todo OK → green light para T-final docs unificado (post-Cambio 6, sesión separada). Si bug → documenta en `Docs/cambio6-incidente.md`, plan reabre.

**Files:** Ninguno (verificación manual).

**Acceptance Criteria:**
- [ ] 18 tests E2E pasan vía `npx playwright test tests/cambio6-integrity.spec.ts --reporter=list`.
- [ ] James verifica manualmente los flows operativos:
  - Cancel trip Programado sin Salida → línea vuelve a backlog (Pendiente).
  - Cancel trip En Ruta con qty_delivered=0 → líneas vuelven a backlog.
  - Cancel trip En Ruta con qty_delivered>0 → modal pide razón, línea queda Parcial.
  - Editar quantity de línea con assignment activo → BD rechaza con mensaje claro.
  - Crear trip sin rate_id → bloqueado en frontend antes de submit.
  - Multi-entrega misma línea-trip → BD rechaza con mensaje claro.
  - Revertir Salida con Entregas → mensaje pre-flight claro, no error genérico.
  - Cancel pickup_order con qty_delivered>0 → modal pide razón, qty_delivered preservado.
  - Cancel external_order paralelo.
  - DeliveryModal muestra líneas ya entregadas greyed disabled.

**Verify:** Checklist manual completo + suite E2E verde. James confirma "smoke OK" antes de proceder a T-final.

**Steps:**

- [ ] **Step 1: Final test suite run**

```bash
npx playwright test tests/cambio6-integrity.spec.ts --reporter=list
```
Expected: 18/18 passed.

- [ ] **Step 2: Build production verify**

```bash
npm run build 2>&1 | tail -10
```
Expected: `✓ Compiled successfully`. Sin errores TS.

- [ ] **Step 3: Smoke checklist manual de James**

(NO autónomo — James ejecuta vía UI en `localhost:3000` post `npm run dev`)

- [ ] **Step 4: Reportar a James**

Code redacta resumen al final del plan:

```markdown
## Cambio 6 implementación completa — pending smoke OK definitivo

Commits:
  T1 - {hash} bd-pending → bd
  T2 - {hash} regen types
  T3 - {hash} test suite (18 tests)
  T4 - {hash} cancelTrip refactor
  T5 - {hash} handleDelivery + handleRevert
  T6 - {hash} DeliveryModal filter
  T7 - {hash} tarifa obligatoria
  T8 - {hash} cancel modals razón
  T9 - {hash} cancel pickup/external razón
  T10 - {hash} CLAUDE.md regla #9

Build: verde
Tests E2E: 18/18 (suite completa)

Standby tu confirmación. Si todo OK → arranque T-final docs unificado
(Cambio 5 + Cambio 6) en sesión separada. Si bug → documento en
Docs/cambio6-incidente.md y revisamos.
```

- [ ] **Step 5: NO hacer commit en T11.** Es PARADA. Si James confirma OK, T-final es trabajo de otra sesión. Si encuentra bug, plan reabre.

---

## Self-review

**1. Spec coverage:** Skim cada sección del spec contra los tasks:

| Spec sección | Task que lo cubre |
|--------------|-------------------|
| Bug #1 fix | T4 |
| Bug #2 trigger fix | T1 (BD migration) |
| Bug #3 (síntoma) | T4 (lo resuelve junto con #1) |
| Bug #4 trigger + UI | T1 (trigger) + T5 (error UX) + T6 (filter UI) |
| Bug #5 cancellation_reason | T1 (col + triggers) + T8 (modales razón) + T9 (hooks) |
| H1 trigger | T1 |
| H7+H8 CHECK constraints | T1 |
| Tarifa obligatoria | T1 (NOT NULL) + T7 (validate) + T10 (CLAUDE.md) |
| 18 tests E2E | T3 |
| 4 pre-merge queries | T1 (entry [bd-pending]) |
| D1 Opción α | T4 (cancelTrip no DELETE) |
| D2 constraint excluye revertidos | T1 (trigger Bug #4) |
| D3 trigger explicit branch | T1 (recalc_qty_for_line modificado) |
| D4 cancellation_reason condicional | T1 (3 triggers) + T8 (UX modal) |
| D5 UI greyed disabled | T6 |
| D6 rate_id NOT NULL | T1 + T7 |
| D7 trigger order documented | (en spec, no requiere task — orden alfabético es automático) |
| D8 H8 vs revert Salida | T5 (pre-flight UX) |

Todas cubiertas. ✅

**2. Placeholder scan:** Sin "TBD"/"TODO"/"implement later"/"Similar to Task N"/"appropriate error handling". Code blocks completos en cada step. ✅

**3. Type consistency:** `cancellationReason: string | null` consistente entre T4, T8, T9. `rate_id: string` (NOT NULL post-T1) consistente entre T2 y T7. Variables nombradas consistentemente. ✅

---

## Notas de coordinación con James

- **PARADA dentro de T1 step 2:** Code escribe entry `[bd-pending]` y espera. Chat aplica vía MCP. James notifica a Code cuando confirmación de aplicación + queries advisor verificadas. Code edita entry → `[bd]` y commit.

- **PARADA final T11:** Code NO ejecuta T-final docs unificado (Cambio 5 + Cambio 6). Eso es trabajo de sesión separada post smoke OK definitivo de James. T-final cubre: CHANGELOG entries finales, spec maestro v3.4 secciones 5+6, BACKLOG cierra AD-3, frontmatters Cambio 5 + Cambio 6 a `shipped` con `shipped_commits`, plans deletion (Cambio 5 + Cambio 6 + leftover Cambio 4), TRAIL update.

- **NO push:** James pushea al cierre. Code commitea solo.

- **AD-5 follow-up:** los tests E2E usan seed manual via `admin` Supabase client porque `tests/helpers.ts` está roto (createSolicitud + createTrip). AD-5 sigue abierto en BACKLOG, no se resuelve en este plan.

- **Working tree leftover:** `cambio4-external.md.tasks.json`, `cambio5-bulk-fulfillment.md.tasks.json`, `supabase/.temp/cli-latest` siguen ahí. Se limpian en T-final (NO en este plan).
