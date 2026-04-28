---
name: cambio-5-bulk-fulfillment
description: Refactor de Pickup + Externo de modelo flag-en-línea (Cambios 3+4) a tablas dedicadas pickup_orders/external_orders con triggers BD para recalc qty_scheduled/qty_delivered automático + UX bulk action en /programacion (toolbar selector + 3 botones para crear movilización/aprobar pickup/aprobar viaje externo)
status: draft
feature: Cambio 5 — Bulk Fulfillment Refactor
shipped_commits:
deprecated_reason:
---

# Cambio 5 — Bulk Fulfillment Refactor

## §1 Contexto

Quinto y último cambio del rediseño Events V2 v2 (post-Cambios 1 Parada, 2 Cost code, 3 Pickup, 4 Externo). Rediseño arquitectural mayor que reemplaza el modelo flag-en-línea de Cambios 3 (Pickup) y 4 (Externo) con tablas dedicadas que agrupan N líneas por fulfillment común.

**Tres pivotes arquitecturales:**

1. **Tablas dedicadas + triggers BD**: `pickup_orders` / `external_orders` (1:N con líneas via `pickup_order_lines` / `external_order_lines`). Trigger `recalc_qty_for_line` se dispara desde 3 tablas pivot (`trip_line_assignments` + `pickup_order_lines` + `external_order_lines`) y recalcula `sm_request_lines.qty_scheduled` + `qty_delivered` automáticamente. Code elimina TODOS los UPDATE manuales de qty_scheduled.

2. **Coexistencia operacional permitida**: una línea puede tener fulfillments mixtos simultáneos (parte en flota interna + parte pickup + parte externo). Sanity net BD via CHECK `qty_invariant: (qty_scheduled + qty_delivered) <= quantity` previene sobre-asignación con error claro.

3. **UI bulk action**: BacklogTable agrega toolbar con 3 botones bulk ("Crear movilización" + "Aprobar pickup" + "Aprobar viaje externo") que opera sobre N líneas seleccionadas. Surface 1 (single-line approve from backlog) y Surface 2 (convert from trip detail) **eliminadas** — una sola superficie de aprobación bulk.

**BD ya aplicada por Chat en staging** (4 migraciones en orden estricto):

- `cambio5_create_pickup_orders` — CREATE `pickup_orders` (17 cols) + `pickup_order_lines` (7 cols) + triggers (updated_at, audit, generate_pickup_id, auto_cancel_empty_pickup_order)
- `cambio5_create_external_orders` — CREATE `external_orders` (19 cols con provider/invoice/cost) + `external_order_lines` (7 cols) + triggers paralelos
- `cambio5_recalc_qty_scheduled_triggers` — Función `recalc_qty_for_line(p_request_line_id UUID)` + triggers en INSERT/UPDATE/DELETE en las 3 tablas pivot + UPDATE OF status en parents
- `cambio5_drop_old_columns_simplify_cascade` — DROP 16 columnas viejas de `sm_request_lines` (6 pickup_* + 10 external_*) + DROP CHECK constraint `sm_request_lines_pickup_external_exclusive` + simplificar `cascade_request_status` (in_progress IN ('Programada', 'En Transito') solamente)

Verificación post-migración: 11 líneas activas re-calculadas con 0 diff vs estado anterior. Invariante intacto.

**Para prod (merge final v2):** aplicar 4 migraciones en orden estricto. Sin data migration (prod tiene 0 líneas con flags pickup/external).

**Cambio 4 commits T1-T9** (`13262de..b6e63e3` en `jaime/dev`) implementaron el modelo flag-en-línea de Externo. Permanecen en historial git pero el feature será reemplazado funcionalmente por Cambio 5. Spec Cambio 4 se flippea a `status: deprecated` en T-final con `deprecated_reason` claro.

Code en este sprint NO toca BD. Si encuentra algo que requiere BD change durante el run, parar y reportar en `Docs/cambio5-incidente.md`.

## §2 Goal

Una solicitud puede tener líneas con fulfillment mixto y simultáneo:

- **Línea normal en trip de flota interna**: programada via `trip_line_assignments`, conductor asignado, entrega física verificada con código
- **Línea aprobada para pickup**: agrupada en `pickup_orders` con N líneas, retirada por proyecto destino
- **Línea aprobada para externo**: agrupada en `external_orders` con N líneas + provider + factura + costo, transportada por proveedor externo

Una línea con `quantity=10` puede tener simultáneamente:
- 4 unidades en `trip_line_assignments` (trip activo)
- 6 unidades en `pickup_order_lines` (pickup_order Aprobado)

Trigger BD garantiza `qty_scheduled = 4 + 6 = 10`, backlog disponible = 0. Cuando se entreguen ambos, `qty_delivered=10`, status='Entregada', tooltip muestra ambos sources con `pickup_id` y `trip_id`.

**UX consistente con Cambios 3+4** pero rediseñada bulk:
- BacklogTable: selector + toolbar 3 botones bulk
- 2 modales create (CreatePickupOrderModal + CreateExternalOrderModal) con qty editable per línea
- 2 secciones dedicadas en `/programacion` con cards de orders activos
- Botones "Confirmar entrega" + "Cancelar pickup" en cards
- Modales confirm delivery con receptor opcional + foto
- LineRow muestra 0-N badges per fulfillment activo
- PM puede confirmar entrega de orders desde `/solicitudes/[id]` (revert Cambio 4 Q3)

**Cierre arquitectural:** AD-3 (fulfillment per-línea, no per-trip) cerrado. Cambio 5 es el modelo final del flujo de fulfillment.

## §3 Architecture decisions (A-K)

### A. Tablas dedicadas (no flag-en-línea)

`pickup_orders` y `external_orders` son entidades de primer nivel con metadata propia (id, status lifecycle, audit fields, receptor, attachments). `pickup_order_lines` y `external_order_lines` son tablas pivote con `(order_id, request_line_id, quantity_assigned, qty_delivered)`.

**Cierra AD-3**: fulfillment es per-línea con grupos por order, no per-trip.

### B. Trigger BD recalc qty_scheduled/qty_delivered

