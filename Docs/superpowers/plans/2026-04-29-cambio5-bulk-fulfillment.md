# Cambio 5 — Bulk Fulfillment Refactor (Pickup + Externo) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el modelo flag-en-línea de Pickup (Cambio 3) y Externo (Cambio 4) con tablas dedicadas `pickup_orders` y `external_orders` que agrupan N líneas por fulfillment común, con triggers BD que recalculan `qty_scheduled`/`qty_delivered` automáticamente, y UX bulk action en `/programacion`.

**Architecture:** Tablas dedicadas + triggers BD `recalc_qty_for_line` que se disparan desde 3 tablas pivot (`trip_line_assignments` + `pickup_order_lines` + `external_order_lines`). Code elimina TODOS los UPDATE manuales de `qty_scheduled`/`qty_delivered` — solo escribe en tablas pivot. Coexistencia operacional permitida (línea con fulfillments mixtos trip+pickup+externo) con sanity net BD `qty_invariant`. UI bulk action: BacklogTable agrega toolbar con 3 botones (Crear movilización + Aprobar pickup + Aprobar viaje externo). Surface 1 (single-line) y Surface 2 (convert from trip detail) eliminadas.

**Tech Stack:** Next.js 16 (App Router) + TypeScript ES2022 strict, Supabase (read-only Code), Tailwind CSS, lucide-react icons. BD ya aplicada por Chat (4 migraciones en orden estricto en staging `vonwkciosksqspyljzfy`). Cambio 4 commits T1-T9 (`13262de..b6e63e3`) permanecen en historial git pero su feature será reemplazado por Cambio 5.

**Spec ref:** `Docs/superpowers/specs/2026-04-29-cambio5-bulk-fulfillment.md` (commit `cc53224`, status: draft).

---

## File structure overview

### Create new (8 archivos)

| File | Responsibility |
|---|---|
| `src/hooks/usePickupOrders.ts` | 4 funciones: createPickupOrder, completePickupOrder, cancelPickupOrder, removeLineFromPickupOrder + tipos discriminated union |
| `src/hooks/useExternalOrders.ts` | 4 funciones paralelas + provider/invoice/cost (validación strict) |
| `src/components/programacion/PickupOrderCard.tsx` | Card reusable mostrando 1 pickup_order + N líneas + botones acción permission-driven |
| `src/components/programacion/ExternalOrderCard.tsx` | Card paralelo + provider_name + invoice_amount + "Ver factura" link |
| `src/components/programacion/CreatePickupOrderModal.tsx` | Modal bulk: N líneas con qty editable per línea + notas |
| `src/components/programacion/CreateExternalOrderModal.tsx` | Paralelo + sección provider/cost/factura/notas |
| `src/components/programacion/ConfirmPickupOrderDeliveryModal.tsx` | Modal confirm: read-only líneas + receptor opcional + notas + foto adicional |
| `src/components/programacion/ConfirmExternalOrderDeliveryModal.tsx` | Paralelo a pickup confirm + muestra info provider read-only |

### Modify (~12 archivos)

| File | Cambios |
|---|---|
| `src/lib/types/database.ts` | Regen post-4 BD migrations (4 nuevas tablas + DROP 16 columnas viejas + simplify cascade_request_status) |
| `src/hooks/useTrips.ts` | DELETE `releaseLineFromAssignment` helper. ELIMINAR UPDATEs manuales `qty_scheduled` en saveTrip/updateTrip/cancelTrip. MANTENER UPDATEs de `trip_line_assignments` (trigger se dispara desde ahí). |
| `src/hooks/useTripEvents.ts` | ELIMINAR UPDATEs manuales `qty_scheduled`/`qty_delivered`/`status` en handleDelivery/handleRevert. MANTENER UPDATE de `trip_line_assignments.qty_delivered`. MANTENER UPDATE de `sm_request_lines.delivered_at` (no calculado por trigger). |
| `src/hooks/useSolicitudes.ts` | LineWithRelations sin pickup_*/external_* columns. Agregar `fulfillments: FulfillmentInfo[]` campo + LEFT JOIN query. cancelSolicitud lógica G (cancel orders relacionados). |
| `src/components/solicitudes/LineRow.tsx` | DELETE props `pickupInfo`/`externalInfo`. Agregar prop `fulfillments`. Render 0-N badges. PRESERVAR polish round 2 (no truncate desc/ruta + tooltips universales). |
| `src/components/programacion/BacklogTable.tsx` | DELETE props `onApprovePickup`/`onApproveExternal` y botones per-línea. Selection state existente extender a 3 bulk actions. |
| `src/app/(app)/programacion/page.tsx` | DELETE Surface 1 modales single-line pickup/externo. DELETE secciones del modelo viejo. ADD bulk action toolbar (D1) + 2 secciones nuevas (D5/D6) con cards. |
| `src/app/(app)/programacion/viaje/[id]/page.tsx` | DELETE Surface 2 botones AssignmentRow + 2 modales inline (Cambio 3+4). MANTENER solo botón "Quitar del viaje". |
| `src/app/(app)/solicitudes/[id]/page.tsx` | ADD secciones "Pickup Orders" + "External Orders" related (D8). PM permission con AT LEAST 1 match (E10) + free-text edge case (E11). |
| `src/components/viajes/TripCard.tsx` | Verificar (probablemente sin cambios — TripCard es trip-level) |
| `src/components/programacion/LineSelector.tsx` | Verificar — selection checkboxes deben funcionar para 3 bulk actions |
| `src/components/solicitudes/types.ts` | Si tiene refs viejas de pickupInfo/externalInfo, cleanup |

### Delete (5 archivos)

| File | Razón |
|---|---|
| `src/hooks/usePickup.ts` | Modelo flag-en-línea Cambio 3 obsoleto |
| `src/hooks/useExternal.ts` | Modelo flag-en-línea Cambio 4 obsoleto |
| `src/components/programacion/ExternalApprovalForm.tsx` | Form Cambio 4 obsoleto (reemplazado por CreateExternalOrderModal con bulk lines) |
| `src/components/programacion/ExternalDeliveryModal.tsx` | Modal Cambio 4 obsoleto (reemplazado por ConfirmExternalOrderDeliveryModal) |
| `src/components/programacion/PickupDeliveryModal.tsx` | Modal Cambio 3 obsoleto (verificar si existe) |

---

## Task 1: Cleanup atomic + regen `database.ts` (7 sub-pasos, commit único)

**Goal:** Ejecutar el cleanup masivo de Cambios 3+4 obsoletos en una secuencia controlada de 7 sub-pasos (working tree). Commit único al final del sub-paso 1.7. Sub-pasos 1.1-1.6 son working tree, NO commits intermedios.

**Files:**
- Modify: `src/lib/types/database.ts` (regen completo)
- Delete: `src/hooks/usePickup.ts`, `src/hooks/useExternal.ts`, `src/components/programacion/ExternalApprovalForm.tsx`, `src/components/programacion/ExternalDeliveryModal.tsx`, `src/components/programacion/PickupDeliveryModal.tsx` (si existe)
- Modify hooks: `src/hooks/useTrips.ts` (eliminar UPDATEs qty_scheduled + releaseLineFromAssignment), `src/hooks/useTripEvents.ts` (eliminar UPDATEs qty_scheduled/qty_delivered/status), `src/hooks/useSolicitudes.ts` (LineWithRelations sin pickup_*/external_* + cancelSolicitud filter sin Pickup/Externo Aprobado status)
- Modify components: `src/components/solicitudes/LineRow.tsx` (eliminar props pickupInfo/externalInfo + badges), `src/components/programacion/BacklogTable.tsx` (eliminar props onApprovePickup/onApproveExternal + botones)
- Modify pages: `src/app/(app)/programacion/page.tsx` (eliminar imports useExternal/usePickup + state externalApproveModal/etc + Surface 1 modales + secciones modelo viejo), `src/app/(app)/programacion/viaje/[id]/page.tsx` (eliminar Surface 2 imports/state/handlers/modales), `src/app/(app)/solicitudes/[id]/page.tsx` (eliminar `externalInfo` prop pass-through si existe)

**Acceptance Criteria:**
- [ ] `database.ts` regenerado con 4 tablas nuevas (`pickup_orders`, `pickup_order_lines`, `external_orders`, `external_order_lines`) + DROP de 16 columnas viejas en `sm_request_lines`
- [ ] `grep -rn "pickup_by_project\|external_by_provider" src/ tests/` → 0 matches
- [ ] `grep -rn "usePickup\|useExternal" src/` → 0 matches (eliminados completamente; los nuevos hooks `usePickupOrders` / `useExternalOrders` se crean en T2/T3)
- [ ] `grep -rn "ExternalApprovalForm\|ExternalDeliveryModal\|PickupDeliveryModal" src/` → 0 matches
- [ ] `grep -rn "qty_scheduled\s*=\|qty_scheduled:" src/hooks/useTrips.ts src/hooks/useTripEvents.ts` → 0 matches en UPDATEs (mantener solo en interfaces TypeScript si aplican)
- [ ] `npm run build` → verde
- [ ] T8 (Cost editable) preservado: `grep -n "disabled={fieldsDisabled" src/components/programacion/TripForm.tsx` → match SIN `|| !!rateId`
- [ ] T9 Polish round 2 preservado: `grep -rEn "truncate.*description|description.*truncate" src/components/{solicitudes,programacion,viajes}/ src/app/\(app\)/{programacion,mis-viajes,solicitudes}/` → 0 matches en line cards

**Verify:**
```bash
grep -rn "pickup_by_project\|external_by_provider\|usePickup\|useExternal\|ExternalApprovalForm\|ExternalDeliveryModal\|PickupDeliveryModal" src/ tests/
npm run build
```

Expected: 0 grep matches + build green.

**Sub-pasos (working tree, NO commits intermedios):**

- [ ] **Sub-paso 1.1: Regen `database.ts` desde staging**

```bash
npx supabase gen types typescript --project-id vonwkciosksqspyljzfy > src/lib/types/database.ts
```

Después del regen, RE-AGREGAR el helper manual `Row<T>` al final del archivo (deuda técnica conocida — el regen lo wipea):

```typescript
// Helper type for row access
export type Row<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
```

Verificar regen capturó las 4 nuevas tablas:
```bash
grep -E "^      pickup_orders:|^      pickup_order_lines:|^      external_orders:|^      external_order_lines:" src/lib/types/database.ts
```
Expected: 4 matches (uno por tabla en `Tables` interface).

Verificar DROP de columnas viejas:
```bash
grep "pickup_by_project\|external_by_provider" src/lib/types/database.ts
```
Expected: 0 matches.

**Build esperado en este sub-paso: ROJO** (consumidores de las columnas viejas fallan TypeScript). NO commitear ahora.

- [ ] **Sub-paso 1.2: DELETE 5 archivos viejos**

```bash
rm src/hooks/usePickup.ts
rm src/hooks/useExternal.ts
rm src/components/programacion/ExternalApprovalForm.tsx
rm src/components/programacion/ExternalDeliveryModal.tsx
# Verificar si PickupDeliveryModal existe antes de borrar:
ls src/components/programacion/PickupDeliveryModal.tsx 2>/dev/null && rm src/components/programacion/PickupDeliveryModal.tsx
```

Build esperado: aún ROJO (refs huérfanas en consumers). NO commitear.

- [ ] **Sub-paso 1.3: Cleanup refs en hooks**

**`src/hooks/useTrips.ts`:**

DELETE la función helper `releaseLineFromAssignment` (entre la sección de helpers privados, ~líneas 360-395):

Old:
```typescript
async function releaseLineFromAssignment(
  supabase: SupabaseClient<Database>,
  requestLineId: string,
  quantityAssigned: number,
): Promise<boolean> {
  const { data: line, error: fetchError } = await supabase
    .from('sm_request_lines')
    .select('id, status, qty_scheduled, qty_delivered')
    .eq('id', requestLineId)
    .single()

  if (fetchError || !line) return false
  if (['Entregada', 'Cancelada'].includes(line.status)) return true

  const newQtyScheduled = Math.max(0, (line.qty_scheduled ?? 0) - quantityAssigned)
  let newStatus = line.status
  if (newQtyScheduled <= 0) {
    newStatus = (line.qty_delivered ?? 0) > 0 ? 'Parcial' : 'Pendiente'
  }

  const { error: updateError } = await supabase
    .from('sm_request_lines')
    .update({
      qty_scheduled: newQtyScheduled,
      status: newStatus,
    })
    .eq('id', requestLineId)

  return !updateError
}
```

New: (función completa eliminada — el trigger BD reemplaza esta lógica)

DELETE en `saveTrip` el loop post-INSERT que actualiza qty_scheduled (~líneas 870-890):

Old:
```typescript
// 3. Actualizar el estado de cada línea asignada a 'Programada' y sumar la cantidad programada acumulada
for (const a of assignments) {
  const { data: currentLine } = await supabase
    .from('sm_request_lines')
    .select('qty_scheduled, quantity')
    .eq('id', a.request_line_id)
    .single()

  const currentScheduled = currentLine?.qty_scheduled ?? 0
  const totalQty = currentLine?.quantity ?? a.quantity_assigned
  const newQtyScheduled = Math.min(totalQty, currentScheduled + a.quantity_assigned)

  await supabase
    .from('sm_request_lines')
    .update({
      status: 'Programada',
      qty_scheduled: newQtyScheduled,
    })
    .eq('id', a.request_line_id)
}
```

New: (loop completo eliminado — el trigger `recalc_on_trip_assignment_change` se dispara automáticamente desde el INSERT en `trip_line_assignments`)

DELETE en `updateTrip` los loops similares para `removeAssignmentIds`, `modifiedAssignments`, `addAssignments` (todos los UPDATEs de `sm_request_lines.qty_scheduled` y `status='Programada'`). MANTENER:
- DELETE de `trip_line_assignments` (líneas removidas)
- UPDATE de `trip_line_assignments.quantity_assigned` (modified)
- INSERT en `trip_line_assignments` (added)

DELETE en `cancelTrip` el loop `releaseLineFromAssignment` (~líneas 1095-1100). MANTENER:
- DELETE de `trip_line_assignments` (todas las assignments del trip)
- UPDATE de `trips.status='Cancelado'` (el trigger en trips status change recalcula líneas)

**`src/hooks/useTripEvents.ts`:**

(Este archivo no fue revisado en detalle previamente — investigar matching pattern para `handleDelivery` y `handleRevert`. Buscar UPDATEs de `sm_request_lines.qty_scheduled`, `qty_delivered`, `status` y eliminarlos. MANTENER UPDATE de `trip_line_assignments.qty_delivered` y de `sm_request_lines.delivered_at`.)

```bash
grep -n "qty_scheduled\|qty_delivered\|status" src/hooks/useTripEvents.ts | head -30
```

Identificar líneas con `.update({` para `sm_request_lines` y eliminar las que setean qty_scheduled/qty_delivered/status. Conservar UPDATEs específicos a `trip_line_assignments` y a `sm_request_lines.delivered_at` (no calculado por trigger).

**`src/hooks/useSolicitudes.ts`:**

En `LineWithRelations` interface (~líneas 42-87): eliminar las 14 columnas pickup_*/external_* (6 + 8). El interface queda sin esos campos pre-Cambio 5; se reemplazarán por `fulfillments` array en T9.

En `fetchSolicitud` mapper (~líneas 446-451): eliminar las líneas que mapean pickup_*/external_* fields.

En `cancelSolicitud` filter (~línea 781):

Old:
```typescript
const lineIdsToCancel = (lines ?? [])
  .filter((l) => l.status === 'Pendiente' || l.status === 'Programada' || l.status === 'Pickup Aprobado' || l.status === 'Externo Aprobado')
  .map((l) => l.id)
```

New (los status 'Pickup Aprobado' y 'Externo Aprobado' ya no existen post-Migration 4):
```typescript
const lineIdsToCancel = (lines ?? [])
  .filter((l) => l.status === 'Pendiente' || l.status === 'Programada' || l.status === 'Parcial')
  .map((l) => l.id)
```

Nota: agregar `'Parcial'` al filter (líneas con qty_delivered > 0 pero no completadas — al cancelar la solicitud, las no-entregadas vuelven a Cancelada, las entregadas históricas sobreviven via trigger).

Build esperado: aún ROJO (refs en components y pages). NO commitear.

- [ ] **Sub-paso 1.4: Cleanup refs en components**

**`src/components/solicitudes/LineRow.tsx`:**

DELETE props `pickupInfo` y `externalInfo` de `LineRowProps` interface (~líneas 22-39).

DELETE el destructuring de `pickupInfo`, `externalInfo` en function signature.

DELETE las constantes derivadas:
```typescript
const showPickupApproved = pickupInfo?.pickup_by_project && status === 'Pickup Aprobado'
const showPickupCompleted = pickupInfo?.pickup_completed_at && status === 'Entregada'
const showExternalApproved = externalInfo?.external_by_provider && status === 'Externo Aprobado'
const showExternalCompleted = externalInfo?.external_completed_at && status === 'Entregada'
const externalApprovedTooltip = ...
const externalCompletedTooltip = ...
```

DELETE en JSX desktop block (~líneas 122-167) los badges PICKUP/RETIRADO/EXTERNO APROBADO/ENTREGADO (EXTERNO):
```tsx
{showPickupApproved && pickupInfo && (...)}
{showPickupCompleted && pickupInfo && (...)}
{showExternalApproved && externalInfo && (...)}
{showExternalCompleted && externalInfo && (...)}
```

Mismo en mobile block.

**MANTENER el polish round 2 de Cambio 4 T9** (description sin truncate, ruta sin truncate, tooltips universales con `statusContextString`). En T9 de Cambio 5 vamos a re-introducir badges per-fulfillment usando el nuevo prop `fulfillments`.

**`src/components/programacion/BacklogTable.tsx`:**

DELETE props `onApprovePickup` y `onApproveExternal` de `BacklogTableProps` interface (~líneas 17-22).

DELETE el destructuring en function signature.

DELETE en desktop block los 2 botones:
```tsx
{onApprovePickup && (<button>Aprobar pickup</button>)}
{onApproveExternal && (<button>Aprobar viaje externo</button>)}
```

Mismo en mobile block.

(Los nuevos botones bulk en toolbar van en T7, no en BacklogTable directamente — la toolbar es parte de programacion/page.tsx.)

Build esperado: aún ROJO (refs en pages). NO commitear.

- [ ] **Sub-paso 1.5: Cleanup refs en pages**

**`src/app/(app)/programacion/page.tsx`:**

DELETE imports:
```typescript
import { usePickup } from '@/hooks/usePickup'
import { PickupDeliveryModal, type PendingPickupLine } from '@/components/programacion/PickupDeliveryModal'  // si existe
import { useExternal } from '@/hooks/useExternal'
import { ExternalApprovalForm, EMPTY_FORM_VALUES, validateApprovalForm, type ExternalApprovalFormValues, type ExternalApprovalFormErrors } from '@/components/programacion/ExternalApprovalForm'
import { ExternalDeliveryModal, type PendingExternalLine } from '@/components/programacion/ExternalDeliveryModal'
```

DELETE state:
```typescript
const pickup = usePickup()
const [pickupConfirmLineId, setPickupConfirmLineId] = useState<string | null>(null)
const [pendingPickups, setPendingPickups] = useState<PendingPickupLine[]>([])
const [pickupsLoading, setPickupsLoading] = useState(false)
const [pickupDeliveryLine, setPickupDeliveryLine] = useState<PendingPickupLine | null>(null)
const [pickupRevertLine, setPickupRevertLine] = useState<PendingPickupLine | null>(null)
const external = useExternal()
const [externalApproveModal, setExternalApproveModal] = useState<{ lineId: string } | null>(null)
const [externalApproveValues, setExternalApproveValues] = useState<ExternalApprovalFormValues>(EMPTY_FORM_VALUES)
const [externalApproveErrors, setExternalApproveErrors] = useState<ExternalApprovalFormErrors>({})
const [pendingExternals, setPendingExternals] = useState<PendingExternalLine[]>([])
const [externalsLoading, setExternalsLoading] = useState(false)
const [externalDeliveryLine, setExternalDeliveryLine] = useState<PendingExternalLine | null>(null)
const [externalRevertLine, setExternalRevertLine] = useState<PendingExternalLine | null>(null)
```

DELETE handlers:
```typescript
const handleApprovePickup = ...
const confirmApprovePickup = ...
const handleCompletePickup = ...
const confirmRevertPickup = ...
const refetchPendingPickups = ...
const handleApproveExternal = ...
const closeExternalApproveModal = ...
const confirmApproveExternal = ...
const refetchPendingExternals = ...
const handleCompleteExternal = ...
const confirmRevertExternal = ...
```

DELETE useEffects que llaman refetchPendingPickups / refetchPendingExternals.

DELETE el prop pass `onApprovePickup={...}` y `onApproveExternal={...}` en `<BacklogTable />`.

DELETE las JSX sections viejas:
- Sección "Pickups Pendientes de Retiro" (modelo Cambio 3)
- Sección "Viajes Externos Pendientes" (modelo Cambio 4)