Trigger `recalc_qty_for_line(p_request_line_id)`:
- SELECT SUM de quantity_assigned activos en las 3 tablas pivote (filtrando parents NOT IN ('Cancelado'))
- SELECT SUM de qty_delivered HISTÓRICA (TODAS las pivot rows incluso de orders cancelados — entregas son hechos físicos, sobreviven al cancel)
- UPDATE sm_request_lines SET qty_scheduled, qty_delivered con valores recalculados
- Status derivado: si qty_delivered = quantity → 'Entregada'. Si qty_delivered > 0 && qty_delivered < quantity → 'Parcial'. Si qty_scheduled > 0 → 'Programada'. Si qty_scheduled = 0 && qty_delivered = 0 → 'Pendiente'. **Status 'En Transito' preservado** (viene de evento Salida, trigger no lo sobreescribe).

Triggers fire en:
- INSERT/UPDATE/DELETE en `trip_line_assignments`, `pickup_order_lines`, `external_order_lines`
- UPDATE OF status en `trips`, `pickup_orders`, `external_orders` (cancel propaga recalc a líneas afectadas)

**Code NO escribe `sm_request_lines.qty_scheduled` ni `sm_request_lines.qty_delivered` manualmente.** Solo escribe en las tablas pivot (`trip_line_assignments`, `pickup_order_lines`, `external_order_lines`). Trigger reconcilia.

**Excepción**: `qty_delivered` per pivot row sí lo escribe el código (viene de input de usuario al completar entrega). El trigger lo lee para sumar.

**Excepción 2**: `sm_request_lines.delivered_at` lo escribe el código en handleDelivery (no calculado por trigger).

### C. Coexistencia operacional permitida (Q1+Q4)

Una línea puede tener fulfillments mixtos simultáneos. Trigger reconcilia. UI muestra todos los fulfillments activos como 0-N badges.

Caso típico Chilibre:
- Equipo grande en piezas: parte por flota (líneas pesadas) + parte pickup (proyectoretira complementos)
- Materiales urgentes mixtos: parte por flota (lo que llega ya) + parte externo (proveedor entrega resto en ruta)

Sanity net BD: si race condition produce sobre-asignación, CHECK `qty_invariant: qty_scheduled + qty_delivered <= quantity` rechaza con error PostgreSQL. Hook traduce a "Esta línea ya fue asignada en otro fulfillment. Refrescá la página."

### D. Sanity net BD vs CHECK constraint code-side

CHECK constraints existentes en `sm_request_lines` (verificados via Supabase MCP):
- `qty_invariant: (qty_scheduled + qty_delivered) <= quantity` — previene sobre-asignación
- `qty_scheduled_nonneg: qty_scheduled >= 0`
- `qty_delivered_nonneg: qty_delivered >= 0`
- `qty_positive: quantity > 0`

Hooks de Code (`createPickupOrder`, `createExternalOrder`, `addLineToOrder`):
1. SELECT fresh `available = quantity - qty_scheduled - qty_delivered` per línea
2. Validar cada `quantity_assigned ≤ available`
3. INSERT bulk en pickup_order_lines / external_order_lines
4. Si BD rechaza por `qty_invariant` (race window TOCTOU): `translateBdError` traduce mensaje

### E. Surface 2 eliminada (Q2)

AssignmentRow en `programacion/viaje/[id]/page.tsx` queda con SOLO botón "Quitar del viaje" (existente del flow de edit trip). Sin botones "Convertir a pickup" / "Convertir a externo".

Flow alternativo: Charris edita trip → quita línea (vuelve a backlog) → bulk approve pickup/externo desde toolbar.

Justificación: Surface 2 actual son ~200 líneas (handlers + 2 modales inline + AssignmentRow buttons) para baja frecuencia de uso. Eliminar reduce edge cases (auto-cancel-trip si última línea, doble UPDATE atómico).

### F. Read-only quantity_assigned en Confirm Delivery (Q3)

`ConfirmPickupOrderDeliveryModal` y `ConfirmExternalOrderDeliveryModal` muestran líneas con `quantity_assigned` read-only. Hook setea `qty_delivered = quantity_assigned` para todas las líneas del order al completar.

Si entrega fue parcial (recibieron menos de lo aprobado): Charris cancela el order y crea uno nuevo con cantidades correctas. Las cantidades ya entregadas físicamente quedan registradas vía qty_delivered HISTÓRICA del trigger.

**Deuda técnica documentada**: v1 simple, post-merge se evalúa B (editable per línea) si fricción operacional.

### G. LEFT JOIN fulfillments query en useSolicitudes (Q5)

`useSolicitudes.fetchSolicitud` ejecuta query con LEFT JOIN a 3 tablas pivote + parents activos:

```sql
SELECT line.*,
  (
    SELECT json_agg(...) FROM trip_line_assignments tla
    JOIN trips t ON t.id = tla.trip_id
    WHERE tla.request_line_id = line.id AND t.status NOT IN ('Cancelado')
  ) as trip_fulfillments,
  (
    SELECT json_agg(...) FROM pickup_order_lines pol
    JOIN pickup_orders po ON po.id = pol.pickup_order_id
    WHERE pol.request_line_id = line.id AND po.status NOT IN ('Cancelado')
  ) as pickup_fulfillments,
  (similar para external)
FROM sm_request_lines line WHERE line.request_id = ?
```

LineWithRelations gana campo `fulfillments: FulfillmentInfo[]` discriminated union:

```typescript
type FulfillmentInfo =
  | { type: 'trip'; id: string; trip_id: string | null; status: string; quantity_assigned: number; qty_delivered: number }
  | { type: 'pickup'; id: string; pickup_id: string; status: string; quantity_assigned: number; qty_delivered: number }
  | { type: 'external'; id: string; external_id: string; status: string; provider_name: string; invoice_amount: number; quantity_assigned: number; qty_delivered: number }
```

LineRow recibe prop `fulfillments` y renderiza 0-N badges. Filtro: solo orders con `status NOT IN ('Cancelado')`. Para línea con status='Entregada', tooltip lista TODOS los fulfillments con qty_delivered > 0 incluyendo trip Completado (D9).

### H. Bulk action toolbar en BacklogTable (D1)

Selection state existente (checkboxes ya existen para "Crear movilización") — extender a 3 botones bulk.

Toolbar fija arriba cuando `selectedLineIds.size > 0`:
- Layout: `bg-amber-50 border border-amber-200 px-4 py-3 rounded-lg`
- Badge con count: "{N} líneas seleccionadas"
- 3 botones pill amber compacto SIN emoji ni íconos lucide:
  - "Crear movilización" (existente, flow sin cambios)
  - "Aprobar pickup" (NUEVO) → CreatePickupOrderModal
  - "Aprobar viaje externo" (NUEVO) → CreateExternalOrderModal
- Botón secundario "Limpiar selección" a la derecha

Permission gate: `admin + logistica` solamente. PM no ve toolbar.

### I. Cards reusables (D5/D6/D8)

`PickupOrderCard.tsx` y `ExternalOrderCard.tsx` son componentes reusables consumidos por:
- `/programacion` Surface 3 secciones (admin/logistica)
- `/solicitudes/[id]` (admin/logistica/pm-del-proyecto-destino)

Props comunes:
```typescript
interface OrderCardProps {
  order: PickupOrderWithLines | ExternalOrderWithLines
  canConfirmDelivery: boolean  // permission-driven
  canCancelOrder: boolean      // permission-driven
  onConfirmDelivery?: () => void
  onCancelOrder?: () => void
  showLines?: boolean  // expand collapsed by default
}
```

Cards muestran:
- Header: `pickup_id` / `external_id` + status badge + fecha aprobación + approver name
- Lista colapsable de N líneas: descripción + ruta + cantidad asignada
- Notas (si hay) + attachments link
- 2-3 botones: "Confirmar entrega" (primary amber) + "Cancelar pickup" (destructive ghost) + ("Editar" diferido D8)

### J. PM permission D8 (revert Cambio 4 Q3)

PM del **proyecto destino de la línea** ve sección "Pickup Orders" + "External Orders" en `/solicitudes/[id]` y puede confirmar entrega.

Permission query (PM ve order si tiene AT LEAST 1 línea cuyo `to_location.project_id` matchea sus `person_projects`):

```sql
SELECT COUNT(*) > 0 AS can_confirm
FROM pickup_order_lines pol
JOIN sm_request_lines srl ON srl.id = pol.request_line_id
JOIN locations loc ON loc.id = srl.to_location_id
JOIN person_projects pp ON pp.project_id = loc.project_id
WHERE pol.pickup_order_id = ?
  AND pp.person_id = ?
  AND pp.is_active = true
  AND loc.location_type = 'proyecto'  -- LOWERCASE per Cambio 1 convention
```

Nota crítica: `location_type = 'proyecto'` lowercase (corrección Cambio 1 documentada en master spec v3.1).

Edge case E11 (documentado abajo): orders con TODAS las líneas en `to_text` free-text (sin `to_location_id`) → PM no puede confirmar (admin/logistica only).

PM ve sección en `/solicitudes/[id]` pero NO en `/programacion` (Surface 3 secciones son admin/logistica only).

### K. T1 Cleanup atomic en 7 sub-pasos

T1 monolítico (commit único) pero ejecutado en 7 sub-pasos con TodoWrite explícito para mental check + recovery point:

1. Regen `database.ts` desde staging (build esperado: ROJO — types perdieron 16 columnas viejas)
2. DELETE 5 archivos: `usePickup.ts`, `useExternal.ts`, `ExternalApprovalForm.tsx`, `ExternalDeliveryModal.tsx`, `PickupDeliveryModal.tsx` (verificar)
3. Cleanup refs en hooks: `useTrips.ts`, `useTripEvents.ts`, `useSolicitudes.ts`
4. Cleanup refs en components: `LineRow.tsx`, `BacklogTable.tsx`
5. Cleanup refs en pages: `programacion/page.tsx`, `programacion/viaje/[id]/page.tsx`, `solicitudes/[id]/page.tsx`
6. Verificar build verde end-to-end
7. Git add + commit único T1

Razón: cleanup parcial → build rojo. Cambio 5 BD ya tiene DROP de columnas viejas → cualquier ref en code falla TypeScript. Sub-pasos secuenciales aseguran que llegues a build verde sin perder progreso.

## §4 Scope

### IN

**A — Refactor de hooks existentes (eliminar UPDATEs manuales de qty_scheduled)**:
- `src/hooks/useTrips.ts`: DELETE `releaseLineFromAssignment` helper. ELIMINAR UPDATEs manuales `qty_scheduled` en `saveTrip`/`updateTrip`/`cancelTrip`. MANTENER UPDATEs de `trip_line_assignments` (trigger se dispara desde ahí). MANTENER UPDATE de `trips.status='Cancelado'` (trigger en trips status change recalcula líneas).
- `src/hooks/useTripEvents.ts`: ELIMINAR UPDATEs manuales `qty_scheduled`/`qty_delivered`/`status` en `handleDelivery`/`handleRevert`. MANTENER UPDATE de `trip_line_assignments.qty_delivered` (trigger lo lee). MANTENER UPDATE de `sm_request_lines.delivered_at` (no calculado por trigger).

**B — Eliminar código viejo (Cambios 3+4 obsoleto)**:
- DELETE files: `usePickup.ts`, `useExternal.ts`, `ExternalApprovalForm.tsx`, `ExternalDeliveryModal.tsx`, `PickupDeliveryModal.tsx`
- Cleanup refs en `LineRow.tsx`, `BacklogTable.tsx`, `programacion/page.tsx`, `programacion/viaje/[id]/page.tsx`, `useSolicitudes.ts`

**C — Hooks nuevos**:
- `src/hooks/usePickupOrders.ts` con 4 funciones (createPickupOrder, completePickupOrder, cancelPickupOrder, removeLineFromPickupOrder) + tipos
- `src/hooks/useExternalOrders.ts` paralelo + provider/invoice/cost logic

**D — UI Bulk Action**:
- D1: Toolbar bulk en BacklogTable con 3 botones (admin/logistica)
- D2: `CreatePickupOrderModal.tsx` con N líneas + qty editable
- D3: `CreateExternalOrderModal.tsx` paralelo + provider/cost/factura/notas
- D4: Surface 2 ELIMINADA en `programacion/viaje/[id]/page.tsx`
- D5: Sección "Pickups Pendientes" en `/programacion` con `PickupOrderCard` (admin/logistica)
- D6: Sección "Viajes Externos Pendientes" en `/programacion` con `ExternalOrderCard` (admin/logistica)
- D7: `ConfirmPickupOrderDeliveryModal.tsx` y `ConfirmExternalOrderDeliveryModal.tsx`
- D8: Sección orders en `/solicitudes/[id]` con cards (admin/logistica/pm-del-proyecto-destino)