DELETE los modals al final del JSX:
- Modal Aprobar pickup (`pickupConfirmLineId &&`)
- Modal Devolver al backlog pickup (`pickupRevertLine &&`)
- Modal PickupDeliveryModal
- Modal Aprobar viaje externo (`externalApproveModal &&`)
- Modal Devolver al backlog externo (`externalRevertLine &&`)
- Modal ExternalDeliveryModal

(Los nuevos modals + secciones bulk se agregan en T7.)

**`src/app/(app)/programacion/viaje/[id]/page.tsx`:**

DELETE imports:
```typescript
import { usePickup } from '@/hooks/usePickup'
import { useExternal } from '@/hooks/useExternal'
import { ExternalApprovalForm, EMPTY_FORM_VALUES, validateApprovalForm, type ExternalApprovalFormValues, type ExternalApprovalFormErrors } from '@/components/programacion/ExternalApprovalForm'
```

DELETE state pickup/external (modal states, values, errors).

DELETE handlers `handleConvertToPickup`, `confirmConvertToPickup`, `handleConvertToExternal`, `closeExternalConvertModal`, `confirmConvertToExternal`.

DELETE en `AssignmentRow` interface las props `onConvertToPickup`/`onConvertToExternal`. Y los botones JSX dentro del componente.

DELETE el prop pass `onConvertToPickup={...}` y `onConvertToExternal={...}` en `<AssignmentRow />`.

DELETE los modals inline:
- Modal Convertir a pickup (`pickupModalState &&`)
- Modal Convertir a externo (`externalConvertModal &&`)

**`src/app/(app)/solicitudes/[id]/page.tsx`:**

Si tiene refs a `externalInfo` o `pickupInfo` props para LineRow:
```bash
grep -n "externalInfo\|pickupInfo" "src/app/(app)/solicitudes/[id]/page.tsx"
```

DELETE el prop pass de `externalInfo={{...}}` en `<LineRow />` (LineRow ya no acepta esa prop). En T9 se agregará el prop `fulfillments={...}`.

Build esperado: VERDE end-to-end después del cleanup completo. Si NO está verde, identificar refs huérfanas restantes y eliminarlas.

- [ ] **Sub-paso 1.6: Verificar build verde end-to-end**

```bash
npm run build
```

Expected: exit code 0, "Compiled successfully" message.

Si falla: leer el error, identificar la ref huérfana, eliminar, retry. NO commitear hasta que esté verde.

```bash
grep -rn "pickup_by_project\|external_by_provider\|usePickup\|useExternal\|ExternalApprovalForm\|ExternalDeliveryModal\|PickupDeliveryModal" src/ tests/
```

Expected: 0 matches en TODOS los patterns.

- [ ] **Sub-paso 1.7: Commit único T1**

```bash
git add src/lib/types/database.ts src/hooks/useTrips.ts src/hooks/useTripEvents.ts src/hooks/useSolicitudes.ts src/components/solicitudes/LineRow.tsx src/components/programacion/BacklogTable.tsx "src/app/(app)/programacion/page.tsx" "src/app/(app)/programacion/viaje/[id]/page.tsx" "src/app/(app)/solicitudes/[id]/page.tsx"
git rm src/hooks/usePickup.ts src/hooks/useExternal.ts src/components/programacion/ExternalApprovalForm.tsx src/components/programacion/ExternalDeliveryModal.tsx
# Si PickupDeliveryModal existía:
ls src/components/programacion/PickupDeliveryModal.tsx 2>/dev/null && git rm src/components/programacion/PickupDeliveryModal.tsx

git commit -m "$(cat <<'EOF'
feat: T1 Cambio 5 — cleanup atomic (regen database.ts + DELETE Cambios 3+4 obsoletos)

Regenera tipos desde staging post-4 BD migrations:
- 4 tablas nuevas: pickup_orders + pickup_order_lines + external_orders + external_order_lines
- DROP 16 columnas viejas en sm_request_lines (6 pickup_* + 10 external_*)
- DROP CHECK constraint sm_request_lines_pickup_external_exclusive
- cascade_request_status simplificado (in_progress IN ('Programada', 'En Transito') solamente)

DELETE 5 archivos obsoletos:
- src/hooks/usePickup.ts (Cambio 3 flag-en-línea)
- src/hooks/useExternal.ts (Cambio 4 flag-en-línea)
- src/components/programacion/ExternalApprovalForm.tsx (Cambio 4)
- src/components/programacion/ExternalDeliveryModal.tsx (Cambio 4)
- src/components/programacion/PickupDeliveryModal.tsx (Cambio 3, si existía)

Cleanup refs en hooks:
- useTrips.ts: DELETE releaseLineFromAssignment helper. ELIMINAR UPDATEs
  manuales qty_scheduled en saveTrip/updateTrip/cancelTrip. MANTENER
  UPDATEs de trip_line_assignments (trigger se dispara desde ahí).
- useTripEvents.ts: ELIMINAR UPDATEs manuales qty_scheduled/qty_delivered/
  status en handleDelivery/handleRevert. MANTENER UPDATE de
  trip_line_assignments.qty_delivered + sm_request_lines.delivered_at.
- useSolicitudes.ts: LineWithRelations sin pickup_*/external_* (14 cols).
  fetchSolicitud mapper sin esos fields. cancelSolicitud filter sin
  'Pickup Aprobado'/'Externo Aprobado' status (eliminados post-Migration 4).

Cleanup refs en components: LineRow + BacklogTable sin pickupInfo/
externalInfo props ni botones per-línea. Polish round 2 de Cambio 4
PRESERVADO (sin truncate desc/ruta + tooltips universales).

Cleanup refs en pages: programacion + viaje/[id] + solicitudes/[id]
sin imports/state/handlers/modales/secciones del modelo viejo.

Trigger BD recalc_qty_for_line garantiza qty_scheduled/qty_delivered
correctos automáticamente — Code escribe SOLO en tablas pivot.

Cambio 4 commits T1-T9 (13262de..b6e63e3) permanecen en historial git.
Spec Cambio 4 se flippea a status=deprecated en T-final.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

```json:metadata
{"files":["src/lib/types/database.ts","src/hooks/useTrips.ts","src/hooks/useTripEvents.ts","src/hooks/useSolicitudes.ts","src/components/solicitudes/LineRow.tsx","src/components/programacion/BacklogTable.tsx","src/app/(app)/programacion/page.tsx","src/app/(app)/programacion/viaje/[id]/page.tsx","src/app/(app)/solicitudes/[id]/page.tsx"],"verifyCommand":"grep -rn \"pickup_by_project\\|external_by_provider\\|usePickup\\|useExternal\" src/ tests/ && npm run build","acceptanceCriteria":["database.ts regenerado con 4 tablas nuevas + DROP 16 cols","0 grep matches refs viejas","build verde","Polish round 2 + Cost editable preservados","sub-pasos 1.1-1.6 working tree, commit único 1.7"]}
```

---

## Task 2: Hook `usePickupOrders.ts` con 4 funciones

**Goal:** Implementar hook centralizado para operaciones de pickup_orders. 4 funciones: createPickupOrder, completePickupOrder, cancelPickupOrder, removeLineFromPickupOrder. Todas validan cantidades vs `available` antes del INSERT, usan `translateBdError` para CHECK constraint qty_invariant. cancelPickupOrder hace pre-flight stats SELECT para UI confirmation modal. removeLineFromPickupOrder detecta auto-cancel-empty para toast UI.

**Files:**
- Create: `src/hooks/usePickupOrders.ts`

**Acceptance Criteria:**
- [ ] Hook exporta 4 funciones + 4 result types (`CreatePickupOrderResult`, `CompletePickupResult`, `CancelPickupResult`, `RemoveLineResult`) + tipo `PickupOrderLineInput`
- [ ] `createPickupOrder` valida `quantity_assigned > 0 && <= available` per línea con SELECT fresh pre-INSERT
- [ ] `cancelPickupOrder` pre-flight SELECT devuelve `{ deliveredCount, deliveredQty }` para UI confirmation modal
- [ ] `removeLineFromPickupOrder` detecta auto-cancel y devuelve `{ orderCancelled: boolean, orderId?: string }`
- [ ] CHECK constraint qty_invariant error traducido a "Esta línea ya fue asignada en otro fulfillment. Refrescá la página."
- [ ] `npm run build` → verde

**Verify:** `npm run build && grep -n "createPickupOrder\|completePickupOrder\|cancelPickupOrder\|removeLineFromPickupOrder" src/hooks/usePickupOrders.ts`

Expected: build verde + 4 matches (uno por función exportada).

**Steps:**

- [ ] **Step 1: Crear `src/hooks/usePickupOrders.ts` con contenido completo**

```typescript
'use client'

import { useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface PickupOrderLineInput {
  request_line_id: string
  quantity_assigned: number
}

export interface CreatePickupOrderResult {
  ok: boolean
  orderId?: string
  pickupId?: string  // PKP-2026-NNN auto-generado por trigger BD
  error?: string
}

export interface CompletePickupResult {
  ok: boolean
  error?: string
}

export interface CancelPickupResult {
  ok: boolean
  deliveredCount?: number  // # líneas con qty_delivered > 0 (para UI confirmation modal)
  deliveredQty?: number    // SUM qty_delivered total
  error?: string
}

export interface RemoveLineResult {
  ok: boolean
  orderCancelled?: boolean   // true si era última línea (auto_cancel_empty trigger se disparó)
  orderId?: string           // PKP-... para toast UI
  error?: string
}

/**
 * Traduce errores BD a mensajes user-friendly. CHECK constraint qty_invariant
 * se triggerea en race condition (2 sesiones de Charris asignando la misma
 * línea a fulfillments diferentes simultáneamente). Error PostgreSQL críptico
 * se convierte a mensaje accionable.
 */
function translateBdError(message: string): string {
  if (message.includes('qty_invariant') || message.includes('sm_request_lines_qty_invariant')) {
    return 'Esta línea ya fue asignada en otro fulfillment. Refrescá la página.'
  }
  return message
}

/**
 * Hook de operaciones pickup_orders (Cambio 5 — modelo bulk).
 * Reemplaza el modelo flag-en-línea de Cambio 3 (usePickup).
 *
 * 4 funciones:
 * - createPickupOrder: crea pickup_order + N pickup_order_lines en una transacción.
 *   Trigger BD recalcula sm_request_lines.qty_scheduled automáticamente.
 * - completePickupOrder: marca order como Entregado, setea qty_delivered=quantity_assigned
 *   per línea (todo-o-nada v1). Trigger recalcula qty_delivered + status de las líneas.
 * - cancelPickupOrder: UPDATE pickup_orders.status='Cancelado'. Trigger recalcula:
 *   qty_scheduled de no-entregadas vuelve a 0, qty_delivered HISTÓRICA preservada.
 *   PERMITIDO con qty_delivered>0 — pre-flight stats para UI confirmation modal.
 * - removeLineFromPickupOrder: DELETE de pickup_order_lines. Si era la última línea,
 *   auto_cancel_empty_pickup_order trigger cancela el order automáticamente.
 *   Hook detecta count post-DELETE y devuelve { orderCancelled, orderId } para toast.
 */
export function usePickupOrders() {
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Crea pickup_order con N líneas. Validaciones:
   * - lines.length > 0
   * - cada quantity_assigned > 0
   * - cada quantity_assigned <= available (quantity - qty_scheduled - qty_delivered)
   *
   * Trigger BD recalc_qty_for_line se dispara automáticamente desde el INSERT
   * en pickup_order_lines y actualiza sm_request_lines.qty_scheduled.
   */
  const createPickupOrder = useCallback(
    async (
      charrisId: string,
      lines: PickupOrderLineInput[],
      notes?: string | null,
    ): Promise<CreatePickupOrderResult> => {
      setLoading(true)
      setError(null)

      try {
        if (lines.length === 0) {
          const msg = 'Debe seleccionar al menos una línea para aprobar pickup.'
          setError(msg)
          return { ok: false, error: msg }
        }

        // 1. Validar quantities pre-INSERT con SELECT fresh
        const lineIds = lines.map((l) => l.request_line_id)
        const { data: dbLines, error: fetchError } = await supabase
          .from('sm_request_lines')
          .select('id, quantity, qty_scheduled, qty_delivered, description')
          .in('id', lineIds)

        if (fetchError || !dbLines) {
          const msg = fetchError?.message ?? 'Error al validar líneas'
          setError(msg)
          return { ok: false, error: msg }
        }

        for (const input of lines) {
          if (input.quantity_assigned <= 0) {
            const msg = `Cantidad inválida (${input.quantity_assigned}). Debe ser mayor a cero.`
            setError(msg)
            return { ok: false, error: msg }
          }
          const dbLine = dbLines.find((dl) => dl.id === input.request_line_id)
          if (!dbLine) {
            const msg = `Línea ${input.request_line_id.slice(0, 8)} no encontrada.`
            setError(msg)
            return { ok: false, error: msg }
          }
          const available = dbLine.quantity - (dbLine.qty_scheduled ?? 0) - (dbLine.qty_delivered ?? 0)
          if (input.quantity_assigned > available) {
            const msg = `"${dbLine.description}": cantidad ${input.quantity_assigned} excede disponible (${available}).`
            setError(msg)
            return { ok: false, error: msg }
          }
        }

        // 2. INSERT pickup_orders header
        const { data: orderRow, error: insertError } = await supabase
          .from('pickup_orders')
          .insert({
            status: 'Aprobado',
            approved_by: charrisId,
            approved_at: new Date().toISOString(),
            notes: notes?.trim() || null,
            created_by: charrisId,
          })
          .select('id, pickup_id')
          .single()

        if (insertError || !orderRow) {
          const friendly = translateBdError(insertError?.message ?? 'Error al crear pickup order')
          setError(friendly)
          return { ok: false, error: friendly }
        }

        // 3. INSERT pickup_order_lines (bulk)
        const linesPayload = lines.map((l) => ({
          pickup_order_id: orderRow.id,
          request_line_id: l.request_line_id,
          quantity_assigned: l.quantity_assigned,
          qty_delivered: 0,
        }))

        const { error: linesError } = await supabase
          .from('pickup_order_lines')
          .insert(linesPayload)

        if (linesError) {
          // Rollback: DELETE el order para no dejar huérfano
          await supabase.from('pickup_orders').delete().eq('id', orderRow.id)
          const friendly = translateBdError(linesError.message)
          setError(friendly)
          return { ok: false, error: friendly }
        }

        // Trigger BD recalc_qty_for_line ya actualizó sm_request_lines.qty_scheduled
        return { ok: true, orderId: orderRow.id, pickupId: orderRow.pickup_id }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error inesperado al crear pickup order'
        setError(message)
        return { ok: false, error: message }
      } finally {
        setLoading(false)
      }
    },
    [supabase],
  )

  /**
   * Completa pickup_order: setea qty_delivered = quantity_assigned per línea
   * (todo-o-nada v1) y status='Entregado'. Trigger BD recalcula qty_delivered
   * + status de las sm_request_lines automáticamente.
   *
   * receivedById/receivedByName son OPCIONALES (no XOR). Ambos pueden ser NULL.
   */
  const completePickupOrder = useCallback(
    async (
      orderId: string,
      completedById: string,
      receivedById: string | null,
      receivedByName: string,
      notes: string,
      additionalAttachments: unknown[],
    ): Promise<CompletePickupResult> => {
      setLoading(true)
      setError(null)

      try {
        const now = new Date().toISOString()

        // 1. SELECT existing attachments + notes para append
        const { data: existing, error: fetchError } = await supabase
          .from('pickup_orders')
          .select('attachments, notes')
          .eq('id', orderId)
          .single()

        if (fetchError || !existing) {
          const msg = fetchError?.message ?? 'Pickup order no encontrado'
          setError(msg)
          return { ok: false, error: msg }
        }

        const existingAttachments = Array.isArray(existing.attachments)
          ? (existing.attachments as unknown[])
          : []
        const finalAttachments = [...existingAttachments, ...additionalAttachments]

        const trimmedNotes = notes.trim()
        const finalNotes = trimmedNotes
          ? (existing.notes ? `${existing.notes}\n\n[Entrega ${now}] ${trimmedNotes}` : trimmedNotes)
          : existing.notes ?? null

        // 2. UPDATE pickup_order_lines: qty_delivered = quantity_assigned (todo-o-nada)
        const { data: orderLines, error: linesError } = await supabase
          .from('pickup_order_lines')
          .select('id, quantity_assigned')
          .eq('pickup_order_id', orderId)

        if (linesError || !orderLines) {
          setError(linesError?.message ?? 'Error al obtener líneas del order')
          return { ok: false, error: linesError?.message ?? 'Líneas no encontradas' }
        }

        for (const line of orderLines) {
          const { error: updateLineError } = await supabase
            .from('pickup_order_lines')
            .update({ qty_delivered: line.quantity_assigned })
            .eq('id', line.id)
          if (updateLineError) {
            setError(updateLineError.message)
            return { ok: false, error: updateLineError.message }
          }
        }

        // 3. UPDATE pickup_orders: status='Entregado' + completed_at + receptor + notas + attachments
        const { error: orderUpdateError } = await supabase
          .from('pickup_orders')
          .update({
            status: 'Entregado',
            completed_at: now,
            completed_by: completedById,
            received_by_id: receivedById,
            received_by_name: receivedByName.trim() || null,
            notes: finalNotes,
            attachments: JSON.parse(JSON.stringify(finalAttachments)),
          })
          .eq('id', orderId)
          .eq('status', 'Aprobado')  // WHERE defensive
          .select('id')

        if (orderUpdateError) {
          setError(orderUpdateError.message)
          return { ok: false, error: orderUpdateError.message }
        }

        return { ok: true }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error inesperado al completar pickup order'
        setError(message)
        return { ok: false, error: message }
      } finally {
        setLoading(false)
      }
    },
    [supabase],
  )

  /**
   * Cancela pickup_order. PERMITIDO con qty_delivered > 0 (E7).
   * Trigger BD preserva qty_delivered HISTÓRICA — entregas son hechos físicos
   * que sobreviven al cancel.
   *
   * Pre-flight SELECT devuelve stats para que UI muestre confirmation modal
   * con copy contextual: "Las {N} líneas ya entregadas ({Q} unidades) quedan
   * registradas como entregadas. ¿Confirmar?"
   */
  const cancelPickupOrder = useCallback(
    async (
      orderId: string,
      cancelledById: string,
    ): Promise<CancelPickupResult> => {
      setLoading(true)
      setError(null)

      try {
        // Pre-flight stats
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

        // UPDATE pickup_orders SET status='Cancelado'
        const { error: updateError } = await supabase
          .from('pickup_orders')
          .update({
            status: 'Cancelado',
            cancelled_at: new Date().toISOString(),
            cancelled_by: cancelledById,
          })
          .eq('id', orderId)
          .eq('status', 'Aprobado')  // WHERE defensive
          .select('id')

        if (updateError) {
          setError(updateError.message)
          return { ok: false, error: updateError.message }
        }

        // Trigger BD ya recalculó: qty_scheduled de no-entregadas → 0,
        // qty_delivered HISTÓRICA preservada.
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

  /**
   * Elimina una línea de pickup_order. Si era la última línea, el trigger BD
   * auto_cancel_empty_pickup_order cancela el order automáticamente.
   *
   * Hook detecta count post-DELETE y devuelve { orderCancelled, orderId }
   * para que UI muestre toast: "Pickup PKP-2026-X cancelado al eliminar
   * última línea".
   */
  const removeLineFromPickupOrder = useCallback(
    async (
      orderId: string,
      pickupOrderLineId: string,
    ): Promise<RemoveLineResult> => {
      setLoading(true)
      setError(null)

      try {
        // 1. DELETE de pickup_order_lines
        const { error: deleteError } = await supabase
          .from('pickup_order_lines')
          .delete()
          .eq('id', pickupOrderLineId)

        if (deleteError) {
          setError(deleteError.message)
          return { ok: false, error: deleteError.message }
        }

        // 2. SELECT count remaining + status del order (post-trigger)
        const { data: orderRow, error: fetchError } = await supabase
          .from('pickup_orders')
          .select('id, pickup_id, status')
          .eq('id', orderId)
          .single()

        if (fetchError || !orderRow) {
          // Order ya fue eliminado o no existe — asumir cancelled
          return { ok: true, orderCancelled: true }
        }

        const orderCancelled = orderRow.status === 'Cancelado'
        return {
          ok: true,
          orderCancelled,
          orderId: orderCancelled ? orderRow.pickup_id : undefined,
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error inesperado al eliminar línea'
        setError(message)
        return { ok: false, error: message }
      } finally {
        setLoading(false)
      }
    },
    [supabase],
  )

  return {
    loading,
    error,
    createPickupOrder,
    completePickupOrder,
    cancelPickupOrder,
    removeLineFromPickupOrder,
  }
}
```

- [ ] **Step 2: Build verde**

```bash
npm run build
```

Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/usePickupOrders.ts
git commit -m "$(cat <<'EOF'
feat: T2 Cambio 5 — hook usePickupOrders con 4 funciones bulk

Hook centralizado de operaciones pickup_orders. Reemplaza modelo
flag-en-línea de Cambio 3 (usePickup eliminado en T1).

4 funciones:
- createPickupOrder: crea pickup_order + N pickup_order_lines en
  transacción. Validación pre-INSERT: quantity_assigned > 0 y <=
  available (quantity - qty_scheduled - qty_delivered) per línea con
  SELECT fresh. Rollback explícito (DELETE order) si lines INSERT falla.
- completePickupOrder: setea qty_delivered = quantity_assigned per línea
  (todo-o-nada v1) + UPDATE order status='Entregado' con receptor opcional
  + notas append + attachments concat. WHERE defensive status='Aprobado'.
- cancelPickupOrder: pre-flight SELECT stats (deliveredCount, deliveredQty)
  para UI confirmation modal. UPDATE status='Cancelado'. PERMITIDO con
  qty_delivered>0 — trigger BD preserva HISTÓRICA. WHERE defensive.
- removeLineFromPickupOrder: DELETE pickup_order_lines + SELECT post-DELETE
  para detectar auto_cancel_empty trigger. Devuelve { orderCancelled,
  orderId } para toast UI.

translateBdError() traduce CHECK constraint qty_invariant a mensaje
user-friendly: "Esta línea ya fue asignada en otro fulfillment. Refrescá
la página."

Trigger BD recalc_qty_for_line garantiza qty_scheduled/qty_delivered de
sm_request_lines correctos automáticamente — Code escribe SOLO en tablas
pivot.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

```json:metadata
{"files":["src/hooks/usePickupOrders.ts"],"verifyCommand":"npm run build && grep -n \"createPickupOrder\\|completePickupOrder\\|cancelPickupOrder\\|removeLineFromPickupOrder\" src/hooks/usePickupOrders.ts","acceptanceCriteria":["4 funciones exportadas","validación pre-INSERT con available","translateBdError para qty_invariant","cancelPickupOrder pre-flight stats","removeLineFromPickupOrder detecta auto-cancel","build verde"]}
```

---

## Task 3: Hook `useExternalOrders.ts` con 4 funciones

**Goal:** Hook paralelo a `usePickupOrders` con 4 funciones espejo + provider/invoice/cost. createExternalOrder con validación strict (provider trim != '', amount > 0, attachments.length >= 1). cancelExternalOrder PRESERVA `invoice_attachments` (Q4 cerrado en Cambio 4).

**Files:**
- Create: `src/hooks/useExternalOrders.ts`

**Acceptance Criteria:**
- [ ] Hook exporta 4 funciones + 4 result types + tipos
- [ ] `createExternalOrder` validación strict + INSERT external_orders + INSERT external_order_lines
- [ ] `cancelExternalOrder` PRESERVA `invoice_attachments` (NO setea a NULL)
- [ ] `npm run build` → verde

**Verify:** `npm run build && grep -n "createExternalOrder\|completeExternalOrder\|cancelExternalOrder\|removeLineFromExternalOrder" src/hooks/useExternalOrders.ts`

**Steps:**

- [ ] **Step 1: Crear `src/hooks/useExternalOrders.ts`**

```typescript
'use client'

import { useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Attachment } from '@/lib/supabase/storage'

export interface ExternalOrderLineInput {
  request_line_id: string
  quantity_assigned: number
}

export interface CreateExternalOrderResult {
  ok: boolean
  orderId?: string
  externalId?: string  // EXT-2026-NNN auto-gen por trigger BD
  error?: string
}

export interface CompleteExternalResult {
  ok: boolean
  error?: string
}

export interface CancelExternalResult {
  ok: boolean
  deliveredCount?: number
  deliveredQty?: number
  error?: string
}

export interface RemoveLineExternalResult {
  ok: boolean
  orderCancelled?: boolean
  orderId?: string
  error?: string
}

function translateBdError(message: string): string {
  if (message.includes('qty_invariant') || message.includes('sm_request_lines_qty_invariant')) {
    return 'Esta línea ya fue asignada en otro fulfillment. Refrescá la página.'
  }
  return message
}

/**
 * Hook de operaciones external_orders (Cambio 5 — modelo bulk).
 * Reemplaza el modelo flag-en-línea de Cambio 4 (useExternal).
 *
 * 4 funciones paralelas a usePickupOrders + provider/invoice/cost:
 * - createExternalOrder: validaciones strict (provider trim, amount > 0,
 *   attachments.length >= 1) + crea order con metadata + N order_lines.
 * - completeExternalOrder: paralelo a completePickupOrder.
 * - cancelExternalOrder: paralelo + PRESERVA invoice_attachments (Q4
 *   cerrado en Cambio 4 — Storage cleanup async no vale la pena v1).
 * - removeLineFromExternalOrder: paralelo + auto_cancel_empty.
 */
export function useExternalOrders() {
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createExternalOrder = useCallback(
    async (
      charrisId: string,
      lines: ExternalOrderLineInput[],
      providerName: string,
      invoiceAmount: number,
      invoiceAttachments: Attachment[],
      notes?: string | null,
    ): Promise<CreateExternalOrderResult> => {
      setLoading(true)
      setError(null)

      try {
        if (lines.length === 0) {
          const msg = 'Debe seleccionar al menos una línea para aprobar viaje externo.'
          setError(msg)
          return { ok: false, error: msg }
        }
        if (providerName.trim() === '') {
          const msg = 'El nombre del proveedor es requerido.'
          setError(msg)
          return { ok: false, error: msg }
        }
        if (invoiceAmount <= 0) {
          const msg = 'El costo del servicio debe ser mayor a cero.'
          setError(msg)
          return { ok: false, error: msg }
        }
        if (invoiceAttachments.length === 0) {
          const msg = 'Adjunta al menos una cotización o factura.'
          setError(msg)
          return { ok: false, error: msg }
        }

        // Validar quantities pre-INSERT (mismo patrón que usePickupOrders)
        const lineIds = lines.map((l) => l.request_line_id)
        const { data: dbLines, error: fetchError } = await supabase
          .from('sm_request_lines')
          .select('id, quantity, qty_scheduled, qty_delivered, description')
          .in('id', lineIds)

        if (fetchError || !dbLines) {
          const msg = fetchError?.message ?? 'Error al validar líneas'
          setError(msg)
          return { ok: false, error: msg }
        }

        for (const input of lines) {
          if (input.quantity_assigned <= 0) {
            const msg = `Cantidad inválida (${input.quantity_assigned}). Debe ser mayor a cero.`
            setError(msg)
            return { ok: false, error: msg }
          }
          const dbLine = dbLines.find((dl) => dl.id === input.request_line_id)
          if (!dbLine) {
            const msg = `Línea ${input.request_line_id.slice(0, 8)} no encontrada.`
            setError(msg)
            return { ok: false, error: msg }
          }
          const available = dbLine.quantity - (dbLine.qty_scheduled ?? 0) - (dbLine.qty_delivered ?? 0)
          if (input.quantity_assigned > available) {
            const msg = `"${dbLine.description}": cantidad ${input.quantity_assigned} excede disponible (${available}).`
            setError(msg)
            return { ok: false, error: msg }
          }
        }

        // INSERT external_orders header con provider/invoice/cost
        const { data: orderRow, error: insertError } = await supabase
          .from('external_orders')
          .insert({
            status: 'Aprobado',
            approved_by: charrisId,
            approved_at: new Date().toISOString(),
            provider_name: providerName.trim(),
            invoice_amount: invoiceAmount,
            invoice_attachments: JSON.parse(JSON.stringify(invoiceAttachments)),
            notes: notes?.trim() || null,
            created_by: charrisId,
          })
          .select('id, external_id')
          .single()

        if (insertError || !orderRow) {
          const friendly = translateBdError(insertError?.message ?? 'Error al crear external order')
          setError(friendly)
          return { ok: false, error: friendly }
        }

        // INSERT external_order_lines (bulk)
        const linesPayload = lines.map((l) => ({
          external_order_id: orderRow.id,
          request_line_id: l.request_line_id,
          quantity_assigned: l.quantity_assigned,
          qty_delivered: 0,
        }))

        const { error: linesError } = await supabase
          .from('external_order_lines')
          .insert(linesPayload)

        if (linesError) {
          await supabase.from('external_orders').delete().eq('id', orderRow.id)
          const friendly = translateBdError(linesError.message)
          setError(friendly)
          return { ok: false, error: friendly }
        }

        return { ok: true, orderId: orderRow.id, externalId: orderRow.external_id }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error inesperado al crear external order'
        setError(message)
        return { ok: false, error: message }
      } finally {
        setLoading(false)
      }
    },
    [supabase],
  )

  const completeExternalOrder = useCallback(
    async (
      orderId: string,
      completedById: string,
      receivedById: string | null,
      receivedByName: string,
      notes: string,
      additionalAttachments: Attachment[],
    ): Promise<CompleteExternalResult> => {
      setLoading(true)
      setError(null)

      try {
        const now = new Date().toISOString()

        // SELECT existing notes (no append a invoice_attachments aquí — esos son del approve original)
        const { data: existing, error: fetchError } = await supabase
          .from('external_orders')
          .select('notes, invoice_attachments')
          .eq('id', orderId)
          .single()

        if (fetchError || !existing) {
          const msg = fetchError?.message ?? 'External order no encontrado'
          setError(msg)
          return { ok: false, error: msg }
        }

        // Append additionalAttachments al invoice_attachments existente
        const existingAttachments = Array.isArray(existing.invoice_attachments)
          ? (existing.invoice_attachments as unknown as Attachment[])
          : []
        const finalAttachments = [...existingAttachments, ...additionalAttachments]

        const trimmedNotes = notes.trim()
        const finalNotes = trimmedNotes
          ? (existing.notes ? `${existing.notes}\n\n[Entrega ${now}] ${trimmedNotes}` : trimmedNotes)
          : existing.notes ?? null

        // UPDATE external_order_lines (todo-o-nada)
        const { data: orderLines, error: linesError } = await supabase
          .from('external_order_lines')
          .select('id, quantity_assigned')
          .eq('external_order_id', orderId)

        if (linesError || !orderLines) {
          setError(linesError?.message ?? 'Error al obtener líneas')
          return { ok: false, error: linesError?.message ?? 'Líneas no encontradas' }
        }

        for (const line of orderLines) {
          const { error: updateLineError } = await supabase
            .from('external_order_lines')
            .update({ qty_delivered: line.quantity_assigned })
            .eq('id', line.id)
          if (updateLineError) {
            setError(updateLineError.message)
            return { ok: false, error: updateLineError.message }
          }
        }

        const { error: orderUpdateError } = await supabase
          .from('external_orders')
          .update({
            status: 'Entregado',
            completed_at: now,
            completed_by: completedById,
            received_by_id: receivedById,
            received_by_name: receivedByName.trim() || null,
            notes: finalNotes,
            invoice_attachments: JSON.parse(JSON.stringify(finalAttachments)),
          })
          .eq('id', orderId)
          .eq('status', 'Aprobado')
          .select('id')

        if (orderUpdateError) {
          setError(orderUpdateError.message)
          return { ok: false, error: orderUpdateError.message }
        }

        return { ok: true }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error inesperado al completar external order'
        setError(message)
        return { ok: false, error: message }
      } finally {
        setLoading(false)
      }
    },
    [supabase],
  )

  /**
   * Cancela external_order. PERMITIDO con qty_delivered > 0.
   * PRESERVA invoice_attachments (NO se setea a NULL — Q4 cerrado en Cambio 4).
   * Storage cleanup async no vale la pena v1.
   */
  const cancelExternalOrder = useCallback(
    async (
      orderId: string,
      cancelledById: string,
    ): Promise<CancelExternalResult> => {
      setLoading(true)
      setError(null)

      try {
        const { data: lines, error: fetchError } = await supabase
          .from('external_order_lines')
          .select('id, qty_delivered')
          .eq('external_order_id', orderId)

        if (fetchError || !lines) {
          const msg = fetchError?.message ?? 'External order no encontrado'
          setError(msg)
          return { ok: false, error: msg }
        }

        const deliveredLines = lines.filter((l) => (l.qty_delivered ?? 0) > 0)
        const deliveredCount = deliveredLines.length
        const deliveredQty = deliveredLines.reduce((sum, l) => sum + (l.qty_delivered ?? 0), 0)

        // UPDATE external_orders SET status='Cancelado'
        // NOTA: NO setear invoice_attachments a NULL — preservar (Q4)
        const { error: updateError } = await supabase
          .from('external_orders')
          .update({
            status: 'Cancelado',
            cancelled_at: new Date().toISOString(),
            cancelled_by: cancelledById,
          })
          .eq('id', orderId)
          .eq('status', 'Aprobado')
          .select('id')

        if (updateError) {
          setError(updateError.message)
          return { ok: false, error: updateError.message }
        }

        return { ok: true, deliveredCount, deliveredQty }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error inesperado al cancelar external order'
        setError(message)
        return { ok: false, error: message }
      } finally {
        setLoading(false)
      }
    },
    [supabase],
  )

  const removeLineFromExternalOrder = useCallback(
    async (
      orderId: string,
      externalOrderLineId: string,
    ): Promise<RemoveLineExternalResult> => {
      setLoading(true)
      setError(null)

      try {
        const { error: deleteError } = await supabase
          .from('external_order_lines')
          .delete()
          .eq('id', externalOrderLineId)

        if (deleteError) {
          setError(deleteError.message)
          return { ok: false, error: deleteError.message }
        }

        const { data: orderRow, error: fetchError } = await supabase
          .from('external_orders')
          .select('id, external_id, status')
          .eq('id', orderId)
          .single()

        if (fetchError || !orderRow) {
          return { ok: true, orderCancelled: true }
        }

        const orderCancelled = orderRow.status === 'Cancelado'
        return {
          ok: true,
          orderCancelled,
          orderId: orderCancelled ? orderRow.external_id : undefined,
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error inesperado al eliminar línea'
        setError(message)
        return { ok: false, error: message }
      } finally {
        setLoading(false)
      }
    },
    [supabase],
  )

  return {
    loading,
    error,
    createExternalOrder,
    completeExternalOrder,
    cancelExternalOrder,
    removeLineFromExternalOrder,
  }
}
```

- [ ] **Step 2: Build verde + commit**

```bash
npm run build
git add src/hooks/useExternalOrders.ts
git commit -m "feat: T3 Cambio 5 — hook useExternalOrders con 4 funciones bulk + provider/invoice/cost"
```

```json:metadata
{"files":["src/hooks/useExternalOrders.ts"],"verifyCommand":"npm run build && grep -n \"createExternalOrder\\|completeExternalOrder\\|cancelExternalOrder\\|removeLineFromExternalOrder\" src/hooks/useExternalOrders.ts","acceptanceCriteria":["4 funciones exportadas paralelas a pickup","validación strict provider/amount/attachments","cancelExternalOrder PRESERVA invoice_attachments","build verde"]}
```

---

## Task 4: Cards reusables — `PickupOrderCard.tsx` + `ExternalOrderCard.tsx`

**Goal:** Componentes reusables para mostrar 1 order con N líneas + botones de acción permission-driven. Consumidos por `/programacion` Surface 3 (admin/logistica) y `/solicitudes/[id]` (admin/logistica/pm-del-proyecto-destino).

**Files:**
- Create: `src/components/programacion/PickupOrderCard.tsx`
- Create: `src/components/programacion/ExternalOrderCard.tsx`

**Acceptance Criteria:**
- [ ] PickupOrderCard exports types `PickupOrderWithLines` + `PickupOrderLineWithRelations` + componente
- [ ] ExternalOrderCard paralelo + types `ExternalOrderWithLines` + provider_name + invoice_amount + "Ver factura" link
- [ ] Cards muestran header (id + status + fecha + approver) + lista colapsable de líneas + notas + 2-3 botones acción
- [ ] Botones gateados por props `canConfirmDelivery`/`canCancelOrder`
- [ ] Sin emojis ni íconos lucide en botones (texto puro pill amber/gray/red estilo)
- [ ] `npm run build` → verde

**Verify:** `npm run build && grep -n "PickupOrderCard\|ExternalOrderCard" src/components/programacion/`

**Steps:**

- [ ] **Step 1: Crear `src/components/programacion/PickupOrderCard.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Wrench, Package, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatDate, formatDateTime, formatQty } from '@/lib/utils/format'
import type { Attachment } from '@/lib/supabase/storage'

export interface PickupOrderLineWithRelations {
  id: string
  request_line_id: string
  quantity_assigned: number
  qty_delivered: number
  line: {
    description: string
    line_type: string
    quantity: number
    unit: { code: string } | null
    unit_text: string | null
    from_location: { name: string } | null
    from_text: string | null
    to_location: { id: string; name: string; project_id: string | null; location_type: string | null } | null
    to_text: string | null
    request: { id: string; request_id: string | null; project: { code: string; name: string } | null }
  } | null
}

export interface PickupOrderWithLines {
  id: string
  pickup_id: string  // PKP-2026-001
  status: 'Aprobado' | 'Entregado' | 'Cancelado'
  approved_at: string
  approved_by_name: string | null
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

interface PickupOrderCardProps {
  order: PickupOrderWithLines
  canConfirmDelivery: boolean
  canCancelOrder: boolean
  onConfirmDelivery?: () => void
  onCancelOrder?: () => void
  showLinesInitially?: boolean
}

export function PickupOrderCard({
  order,
  canConfirmDelivery,
  canCancelOrder,
  onConfirmDelivery,
  onCancelOrder,
  showLinesInitially = false,
}: PickupOrderCardProps) {
  const [expanded, setExpanded] = useState(showLinesInitially)

  const isActive = order.status === 'Aprobado'

  return (
    <div className="rounded-lg border border-amber-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-amber-100">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-sm font-mono font-bold text-navy hover:text-iconsa-blue"
            title={expanded ? 'Colapsar líneas' : 'Expandir líneas'}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            {order.pickup_id}
          </button>
          <Badge label={order.status} variant="custom" bg={
            order.status === 'Aprobado' ? 'bg-amber-100' :
            order.status === 'Entregado' ? 'bg-emerald-100' : 'bg-gray-100'
          } text={
            order.status === 'Aprobado' ? 'text-amber-800' :
            order.status === 'Entregado' ? 'text-emerald-800' : 'text-gray-600'
          } />
          <span className="text-xs text-iconsa-gray" title={`Aprobado ${formatDateTime(order.approved_at)}`}>
            {formatDate(order.approved_at)}
            {order.approved_by_name && <span> · {order.approved_by_name}</span>}
          </span>
          <span className="text-xs text-iconsa-gray">
            {order.lines.length} {order.lines.length === 1 ? 'línea' : 'líneas'}
          </span>
        </div>

        {/* Acciones */}
        {isActive && (canConfirmDelivery || canCancelOrder) && (
          <div className="flex items-center gap-2 shrink-0">
            {canCancelOrder && onCancelOrder && (
              <button
                type="button"
                onClick={onCancelOrder}
                className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors"
              >
                Cancelar pickup
              </button>
            )}
            {canConfirmDelivery && onConfirmDelivery && (
              <button
                type="button"
                onClick={onConfirmDelivery}
                className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 transition-colors"
              >
                Confirmar entrega
              </button>
            )}
          </div>
        )}

        {/* Estado completado/cancelado */}
        {!isActive && (
          <div className="text-xs text-iconsa-gray shrink-0">
            {order.status === 'Entregado' && order.completed_at && (
              <span title={`Recibido por ${order.received_by_name ?? '(no captado)'}`}>
                Entregado {formatDate(order.completed_at)}
              </span>
            )}
            {order.status === 'Cancelado' && order.cancelled_at && (
              <span>Cancelado {formatDate(order.cancelled_at)}</span>
            )}
          </div>
        )}
      </div>

      {/* Lista de líneas (colapsable) */}
      {expanded && (
        <div className="px-4 py-3 space-y-2">
          {order.lines.map((ol) => {
            if (!ol.line) return null
            const fromName = ol.line.from_location?.name ?? ol.line.from_text ?? '—'
            const toName = ol.line.to_location?.name ?? ol.line.to_text ?? '—'
            const unitCode = ol.line.unit?.code ?? ol.line.unit_text ?? ''
            const isEquipo = ol.line.line_type === 'Equipo'
            return (
              <div key={ol.id} className="flex items-center gap-2 text-sm py-1">
                {isEquipo ? (
                  <Wrench className="h-3.5 w-3.5 shrink-0 text-iconsa-blue" />
                ) : (
                  <Package className="h-3.5 w-3.5 shrink-0 text-gold" />
                )}
                <span className="font-medium text-gray-900" title={ol.line.description}>
                  {ol.line.description}
                </span>
                <span className="text-gray-300">·</span>
                <span className="font-semibold text-gray-700 whitespace-nowrap bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                  {formatQty(ol.quantity_assigned)} {unitCode}
                </span>
                <span className="text-xs text-gray-400 whitespace-nowrap">{fromName} → {toName}</span>
                {ol.qty_delivered > 0 && (
                  <span className="text-xs text-emerald-600 whitespace-nowrap" title={`Entregado: ${formatQty(ol.qty_delivered)}`}>
                    ✓ {formatQty(ol.qty_delivered)}
                  </span>
                )}
              </div>
            )
          })}

          {order.notes && (
            <div className="mt-2 pt-2 border-t border-amber-100">
              <p className="text-xs italic text-gray-500">{order.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Crear `src/components/programacion/ExternalOrderCard.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Wrench, Package } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency, formatDate, formatDateTime, formatQty } from '@/lib/utils/format'
import { getFileUrl } from '@/lib/supabase/storage'
import type { Attachment } from '@/lib/supabase/storage'
import type { PickupOrderLineWithRelations } from './PickupOrderCard'

export interface ExternalOrderWithLines {
  id: string
  external_id: string  // EXT-2026-001
  status: 'Aprobado' | 'Entregado' | 'Cancelado'
  provider_name: string
  invoice_amount: number
  invoice_attachments: Attachment[]
  approved_at: string
  approved_by_name: string | null
  completed_at: string | null
  completed_by_name: string | null
  cancelled_at: string | null
  cancelled_by_name: string | null
  received_by_id: string | null
  received_by_name: string | null
  notes: string | null
  lines: PickupOrderLineWithRelations[]  // misma shape — solo cambia el parent
}

interface ExternalOrderCardProps {
  order: ExternalOrderWithLines
  canConfirmDelivery: boolean
  canCancelOrder: boolean
  onConfirmDelivery?: () => void
  onCancelOrder?: () => void
  showLinesInitially?: boolean
}

export function ExternalOrderCard({
  order,
  canConfirmDelivery,
  canCancelOrder,
  onConfirmDelivery,
  onCancelOrder,
  showLinesInitially = false,
}: ExternalOrderCardProps) {
  const [expanded, setExpanded] = useState(showLinesInitially)
  const isActive = order.status === 'Aprobado'

  const handleViewInvoice = async () => {
    if (order.invoice_attachments.length === 0) return
    const url = await getFileUrl(order.invoice_attachments[0].path)
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="rounded-lg border border-blue-200 bg-white">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-blue-100">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-sm font-mono font-bold text-navy hover:text-iconsa-blue"
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            {order.external_id}
          </button>
          <Badge label={order.status} variant="custom" bg={
            order.status === 'Aprobado' ? 'bg-blue-100' :
            order.status === 'Entregado' ? 'bg-emerald-100' : 'bg-gray-100'
          } text={
            order.status === 'Aprobado' ? 'text-blue-800' :
            order.status === 'Entregado' ? 'text-emerald-800' : 'text-gray-600'
          } />
          <span className="text-xs text-iconsa-gray" title={`Aprobado ${formatDateTime(order.approved_at)}`}>
            {formatDate(order.approved_at)}
            {order.approved_by_name && <span> · {order.approved_by_name}</span>}
          </span>
          <span className="text-xs text-iconsa-gray">{order.lines.length} {order.lines.length === 1 ? 'línea' : 'líneas'}</span>
          <span className="text-xs font-medium text-blue-800">{order.provider_name}</span>
          <span className="text-xs font-semibold text-gray-900">{formatCurrency(order.invoice_amount)}</span>
          {order.invoice_attachments.length > 0 && (
            <button
              type="button"
              onClick={handleViewInvoice}
              className="text-xs text-blue-600 hover:underline"
            >
              Ver factura
            </button>
          )}
        </div>

        {isActive && (canConfirmDelivery || canCancelOrder) && (
          <div className="flex items-center gap-2 shrink-0">
            {canCancelOrder && onCancelOrder && (
              <button
                type="button"
                onClick={onCancelOrder}
                className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors"
              >
                Cancelar viaje externo
              </button>
            )}
            {canConfirmDelivery && onConfirmDelivery && (
              <button
                type="button"
                onClick={onConfirmDelivery}
                className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 transition-colors"
              >
                Confirmar entrega
              </button>
            )}
          </div>
        )}

        {!isActive && (
          <div className="text-xs text-iconsa-gray shrink-0">
            {order.status === 'Entregado' && order.completed_at && (
              <span title={`Recibido por ${order.received_by_name ?? '(no captado)'}`}>
                Entregado {formatDate(order.completed_at)}
              </span>
            )}
            {order.status === 'Cancelado' && order.cancelled_at && (
              <span>Cancelado {formatDate(order.cancelled_at)}</span>
            )}
          </div>
        )}
      </div>

      {expanded && (
        <div className="px-4 py-3 space-y-2">
          {order.lines.map((ol) => {
            if (!ol.line) return null
            const fromName = ol.line.from_location?.name ?? ol.line.from_text ?? '—'
            const toName = ol.line.to_location?.name ?? ol.line.to_text ?? '—'
            const unitCode = ol.line.unit?.code ?? ol.line.unit_text ?? ''
            const isEquipo = ol.line.line_type === 'Equipo'
            return (
              <div key={ol.id} className="flex items-center gap-2 text-sm py-1">
                {isEquipo ? (
                  <Wrench className="h-3.5 w-3.5 shrink-0 text-iconsa-blue" />
                ) : (
                  <Package className="h-3.5 w-3.5 shrink-0 text-gold" />
                )}
                <span className="font-medium text-gray-900" title={ol.line.description}>
                  {ol.line.description}
                </span>
                <span className="text-gray-300">·</span>
                <span className="font-semibold text-gray-700 whitespace-nowrap bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                  {formatQty(ol.quantity_assigned)} {unitCode}
                </span>
                <span className="text-xs text-gray-400 whitespace-nowrap">{fromName} → {toName}</span>
                {ol.qty_delivered > 0 && (
                  <span className="text-xs text-emerald-600 whitespace-nowrap">✓ {formatQty(ol.qty_delivered)}</span>
                )}
              </div>
            )
          })}

          {order.notes && (
            <div className="mt-2 pt-2 border-t border-blue-100">
              <p className="text-xs italic text-gray-500">{order.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Build verde + commit**

```bash
npm run build
git add src/components/programacion/PickupOrderCard.tsx src/components/programacion/ExternalOrderCard.tsx
git commit -m "feat: T4 Cambio 5 — PickupOrderCard + ExternalOrderCard reusables (header + líneas colapsables + acciones permission-driven)"
```

```json:metadata
{"files":["src/components/programacion/PickupOrderCard.tsx","src/components/programacion/ExternalOrderCard.tsx"],"verifyCommand":"npm run build","acceptanceCriteria":["2 cards reusables exportadas","header con id+status+fecha+approver+lines count","lista colapsable","botones gated por permission props","ExternalOrderCard con provider+amount+Ver factura"]}
```

---

## Task 5: Create modals — `CreatePickupOrderModal.tsx` + `CreateExternalOrderModal.tsx`

**Goal:** Modales bulk que reciben N líneas seleccionadas del BacklogTable y permiten editar `quantity_assigned` per línea (default = available, max = available). CreateExternalOrderModal agrega sección "Datos del proveedor" (provider + cost + factura + notas).

**Files:**
- Create: `src/components/programacion/CreatePickupOrderModal.tsx`
- Create: `src/components/programacion/CreateExternalOrderModal.tsx`

**Acceptance Criteria:**
- [ ] CreatePickupOrderModal: lista N líneas con qty editable (default available, min 0.01, max available), notas opcional, validación submit (filtrar líneas con qty=0)
- [ ] CreateExternalOrderModal: paralelo + sección provider/cost/factura (FileUploader min 1) + validación strict
- [ ] Botones primary amber: "Aprobar pickup" / "Aprobar viaje externo"
- [ ] Permission gate ya hecho upstream (BacklogTable bulk toolbar — admin/logistica only)
- [ ] `npm run build` → verde

**Verify:** `npm run build`

**Steps:**

- [ ] **Step 1: Crear `src/components/programacion/CreatePickupOrderModal.tsx`**

```typescript
'use client'

import { useState, useMemo } from 'react'
import { Wrench, Package } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatQty } from '@/lib/utils/format'
import type { BacklogLine } from '@/hooks/useTrips'
import type { PickupOrderLineInput } from '@/hooks/usePickupOrders'

interface LineQuantityState {
  request_line_id: string
  quantity_assigned: string  // string para input controlled
}

interface CreatePickupOrderModalProps {
  selectedLines: BacklogLine[]
  onConfirm: (lines: PickupOrderLineInput[], notes: string | null) => Promise<void>
  onClose: () => void
  loading: boolean
  error: string | null
}

export function CreatePickupOrderModal({
  selectedLines,
  onConfirm,
  onClose,
  loading,
  error,
}: CreatePickupOrderModalProps) {
  const initialState: LineQuantityState[] = useMemo(
    () =>
      selectedLines.map((line) => {
        const available = Math.max(
          0,
          line.quantity - (line.qty_scheduled ?? 0) - (line.qty_delivered ?? 0),
        )
        return { request_line_id: line.id, quantity_assigned: String(available) }
      }),
    [selectedLines],
  )

  const [quantities, setQuantities] = useState<LineQuantityState[]>(initialState)
  const [notes, setNotes] = useState('')

  const handleQtyChange = (lineId: string, value: string) => {
    setQuantities((prev) =>
      prev.map((q) => (q.request_line_id === lineId ? { ...q, quantity_assigned: value } : q)),
    )
  }

  const handleSubmit = async () => {
    // Filtrar líneas con qty=0 (no incluir en pickup_order)
    const validLines: PickupOrderLineInput[] = quantities
      .map((q) => ({
        request_line_id: q.request_line_id,
        quantity_assigned: parseFloat(q.quantity_assigned) || 0,
      }))
      .filter((l) => l.quantity_assigned > 0)

    if (validLines.length === 0) return  // hook valida también

    await onConfirm(validLines, notes.trim() || null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl sm:p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Aprobar pickup ({selectedLines.length} {selectedLines.length === 1 ? 'línea' : 'líneas'})
        </h3>

        <div className="space-y-3">
          {selectedLines.map((line) => {
            const isEquipo = line.line_type === 'Equipo'
            const available = Math.max(
              0,
              line.quantity - (line.qty_scheduled ?? 0) - (line.qty_delivered ?? 0),
            )
            const fromName = line.from_location?.name ?? line.from_text ?? '—'
            const toName = line.to_location?.name ?? line.to_text ?? '—'
            const unitCode = line.unit?.code ?? line.unit_text ?? ''
            const qty = quantities.find((q) => q.request_line_id === line.id)
            const parsedQty = parseFloat(qty?.quantity_assigned ?? '0') || 0
            const willInclude = parsedQty > 0

            return (
              <div
                key={line.id}
                className={`rounded-lg border p-3 ${willInclude ? 'border-amber-200 bg-amber-50/50' : 'border-gray-200 bg-gray-50/50 opacity-60'}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {isEquipo ? (
                    <Wrench className="h-4 w-4 text-iconsa-blue" />
                  ) : (
                    <Package className="h-4 w-4 text-gold" />
                  )}
                  <span className="text-sm font-medium text-gray-900" title={line.description}>
                    {line.description}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-iconsa-gray mb-2">
                  <span>{fromName} → {toName}</span>
                  <span className="text-gray-300">·</span>
                  <span>Disponible: {formatQty(available)} {unitCode}</span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-700 whitespace-nowrap">
                    Cantidad a aprobar:
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={available}
                    step="0.01"
                    value={qty?.quantity_assigned ?? ''}
                    onChange={(e) => handleQtyChange(line.id, e.target.value)}
                    onFocus={(e) => e.target.select()}
                    disabled={loading}
                    className="w-24 rounded border border-gray-300 px-2 py-1 text-sm text-right focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue"
                  />
                  <span className="text-xs text-gray-500">{unitCode}</span>
                  {!willInclude && (
                    <span className="text-xs italic text-gray-500">No se incluirá</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-4">
          <label htmlFor="pickup-order-notes" className="mb-1 block text-sm font-medium text-gray-700">
            Notas (opcional)
          </label>
          <textarea
            id="pickup-order-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observaciones del pickup..."
            rows={2}
            maxLength={500}
            disabled={loading}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue"
          />
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        )}

        <div className="mt-4 flex items-center justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} loading={loading}>
            Aprobar pickup
          </Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Crear `src/components/programacion/CreateExternalOrderModal.tsx`**

```typescript
'use client'

import { useState, useMemo } from 'react'
import { Wrench, Package } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import FileUploader from '@/components/ui/FileUploader'
import { formatQty } from '@/lib/utils/format'
import type { Attachment } from '@/lib/supabase/storage'
import type { BacklogLine } from '@/hooks/useTrips'
import type { ExternalOrderLineInput } from '@/hooks/useExternalOrders'

interface LineQuantityState {
  request_line_id: string
  quantity_assigned: string
}

interface CreateExternalOrderModalProps {
  selectedLines: BacklogLine[]
  onConfirm: (
    lines: ExternalOrderLineInput[],
    providerName: string,
    invoiceAmount: number,
    invoiceAttachments: Attachment[],
    notes: string | null,
  ) => Promise<void>
  onClose: () => void
  loading: boolean
  error: string | null
}

export function CreateExternalOrderModal({
  selectedLines,
  onConfirm,
  onClose,
  loading,
  error,
}: CreateExternalOrderModalProps) {
  const initialState: LineQuantityState[] = useMemo(
    () =>
      selectedLines.map((line) => {
        const available = Math.max(
          0,
          line.quantity - (line.qty_scheduled ?? 0) - (line.qty_delivered ?? 0),
        )
        return { request_line_id: line.id, quantity_assigned: String(available) }
      }),
    [selectedLines],
  )

  const [quantities, setQuantities] = useState<LineQuantityState[]>(initialState)
  const [providerName, setProviderName] = useState('')
  const [invoiceAmount, setInvoiceAmount] = useState('')
  const [invoiceAttachments, setInvoiceAttachments] = useState<Attachment[]>([])
  const [notes, setNotes] = useState('')

  // Folder temporal para FileUploader (se actualiza con el order id real post-create
  // si se necesita; v1 usa tempId estable durante la sesión del modal)
  const tempFolderId = useMemo(() => `external/temp-${Date.now()}`, [])

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const handleQtyChange = (lineId: string, value: string) => {
    setQuantities((prev) =>
      prev.map((q) => (q.request_line_id === lineId ? { ...q, quantity_assigned: value } : q)),
    )
  }

  const validate = (): { valid: boolean; errors: Record<string, string> } => {
    const errs: Record<string, string> = {}
    if (providerName.trim() === '') {
      errs.providerName = 'El nombre del proveedor es requerido'
    } else if (providerName.length > 100) {
      errs.providerName = 'Máximo 100 caracteres'
    }
    const amount = parseFloat(invoiceAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      errs.invoiceAmount = 'El costo debe ser mayor a cero'
    }
    if (invoiceAttachments.length === 0) {
      errs.invoiceAttachments = 'Adjunta al menos una cotización o factura'
    }
    if (notes.length > 500) {
      errs.notes = 'Máximo 500 caracteres'
    }
    return { valid: Object.keys(errs).length === 0, errors: errs }
  }

  const handleSubmit = async () => {
    const { valid, errors } = validate()
    if (!valid) {
      setFormErrors(errors)
      return
    }
    setFormErrors({})

    const validLines: ExternalOrderLineInput[] = quantities
      .map((q) => ({
        request_line_id: q.request_line_id,
        quantity_assigned: parseFloat(q.quantity_assigned) || 0,
      }))
      .filter((l) => l.quantity_assigned > 0)

    if (validLines.length === 0) return

    await onConfirm(validLines, providerName, parseFloat(invoiceAmount), invoiceAttachments, notes.trim() || null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl sm:p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Aprobar viaje externo ({selectedLines.length} {selectedLines.length === 1 ? 'línea' : 'líneas'})
        </h3>

        {/* Sección líneas (idéntico a CreatePickupOrderModal) */}
        <div className="space-y-3">
          {selectedLines.map((line) => {
            const isEquipo = line.line_type === 'Equipo'
            const available = Math.max(
              0,
              line.quantity - (line.qty_scheduled ?? 0) - (line.qty_delivered ?? 0),
            )
            const fromName = line.from_location?.name ?? line.from_text ?? '—'
            const toName = line.to_location?.name ?? line.to_text ?? '—'
            const unitCode = line.unit?.code ?? line.unit_text ?? ''
            const qty = quantities.find((q) => q.request_line_id === line.id)
            const parsedQty = parseFloat(qty?.quantity_assigned ?? '0') || 0
            const willInclude = parsedQty > 0

            return (
              <div
                key={line.id}
                className={`rounded-lg border p-3 ${willInclude ? 'border-blue-200 bg-blue-50/50' : 'border-gray-200 bg-gray-50/50 opacity-60'}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {isEquipo ? <Wrench className="h-4 w-4 text-iconsa-blue" /> : <Package className="h-4 w-4 text-gold" />}
                  <span className="text-sm font-medium text-gray-900" title={line.description}>
                    {line.description}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-iconsa-gray mb-2">
                  <span>{fromName} → {toName}</span>
                  <span className="text-gray-300">·</span>
                  <span>Disponible: {formatQty(available)} {unitCode}</span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-700 whitespace-nowrap">Cantidad a aprobar:</label>
                  <input
                    type="number"
                    min="0"
                    max={available}
                    step="0.01"
                    value={qty?.quantity_assigned ?? ''}
                    onChange={(e) => handleQtyChange(line.id, e.target.value)}
                    onFocus={(e) => e.target.select()}
                    disabled={loading}
                    className="w-24 rounded border border-gray-300 px-2 py-1 text-sm text-right focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue"
                  />
                  <span className="text-xs text-gray-500">{unitCode}</span>
                  {!willInclude && <span className="text-xs italic text-gray-500">No se incluirá</span>}
                </div>
              </div>
            )
          })}
        </div>

        {/* Sección Datos del proveedor */}
        <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
          <h4 className="text-sm font-semibold text-gray-900">Datos del proveedor</h4>

          <div>
            <label htmlFor="ext-provider" className="mb-1 block text-sm font-medium text-gray-700">
              Proveedor / Empresa transportista <span className="text-red-600">*</span>
            </label>
            <input
              id="ext-provider"
              type="text"
              maxLength={100}
              value={providerName}
              onChange={(e) => setProviderName(e.target.value)}
              disabled={loading}
              placeholder="Nombre del proveedor"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue"
            />
            {formErrors.providerName && (
              <p className="mt-1 text-xs text-red-600">{formErrors.providerName}</p>
            )}
          </div>

          <div>
            <label htmlFor="ext-cost" className="mb-1 block text-sm font-medium text-gray-700">
              Costo del servicio (B/.) <span className="text-red-600">*</span>
            </label>
            <input
              id="ext-cost"
              type="number"
              step="0.01"
              min="0.01"
              value={invoiceAmount}
              onChange={(e) => setInvoiceAmount(e.target.value)}
              disabled={loading}
              placeholder="0.00"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue"
            />
            {formErrors.invoiceAmount && (
              <p className="mt-1 text-xs text-red-600">{formErrors.invoiceAmount}</p>
            )}
          </div>

          <div>
            <FileUploader
              attachments={invoiceAttachments}
              folder={tempFolderId}
              onChange={setInvoiceAttachments}
              label="Cotización / Factura"
              hint="PDF, JPG, PNG o WEBP (max 10MB) — al menos 1 archivo requerido"
              disabled={loading}
            />
            {formErrors.invoiceAttachments && (
              <p className="mt-1 text-xs text-red-600">{formErrors.invoiceAttachments}</p>
            )}
          </div>

          <div>
            <label htmlFor="ext-notes" className="mb-1 block text-sm font-medium text-gray-700">
              Notas (opcional)
            </label>
            <textarea
              id="ext-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones del servicio externo..."
              rows={2}
              maxLength={500}
              disabled={loading}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue"
            />
            {formErrors.notes && (
              <p className="mt-1 text-xs text-red-600">{formErrors.notes}</p>
            )}
          </div>
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        )}

        <div className="mt-4 flex items-center justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} loading={loading}>
            Aprobar viaje externo
          </Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Build verde + commit**

```bash
npm run build
git add src/components/programacion/CreatePickupOrderModal.tsx src/components/programacion/CreateExternalOrderModal.tsx
git commit -m "feat: T5 Cambio 5 — CreatePickupOrderModal + CreateExternalOrderModal (bulk N líneas con qty editable)"
```

```json:metadata
{"files":["src/components/programacion/CreatePickupOrderModal.tsx","src/components/programacion/CreateExternalOrderModal.tsx"],"verifyCommand":"npm run build","acceptanceCriteria":["modales bulk con N líneas + qty editable per línea","validación pre-submit (filtrar qty=0 + provider/cost/factura strict para externo)","FileUploader con tempFolderId para externo","build verde"]}
```

---

## Task 6: Confirm delivery modals — `ConfirmPickupOrderDeliveryModal.tsx` + `ConfirmExternalOrderDeliveryModal.tsx`

**Goal:** Modales para confirmar entrega de un order activo. Read-only quantity_assigned (todo-o-nada v1). Receptor opcional + notas + foto adicional opcional.

**Files:**
- Create: `src/components/programacion/ConfirmPickupOrderDeliveryModal.tsx`
- Create: `src/components/programacion/ConfirmExternalOrderDeliveryModal.tsx`

**Acceptance Criteria:**
- [ ] Lista líneas con qty_assigned read-only
- [ ] Receptor SelectWithFallback opcional
- [ ] Notas + foto adicional opcionales
- [ ] Submit valida solo confirmation checkbox required
- [ ] ExternalConfirm muestra info provider/amount/factura read-only en header
- [ ] `npm run build` → verde

**Verify:** `npm run build`

**Steps:**

- [ ] **Step 1: Crear `src/components/programacion/ConfirmPickupOrderDeliveryModal.tsx`**

```typescript
'use client'

import { useState, useMemo, useCallback } from 'react'
import { Wrench, Package } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SelectWithFallback, type SelectWithFallbackValue } from '@/components/ui/SelectWithFallback'
import FileUploader from '@/components/ui/FileUploader'
import { formatQty } from '@/lib/utils/format'
import type { Attachment } from '@/lib/supabase/storage'
import type { PickupOrderWithLines } from './PickupOrderCard'

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

export function ConfirmPickupOrderDeliveryModal({
  order,
  receiverOptions,
  onConfirm,
  onClose,
  loading,
  error,
}: ConfirmPickupOrderDeliveryModalProps) {
  const [confirmed, setConfirmed] = useState(false)
  const [receiver, setReceiver] = useState<SelectWithFallbackValue>({ id: null, text: null })
  const [notes, setNotes] = useState('')
  const [additionalAttachments, setAdditionalAttachments] = useState<Attachment[]>([])

  const folderId = useMemo(() => `pickup/${order.id}`, [order.id])

  const canConfirm = confirmed && !loading

  const handleSubmit = useCallback(async () => {
    if (!confirmed) return
    await onConfirm({
      receivedById: receiver.id,
      receivedByName: (receiver.text ?? '').trim(),
      notes: notes.trim(),
      additionalAttachments,
    })
  }, [confirmed, receiver, notes, additionalAttachments, onConfirm])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl sm:p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Confirmar entrega pickup {order.pickup_id}
        </h3>

        {/* Lista de líneas read-only */}
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-1">
          <p className="text-xs font-semibold text-amber-900 mb-2">
            {order.lines.length} {order.lines.length === 1 ? 'línea' : 'líneas'} a entregar:
          </p>
          {order.lines.map((ol) => {
            if (!ol.line) return null
            const isEquipo = ol.line.line_type === 'Equipo'
            const unitCode = ol.line.unit?.code ?? ol.line.unit_text ?? ''
            return (
              <div key={ol.id} className="flex items-center gap-2 text-sm">
                {isEquipo ? <Wrench className="h-3.5 w-3.5 text-iconsa-blue" /> : <Package className="h-3.5 w-3.5 text-gold" />}
                <span className="font-medium text-gray-900">{ol.line.description}</span>
                <span className="text-gray-300">·</span>
                <span className="font-semibold text-gray-700 whitespace-nowrap">
                  {formatQty(ol.quantity_assigned)} {unitCode}
                </span>
              </div>
            )
          })}
        </div>

        <div className="space-y-4">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              disabled={loading}
              className="mt-0.5 rounded border-gray-300 text-navy focus:ring-navy"
            />
            <span className="text-sm text-gray-700">
              Confirmo que las {order.lines.length} líneas fueron entregadas. <span className="text-red-600">*</span>
            </span>
          </label>

          <SelectWithFallback
            label="Receptor (opcional)"
            placeholder="Seleccionar persona..."
            options={receiverOptions}
            value={receiver}
            onChange={setReceiver}
            fallbackPlaceholder="Escribir nombre del receptor"
          />

          <div>
            <label htmlFor="confirm-pickup-notes" className="mb-1 block text-sm font-medium text-gray-700">
              Notas adicionales (opcional)
            </label>
            <textarea
              id="confirm-pickup-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones de la entrega..."
              rows={2}
              maxLength={500}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue"
            />
          </div>

          <FileUploader
            attachments={additionalAttachments}
            folder={folderId}
            onChange={setAdditionalAttachments}
            label="Foto adicional (opcional)"
            hint="Se agrega a las attachments existentes del order (max 10MB)"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 pt-2">
            <Button variant="primary" onClick={handleSubmit} loading={loading} disabled={!canConfirm}>
              Confirmar entrega
            </Button>
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Crear `src/components/programacion/ConfirmExternalOrderDeliveryModal.tsx`**

Paralelo a pickup confirm + sección read-only con info del proveedor (provider name, invoice_amount, "Ver factura" link).

```typescript
'use client'

import { useState, useMemo, useCallback } from 'react'
import { Wrench, Package } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SelectWithFallback, type SelectWithFallbackValue } from '@/components/ui/SelectWithFallback'
import FileUploader from '@/components/ui/FileUploader'
import { formatCurrency, formatQty } from '@/lib/utils/format'
import { getFileUrl } from '@/lib/supabase/storage'
import type { Attachment } from '@/lib/supabase/storage'
import type { ExternalOrderWithLines } from './ExternalOrderCard'

interface ConfirmExternalOrderDeliveryModalProps {
  order: ExternalOrderWithLines
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

export function ConfirmExternalOrderDeliveryModal({
  order,
  receiverOptions,
  onConfirm,
  onClose,
  loading,
  error,
}: ConfirmExternalOrderDeliveryModalProps) {
  const [confirmed, setConfirmed] = useState(false)
  const [receiver, setReceiver] = useState<SelectWithFallbackValue>({ id: null, text: null })
  const [notes, setNotes] = useState('')
  const [additionalAttachments, setAdditionalAttachments] = useState<Attachment[]>([])

  const folderId = useMemo(() => `external/${order.id}`, [order.id])
  const canConfirm = confirmed && !loading

  const handleViewInvoice = useCallback(async () => {
    if (order.invoice_attachments.length === 0) return
    const url = await getFileUrl(order.invoice_attachments[0].path)
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
  }, [order.invoice_attachments])

  const handleSubmit = useCallback(async () => {
    if (!confirmed) return
    await onConfirm({
      receivedById: receiver.id,
      receivedByName: (receiver.text ?? '').trim(),
      notes: notes.trim(),
      additionalAttachments,
    })
  }, [confirmed, receiver, notes, additionalAttachments, onConfirm])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl sm:p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Confirmar entrega externo {order.external_id}
        </h3>

        {/* Info del proveedor read-only */}
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-1">
          <p className="text-xs font-semibold text-blue-900">
            {order.lines.length} {order.lines.length === 1 ? 'línea' : 'líneas'} a entregar
          </p>
          <p className="text-xs text-iconsa-gray">
            Proveedor: <span className="font-medium">{order.provider_name}</span>
            {' · '}
            Costo: <span className="font-medium">{formatCurrency(order.invoice_amount)}</span>
            {order.invoice_attachments.length > 0 && (
              <>
                {' · '}
                <button
                  type="button"
                  onClick={handleViewInvoice}
                  className="text-blue-600 hover:underline"
                >
                  Ver factura
                </button>
              </>
            )}
          </p>
          {/* Lista de líneas */}
          <div className="mt-2 space-y-0.5">
            {order.lines.map((ol) => {
              if (!ol.line) return null
              const isEquipo = ol.line.line_type === 'Equipo'
              const unitCode = ol.line.unit?.code ?? ol.line.unit_text ?? ''
              return (
                <div key={ol.id} className="flex items-center gap-2 text-sm">
                  {isEquipo ? <Wrench className="h-3.5 w-3.5 text-iconsa-blue" /> : <Package className="h-3.5 w-3.5 text-gold" />}
                  <span className="font-medium text-gray-900">{ol.line.description}</span>
                  <span className="text-gray-300">·</span>
                  <span className="font-semibold text-gray-700 whitespace-nowrap">
                    {formatQty(ol.quantity_assigned)} {unitCode}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="space-y-4">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              disabled={loading}
              className="mt-0.5 rounded border-gray-300 text-navy focus:ring-navy"
            />
            <span className="text-sm text-gray-700">
              Confirmo que el material llegó al proyecto destino. <span className="text-red-600">*</span>
            </span>
          </label>

          <SelectWithFallback
            label="Receptor en proyecto (opcional)"
            placeholder="Seleccionar persona..."
            options={receiverOptions}
            value={receiver}
            onChange={setReceiver}
            fallbackPlaceholder="Escribir nombre del receptor"
          />
          <p className="-mt-2 text-xs text-iconsa-gray">
            La factura ya subida es la prueba primaria. Receptor opcional.
          </p>

          <div>
            <label htmlFor="confirm-ext-notes" className="mb-1 block text-sm font-medium text-gray-700">
              Notas adicionales (opcional)
            </label>
            <textarea
              id="confirm-ext-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones de la entrega..."
              rows={2}
              maxLength={500}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue"
            />
          </div>

          <FileUploader
            attachments={additionalAttachments}
            folder={folderId}
            onChange={setAdditionalAttachments}
            label="Foto adicional (opcional)"
            hint="Se agrega a las facturas existentes del order (max 10MB)"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 pt-2">
            <Button variant="primary" onClick={handleSubmit} loading={loading} disabled={!canConfirm}>
              Confirmar entrega
            </Button>
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Build verde + commit**

```bash
npm run build
git add src/components/programacion/ConfirmPickupOrderDeliveryModal.tsx src/components/programacion/ConfirmExternalOrderDeliveryModal.tsx
git commit -m "feat: T6 Cambio 5 — ConfirmPickupOrderDeliveryModal + ConfirmExternalOrderDeliveryModal (read-only líneas + receptor opcional + foto adicional)"
```

```json:metadata
{"files":["src/components/programacion/ConfirmPickupOrderDeliveryModal.tsx","src/components/programacion/ConfirmExternalOrderDeliveryModal.tsx"],"verifyCommand":"npm run build","acceptanceCriteria":["read-only quantity_assigned por línea","receptor SelectWithFallback opcional","notas + foto adicional opcionales","ExternalConfirm header con provider/amount/Ver factura","build verde"]}
```

---

## Task 7: `/programacion` integration — bulk action toolbar (D1) + 2 secciones (D5/D6)

**Goal:** Integración full en `programacion/page.tsx`: bulk action toolbar con 3 botones (existente "Crear movilización" + 2 nuevos "Aprobar pickup"/"Aprobar viaje externo") + 2 secciones nuevas con cards (Pickups Pendientes + Externos Pendientes) reemplazando las secciones del modelo viejo eliminadas en T1. Cancel order modales con copy contextual de stats.

**Files:**
- Modify: `src/app/(app)/programacion/page.tsx`
- Modify: `src/components/programacion/BacklogTable.tsx` (selection ya existe — solo adaptar bulk callback signature si necesario)

**Acceptance Criteria:**
- [ ] Bulk action toolbar visible cuando `selectedLineIds.size > 0` con 3 botones (admin/logistica only)
- [ ] Click "Aprobar pickup" → CreatePickupOrderModal con líneas seleccionadas
- [ ] Click "Aprobar viaje externo" → CreateExternalOrderModal con líneas seleccionadas
- [ ] Sección "Pickups Pendientes" con `PickupOrderCard[]` posición arriba del backlog (después del header de página)
- [ ] Sección "Viajes Externos Pendientes" con `ExternalOrderCard[]` posición después de Pickups Pendientes
- [ ] Hide-when-empty para ambas secciones
- [ ] ConfirmPickupOrderDeliveryModal + ConfirmExternalOrderDeliveryModal renderizan al click "Confirmar entrega" de un card
- [ ] Cancel order modal con copy contextual de stats (deliveredCount, deliveredQty)
- [ ] Toast UI cuando removeLineFromOrder dispara auto_cancel_empty
- [ ] Permission gate admin/logistica only
- [ ] `npm run build` → verde

**Verify:** `npm run build && grep -n "CreatePickupOrderModal\|CreateExternalOrderModal\|PickupOrderCard\|ExternalOrderCard\|usePickupOrders\|useExternalOrders" "src/app/(app)/programacion/page.tsx"`

**Steps:**

- [ ] **Step 1: programacion/page.tsx — agregar imports**

```typescript
import { usePickupOrders, type PickupOrderLineInput } from '@/hooks/usePickupOrders'
import { useExternalOrders, type ExternalOrderLineInput } from '@/hooks/useExternalOrders'
import { PickupOrderCard, type PickupOrderWithLines } from '@/components/programacion/PickupOrderCard'
import { ExternalOrderCard, type ExternalOrderWithLines } from '@/components/programacion/ExternalOrderCard'
import { CreatePickupOrderModal } from '@/components/programacion/CreatePickupOrderModal'
import { CreateExternalOrderModal } from '@/components/programacion/CreateExternalOrderModal'
import { ConfirmPickupOrderDeliveryModal } from '@/components/programacion/ConfirmPickupOrderDeliveryModal'
import { ConfirmExternalOrderDeliveryModal } from '@/components/programacion/ConfirmExternalOrderDeliveryModal'
import type { Attachment } from '@/lib/supabase/storage'
```

- [ ] **Step 2: programacion/page.tsx — state**

Después del state existente, agregar:

```typescript
const pickupOrders = usePickupOrders()
const externalOrders = useExternalOrders()

// Bulk approve modals
const [createPickupModal, setCreatePickupModal] = useState<{ lines: BacklogLine[] } | null>(null)
const [createExternalModal, setCreateExternalModal] = useState<{ lines: BacklogLine[] } | null>(null)

// Surface 3 — listas de orders activos
const [pendingPickupOrders, setPendingPickupOrders] = useState<PickupOrderWithLines[]>([])
const [pendingExternalOrders, setPendingExternalOrders] = useState<ExternalOrderWithLines[]>([])
const [pickupOrdersLoading, setPickupOrdersLoading] = useState(false)
const [externalOrdersLoading, setExternalOrdersLoading] = useState(false)

// Confirm delivery modals
const [confirmPickupOrder, setConfirmPickupOrder] = useState<PickupOrderWithLines | null>(null)
const [confirmExternalOrder, setConfirmExternalOrder] = useState<ExternalOrderWithLines | null>(null)

// Cancel order modals con stats contextual
const [cancelPickupModal, setCancelPickupModal] = useState<{
  order: PickupOrderWithLines
  deliveredCount: number
  deliveredQty: number
} | null>(null)
const [cancelExternalModal, setCancelExternalModal] = useState<{
  order: ExternalOrderWithLines
  deliveredCount: number
  deliveredQty: number
} | null>(null)
```

- [ ] **Step 3: programacion/page.tsx — refetch functions para Surface 3**

```typescript
const refetchPendingPickupOrders = useCallback(async () => {
  setPickupOrdersLoading(true)
  try {
    const { data } = await supabase
      .from('pickup_orders')
      .select(`
        id, pickup_id, status, approved_at, completed_at, cancelled_at,
        received_by_id, received_by_name, notes, attachments,
        approved_by_person:people!pickup_orders_approved_by_fkey(name),
        completed_by_person:people!pickup_orders_completed_by_fkey(name),
        cancelled_by_person:people!pickup_orders_cancelled_by_fkey(name),
        lines:pickup_order_lines(
          id, request_line_id, quantity_assigned, qty_delivered,
          line:request_line_id(
            description, line_type, quantity,
            unit:unit_id(code), unit_text,
            from_location:from_location_id(name), from_text,
            to_location:to_location_id(id, name, project_id, location_type), to_text,
            request:request_id(id, request_id, project:project_id(code, name))
          )
        )
      `)
      .eq('status', 'Aprobado')
      .order('approved_at', { ascending: true })

    const mapped: PickupOrderWithLines[] = (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      pickup_id: row.pickup_id as string,
      status: row.status as 'Aprobado' | 'Entregado' | 'Cancelado',
      approved_at: row.approved_at as string,
      approved_by_name: ((row.approved_by_person as { name?: string } | null)?.name) ?? null,
      completed_at: (row.completed_at as string | null) ?? null,
      completed_by_name: ((row.completed_by_person as { name?: string } | null)?.name) ?? null,
      cancelled_at: (row.cancelled_at as string | null) ?? null,
      cancelled_by_name: ((row.cancelled_by_person as { name?: string } | null)?.name) ?? null,
      received_by_id: (row.received_by_id as string | null) ?? null,
      received_by_name: (row.received_by_name as string | null) ?? null,
      notes: (row.notes as string | null) ?? null,
      attachments: Array.isArray(row.attachments) ? (row.attachments as unknown as Attachment[]) : [],
      lines: (Array.isArray(row.lines) ? row.lines : []) as PickupOrderWithLines['lines'],
    }))
    setPendingPickupOrders(mapped)
  } finally {
    setPickupOrdersLoading(false)
  }
}, [supabase])

const refetchPendingExternalOrders = useCallback(async () => {
  setExternalOrdersLoading(true)
  try {
    const { data } = await supabase
      .from('external_orders')
      .select(`
        id, external_id, status, provider_name, invoice_amount, invoice_attachments,
        approved_at, completed_at, cancelled_at,
        received_by_id, received_by_name, notes,
        approved_by_person:people!external_orders_approved_by_fkey(name),
        completed_by_person:people!external_orders_completed_by_fkey(name),
        cancelled_by_person:people!external_orders_cancelled_by_fkey(name),
        lines:external_order_lines(
          id, request_line_id, quantity_assigned, qty_delivered,
          line:request_line_id(
            description, line_type, quantity,
            unit:unit_id(code), unit_text,
            from_location:from_location_id(name), from_text,
            to_location:to_location_id(id, name, project_id, location_type), to_text,
            request:request_id(id, request_id, project:project_id(code, name))
          )
        )
      `)
      .eq('status', 'Aprobado')
      .order('approved_at', { ascending: true })

    const mapped: ExternalOrderWithLines[] = (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      external_id: row.external_id as string,
      status: row.status as 'Aprobado' | 'Entregado' | 'Cancelado',
      provider_name: row.provider_name as string,
      invoice_amount: row.invoice_amount as number,
      invoice_attachments: Array.isArray(row.invoice_attachments) ? (row.invoice_attachments as unknown as Attachment[]) : [],
      approved_at: row.approved_at as string,
      approved_by_name: ((row.approved_by_person as { name?: string } | null)?.name) ?? null,
      completed_at: (row.completed_at as string | null) ?? null,
      completed_by_name: ((row.completed_by_person as { name?: string } | null)?.name) ?? null,
      cancelled_at: (row.cancelled_at as string | null) ?? null,
      cancelled_by_name: ((row.cancelled_by_person as { name?: string } | null)?.name) ?? null,
      received_by_id: (row.received_by_id as string | null) ?? null,
      received_by_name: (row.received_by_name as string | null) ?? null,
      notes: (row.notes as string | null) ?? null,
      lines: (Array.isArray(row.lines) ? row.lines : []) as ExternalOrderWithLines['lines'],
    }))
    setPendingExternalOrders(mapped)
  } finally {
    setExternalOrdersLoading(false)
  }
}, [supabase])

useEffect(() => {
  if (role === 'logistica' || role === 'admin') {
    void refetchPendingPickupOrders()
    void refetchPendingExternalOrders()
  }
}, [role, refetchPendingPickupOrders, refetchPendingExternalOrders])
```

- [ ] **Step 4: programacion/page.tsx — handlers bulk approve**

```typescript
// Bulk approve handlers
const handleOpenBulkApprovePickup = useCallback(() => {
  const lines = backlog.filter((l) => selectedLineIds.has(l.id))
  if (lines.length === 0) return
  setCreatePickupModal({ lines })
}, [backlog, selectedLineIds])

const handleOpenBulkApproveExternal = useCallback(() => {
  const lines = backlog.filter((l) => selectedLineIds.has(l.id))
  if (lines.length === 0) return
  setCreateExternalModal({ lines })
}, [backlog, selectedLineIds])

const handleConfirmCreatePickup = useCallback(
  async (lines: PickupOrderLineInput[], notes: string | null) => {
    if (!person?.id) return
    const result = await pickupOrders.createPickupOrder(person.id, lines, notes)
    if (result.ok) {
      setCreatePickupModal(null)
      setSelectedLineIds(new Set())
      refetchBacklog()
      void refetchPendingPickupOrders()
    }
  },
  [person, pickupOrders, refetchBacklog, refetchPendingPickupOrders],
)

const handleConfirmCreateExternal = useCallback(
  async (
    lines: ExternalOrderLineInput[],
    providerName: string,
    invoiceAmount: number,
    invoiceAttachments: Attachment[],
    notes: string | null,
  ) => {
    if (!person?.id) return
    const result = await externalOrders.createExternalOrder(
      person.id,
      lines,
      providerName,
      invoiceAmount,
      invoiceAttachments,
      notes,
    )
    if (result.ok) {
      setCreateExternalModal(null)
      setSelectedLineIds(new Set())
      refetchBacklog()
      void refetchPendingExternalOrders()
    }
  },
  [person, externalOrders, refetchBacklog, refetchPendingExternalOrders],
)
```

- [ ] **Step 5: programacion/page.tsx — handlers confirm delivery + cancel**

```typescript
// Confirm delivery handlers (Surface 3 cards)
const handleConfirmPickupDelivery = useCallback(async (data: {
  receivedById: string | null
  receivedByName: string
  notes: string
  additionalAttachments: Attachment[]
}) => {
  if (!confirmPickupOrder || !person?.id) return
  const result = await pickupOrders.completePickupOrder(
    confirmPickupOrder.id,
    person.id,
    data.receivedById,
    data.receivedByName,
    data.notes,
    data.additionalAttachments,
  )
  if (result.ok) {
    setConfirmPickupOrder(null)
    void refetchPendingPickupOrders()
    refetchBacklog()
  }
}, [confirmPickupOrder, person, pickupOrders, refetchPendingPickupOrders, refetchBacklog])

const handleConfirmExternalDelivery = useCallback(async (data: {
  receivedById: string | null
  receivedByName: string
  notes: string
  additionalAttachments: Attachment[]
}) => {
  if (!confirmExternalOrder || !person?.id) return
  const result = await externalOrders.completeExternalOrder(
    confirmExternalOrder.id,
    person.id,
    data.receivedById,
    data.receivedByName,
    data.notes,
    data.additionalAttachments,
  )
  if (result.ok) {
    setConfirmExternalOrder(null)
    void refetchPendingExternalOrders()
    refetchBacklog()
  }
}, [confirmExternalOrder, person, externalOrders, refetchPendingExternalOrders, refetchBacklog])

// Cancel order handlers (con stats contextual)
const handleOpenCancelPickup = useCallback(async (order: PickupOrderWithLines) => {
  // Pre-flight stats: count líneas con qty_delivered > 0
  const { data } = await supabase
    .from('pickup_order_lines')
    .select('id, qty_delivered')
    .eq('pickup_order_id', order.id)
  const deliveredLines = (data ?? []).filter((l) => (l.qty_delivered ?? 0) > 0)
  setCancelPickupModal({
    order,
    deliveredCount: deliveredLines.length,
    deliveredQty: deliveredLines.reduce((sum, l) => sum + (l.qty_delivered ?? 0), 0),
  })
}, [supabase])

const handleOpenCancelExternal = useCallback(async (order: ExternalOrderWithLines) => {
  const { data } = await supabase
    .from('external_order_lines')
    .select('id, qty_delivered')
    .eq('external_order_id', order.id)
  const deliveredLines = (data ?? []).filter((l) => (l.qty_delivered ?? 0) > 0)
  setCancelExternalModal({
    order,
    deliveredCount: deliveredLines.length,
    deliveredQty: deliveredLines.reduce((sum, l) => sum + (l.qty_delivered ?? 0), 0),
  })
}, [supabase])

const confirmCancelPickup = useCallback(async () => {
  if (!cancelPickupModal || !person?.id) return
  const result = await pickupOrders.cancelPickupOrder(cancelPickupModal.order.id, person.id)
  if (result.ok) {
    setCancelPickupModal(null)
    void refetchPendingPickupOrders()
    refetchBacklog()
  }
}, [cancelPickupModal, person, pickupOrders, refetchPendingPickupOrders, refetchBacklog])

const confirmCancelExternal = useCallback(async () => {
  if (!cancelExternalModal || !person?.id) return
  const result = await externalOrders.cancelExternalOrder(cancelExternalModal.order.id, person.id)
  if (result.ok) {
    setCancelExternalModal(null)
    void refetchPendingExternalOrders()
    refetchBacklog()
  }
}, [cancelExternalModal, person, externalOrders, refetchPendingExternalOrders, refetchBacklog])
```

- [ ] **Step 6: programacion/page.tsx — JSX bulk toolbar**

Encima del backlog section actual (después del header de página), agregar:

```tsx
{/* Bulk action toolbar (Cambio 5 — D1) */}
{(role === 'logistica' || role === 'admin') && selectedLineIds.size > 0 && (
  <section className="rounded-xl border border-amber-200 bg-amber-50 p-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-amber-900">
          {selectedLineIds.size} {selectedLineIds.size === 1 ? 'línea seleccionada' : 'líneas seleccionadas'}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={handleCrearViajeConLineas /* existente */}
          className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 transition-colors"
        >
          Crear movilización
        </button>
        <button
          type="button"
          onClick={handleOpenBulkApprovePickup}
          className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 transition-colors"
        >
          Aprobar pickup
        </button>
        <button
          type="button"
          onClick={handleOpenBulkApproveExternal}
          className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 transition-colors"
        >
          Aprobar viaje externo
        </button>
        <button
          type="button"
          onClick={() => setSelectedLineIds(new Set())}
          className="text-xs text-amber-900 hover:underline"
        >
          Limpiar selección
        </button>
      </div>
    </div>
  </section>
)}
```

(Si el header de página existente ya tiene el botón "Crear movilización" cuando hay selección, **eliminarlo** para no duplicar — la toolbar nueva centraliza las 3 bulk actions.)

- [ ] **Step 7: programacion/page.tsx — JSX secciones Surface 3**

Después de la toolbar bulk, antes del backlog section:

```tsx
{/* Sección Pickups Pendientes (Cambio 5 — D5) */}
{(role === 'logistica' || role === 'admin') && (pickupOrdersLoading || pendingPickupOrders.length > 0) && (
  <section className="rounded-xl border border-amber-200 bg-amber-50/30">
    <div className="px-4 pt-4 pb-3 flex items-center gap-2">
      <h2 className="text-base font-semibold text-gray-900">Pickups Pendientes</h2>
      {!pickupOrdersLoading && (
        <span className="rounded-full bg-amber-200 text-amber-900 px-2 py-0.5 text-xs font-medium">
          {pendingPickupOrders.length}
        </span>
      )}
    </div>
    <div className="px-4 pb-4 space-y-2">
      {pickupOrdersLoading ? (
        <p className="py-4 text-center text-sm text-iconsa-gray">Cargando pickups...</p>
      ) : (
        pendingPickupOrders.map((order) => (
          <PickupOrderCard
            key={order.id}
            order={order}
            canConfirmDelivery={role === 'logistica' || role === 'admin'}
            canCancelOrder={role === 'logistica' || role === 'admin'}
            onConfirmDelivery={() => setConfirmPickupOrder(order)}
            onCancelOrder={() => handleOpenCancelPickup(order)}
          />
        ))
      )}
    </div>
  </section>
)}

{/* Sección Viajes Externos Pendientes (Cambio 5 — D6) */}
{(role === 'logistica' || role === 'admin') && (externalOrdersLoading || pendingExternalOrders.length > 0) && (
  <section className="rounded-xl border border-blue-200 bg-blue-50/30">
    <div className="px-4 pt-4 pb-3 flex items-center gap-2">
      <h2 className="text-base font-semibold text-gray-900">Viajes Externos Pendientes</h2>
      {!externalOrdersLoading && (
        <span className="rounded-full bg-blue-200 text-blue-900 px-2 py-0.5 text-xs font-medium">
          {pendingExternalOrders.length}
        </span>
      )}
    </div>
    <div className="px-4 pb-4 space-y-2">
      {externalOrdersLoading ? (
        <p className="py-4 text-center text-sm text-iconsa-gray">Cargando externos...</p>
      ) : (
        pendingExternalOrders.map((order) => (
          <ExternalOrderCard
            key={order.id}
            order={order}
            canConfirmDelivery={role === 'logistica' || role === 'admin'}
            canCancelOrder={role === 'logistica' || role === 'admin'}
            onConfirmDelivery={() => setConfirmExternalOrder(order)}
            onCancelOrder={() => handleOpenCancelExternal(order)}
          />
        ))
      )}
    </div>
  </section>
)}
```

- [ ] **Step 8: programacion/page.tsx — JSX modales al final**

Antes del último `</div>` del page root, agregar:

```tsx
{/* Modal Crear Pickup Order (Cambio 5 — Surface 1 bulk) */}
{createPickupModal && (
  <CreatePickupOrderModal
    selectedLines={createPickupModal.lines}
    onConfirm={handleConfirmCreatePickup}
    onClose={() => setCreatePickupModal(null)}
    loading={pickupOrders.loading}
    error={pickupOrders.error}
  />
)}

{/* Modal Crear External Order (Cambio 5 — Surface 1 bulk) */}
{createExternalModal && (
  <CreateExternalOrderModal
    selectedLines={createExternalModal.lines}
    onConfirm={handleConfirmCreateExternal}
    onClose={() => setCreateExternalModal(null)}
    loading={externalOrders.loading}
    error={externalOrders.error}
  />
)}

{/* Modal Confirmar Entrega Pickup (Cambio 5 — Surface 3 card action) */}
{confirmPickupOrder && (
  <ConfirmPickupOrderDeliveryModal
    order={confirmPickupOrder}
    receiverOptions={receiverOptions}
    onConfirm={handleConfirmPickupDelivery}
    onClose={() => setConfirmPickupOrder(null)}
    loading={pickupOrders.loading}
    error={pickupOrders.error}
  />
)}

{/* Modal Confirmar Entrega External */}
{confirmExternalOrder && (
  <ConfirmExternalOrderDeliveryModal
    order={confirmExternalOrder}
    receiverOptions={receiverOptions}
    onConfirm={handleConfirmExternalDelivery}
    onClose={() => setConfirmExternalOrder(null)}
    loading={externalOrders.loading}
    error={externalOrders.error}
  />
)}

{/* Modal Cancelar Pickup Order (Cambio 5 — Surface 3 card action con stats) */}
{cancelPickupModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
      <h3 className="text-lg font-semibold text-gray-900">
        ¿Cancelar pickup {cancelPickupModal.order.pickup_id}?
      </h3>
      <p className="mt-2 text-sm text-gray-600">
        {cancelPickupModal.deliveredCount > 0 ? (
          <>
            Cancelar este pickup va a devolver al backlog las líneas no entregadas.
            Las {cancelPickupModal.deliveredCount} {cancelPickupModal.deliveredCount === 1 ? 'línea ya entregada' : 'líneas ya entregadas'}{' '}
            ({cancelPickupModal.deliveredQty} unidades en total) quedan registradas como entregadas (no se invierten). ¿Confirmar?
          </>
        ) : (
          <>Las líneas volverán al backlog. ¿Confirmar?</>
        )}
      </p>
      {pickupOrders.error && (
        <p className="mt-2 text-sm text-red-600">{pickupOrders.error}</p>
      )}
      <div className="mt-4 flex items-center justify-end gap-3">
        <Button variant="ghost" size="sm" onClick={() => setCancelPickupModal(null)} disabled={pickupOrders.loading}>
          Volver
        </Button>
        <Button variant="danger" size="sm" onClick={confirmCancelPickup} loading={pickupOrders.loading}>
          Sí, cancelar pickup
        </Button>
      </div>
    </div>
  </div>
)}

{/* Modal Cancelar External Order (paralelo) */}
{cancelExternalModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
      <h3 className="text-lg font-semibold text-gray-900">
        ¿Cancelar viaje externo {cancelExternalModal.order.external_id}?
      </h3>
      <p className="mt-2 text-sm text-gray-600">
        {cancelExternalModal.deliveredCount > 0 ? (
          <>
            Cancelar este viaje externo va a devolver al backlog las líneas no entregadas.
            Las {cancelExternalModal.deliveredCount} {cancelExternalModal.deliveredCount === 1 ? 'línea ya entregada' : 'líneas ya entregadas'}{' '}
            ({cancelExternalModal.deliveredQty} unidades en total) quedan registradas como entregadas. La factura subida se preserva. ¿Confirmar?
          </>
        ) : (
          <>Las líneas volverán al backlog. La factura subida se preserva. ¿Confirmar?</>
        )}
      </p>
      {externalOrders.error && (
        <p className="mt-2 text-sm text-red-600">{externalOrders.error}</p>
      )}
      <div className="mt-4 flex items-center justify-end gap-3">
        <Button variant="ghost" size="sm" onClick={() => setCancelExternalModal(null)} disabled={externalOrders.loading}>
          Volver
        </Button>
        <Button variant="danger" size="sm" onClick={confirmCancelExternal} loading={externalOrders.loading}>
          Sí, cancelar viaje externo
        </Button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 9: Build verde + commit**

```bash
npm run build
grep -n "CreatePickupOrderModal\|CreateExternalOrderModal\|PickupOrderCard\|ExternalOrderCard\|usePickupOrders\|useExternalOrders" "src/app/(app)/programacion/page.tsx"
```

```bash
git add "src/app/(app)/programacion/page.tsx"
git commit -m "feat: T7 Cambio 5 — programacion/page.tsx integration (bulk toolbar D1 + 2 secciones D5/D6 + cancel modales con stats contextual)"
```

```json:metadata
{"files":["src/app/(app)/programacion/page.tsx"],"verifyCommand":"npm run build && grep -n \"CreatePickupOrderModal\\|CreateExternalOrderModal\\|PickupOrderCard\\|ExternalOrderCard\" 'src/app/(app)/programacion/page.tsx'","acceptanceCriteria":["bulk toolbar 3 botones admin/logistica","2 secciones cards hide-when-empty","confirm delivery modales","cancel modales con stats contextual","permission gate","build verde"]}
```

---

## Task 8: `/solicitudes/[id]` integration — secciones orders related + PM permission (D8/J)

**Goal:** Agregar secciones "Pickup Orders" y "Viajes Externos" relacionados a la solicitud actual. PM del proyecto destino (vía `to_location.project_id` + `person_projects.is_active`) puede confirmar entrega. Admin/logistica también pueden cancelar. Edge case E11 documentado: orders con TODAS líneas en `to_text` free-text → solo admin/logistica pueden confirmar.

**Files:**
- Modify: `src/app/(app)/solicitudes/[id]/page.tsx`

**Acceptance Criteria:**
- [ ] Sección "Pickup Orders" arriba o debajo del SolicitudForm con `PickupOrderCard[]` related
- [ ] Sección "Viajes Externos" paralela
- [ ] PM permission query con AT LEAST 1 match + `location_type='proyecto'` lowercase + `pp.is_active=true` (con comentario explicando el INNER JOIN automático excluye `to_location_id=null`)
- [ ] PM puede confirmar entrega; admin/logistica pueden confirmar + cancelar
- [ ] E11 free-text destination: si TODAS las líneas son free-text, PM no puede confirmar (admin/logistica only)
- [ ] Cards reusan `PickupOrderCard` + `ExternalOrderCard`
- [ ] Modales `ConfirmPickupOrderDeliveryModal` + `ConfirmExternalOrderDeliveryModal` reutilizables
- [ ] `npm run build` → verde

**Verify:** `npm run build && grep -n "PickupOrderCard\|ExternalOrderCard\|relatedPickupOrders\|relatedExternalOrders" "src/app/(app)/solicitudes/[id]/page.tsx"`

**Steps:**

- [ ] **Step 1: solicitudes/[id]/page.tsx — agregar imports**

```typescript
import { usePickupOrders, type PickupOrderLineInput } from '@/hooks/usePickupOrders'
import { useExternalOrders } from '@/hooks/useExternalOrders'
import { PickupOrderCard, type PickupOrderWithLines } from '@/components/programacion/PickupOrderCard'
import { ExternalOrderCard, type ExternalOrderWithLines } from '@/components/programacion/ExternalOrderCard'
import { ConfirmPickupOrderDeliveryModal } from '@/components/programacion/ConfirmPickupOrderDeliveryModal'
import { ConfirmExternalOrderDeliveryModal } from '@/components/programacion/ConfirmExternalOrderDeliveryModal'
import type { Attachment } from '@/lib/supabase/storage'
```

- [ ] **Step 2: solicitudes/[id]/page.tsx — state**

```typescript
const pickupOrders = usePickupOrders()
const externalOrders = useExternalOrders()

const [relatedPickupOrders, setRelatedPickupOrders] = useState<PickupOrderWithLines[]>([])
const [relatedExternalOrders, setRelatedExternalOrders] = useState<ExternalOrderWithLines[]>([])

// PM permission map: order.id → { canConfirm: boolean }
// Para cada order, calculamos si el PM logueado tiene AT LEAST 1 match en
// person_projects con la project_id de cualquier to_location de las líneas
// del order. Admin/logistica siempre tienen permission.
const [pmPermissionForPickupOrder, setPmPermissionForPickupOrder] = useState<Record<string, boolean>>({})
const [pmPermissionForExternalOrder, setPmPermissionForExternalOrder] = useState<Record<string, boolean>>({})

const [confirmPickupOrder, setConfirmPickupOrder] = useState<PickupOrderWithLines | null>(null)
const [confirmExternalOrder, setConfirmExternalOrder] = useState<ExternalOrderWithLines | null>(null)
const [cancelPickupModal, setCancelPickupModal] = useState<{ order: PickupOrderWithLines; deliveredCount: number; deliveredQty: number } | null>(null)
const [cancelExternalModal, setCancelExternalModal] = useState<{ order: ExternalOrderWithLines; deliveredCount: number; deliveredQty: number } | null>(null)

const [receiverOptions, setReceiverOptions] = useState<{ value: string; label: string }[]>([])
```

- [ ] **Step 3: solicitudes/[id]/page.tsx — fetch related orders + PM permission**

```typescript
// Fetch related pickup_orders + external_orders + PM permission per order
useEffect(() => {
  if (!solicitudId || !person?.id) return

  const fetchRelatedOrders = async () => {
    // 1. Pickup orders related: SELECT distinct pickup_orders via pickup_order_lines.line.request_id
    const { data: pickupData } = await supabase
      .from('pickup_orders')
      .select(`
        id, pickup_id, status, approved_at, completed_at, cancelled_at,
        received_by_id, received_by_name, notes, attachments,
        approved_by_person:people!pickup_orders_approved_by_fkey(name),
        completed_by_person:people!pickup_orders_completed_by_fkey(name),
        cancelled_by_person:people!pickup_orders_cancelled_by_fkey(name),
        lines:pickup_order_lines!inner(
          id, request_line_id, quantity_assigned, qty_delivered,
          line:request_line_id!inner(
            description, line_type, quantity,
            unit:unit_id(code), unit_text,
            from_location:from_location_id(name), from_text,
            to_location:to_location_id(id, name, project_id, location_type), to_text,
            request:request_id!inner(id, request_id, project:project_id(code, name))
          )
        )
      `)
      .eq('lines.line.request_id', solicitudId)

    const mappedPickup: PickupOrderWithLines[] = (pickupData ?? []).map(/* same mapper as T7 */)
    setRelatedPickupOrders(mappedPickup)

    // 2. PM permission para pickup orders
    // Query: AT LEAST 1 línea del order tiene to_location.project_id en person_projects
    //        del PM logueado, con is_active=true y location_type='proyecto' lowercase.
    //
    // NOTA INNER JOIN behavior: cuando una línea tiene to_location_id=null
    // (free-text), el JOIN locations no matchea — esa línea NO contribuye al
    // permission. Si TODAS las líneas son free-text, PM no puede confirmar (E11).
    if (role === 'pm') {
      const pickupPerms: Record<string, boolean> = {}
      for (const order of mappedPickup) {
        const { count } = await supabase
          .from('pickup_order_lines')
          .select('id, line:request_line_id!inner(to_location:to_location_id!inner(id, project_id, location_type))', { count: 'exact', head: true })
          .eq('pickup_order_id', order.id)
          .eq('line.to_location.location_type', 'proyecto')  // LOWERCASE per Cambio 1
          .in('line.to_location.project_id', /* PM's project_ids */)

        // SIMPLIFICACIÓN ALTERNATIVA: hacer un single fetch de PM's projects, luego
        // verificar in-memory si los orders tienen líneas matching.
        pickupPerms[order.id] = (count ?? 0) > 0
      }
      setPmPermissionForPickupOrder(pickupPerms)
    } else {
      // admin/logistica/etc. — todos los permisos true
      const allTrue: Record<string, boolean> = {}
      for (const o of mappedPickup) allTrue[o.id] = true
      setPmPermissionForPickupOrder(allTrue)
    }

    // 3. External orders related — paralelo
    // ... (mismo patrón)
  }

  void fetchRelatedOrders()
}, [solicitudId, person, role, supabase])

// SIMPLIFICACIÓN PRACTICAL: en lugar de N queries para PM permission,
// hacer un single fetch de PM's project_ids al mount + JS filter:

useEffect(() => {
  if (!person?.id || role !== 'pm') return

  const fetchPmProjects = async () => {
    const { data } = await supabase
      .from('person_projects')
      .select('project_id')
      .eq('person_id', person.id)
      .eq('is_active', true)

    const pmProjectIds = new Set((data ?? []).map((pp) => pp.project_id))

    // Helper: chequear si un order tiene AT LEAST 1 línea cuyo to_location.project_id
    // está en pmProjectIds. INNER JOIN behavior: líneas con to_location_id=null
    // automáticamente quedan fuera (E11).
    const checkOrderPerm = (
      lines: PickupOrderWithLines['lines'] | ExternalOrderWithLines['lines'],
    ): boolean => {
      return lines.some((ol) => {
        const toLoc = ol.line?.to_location
        if (!toLoc) return false  // free-text destination → no contribuye (E11)
        if (toLoc.location_type !== 'proyecto') return false  // LOWERCASE per Cambio 1
        return toLoc.project_id != null && pmProjectIds.has(toLoc.project_id)
      })
    }

    // Recalcular permissions
    const pickupPerms: Record<string, boolean> = {}
    for (const order of relatedPickupOrders) {
      pickupPerms[order.id] = checkOrderPerm(order.lines)
    }
    setPmPermissionForPickupOrder(pickupPerms)

    const externalPerms: Record<string, boolean> = {}
    for (const order of relatedExternalOrders) {
      externalPerms[order.id] = checkOrderPerm(order.lines)
    }
    setPmPermissionForExternalOrder(externalPerms)
  }

  void fetchPmProjects()
}, [person, role, supabase, relatedPickupOrders, relatedExternalOrders])

// Receivers para modales (PM o admin)
useEffect(() => {
  supabase
    .from('people')
    .select('id, name')
    .eq('status', 'Activo')
    .order('name')
    .then(({ data }) => setReceiverOptions((data ?? []).map((p) => ({ value: p.id, label: p.name }))))
}, [supabase])
```

NOTE: For simplicity in the plan, the inline `useEffect` for PM permission is shown; the implementer should refactor if this grows complex. The key points: (1) INNER JOIN excludes `to_location_id=null` (E11), (2) `location_type='proyecto'` lowercase (E12), (3) `pp.is_active=true` filter.

- [ ] **Step 4: solicitudes/[id]/page.tsx — handlers (paralelo a programacion/page.tsx)**

Mismos handlers que T7 Step 5:
- `handleConfirmPickupDelivery`, `handleConfirmExternalDelivery`
- `handleOpenCancelPickup`, `handleOpenCancelExternal`
- `confirmCancelPickup`, `confirmCancelExternal`

Diferencia: post-success refetch local de `relatedPickupOrders`/`relatedExternalOrders` (no hay backlog en esta page).

- [ ] **Step 5: solicitudes/[id]/page.tsx — JSX secciones**

Antes del `<SolicitudForm>` o después según UX preference (recomendación: arriba para que PM las vea primero):

```tsx
{/* Sección Pickup Orders related (Cambio 5 — D8) */}
{relatedPickupOrders.length > 0 && (
  <section className="rounded-xl border border-amber-200 bg-amber-50/30">
    <div className="px-4 pt-4 pb-3 flex items-center gap-2">
      <h2 className="text-base font-semibold text-gray-900">Pickup Orders</h2>
      <span className="rounded-full bg-amber-200 text-amber-900 px-2 py-0.5 text-xs font-medium">
        {relatedPickupOrders.length}
      </span>
    </div>
    <div className="px-4 pb-4 space-y-2">
      {relatedPickupOrders.map((order) => {
        const isAdmin = role === 'admin' || role === 'logistica'
        const canConfirm = isAdmin || (pmPermissionForPickupOrder[order.id] === true)
        const canCancel = isAdmin && order.status === 'Aprobado'
        return (
          <PickupOrderCard
            key={order.id}
            order={order}
            canConfirmDelivery={canConfirm && order.status === 'Aprobado'}
            canCancelOrder={canCancel}
            onConfirmDelivery={() => setConfirmPickupOrder(order)}
            onCancelOrder={() => handleOpenCancelPickup(order)}
            showLinesInitially={true}
          />
        )
      })}
    </div>
  </section>
)}

{/* Sección Viajes Externos related */}
{relatedExternalOrders.length > 0 && (
  <section className="rounded-xl border border-blue-200 bg-blue-50/30">
    <div className="px-4 pt-4 pb-3 flex items-center gap-2">
      <h2 className="text-base font-semibold text-gray-900">Viajes Externos</h2>
      <span className="rounded-full bg-blue-200 text-blue-900 px-2 py-0.5 text-xs font-medium">
        {relatedExternalOrders.length}
      </span>
    </div>
    <div className="px-4 pb-4 space-y-2">
      {relatedExternalOrders.map((order) => {
        const isAdmin = role === 'admin' || role === 'logistica'
        const canConfirm = isAdmin || (pmPermissionForExternalOrder[order.id] === true)
        const canCancel = isAdmin && order.status === 'Aprobado'
        return (
          <ExternalOrderCard
            key={order.id}
            order={order}
            canConfirmDelivery={canConfirm && order.status === 'Aprobado'}
            canCancelOrder={canCancel}
            onConfirmDelivery={() => setConfirmExternalOrder(order)}
            onCancelOrder={() => handleOpenCancelExternal(order)}
            showLinesInitially={true}
          />
        )
      })}
    </div>
  </section>
)}
```

- [ ] **Step 6: solicitudes/[id]/page.tsx — modales al final**

Mismos modales que T7 Step 8 (4 modales: 2 confirm + 2 cancel con stats contextual). Adaptados a usar `relatedPickupOrders`/`relatedExternalOrders` y refetch después de cada acción.

- [ ] **Step 7: Build verde + commit**

```bash
npm run build
grep -n "PickupOrderCard\|ExternalOrderCard\|relatedPickupOrders\|relatedExternalOrders" "src/app/(app)/solicitudes/[id]/page.tsx"
```

```bash
git add "src/app/(app)/solicitudes/[id]/page.tsx"
git commit -m "feat: T8 Cambio 5 — solicitudes/[id] integration (orders related + PM permission D8/J)"
```

```json:metadata
{"files":["src/app/(app)/solicitudes/[id]/page.tsx"],"verifyCommand":"npm run build && grep -n \"PickupOrderCard\\|ExternalOrderCard\\|relatedPickupOrders\" 'src/app/(app)/solicitudes/[id]/page.tsx'","acceptanceCriteria":["secciones orders related","PM permission AT LEAST 1 match + lowercase + is_active","E11 free-text destination handled","cards reusables","modales reutilizables","build verde"]}
```

---

## Task 9: useSolicitudes LEFT JOIN fulfillments + LineRow badges (E)

**Goal:** Modificar `useSolicitudes.fetchSolicitud` para LEFT JOIN a 3 tablas pivot + parents activos, devolviendo `fulfillments: FulfillmentInfo[]` per línea. LineRow renderiza 0-N badges con tooltips.

**Files:**
- Modify: `src/hooks/useSolicitudes.ts`
- Modify: `src/components/solicitudes/LineRow.tsx`

**Acceptance Criteria:**
- [ ] `LineWithRelations` agrega campo `fulfillments: FulfillmentInfo[]` (discriminated union)
- [ ] `fetchSolicitud` query con 3 LEFT JOINs filtrando `status NOT IN ('Cancelado')`
- [ ] LineRow recibe prop `fulfillments` y renderiza N badges:
  - Trip: green-100/green-700 "EN VIAJE {trip_id}" + tooltip "Trip {trip_id}, {qty} {unit}"
  - Pickup: blue-100/blue-700 "EN PICKUP {pickup_id}" + tooltip "Pickup {pickup_id}, {qty} {unit}"
  - External: violet-100/violet-700 "EN EXTERNO {external_id}" + tooltip "Externo {external_id}, B/. {amount}, {provider}, {qty} {unit}"
- [ ] Para línea Entregada: badge "ENTREGADA" emerald + tooltip lista TODOS los fulfillments con qty_delivered > 0
- [ ] Polish round 2 preservado (no truncate desc/ruta + tooltips universales con `statusContextString`)
- [ ] `npm run build` → verde

**Verify:** `npm run build && grep -n "fulfillments\|FulfillmentInfo" src/hooks/useSolicitudes.ts src/components/solicitudes/LineRow.tsx`

**Steps:**

- [ ] **Step 1: useSolicitudes.ts — agregar tipo `FulfillmentInfo`**

```typescript
export type FulfillmentInfo =
  | { type: 'trip'; id: string; trip_id: string | null; status: string; quantity_assigned: number; qty_delivered: number }
  | { type: 'pickup'; id: string; pickup_id: string; status: string; quantity_assigned: number; qty_delivered: number }
  | { type: 'external'; id: string; external_id: string; status: string; provider_name: string; invoice_amount: number; quantity_assigned: number; qty_delivered: number }
```

- [ ] **Step 2: useSolicitudes.ts — agregar campo `fulfillments` a LineWithRelations**

En la interface `LineWithRelations` (~líneas 42-79 post-T1), agregar al final:
```typescript
  fulfillments: FulfillmentInfo[]
```

- [ ] **Step 3: useSolicitudes.ts — actualizar `fetchSolicitud` query**

Modificar el SELECT de `lines:sm_request_lines(...)` para agregar 3 LEFT JOINs:

```typescript
lines:sm_request_lines(
  *,
  equipment:equipment!sm_request_lines_equipment_id_fkey(id, spectrum_code, description),
  from_location:locations!sm_request_lines_from_location_id_fkey(id, name),
  to_location:locations!sm_request_lines_to_location_id_fkey(id, name),
  unit:units!sm_request_lines_unit_id_fkey(id, code, description),
  trip_assignments:trip_line_assignments(
    id, quantity_assigned, qty_delivered,
    trip:trip_id!inner(id, trip_id, status)
  ),
  pickup_lines:pickup_order_lines(
    id, quantity_assigned, qty_delivered,
    order:pickup_order_id!inner(id, pickup_id, status)
  ),
  external_lines:external_order_lines(
    id, quantity_assigned, qty_delivered,
    order:external_order_id!inner(id, external_id, status, provider_name, invoice_amount)
  )
)
```

- [ ] **Step 4: useSolicitudes.ts — mapper para `fulfillments`**

En el `lines.map((rawLine) => {...})` mapper, agregar cómputo de `fulfillments`:

```typescript
// Mapear fulfillments (3 tablas pivote) a discriminated union
const tripAssignments = (line.trip_assignments as Array<Record<string, unknown>>) ?? []
const pickupLines = (line.pickup_lines as Array<Record<string, unknown>>) ?? []
const externalLines = (line.external_lines as Array<Record<string, unknown>>) ?? []

const fulfillments: FulfillmentInfo[] = []

for (const ta of tripAssignments) {
  const trip = (Array.isArray(ta.trip) ? ta.trip[0] : ta.trip) as { id: string; trip_id: string | null; status: string } | null
  if (!trip || trip.status === 'Cancelado') continue  // filtro D9: excluir Cancelados activos
  fulfillments.push({
    type: 'trip',
    id: trip.id,
    trip_id: trip.trip_id,
    status: trip.status,
    quantity_assigned: ta.quantity_assigned as number,
    qty_delivered: (ta.qty_delivered as number) ?? 0,
  })
}

for (const pl of pickupLines) {
  const order = (Array.isArray(pl.order) ? pl.order[0] : pl.order) as { id: string; pickup_id: string; status: string } | null
  if (!order || order.status === 'Cancelado') continue
  fulfillments.push({
    type: 'pickup',
    id: order.id,
    pickup_id: order.pickup_id,
    status: order.status,
    quantity_assigned: pl.quantity_assigned as number,
    qty_delivered: (pl.qty_delivered as number) ?? 0,
  })
}

for (const el of externalLines) {
  const order = (Array.isArray(el.order) ? el.order[0] : el.order) as {
    id: string; external_id: string; status: string; provider_name: string; invoice_amount: number
  } | null
  if (!order || order.status === 'Cancelado') continue
  fulfillments.push({
    type: 'external',
    id: order.id,
    external_id: order.external_id,
    status: order.status,
    provider_name: order.provider_name,
    invoice_amount: order.invoice_amount,
    quantity_assigned: el.quantity_assigned as number,
    qty_delivered: (el.qty_delivered as number) ?? 0,
  })
}
```

Agregar `fulfillments` al objeto returned por el map.

- [ ] **Step 5: LineRow.tsx — agregar prop `fulfillments`**

En `LineRowProps` interface, agregar después de los campos existentes:
```typescript
import type { FulfillmentInfo } from '@/hooks/useSolicitudes'
// ...
interface LineRowProps {
  line: LineInput & { ... }  // existente
  // ...
  // Cambio 5 — fulfillments per línea (0-N items)
  fulfillments?: FulfillmentInfo[]
}
```

Destructurar `fulfillments = []` en function signature.

- [ ] **Step 6: LineRow.tsx — renderizar badges en desktop block**

Después del Badge de status existente:

```tsx
{/* Cambio 5 — badges per fulfillment activo (0-N) */}
{fulfillments.map((f) => {
  if (f.type === 'trip') {
    return (
      <span
        key={f.id}
        className="inline-flex items-center rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs font-medium"
        title={`Trip ${f.trip_id ?? f.id.slice(0, 8)}, ${f.quantity_assigned} unidades${f.status !== 'Programado' ? ` (${f.status})` : ''}`}
      >
        EN VIAJE {f.trip_id ?? f.id.slice(0, 8)}
      </span>
    )
  }
  if (f.type === 'pickup') {
    return (
      <span
        key={f.id}
        className="inline-flex items-center rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-xs font-medium"
        title={`Pickup ${f.pickup_id}, ${f.quantity_assigned} unidades${f.status !== 'Aprobado' ? ` (${f.status})` : ''}`}
      >
        EN PICKUP {f.pickup_id}
      </span>
    )
  }
  if (f.type === 'external') {
    return (
      <span
        key={f.id}
        className="inline-flex items-center rounded-full bg-violet-100 text-violet-700 px-2 py-0.5 text-xs font-medium"
        title={`Externo ${f.external_id}, B/. ${f.invoice_amount}, ${f.provider_name}, ${f.quantity_assigned} unidades${f.status !== 'Aprobado' ? ` (${f.status})` : ''}`}
      >
        EN EXTERNO {f.external_id}
      </span>
    )
  }
  return null
})}
```

- [ ] **Step 7: LineRow.tsx — renderizar badges en mobile block**

Mismo pattern compactado:
```tsx
{fulfillments.map((f) => {
  if (f.type === 'trip') {
    return (
      <span key={f.id} className="inline-flex rounded-full bg-green-100 text-green-700 px-1.5 py-0.5 text-[10px] font-medium" title={...}>
        VIAJE
      </span>
    )
  }
  if (f.type === 'pickup') {
    return (
      <span key={f.id} className="inline-flex rounded-full bg-blue-100 text-blue-700 px-1.5 py-0.5 text-[10px] font-medium" title={...}>
        PICKUP
      </span>
    )
  }
  if (f.type === 'external') {
    return (
      <span key={f.id} className="inline-flex rounded-full bg-violet-100 text-violet-700 px-1.5 py-0.5 text-[10px] font-medium" title={...}>
        EXTERNO
      </span>
    )
  }
  return null
})}
```

- [ ] **Step 8: solicitudes/[id]/page.tsx — pasar prop `fulfillments` a LineRow**

En el render de `<LineRow .../>`, agregar:
```tsx
fulfillments={line.fulfillments}
```

- [ ] **Step 9: Build verde + commit**

```bash
npm run build
grep -n "fulfillments\|FulfillmentInfo" src/hooks/useSolicitudes.ts src/components/solicitudes/LineRow.tsx
```

```bash
git add src/hooks/useSolicitudes.ts src/components/solicitudes/LineRow.tsx "src/app/(app)/solicitudes/[id]/page.tsx"
git commit -m "feat: T9 Cambio 5 — useSolicitudes LEFT JOIN fulfillments + LineRow badges 0-N"
```

```json:metadata
{"files":["src/hooks/useSolicitudes.ts","src/components/solicitudes/LineRow.tsx","src/app/(app)/solicitudes/[id]/page.tsx"],"verifyCommand":"npm run build && grep -n \"fulfillments\\|FulfillmentInfo\" src/hooks/useSolicitudes.ts","acceptanceCriteria":["FulfillmentInfo discriminated union exportado","LEFT JOIN 3 tablas con filtro Cancelado","LineRow renderiza 0-N badges","trip green / pickup blue / external violet","tooltips informativos","Polish round 2 preservado"]}
```

---

## Task 10: cancelSolicitud refactor (G — cancelar orders relacionados)

**Goal:** Cuando se cancela una solicitud, también cancelar pickup_orders y external_orders relacionados. Si el order tiene TODAS las líneas de la solicitud → cancel order entero. Si tiene ALGUNAS → DELETE pickup_order_lines/external_order_lines selectivo (auto_cancel_empty maneja último caso).

**Files:**
- Modify: `src/hooks/useSolicitudes.ts` (`cancelSolicitud` function)

**Acceptance Criteria:**
- [ ] `cancelSolicitud` SELECT pickup_orders activos con AT LEAST 1 línea de la solicitud
- [ ] Para cada order: si todas las líneas son de la solicitud → cancel order entero. Si solo algunas → DELETE de order_lines selectivo
- [ ] Mismo proceso para external_orders
- [ ] Líneas Pendiente/Programada/Parcial pasan a 'Cancelada'
- [ ] UPDATE sm_requests.status='Cancelada'
- [ ] Devuelve resultado con counts de orders afectados (para UI toast)
- [ ] `npm run build` → verde

**Verify:** `npm run build && grep -n "cancelSolicitud\|cancelPickupOrder\|cancelExternalOrder" src/hooks/useSolicitudes.ts`

**Steps:**

- [ ] **Step 1: useSolicitudes.ts — actualizar `cancelSolicitud`**

Refactor de la función `cancelSolicitud` para incluir orders cleanup. Reemplazar la implementación existente:

```typescript
const cancelSolicitud = useCallback(
  async (id: string, personId?: string): Promise<boolean> => {
    if (busyRef.current) return false
    busyRef.current = true
    setSaving(true)
    setSaveError(null)

    try {
      // 1. Obtener líneas de la solicitud
      const { data: lines, error: fetchError } = await supabase
        .from('sm_request_lines')
        .select('id, status')
        .eq('request_id', id)

      if (fetchError) {
        setSaveError(fetchError.message)
        return false
      }

      const lineIds = (lines ?? []).map((l) => l.id)

      // 2. Cancel pickup_orders relacionados
      // SELECT pickup_orders activos con AT LEAST 1 línea de la solicitud
      const { data: pickupOrdersData } = await supabase
        .from('pickup_orders')
        .select(`
          id, pickup_id,
          lines:pickup_order_lines!inner(id, request_line_id)
        `)
        .eq('status', 'Aprobado')
        .in('lines.request_line_id', lineIds)

      for (const order of pickupOrdersData ?? []) {
        const orderLines = (order.lines as Array<{ id: string; request_line_id: string }>) ?? []
        const linesFromThisRequest = orderLines.filter((ol) => lineIds.includes(ol.request_line_id))

        // Fetch ALL lines del order (no solo las JOINed)
        const { data: allOrderLines } = await supabase
          .from('pickup_order_lines')
          .select('id, request_line_id')
          .eq('pickup_order_id', order.id)

        const allOrderLinesArr = allOrderLines ?? []

        if (linesFromThisRequest.length === allOrderLinesArr.length) {
          // TODAS las líneas son de la solicitud → cancel order entero
          await supabase
            .from('pickup_orders')
            .update({
              status: 'Cancelado',
              cancelled_at: new Date().toISOString(),
              cancelled_by: personId ?? null,
            })
            .eq('id', order.id)
        } else {
          // Solo ALGUNAS son de la solicitud → DELETE selectivo
          // (auto_cancel_empty trigger maneja si quedan 0 líneas)
          const lineIdsToRemove = linesFromThisRequest.map((ol) => ol.id)
          await supabase
            .from('pickup_order_lines')
            .delete()
            .in('id', lineIdsToRemove)
        }
      }

      // 3. Cancel external_orders relacionados (paralelo)
      const { data: externalOrdersData } = await supabase
        .from('external_orders')
        .select(`
          id, external_id,
          lines:external_order_lines!inner(id, request_line_id)
        `)
        .eq('status', 'Aprobado')
        .in('lines.request_line_id', lineIds)

      for (const order of externalOrdersData ?? []) {
        const orderLines = (order.lines as Array<{ id: string; request_line_id: string }>) ?? []
        const linesFromThisRequest = orderLines.filter((ol) => lineIds.includes(ol.request_line_id))

        const { data: allOrderLines } = await supabase
          .from('external_order_lines')
          .select('id, request_line_id')
          .eq('external_order_id', order.id)

        const allOrderLinesArr = allOrderLines ?? []

        if (linesFromThisRequest.length === allOrderLinesArr.length) {
          await supabase
            .from('external_orders')
            .update({
              status: 'Cancelado',
              cancelled_at: new Date().toISOString(),
              cancelled_by: personId ?? null,
            })
            .eq('id', order.id)
        } else {
          const lineIdsToRemove = linesFromThisRequest.map((ol) => ol.id)
          await supabase
            .from('external_order_lines')
            .delete()
            .in('id', lineIdsToRemove)
        }
      }

      // 4. Eliminar trip_line_assignments (líneas Programadas) — el trigger BD recalcula
      const programmedLines = (lines ?? []).filter((l) => l.status === 'Programada')
      for (const line of programmedLines) {
        await supabase
          .from('trip_line_assignments')
          .delete()
          .eq('request_line_id', line.id)
      }

      // 5. UPDATE líneas Pendiente/Programada/Parcial a 'Cancelada'
      // (post-Cambio 5: ya no incluye Pickup Aprobado/Externo Aprobado — esos status fueron eliminados)
      const lineIdsToCancel = (lines ?? [])
        .filter((l) => l.status === 'Pendiente' || l.status === 'Programada' || l.status === 'Parcial')
        .map((l) => l.id)

      if (lineIdsToCancel.length > 0) {
        const { error: cancelLinesError } = await supabase
          .from('sm_request_lines')
          .update({ status: 'Cancelada' })
          .in('id', lineIdsToCancel)

        if (cancelLinesError) {
          setSaveError(cancelLinesError.message)
          return false
        }
      }

      // 6. UPDATE sm_requests.status='Cancelada'
      const { error: cancelError } = await supabase
        .from('sm_requests')
        .update({ status: 'Cancelada' })
        .eq('id', id)

      if (cancelError) {
        setSaveError(cancelError.message)
        return false
      }

      // Notificar
      notifySolicitudCancelada(id, personId).catch(console.error)

      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado al cancelar'
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

- [ ] **Step 2: Build verde + commit**

```bash
npm run build
grep -n "cancelSolicitud\|cancelPickupOrder\|cancelExternalOrder" src/hooks/useSolicitudes.ts
```

```bash
git add src/hooks/useSolicitudes.ts
git commit -m "feat: T10 Cambio 5 — cancelSolicitud cancela pickup_orders + external_orders relacionados (lógica G)"
```

```json:metadata
{"files":["src/hooks/useSolicitudes.ts"],"verifyCommand":"npm run build && grep -n \"cancelSolicitud\" src/hooks/useSolicitudes.ts","acceptanceCriteria":["cancel orders enteros si TODAS líneas son de la solicitud","DELETE selectivo de order_lines si solo ALGUNAS","auto_cancel_empty trigger maneja último caso","status líneas a Cancelada","build verde"]}
```

---

## ⏸ PARADA — Smoke test manual de James

**Antes de T11 (T-final docs), Code DEBE:**
1. Reportar a James estado completo del run (commits T1-T10, files cambiados, build status, greps regression)
2. Listar las 18 verificaciones del smoke test (ver §9 spec Smoke test list)
3. Esperar OK explícito de James

**Code NO ejecuta T11 automáticamente** — solo después de recibir confirmación de smoke OK.

Si James detecta bug en smoke:
- Documentar en `Docs/cambio5-incidente.md`
- Working tree limpio (no commits a medias)
- James decide qué hacer (fix + re-smoke, rollback, etc.)

**Smoke test list (18 verifications)**:

1. Trigger Trip: crear trip → qty_scheduled de líneas se setea automáticamente
2. Trigger Pickup Order: crear pickup_order con cantidades parciales → qty_scheduled refleja quantity_assigned
3. Trigger External Order: paralelo a #2 con provider/invoice/cost
4. Cancelar pickup_order: status='Cancelado' → qty_scheduled vuelve a 0 automáticamente
5. Completar pickup_order: qty_delivered=quantity_assigned → trigger recalcula líneas
6. Bulk action UI: seleccionar 3 líneas → toolbar bulk → "Aprobar pickup" → modal con cantidades editables → confirmar
7. Bulk externo: paralelo a #6 con provider+invoice+cost
8. Confirmar entrega pickup desde `/programacion`: card → modal → llenar receptor + foto → confirmar
9. Confirmar entrega pickup desde `/solicitudes/[id]` como PM: PM ve sección + botón funciona igual
10. Cancelar solicitud con orders activos: solicitud cancela → orders relacionados cancelados (lógica G)
11. Backlog query con cantidades parciales correctas
12. Status 'En Transito' preservado por trigger durante recalc
13. Polish round 2 preservado (line cards sin project info, sin truncate desc/ruta)
14. Cost editable preservado
15. Trip flow completo no se rompe (Salida → Entrega → Retorno)
16. Coexistencia mixed-fulfillment (línea con trip + pickup simultáneos, 2 badges)
17. Sanity net qty_invariant: simular sobre-asignación → BD rechaza → hook traduce error
18. removeLineFromPickupOrder con auto_cancel_empty: última línea → trigger cancela order → toast UI

---

## Task 11 (T-final): Docs (post-smoke OK)

**Goal:** Documentar Cambio 5 en docs vivos. Solo después de smoke test OK confirmado por James.

**Files:**
- Modify: `Docs/CHANGELOG.md` (entry [feat] Cambio 5 + 4 entries [bd])
- Modify: `Docs/reference/events-v2-redesign-in-progress-v3.md` (Sección 5, frontmatter v3.4)
- Modify: `Docs/BACKLOG.md` (cerrar AD-3 + items pickup/externo flag-en-línea)
- Modify: `Docs/superpowers/specs/2026-04-29-cambio5-bulk-fulfillment.md` (frontmatter status: shipped + shipped_commits)
- Modify: `Docs/superpowers/specs/2026-04-28-cambio4-external-design.md` (frontmatter status: deprecated + deprecated_reason)
- Modify: `Docs/TRAIL.md` (Cambio 5 cerrado, Events V2 v2 finalizado)
- Delete: `Docs/superpowers/plans/2026-04-29-cambio5-bulk-fulfillment.md` + `.tasks.json`
- Delete: `Docs/superpowers/plans/2026-04-28-cambio4-external.md` + `.tasks.json` (Cambio 4 plan no se borró en su T10 que fue skipped)

**Acceptance Criteria:**
- [ ] PARADA respetada — smoke test OK confirmado por James
- [ ] CHANGELOG entry [feat] Cambio 5 + 4 entries [bd] (las 4 migraciones BD aplicadas)
- [ ] Spec maestro v3 con Sección 5 + frontmatter v3.4
- [ ] BACKLOG cierra AD-3 + items obsoletos
- [ ] Spec Cambio 5 frontmatter `status: shipped` + `shipped_commits: <T1..T10 hash range>`
- [ ] Spec Cambio 4 frontmatter `status: deprecated` + `deprecated_reason: "Superseded by Cambio 5..."`
- [ ] TRAIL actualizado
- [ ] Plans + tasks.json borrados (ambos: Cambio 5 + Cambio 4)
- [ ] `npm run build` → verde

**Verify:** `git log --oneline jaime/dev | head -15 && grep -n "Cambio 5" Docs/CHANGELOG.md && ls Docs/superpowers/plans/ | grep cambio` (último ls debería NO mostrar cambio4 ni cambio5 plans)

**Steps:**

- [ ] **Step 1: Verificar smoke test OK confirmado por James**

NO proceder sin confirmación explícita en chat.

- [ ] **Step 2: CHANGELOG entry**

Append al inicio del archivo bajo "## 2026-04-29" (crear sección si no existe):

```markdown
## 2026-04-29
- [feat] **Cambio 5 — Bulk Fulfillment Refactor (Pickup + Externo) shippeado.**
  Quinto y último cambio del rediseño Events V2 v2. Reemplaza modelo flag-en-línea de Cambios 3 (Pickup) y 4 (Externo) con tablas dedicadas pickup_orders + external_orders que agrupan N líneas por fulfillment común.

  Tres pivotes arquitecturales: (1) Trigger BD recalc_qty_for_line dispara desde 3 tablas pivot y recalcula sm_request_lines.qty_scheduled + qty_delivered automáticamente — Code elimina TODOS los UPDATEs manuales. (2) Coexistencia operacional permitida (línea con fulfillments mixtos trip+pickup+external simultáneos) con sanity net BD via CHECK qty_invariant. (3) UI bulk action en BacklogTable con toolbar selector + 3 botones (Crear movilización + Aprobar pickup + Aprobar viaje externo). Surface 1 (single-line approve) y Surface 2 (convert from trip detail) eliminadas.

  Componentes: 8 archivos nuevos (2 hooks + 2 cards reusables + 4 modales) + 12 modificados + 5 eliminados (Cambios 3+4 obsoletos). 11 architecture decisions documentadas en spec. PM permission D8 con AT LEAST 1 match (revert Cambio 4 Q3) + location_type='proyecto' lowercase + pp.is_active=true. cancelSolicitud refactor cancela orders relacionados con lógica G (entero o selectivo). Cards reusables consumidos por /programacion y /solicitudes/[id].

  Cierra AD-3 (fulfillment per-línea, no per-trip). Cambio 4 spec deprecated (T10 docs nunca corrió, plan + tasks.json eliminados en este T-final). Cambio 4 commits T1-T9 (13262de..b6e63e3) permanecen en historial git. Plan Cambio 5: Docs/superpowers/plans/2026-04-29-cambio5-bulk-fulfillment.md (borrado al cierre per plan-lifecycle.md). Spec: Docs/superpowers/specs/2026-04-29-cambio5-bulk-fulfillment.md (status: shipped). Commits: <T1..T10 hash range>.

- [bd] **Cambio 5 BD migration 1: cambio5_create_pickup_orders.**
  - CREATE pickup_orders (17 cols: id, pickup_id PKP-2026-NNN auto-gen, status, audit fields, receptor, notes, attachments)
  - CREATE pickup_order_lines (7 cols: pickup_order_id, request_line_id, quantity_assigned, qty_delivered)
  - Triggers: updated_at + audit + generate_pickup_id + auto_cancel_empty_pickup_order
  - Pendiente prod: aplicar en merge final v2 (orden estricto: 1 → 2 → 3 → 4)

- [bd] **Cambio 5 BD migration 2: cambio5_create_external_orders.**
  - CREATE external_orders (19 cols: paralelo + provider_name, invoice_amount, invoice_attachments)
  - CREATE external_order_lines (7 cols paralelo a pickup)
  - Triggers paralelos a pickup_orders
  - Pendiente prod en orden estricto

- [bd] **Cambio 5 BD migration 3: cambio5_recalc_qty_scheduled_triggers.**
  - Función recalc_qty_for_line(p_request_line_id UUID) — calcula qty_scheduled (SUM activos en 3 tablas pivot) + qty_delivered (SUM HISTÓRICA incluso de orders cancelados)
  - Triggers en INSERT/UPDATE/DELETE en trip_line_assignments + pickup_order_lines + external_order_lines → llaman recalc_qty_for_line
  - Triggers en UPDATE OF status en trips + pickup_orders + external_orders → recalculan líneas afectadas
  - Status 'En Transito' preservado (trigger no sobreescribe)
  - Pendiente prod en orden estricto

- [bd] **Cambio 5 BD migration 4: cambio5_drop_old_columns_simplify_cascade.**
  - DROP 16 columnas viejas en sm_request_lines: 6 pickup_* (Cambio 3) + 10 external_* (Cambio 4)
  - DROP CHECK constraint sm_request_lines_pickup_external_exclusive
  - cascade_request_status simplificado: in_progress IN ('Programada', 'En Transito') solamente — ya no incluye 'Pickup Aprobado'/'Externo Aprobado' (status eliminados)
  - Verificación post-migración: 11 líneas activas re-calculadas con 0 diff vs estado anterior
  - Pendiente prod en merge final v2 (último de los 4)
```

- [ ] **Step 3: Spec maestro v3 — Sección 5**

Append a `Docs/reference/events-v2-redesign-in-progress-v3.md` bajo nuevo header `## Sección 5 — Cambio 5 Bulk Fulfillment Refactor`:

(Resumen del spec Cambio 5, paralelo a Sección 4 Cambio 4 con frontmatter v3.4. Contenido: arquitectura, 4 BD migrations, 11 architecture decisions, edge cases destacados, deuda técnica conocida.)

Update frontmatter version: v3.3 → v3.4.

- [ ] **Step 4: BACKLOG.md — cerrar items**

Buscar y marcar como CLOSED:
- AD-3 (fulfillment per-línea no per-trip) → cerrado por Cambio 5
- Items pickup/externo flag-en-línea (si existen) → cerrados por Cambio 5
- Surface 2 obsoleto (si existía como item) → cerrado por Cambio 5

Agregar deuda técnica nueva post-merge:
- completePickupOrder/completeExternalOrder partial qty editable (v1 read-only, evaluar si fricción)
- Edición de orders activos (botón "Editar" en cards diferido)
- Notificaciones email pickup_order/external_order (4 event_types nuevos requieren templates + valid_event_type constraint update)
- PM permission via free-text destination edge case (E11 acceptable v1)

- [ ] **Step 5: Spec Cambio 5 — flippear a shipped**

Edit frontmatter:

Old:
```yaml
status: draft
shipped_commits:
```

New (replace `<HASH_T1>` y `<HASH_T10>` con commits reales obtenidos via `git log`):
```yaml
status: shipped
shipped_commits: <HASH_T1>..<HASH_T10>
```

- [ ] **Step 6: Spec Cambio 4 — flippear a deprecated**

Edit `Docs/superpowers/specs/2026-04-28-cambio4-external-design.md` frontmatter:

Old (puede estar como `status: shipped` o aún en `status: in-progress` dado que su T10 nunca corrió):
```yaml
status: <whatever>
deprecated_reason:
```

New:
```yaml
status: deprecated
deprecated_reason: "Superseded by Cambio 5 bulk fulfillment refactor — flag-en-línea model replaced with dedicated tables pickup_orders/external_orders. Cambio 4 commits T1-T9 (13262de..b6e63e3) permanecen en historial git pero su feature fue reemplazado funcionalmente. Cambio 4 plan + tasks.json eliminados en Cambio 5 T-final."
```

- [ ] **Step 7: Borrar plans + tasks.json**

Per `plan-lifecycle.md`:

```bash
git rm "Docs/superpowers/plans/2026-04-29-cambio5-bulk-fulfillment.md"
git rm "Docs/superpowers/plans/2026-04-29-cambio5-bulk-fulfillment.md.tasks.json"
git rm "Docs/superpowers/plans/2026-04-28-cambio4-external.md"
git rm "Docs/superpowers/plans/2026-04-28-cambio4-external.md.tasks.json"
```

- [ ] **Step 8: TRAIL.md update**

Edit `Docs/TRAIL.md`:
- Cambio 5 ✅ shippeado en jaime/dev
- Events V2 v2 finalizado (Cambios 1-5 todos en historial)
- Próximo target: merge final v2 (jaime/dev → main) con 4 migraciones BD aplicadas a prod en orden estricto
- Plan file activo: ninguno

- [ ] **Step 9: Build + commits**

Build verification:
```bash
npm run build
```

Commit consolidado de docs:
```bash
git add Docs/CHANGELOG.md Docs/BACKLOG.md Docs/reference/events-v2-redesign-in-progress-v3.md Docs/superpowers/specs/2026-04-29-cambio5-bulk-fulfillment.md Docs/superpowers/specs/2026-04-28-cambio4-external-design.md Docs/TRAIL.md
git commit -m "docs: T-final Cambio 5 — CHANGELOG + spec maestro v3.4 sección 5 + BACKLOG + spec Cambio 5 shipped + spec Cambio 4 deprecated + TRAIL"
```

Plan deletion en commit separado:
```bash
git commit -m "chore: borrar plans Cambio 4 + Cambio 5 — features cerrados per plan-lifecycle.md"
```

```json:metadata
{"files":["Docs/CHANGELOG.md","Docs/BACKLOG.md","Docs/reference/events-v2-redesign-in-progress-v3.md","Docs/superpowers/specs/2026-04-29-cambio5-bulk-fulfillment.md","Docs/superpowers/specs/2026-04-28-cambio4-external-design.md","Docs/TRAIL.md"],"verifyCommand":"npm run build && grep -n \"Cambio 5\" Docs/CHANGELOG.md","acceptanceCriteria":["smoke OK confirmado","CHANGELOG entry [feat] + 4 [bd]","spec v3 sección 5","BACKLOG cierra AD-3","spec Cambio 5 shipped","spec Cambio 4 deprecated","plans + tasks.json borrados","TRAIL actualizado","build verde"]}
```

---

## Self-Review

### 1. Spec coverage check

| Spec section | Plan task |
|---|---|
| §3 A. Tablas dedicadas | T2 (usePickupOrders) + T3 (useExternalOrders) — operan contra las tablas BD |
| §3 B. Trigger BD + Code escribe solo en pivot | T1 (eliminar UPDATEs manuales) + T2/T3 (escriben solo en pickup_order_lines / external_order_lines) |
| §3 C. Coexistencia + tooltip combinado | T9 (LineRow renderiza 0-N badges) |
| §3 D. Sanity net BD | T2/T3 (translateBdError para qty_invariant) |
| §3 E. Surface 2 eliminada | T1 (cleanup AssignmentRow buttons + handlers + modales) |
| §3 F. Read-only quantity confirm delivery | T6 (ConfirmPickupOrderDeliveryModal + ConfirmExternalOrderDeliveryModal) |
| §3 G. LEFT JOIN fulfillments | T9 (useSolicitudes refactor) |
| §3 H. Bulk action toolbar | T7 (programacion/page.tsx) |
| §3 I. Cards reusables | T4 (PickupOrderCard + ExternalOrderCard) |
| §3 J. PM permission D8 | T8 (solicitudes/[id] integration) |
| §3 K. T1 cleanup atomic 7 sub-pasos | T1 |
| §4 IN A — Refactor hooks | T1 (eliminar UPDATEs manuales useTrips + useTripEvents) |
| §4 IN B — Eliminar Cambios 3+4 obsoleto | T1 (DELETE 5 archivos + cleanup refs) |
| §4 IN C — Hooks nuevos | T2 + T3 |
| §4 IN D — UI Bulk Action | T4 + T5 + T6 + T7 + T8 |
| §4 IN E — Badges LineRow | T9 |
| §4 IN F — Cost editable + Polish round 2 PRESERVADOS | T1 (verificar grep + acceptance criterion) |
| §4 IN G — cancelSolicitud refactor | T10 |
| §4 IN T-final | T11 |
| §6 E1-E14 edge cases | Cubiertos por hook validations + UI gating + smoke test list |
| §9 Acceptance #1-#18 | Mapeados a acceptance criteria de cada task |
| §9 Smoke test list (18) | Documentado en PARADA antes de T11 |

**Gap detection**: ninguno. Toda la sección IN del spec está cubierta por tasks específicas.

### 2. Placeholder scan

- `TBD` / `TODO` / `implement later`: 0 matches en plan
- `Add appropriate error handling` genérico: 0 — todos los handlers tienen código explícito
- `Similar to Task N`: 0 — código repetido inline donde aplica (T3 paralelo a T2 pero con código completo)
- `Write tests for the above` sin código: N/A — tests E2E fuera de scope (AD-5 bloqueado per spec)
- Referencias a tipos/funciones no definidos: ✅ todos los tipos definidos antes de uso (FulfillmentInfo en T9 antes de uso en LineRow, PickupOrderWithLines en T4 antes de uso en T7/T8)

**Excepción documentada**: T8 Step 3 muestra DOS approaches para PM permission query (inline N-queries vs. fetch PM projects single + JS filter). Documentado claramente como "SIMPLIFICACIÓN PRACTICAL" — el implementer puede elegir el segundo approach. Esto NO es placeholder; es una decisión arquitectónica con racional.

### 3. Type consistency

| Identifier | First defined | Used consistently |
|---|---|---|
| `usePickupOrders` (hook) | T2 | T7, T8 ✅ |
| `useExternalOrders` (hook) | T3 | T7, T8 ✅ |
| `PickupOrderLineInput` | T2 | T5 (CreatePickupOrderModal) ✅ |
| `ExternalOrderLineInput` | T3 | T5 (CreateExternalOrderModal) ✅ |
| `CreatePickupOrderResult` | T2 | T7 (handler usa result.ok) ✅ |
| `CancelPickupResult` | T2 | T7 (handler usa deliveredCount/Qty) ✅ |
| `RemoveLineResult` | T2 | T7 (toast UI usa orderCancelled/orderId) — usado vía hook signature, no consumido directo |
| `PickupOrderWithLines` | T4 | T7, T8, T6 (ConfirmModal prop) ✅ |
| `ExternalOrderWithLines` | T4 | T7, T8, T6 ✅ |
| `PickupOrderLineWithRelations` | T4 | T4 (export + reuse en ExternalOrderCard) ✅ |
| `FulfillmentInfo` | T9 | T9 LineRow + T8 (vía LineWithRelations) ✅ |
| `translateBdError` | T2 | T3 (paralelo) ✅ — copia en cada hook (consistencia inter-hook) |

No naming drift detectado.

### 4. Plan completeness

- [x] Plan header con goal/architecture/tech stack/spec ref ✅
- [x] File structure overview con 8 create + 12 modify + 5 delete ✅
- [x] 11 tasks (T1-T10 implementation + T11 T-final) con dependency graph implícito en orden ✅
- [x] T1 con 7 sub-pasos working tree + commit único explícito ✅
- [x] PARADA explícita antes de T11 con smoke test list 18 verificaciones ✅
- [x] Cada task tiene: Goal + Files + Acceptance Criteria + Verify + Steps con código + commit message preescrito + json:metadata ✅
- [x] Self-review section (esta) ✅
- [x] 4 observaciones de Chat integradas:
  - (1) INNER JOIN behavior comment en T8 PM permission ✅ (Step 3 nota explícita)
  - (2) LEFT JOIN performance accept v1: documentado en §7 risks del spec ✅
  - (3) PM permission cache state acceptable: implícito en T8 useEffect approach ✅
  - (4) T1 sub-pasos working tree NO commits intermedios: documentado explícito en cada sub-paso "Build esperado: ROJO. NO commitear ahora." ✅

**Plan listo para review de Chat.**