**E — Badges en LineRow**:
- LEFT JOIN query en `useSolicitudes.fetchSolicitud`
- Prop `fulfillments: FulfillmentInfo[]` en LineRow
- 0-N badges per línea con tooltip `"{type} {id}, {qty} unidades"`
- Para Entregada: badge único + tooltip listando todos fulfillments contributors

**F — Cost editable + Polish round 2 PRESERVADOS de Cambio 4**:
- `TripForm.tsx:408 disabled={fieldsDisabled}` (sin `|| !!rateId`)
- Line cards sin project info / cost code / cost category
- Descripción + ruta sin truncate
- Tooltips universales con `statusContextString`

**G — cancelSolicitud refactor**:
- Cancel orders relacionados al cancelar solicitud
- Si pickup_order tiene TODAS líneas de la solicitud → cancel order entero
- Si pickup_order tiene ALGUNAS líneas de la solicitud → DELETE de order_lines solo las afectadas (auto_cancel_empty maneja último caso)
- Mismo proceso para external_orders
- UI feedback: toast con count de orders afectados

**T-final docs**:
- `Docs/CHANGELOG.md`: 1 entry `[feat]` Cambio 5 + 4 entries `[bd]` (las 4 migraciones)
- `Docs/reference/events-v2-redesign-in-progress-v3.md`: agregar Sección 5 Cambio 5 (frontmatter v3.4)
- `Docs/BACKLOG.md`: cerrar AD-3 + items de pickup/externo flag-en-línea
- Spec Cambio 5 frontmatter `status: shipped` + `shipped_commits: <hash range T1..T11>`
- Spec Cambio 4: frontmatter `status: deprecated` + `deprecated_reason: "Superseded by Cambio 5 bulk fulfillment refactor — flag-en-línea model replaced with dedicated tables pickup_orders/external_orders"`
- Plan Cambio 5 + .tasks.json deletion per `plan-lifecycle.md`
- **Plan Cambio 4 + .tasks.json deletion también** (no se borraron en T10 que fue skipped)
- `Docs/TRAIL.md`: actualizar — Cambio 5 cerrado, Events V2 v2 finalizado, listo para merge final v2

### OUT

- BD changes (Chat ya aplicó las 4 migraciones; pendiente prod en merge final v2 — orden estricto requerido)
- Renta de equipo (post-merge cuando gerencia lo pida)
- GPS tracking en pickup_orders/external_orders (no aplica conceptualmente — no hay vehículo físico de flota)
- Tests E2E nuevos (AD-5 sigue bloqueado — `createSolicitud`/`createTrip` helpers rotos)
- Notificaciones email para pickup_order/external_order (post-merge, requiere templates nuevos)
- Edición de pickup_order/external_order activos (botón "Editar" en cards) — DIFERIR post-merge (D8 cerrado)
- completeOrder con qty_delivered editable per línea (Q3 cerrado: read-only v1, deuda documentada)
- `/solicitudes/v3_FOUNDATIONAL.md` (deprecated 2026-03-18, no se toca per `no-modify-specs`)

### Deuda técnica conocida (post-merge)

- **completeOrder partial qty editable**: v1 todo-o-nada por order. Si entrega parcial real, Charris cancela y recrea. Post-merge: evaluar editable per línea si fricción operacional.
- **Edición de orders activos**: botón "Editar" en cards diferido. Post-merge: agregar/quitar líneas o cambiar quantity_assigned a un order activo.
- **Tests E2E del flow nuevo**: bloqueado por AD-5. Hacer cuando AD-5 se cierre.
- **Notificaciones email**: pickup_order_aprobado, pickup_order_entregado, external_order_aprobado, external_order_entregado event_types nuevos. Post-merge requiere templates email + actualizar `notification_log.valid_event_type` constraint.
- **PM permission via free-text destination**: orders con TODAS las líneas en `to_text` free-text no permiten PM confirm (E11). Acceptable v1; post-merge evaluar fallback (project hint per order).

## §5 Components & data flow

### `usePickupOrders.ts`

```typescript
interface PickupOrderLineInput {
  request_line_id: string
  quantity_assigned: number
}

interface PickupOrderInput {
  charrisId: string
  lines: PickupOrderLineInput[]
  notes?: string | null
}

interface PickupOrderResult {
  ok: boolean
  orderId?: string
  pickupId?: string  // PKP-2026-NNN
  error?: string
}

interface CompletePickupResult {
  ok: boolean
  error?: string
}

interface CancelPickupResult {
  ok: boolean
  deliveredCount?: number  // # líneas con qty_delivered > 0
  deliveredQty?: number     // SUM qty_delivered total
  error?: string
}

interface RemoveLineResult {
  ok: boolean
  orderCancelled?: boolean   // true si era última línea (auto_cancel_empty trigger)
  orderId?: string           // PKP-... para toast
  error?: string
}

function usePickupOrders() {
  // createPickupOrder: crea pickup_order + N pickup_order_lines en una transacción.
  //   Validaciones: cada quantity_assigned > 0 y <= available (quantity - qty_scheduled - qty_delivered).
  //   Trigger BD recalcula sm_request_lines.qty_scheduled automáticamente.
  // completePickupOrder: UPDATE pickup_orders.status='Entregado' + qty_delivered=quantity_assigned per line.
  //   Trigger recalcula qty_delivered de líneas.
  // cancelPickupOrder: UPDATE pickup_orders.status='Cancelado'.
  //   Trigger recalcula qty_scheduled (vuelve a 0 para no-entregadas) + qty_delivered HISTÓRICA preservada.
  //   PERMITIDO con qty_delivered>0 (D3 cerrado): hook devuelve stats para UI confirmation modal.
  // removeLineFromPickupOrder: DELETE de pickup_order_lines.
  //   auto_cancel_empty_pickup_order trigger cancela order si era la última línea.
  //   Hook detecta count post-DELETE y devuelve { orderCancelled: boolean } para toast UI.
  return { loading, error, createPickupOrder, completePickupOrder, cancelPickupOrder, removeLineFromPickupOrder }
}
```

### `useExternalOrders.ts`

Paralelo a `usePickupOrders` con:
- `createExternalOrder(charrisId, lines, providerName, invoiceAmount, invoiceAttachments, notes?)`: validaciones strict (provider trim != '', amount > 0, attachments.length >= 1)
- `completeExternalOrder`: paralelo
- `cancelExternalOrder`: paralelo. **PRESERVA `invoice_attachments`** (Q4 cerrado en Cambio 4 — Storage cleanup async no vale la pena v1).
- `removeLineFromExternalOrder`: paralelo

### `PickupOrderCard.tsx`

```typescript
interface PickupOrderCardProps {
  order: PickupOrderWithLines
  canConfirmDelivery: boolean
  canCancelOrder: boolean
  onConfirmDelivery?: () => void
  onCancelOrder?: () => void
  showLines?: boolean  // expand state initial
}

interface PickupOrderWithLines {
  id: string
  pickup_id: string  // PKP-2026-001
  status: 'Aprobado' | 'Entregado' | 'Cancelado'
  approved_at: string
  approved_by_name: string
  completed_at: string | null
  completed_by_name: string | null
  cancelled_at: string | null
  cancelled_by_name: string | null
  received_by_id: string | null
  received_by_name: string | null
  notes: string | null
  attachments: Attachment[]
  lines: PickupOrderLineWithRelations[]
}

interface PickupOrderLineWithRelations {
  id: string
  request_line_id: string
  quantity_assigned: number
  qty_delivered: number
  line: {
    description: string
    quantity: number
    unit: { code: string } | null
    unit_text: string | null
    from_location: { name: string } | null
    from_text: string | null
    to_location: { name: string; project_id: string | null; location_type: string | null } | null
    to_text: string | null
    request: { request_id: string | null; project: { code: string } | null }
  }
}
```

### `ExternalOrderCard.tsx`

Paralelo a `PickupOrderCard` con campos extra: `external_id` (EXT-2026-NNN), `provider_name`, `invoice_amount`, `invoice_attachments`. Card muestra "Ver factura" link al primer attachment via `getFileUrl(path) + window.open()`.

### `CreatePickupOrderModal.tsx`

```typescript
interface CreatePickupOrderModalProps {
  selectedLines: BacklogLine[]  // del bulk selection en BacklogTable
  onConfirm: (input: PickupOrderInput) => Promise<void>
  onClose: () => void
  loading: boolean
  error: string | null
}
```

Layout:
- Header: "Aprobar pickup ({N} líneas)"
- Por cada línea: descripción + ruta + `available = quantity - qty_scheduled - qty_delivered` + input numérico `quantity_assigned` (default = available, min 0.01, max = available, step según unidad)
- Validación: si user pone 0, mostrar mensaje "Esta línea no se incluirá" (no eliminar de UI, dejar visible). En submit, filtrar líneas con qty=0.
- Notas opcional textarea (max 500 chars)
- Botones: "Cancelar" + "Aprobar pickup"

### `CreateExternalOrderModal.tsx`

Paralelo a `CreatePickupOrderModal` + sección "Datos del proveedor":
- Provider name (text, requerido, max 100 chars)
- Costo del servicio (numeric, requerido, > 0)
- Cotización/Factura (FileUploader con folder `external/{tempId}`, mínimo 1 archivo)
- Notas (textarea, opcional, max 500 chars)

Validación pre-submit con helper `validateExternalOrderForm(values, lines)`.

### `ConfirmPickupOrderDeliveryModal.tsx`

```typescript
interface ConfirmPickupOrderDeliveryModalProps {
  order: PickupOrderWithLines
  receiverOptions: { value: string; label: string }[]
  onConfirm: (data: {
    receivedById: string | null
    receivedByName: string
    notes: string
    additionalAttachments: Attachment[]
  }) => Promise<void>
  onClose: () => void
  loading: boolean
  error: string | null
}
```

Campos:
- Lista de líneas con `quantity_assigned` read-only (F: todo-o-nada por order)
- Receptor: SelectWithFallback opcional (no XOR — ambos campos pueden ser NULL)
- Notas adicionales opcional textarea
- Foto adicional opcional FileUploader (append a attachments existentes del order)
- Botones: "Cancelar" + "Confirmar entrega"

### `ConfirmExternalOrderDeliveryModal.tsx`

Paralelo a pickup confirm + muestra info del proveedor (read-only): provider, invoice_amount, "Ver factura" link.

### Data flow per surface

**Surface 1 (Bulk approve from backlog)**:
```
User selects N lines in BacklogTable
  → toolbar bulk appears con badge "{N} líneas seleccionadas"
  → click "Aprobar pickup"
  → setCreatePickupOrderModal({ lines: selected })
  → Modal renders <CreatePickupOrderModal selectedLines={...} />
  → User adjusts qty per line + adds notas
  → submit → validate (qty > 0 & <= available)
  → usePickupOrders.createPickupOrder({ charrisId, lines, notes })
  → BD: INSERT pickup_orders + INSERT pickup_order_lines (transaction)
  → Trigger BD recalcula sm_request_lines.qty_scheduled automáticamente
  → Si ok: close modal + clear selection + refetchBacklog + refetchPendingPickupOrders + toast "Pickup PKP-2026-N aprobado"
```

**Confirm Delivery (de Surface 3 o /solicitudes/[id])**:
```
User clicks "Confirmar entrega" en PickupOrderCard
  → setConfirmDeliveryOrder(order)
  → Modal renders <ConfirmPickupOrderDeliveryModal order={...} />
  → User llena receptor opcional + notas + foto adicional
  → submit
  → usePickupOrders.completePickupOrder(orderId, completedById, receivedById, receivedByName, notes, attachments)
  → BD: UPDATE pickup_orders.status='Entregado' + UPDATE pickup_order_lines.qty_delivered=quantity_assigned
  → Trigger recalcula sm_request_lines.qty_delivered + status (Entregada/Parcial)
  → Si ok: close modal + refetchPendingPickupOrders + refetchSolicitud (si /solicitudes/[id]) + toast "Entrega registrada"
```

**Cancel Order**:
```
User clicks "Cancelar pickup" en PickupOrderCard
  → Hook pre-fetch: cancelPickupOrder pre-flight stats SELECT
  → Si deliveredCount > 0: confirmation modal con copy contextual
     "Cancelar este pickup va a devolver al backlog las líneas no entregadas.
      Las {deliveredCount} líneas ya entregadas ({deliveredQty} unidades en total)
      quedan registradas como entregadas (no se invierten). ¿Confirmar?"
  → Si deliveredCount = 0: confirmation modal simple
     "¿Cancelar pickup PKP-2026-N? Las líneas volverán al backlog."
  → User confirms
  → usePickupOrders.cancelPickupOrder(orderId, cancelledById)
  → BD: UPDATE pickup_orders.status='Cancelado'
  → Trigger recalcula líneas: qty_scheduled de no-entregadas → 0; qty_delivered HISTÓRICA preservada
  → Si ok: close modal + refetchPendingPickupOrders + refetchBacklog + toast
```

**Remove Line (auto-cancel-empty)**:
```
User clicks "Quitar línea" en card expanded view (si UI lo permite — D8 diferido)
O eliminación implícita via cancelar solicitud (G refactor)
  → usePickupOrders.removeLineFromPickupOrder(orderId, lineId)
  → BD: DELETE FROM pickup_order_lines WHERE id=lineId
  → Trigger BD: si era la última línea, auto_cancel_empty_pickup_order cancela el order
  → Hook post-DELETE: SELECT count of remaining lines
     Si count = 0: { ok: true, orderCancelled: true, orderId: 'PKP-...' }
  → UI: si orderCancelled, toast "Pickup PKP-2026-N cancelado al eliminar última línea"
```

**LineRow badges (E)**:
```
useSolicitudes.fetchSolicitud query con LEFT JOIN
  → fulfillments[] populated con info per fulfillment activo
  → LineRow recibe prop fulfillments
  → Render N badges según tipo:
    - trip: "EN VIAJE {trip_id}" green-100 / green-700 + tooltip "Trip {trip_id}, {qty} {unit}"
    - pickup: "EN PICKUP {pickup_id}" blue-100 / blue-700 + tooltip "Pickup {pickup_id}, {qty} {unit}"
    - external: "EN EXTERNO {external_id}" violet-100 / violet-700 + tooltip "Externo {external_id}, B/. {amount}, {provider}, {qty} {unit}"
  - Para línea Entregada con qty_delivered > 0: badge "ENTREGADA" emerald + tooltip listando contributors
```

**cancelSolicitud refactor (G)**:
```
useSolicitudes.cancelSolicitud(solicitudId)
  → SELECT pickup_orders activos con líneas en esta solicitud (JOIN pickup_order_lines + sm_request_lines WHERE request_id=solicitudId AND po.status NOT IN ('Cancelado'))
  → Para cada pickup_order:
    SELECT count of lines from THIS solicitud / count of total lines
    Si all == total: cancelPickupOrder(orderId, cancelledById)
    Si all < total: DELETE FROM pickup_order_lines WHERE pickup_order_id=X AND request_line_id IN (líneas de la solicitud)
       (auto_cancel_empty trigger maneja el caso si quedan 0 líneas)
  → Mismo proceso para external_orders
  → UPDATE sm_request_lines.status='Cancelada' para líneas de la solicitud no entregadas
  → UPDATE sm_requests.status='Cancelada'
  → UI feedback: toast "Solicitud cancelada. {N} pickup_orders afectados, {M} external_orders afectados"
```

## §6 Edge cases (E1-E14)

| # | Caso | Comportamiento |
|---|---|---|
| E1 | Coexistencia trip + pickup + external simultáneos | PERMITIDO (Q1+Q4). Trigger reconcilia qty_scheduled. LineRow muestra 0-N badges |
| E2 | Cantidad parcial dentro de pickup_order: línea quantity=10, qty_assigned=6 | OK. Línea queda en backlog con disponible=4. Trigger calcula qty_scheduled=6 |
| E3 | removeLineFromPickupOrder con auto_cancel_empty | DELETE última línea → trigger cancela order automáticamente. Hook detecta count=0 + devuelve `{ orderCancelled: true, orderId }`. UI toast |
| E4 | cancelSolicitud con shared pickup_orders (líneas de N solicitudes) | G lógica: cancel order entero si TODAS líneas son de la solicitud. DELETE order_lines selectivo si ALGUNAS. auto_cancel_empty maneja último caso |
| E5 | Race condition aprobar pickup vs externo en misma línea | Sanity net BD `qty_invariant` rechaza segundo INSERT. Hook traduce: "Esta línea ya fue asignada en otro fulfillment. Refrescá la página." |
| E6 | completePickupOrder con qty real < quantity_assigned | v1: read-only, asume todo-o-nada. Si parcial real: Charris cancela order y recrea con qty correcta. Deuda documentada |
| E7 | cancelOrder con qty_delivered > 0 | PERMITIDO. El trigger BD preserva qty_delivered HISTÓRICA (entregas son hechos físicos, sobreviven al cancel). Hook pre-flight SELECT stats (count líneas con qty_delivered>0 + SUM qty_delivered). UI confirmation modal con copy contextual: "Las {N} líneas ya entregadas ({Q} unidades) quedan registradas como entregadas. ¿Confirmar?" |
| E8 | Trips programados pre-Cambio 5 | Compatibles. trip_line_assignments existentes funcionan sin cambios. Trigger recalc se dispara al UPDATE de trip o assignment futuro |
| E9 | Backlog query con N fulfillments simultáneos | Trigger BD garantiza qty_scheduled refleja TODOS los fulfillments activos. `available = quantity - qty_scheduled - qty_delivered` correcto |
| E10 | PM permission D8 — order con líneas de múltiples proyectos destino | AT LEAST 1 match: PM puede confirmar order si tiene asignación a AL MENOS 1 proyecto destino del order. Multi-proyecto orders raros, primer PM coordina con otros |
| E11 | PM permission D8 — order con TODAS líneas free-text destination | PM no puede confirmar (LEFT JOIN no matchea por NULL `to_location_id`). Admin/logistica only. Documentar como conocido v1 |
| E12 | location_type 'proyecto' lowercase consistency | Code Cambio 5 usa `'proyecto'` lowercase en queries de permission (paralelo a corrección Cambio 1) |
| E13 | Trigger BD vs UI race | Si trigger lento (>50ms), UI puede leer stale qty_scheduled. Mitigación: refetch agresivo post-mutation (refetchBacklog + refetchSolicitud) |
| E14 | Status 'En Transito' preservado por trigger | Evento Salida setea sm_request_lines.status='En Transito'. Trigger recalc detecta y NO sobreescribe (preserva via condition específica). Solo cambia status si está en 'Pendiente'/'Programada'/'Parcial'/'Entregada' |

## §7 Risks identified

1. **T1 monolítico ~20 archivos**: build rojo durante cleanup parcial inevitable. Mitigación: 7 sub-pasos con TodoWrite explícito + commit único al final + recovery point sub-paso 1.6.
2. **Trigger BD vs UI race**: refetch agresivo post-mutation asegura consistency.
3. **`useTripEvents` refactor riesgoso**: handleDelivery + handleRevert tienen lógica compleja. Eliminar UPDATEs manuales sin romper flow existente requiere cuidado. Mitigación: smoke test #15 (trip flow completo) explícito.
4. **CHECK qty_invariant rejects en producción**: race produce sobre-asignación visible. Mitigación: `translateBdError` patrón hereda de Cambio 4.
5. **PM permission D8 query complexity**: 4-table JOIN en cada render de `/solicitudes/[id]` cards. Mitigación: query se ejecuta una vez per page load, resultado cached en state. Si performance issue, mover a SQL view post-merge.
6. **Polish round 2 + Cost editable preservation**: T1 toca LineRow + TripForm. Verificar que cleanup masivo no regrese accidentalmente. Mitigación: post-T1 grep regression `truncate.*description` y `disabled={fieldsDisabled}`.
7. **Cambio 4 commits inconsistencia**: implementan modelo que Cambio 5 elimina inmediatamente. Risk: developers futuros confundidos. Mitigación: T-final docs deprecate Cambio 4 spec con deprecated_reason explícito. Commits mantenidos en historial git.
8. **Smoke test bloqueante de T-final**: si James detecta bug en smoke (18 verificaciones), T-final no corre. Mitigación: 7 sub-pasos T1 + recovery points + smoke list explícito.

## §8 Implementation order (10 tasks + PARADA + T-final)

**Dependency graph**:

```
T1 (cleanup atomic + regen — 7 sub-pasos, commit único)
├── T2 (usePickupOrders hook)
│   ├── T5 (CreatePickupOrderModal)
│   └── T6 (ConfirmPickupOrderDeliveryModal)
├── T3 (useExternalOrders hook)
│   ├── T5 (CreateExternalOrderModal)
│   └── T6 (ConfirmExternalOrderDeliveryModal)
├── T4 (PickupOrderCard + ExternalOrderCard)
│   ├── T7 (programacion/page.tsx integration)
│   └── T8 (solicitudes/[id]/page.tsx integration)
├── T9 (useSolicitudes LEFT JOIN + LineRow badges)
└── T10 (cancelSolicitud refactor)

T5 + T6 + T4 → T7 (bulk action page integration)
T2 + T3 → T10 (cancelSolicitud refactor)

T1-T10 verde + smoke test OK → T11 (T-final docs)
```

**Tasks**:

- **T1** — Cleanup atomic + regen `database.ts` (7 sub-pasos, commit único, ~20 archivos)
- **T2** — Hook `usePickupOrders.ts` con 4 funciones
- **T3** — Hook `useExternalOrders.ts` con 4 funciones (paralelo + provider/invoice/cost)
- **T4** — Cards reusables: `PickupOrderCard.tsx` + `ExternalOrderCard.tsx`
- **T5** — Create modals: `CreatePickupOrderModal.tsx` + `CreateExternalOrderModal.tsx`
- **T6** — Confirm delivery modals: `ConfirmPickupOrderDeliveryModal.tsx` + `ConfirmExternalOrderDeliveryModal.tsx`
- **T7** — `/programacion` integration: bulk action toolbar (D1) + 2 secciones (D5/D6) con cards + handlers + cancel order modals
- **T8** — `/solicitudes/[id]` integration: secciones orders related + PM permission query D8/J
- **T9** — useSolicitudes LEFT JOIN fulfillments + LineRow badges (E)
- **T10** — cancelSolicitud lógica G (cancelar orders relacionados)
- **PARADA** — reporte completo a James + smoke test 18 verificaciones
- **T11 (T-final)** — Docs (CHANGELOG + spec maestro v3 sección 5 + BACKLOG + spec Cambio 4 deprecated + spec Cambio 5 shipped + plan deletion + Cambio 4 plan deletion + TRAIL)

## §9 Acceptance criteria

### Funcionales (18)

1. 8 archivos nuevos creados (2 hooks + 2 cards + 4 modales)
2. 5 archivos eliminados (`usePickup.ts`, `useExternal.ts`, `ExternalApprovalForm.tsx`, `ExternalDeliveryModal.tsx`, `PickupDeliveryModal.tsx` si existe)
3. `database.ts` regenerado con 4 tablas nuevas + DROP de 16 columnas viejas
4. usePickupOrders + useExternalOrders exponen 4 funciones cada uno con tipos paralelos
5. Cards reusables `PickupOrderCard` + `ExternalOrderCard` consumidos por 2 surfaces (programacion + solicitudes)
6. 4 modales nuevos (2 create + 2 confirm delivery)
7. Bulk action toolbar en BacklogTable con 3 botones (admin/logistica only)
8. 2 secciones en `/programacion` (Pickups Pendientes + Externos Pendientes) con cards
9. Sección orders en `/solicitudes/[id]` con cards (admin/logistica/pm-del-proyecto-destino)
10. LineRow badges 0-N fulfillments simultáneos con tooltips informativos
11. cancelSolicitud cancela orders relacionados con lógica G (entero o selectivo)
12. Cost editable preservado de Cambio 4 T8 (`disabled={fieldsDisabled}` sin `!!rateId`)
13. Polish round 2 preservado de Cambio 4 T9 (line cards sin project info, sin truncate desc/ruta)
14. Surface 2 eliminada (sin botones "Convertir a pickup/externo" en AssignmentRow)
15. PM permission D8 funcional con AT LEAST 1 match + `location_type='proyecto'` lowercase + `pp.is_active=true`
16. Trigger BD recalcula `qty_scheduled` + `qty_delivered` automáticamente — Code NO escribe estos campos
17. Coexistencia operacional permitida + sanity net `qty_invariant` rechaza sobre-asignación con error claro
18. Auto-cancel-empty trigger + hook devuelve `{ orderCancelled, orderId }` para toast UI feedback

### Verify commands

```bash
# T1 cleanup verification
grep -rn "pickup_by_project\|external_by_provider\|usePickup\|useExternal" src/ tests/  →  0 matches
grep -rn "isPickup\|isExternal" src/ tests/  →  0 matches
grep -rn "qty_scheduled\s*=" src/hooks/useTrips.ts src/hooks/useTripEvents.ts  →  0 matches (UPDATEs manuales eliminados)

# Polish round 2 + Cost editable preserved
grep -rEn "truncate.*description|description.*truncate" src/components/{solicitudes,programacion,viajes}/ src/app/\(app\)/{programacion,mis-viajes,solicitudes}/  →  0 matches en line cards (trip-row vehicle.description sigue OK)
grep -n "disabled={fieldsDisabled" src/components/programacion/TripForm.tsx  →  match SIN `|| !!rateId`

# Cambio 5 new
grep -rn "usePickupOrders\|useExternalOrders" src/  →  matches en 2 hooks + 4 modales + 2 pages
grep -rn "PickupOrderCard\|ExternalOrderCard" src/  →  matches en 2 cards + 2 pages

# Build
npm run build  →  exit code 0
```

### Smoke test list (18 verificaciones, post-T10 antes de T11)

1. **Trigger Trip**: crear trip con 2 líneas → qty_scheduled de las líneas se setea automáticamente. Sin UPDATE manual en código.
2. **Trigger Pickup Order**: crear pickup_order con 2 líneas (cantidades parciales) → qty_scheduled de las líneas refleja quantity_assigned. Líneas siguen en backlog con cantidad disponible si quedan unidades.
3. **Trigger External Order**: paralelo a #2 con provider/invoice/cost.
4. **Cancelar pickup_order**: UPDATE pickup_orders.status='Cancelado' → qty_scheduled de líneas vuelve a 0 automáticamente. Líneas reaparecen en backlog.
5. **Completar pickup_order**: UPDATE pickup_order_lines.qty_delivered + UPDATE pickup_orders.status='Entregado' → qty_delivered de líneas se acumula. Si qty_delivered=quantity → status='Entregada'. Si qty_delivered<quantity → status='Parcial' y línea aparece en backlog con cantidad restante.
6. **Bulk action UI**: seleccionar 3 líneas en backlog → toolbar bulk → click "Aprobar pickup" → modal con 3 líneas + cantidades editables → confirmar → orden creada, líneas desaparecen del backlog (si fully assigned), aparecen en sección "Pickups Pendientes".
7. **Bulk externo**: paralelo a #6 con provider+invoice+cost requeridos.
8. **Confirmar entrega pickup desde `/programacion`**: click "Confirmar entrega" en card de pickup_order → modal → llenar receptor + foto → confirmar → líneas pasan a Entregada.
9. **Confirmar entrega pickup desde `/solicitudes/[id]` como PM**: PM del proyecto destino ve sección "Pickup Orders" en su solicitud → botón "Confirmar entrega" funciona igual.
10. **Cancelar solicitud con orders activos**: solicitud con 2 líneas, 1 aprobada como pickup → cancelar solicitud → líneas pasan a Cancelada Y pickup_order también pasa a Cancelado.
11. **Backlog query con cantidades parciales correctas**: línea quantity=10, asignada parcial a pickup (qty=6) y trip (qty=2). Backlog muestra disponible=2.
12. **Status 'En Transito' preservado**: registrar Salida en trip → línea pasa a En Transito → trigger NO la cambia a 'Programada' aunque qty_scheduled siga > 0.
13. **Polish round 2 preservado**: line cards en BacklogTable, LineRow, AssignmentRow NO muestran código proyecto, nombre proyecto, cost code, cost category. Descripción y ruta NUNCA truncan.
14. **Cost editable preservado**: TripForm modo Edit → seleccionar tarifa → cost se pre-rellena → editar manualmente → guarda valor custom.
15. **Trip flow completo no se rompe**: crear trip → asignar líneas → registrar Salida → registrar Entrega → registrar Retorno → verificar todo el flow funciona idéntico a antes.
16. **Coexistencia mixed-fulfillment**: línea quantity=10 → asignar 4 a trip + 6 a pickup_order → LineRow muestra 2 badges simultáneos (TRIP + PICKUP). Backlog disponible=0. Cancelar pickup_order → backlog disponible=6 (trip aún tiene 4).
17. **Sanity net qty_invariant**: simular sobre-asignación (manualmente vía 2 pestañas o test directo) → BD rechaza con error CHECK constraint → hook traduce a "Esta línea ya fue asignada en otro fulfillment. Refrescá la página."
18. **removeLineFromPickupOrder con auto_cancel_empty**: crear pickup_order con 1 línea → eliminar esa línea (DELETE pickup_order_lines) → trigger auto_cancel_empty cancela order automáticamente → verificar pickup_orders.status='Cancelado' + qty_scheduled de la línea vuelve a 0 + Toast UI muestra "Pickup PKP-2026-X cancelado al eliminar última línea".

## §10 References

- **Cambio 3 Pickup spec** (predecesor obsoleto): patrón flag-en-línea reemplazado en Cambio 5. Spec deleted al shippear Cambio 3 per `plan-lifecycle.md`. Patrón documentado en `Docs/CHANGELOG.md` 2026-04-27.
- **Cambio 4 External spec** (`Docs/superpowers/specs/2026-04-28-cambio4-external-design.md`): se flippea a `status: deprecated` en T-final con deprecated_reason explícito.
- **Cambio 4 commits T1-T9** (`13262de..b6e63e3`): permanecen en historial git. Implementan modelo flag-en-línea reemplazado funcionalmente por Cambio 5.
- **Master spec Events V2 v3**: `Docs/reference/events-v2-redesign-in-progress-v3.md` — Sección 5 se agrega en T-final con frontmatter v3.4.
- **Master spec v3.1 location_type lowercase**: documenta corrección Cambio 1 (`'proyecto'` lowercase, no `'Proyecto'`). Cambio 5 hereda convención.
- **CLAUDE.md regla #9**: revertida en Cambio 4 T8. Cost editable con rate seleccionada. Mantenida en Cambio 5.
- **plan-lifecycle.md**: plan files Cambio 4 + Cambio 5 + .tasks.json se borran en Cambio 5 T-final.
- **spec-lifecycle.md**: spec Cambio 5 con frontmatter `status: shipped` post-T-final con `shipped_commits: <hash range>`. Spec Cambio 4 con `status: deprecated` + razón.
- **AD-3 (BACKLOG)**: fulfillment per-línea cerrado por Cambio 5.
- **CHECK constraints sm_request_lines** (verificados via Supabase MCP): `qty_invariant`, `qty_scheduled_nonneg`, `qty_delivered_nonneg`, `qty_positive` — sanity net BD para race conditions.
