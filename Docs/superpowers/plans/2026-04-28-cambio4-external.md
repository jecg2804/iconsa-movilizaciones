# Cambio 4 — Viaje Externo + UI Polish round 2 + Costo Trip Editable

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar viaje externo como modelo bandera-en-línea (gemelo de Pickup Cambio 3), limpiar line cards (Polish round 2), y revertir J6 para hacer costo del trip editable con tarifa.

**Architecture:** Hook `useExternal` espejo de `usePickup` con 4 funciones (approve/convert/complete/revert), 3 UI surfaces (BacklogTable, AssignmentRow, sección "Viajes Externos Pendientes"), `ExternalApprovalForm` shared consumido por modales inline en pages, `ExternalDeliveryModal` componente nuevo. Polish round 2 elimina project info + cost code/category + truncate de descripción/ruta en TODAS las line cards. Cost editable es one-line fix en `TripForm.tsx:408`.

**Tech Stack:** Next.js 16 (App Router) + TypeScript ES2022 strict, Supabase (read-only Code), Tailwind CSS, lucide-react icons. BD aplicada por Chat (10 columnas externo + CHECK constraint mutuamente excluyente con pickup + DROP `trips.is_external` + cascade_request_status updated).

**Spec ref:** `Docs/superpowers/specs/2026-04-28-cambio4-external-design.md` (aprobado por Chat, commit `4ed5348`).

---

## File structure overview

### Create new (3 files)

| File | Responsibility |
|---|---|
| `src/hooks/useExternal.ts` | 4 funciones para operaciones externo (espejo de `usePickup.ts`) |
| `src/components/programacion/ExternalApprovalForm.tsx` | Form fields puros (provider + cost + factura + notas) reusado por Surface 1 y Surface 2 modales |
| `src/components/programacion/ExternalDeliveryModal.tsx` | Modal Surface 3 confirmar entrega externo |

### Modify (~13 files)

| File | Cambios |
|---|---|
| `src/lib/types/database.ts` | Regen post-BD (10 columnas externo + DROP is_external) |
| `src/hooks/useTrips.ts` | Remove `is_external` de TripInput, mappers, queries, INSERT/UPDATE |
| `src/hooks/useSolicitudes.ts` | `cancelSolicitud` filter incluye `'Externo Aprobado'` |
| `src/components/programacion/TripForm.tsx` | Remove checkbox isExternal + state + handler + prop; cost editable fix línea 408 |
| `src/components/programacion/BacklogTable.tsx` | Surface 1 button "Aprobar viaje externo" + Polish round 2 |
| `src/components/programacion/LineSelector.tsx` | Polish round 2 (project.name + truncate) |
| `src/components/solicitudes/LineRow.tsx` | Badges externo + Polish round 2 |
| `src/components/viajes/TripCard.tsx` | Polish round 2 (verificar cleanup is_external si existe) |
| `src/app/(app)/programacion/page.tsx` | Surface 1 modal inline + Surface 3 sección + handlers + state |
| `src/app/(app)/programacion/viaje/[id]/page.tsx` | Surface 2 modal inline + AssignmentRow Polish + remove is_external de tripToInput |
| `src/app/(app)/programacion/viaje/nuevo/page.tsx` | Remove is_external state |
| `src/app/(app)/mis-viajes/[id]/page.tsx` | Polish round 2 AssignmentRow inline |
| `src/app/(app)/solicitudes/[id]/page.tsx` | Pass externalInfo prop a LineRow |

---

## Task 1: Regen `database.ts` + cleanup completo `is_external`

**Goal:** Regenerar tipos Supabase desde staging (incluye 10 columnas externo + DROP `trips.is_external`) y eliminar todas las referencias a `is_external`/`isExternal` del código en mismo commit para mantener build verde.

**Files:**
- Modify: `src/lib/types/database.ts` (regen completo)
- Modify: `src/hooks/useTrips.ts` (TripInput interface + mapTripRow + fetchTrip + saveTrip + updateTrip)
- Modify: `src/components/programacion/TripForm.tsx` (state, handler, prop interface, checkbox bloque, propagate)
- Modify: `src/app/(app)/programacion/viaje/[id]/page.tsx` (tripToInput + state initialization + initialData passthrough)
- Modify: `src/app/(app)/programacion/viaje/nuevo/page.tsx` (state initialization)

**Acceptance Criteria:**
- [ ] `database.ts` regenerado desde staging — contiene 10 columnas externo en `sm_request_lines` + `trips` ya no tiene `is_external`
- [ ] `grep -rn "is_external" src/ tests/` → 0 matches
- [ ] `grep -rn "isExternal" src/ tests/` → 0 matches
- [ ] `npm run build` → verde
- [ ] Sin regresiones funcionales: TripForm en modo create + edit funciona, viaje nuevo guarda OK, viaje edit guarda OK

**Verify:** `grep -rn "is_external\|isExternal" src/ tests/ && npm run build`

**Steps:**

- [ ] **Step 1: Regenerar `database.ts` desde staging**

```bash
npx supabase gen types typescript --project-id vonwkciosksqspyljzfy > src/lib/types/database.ts
```

Expected output: archivo regenerado, sin errores, ~3000+ líneas. Verificar con `grep` que las nuevas columnas externo aparecen y `is_external` ya no aparece en `trips`:

```bash
grep -A1 "external_by_provider" src/lib/types/database.ts | head -5
grep "is_external" src/lib/types/database.ts
```

Expected:
- Primer grep: muestra el campo en Row/Insert/Update de `sm_request_lines`
- Segundo grep: 0 matches

- [ ] **Step 2: Cleanup `useTrips.ts` — TripInput interface**

Edit `src/hooks/useTrips.ts` líneas 122-135 (TripInput interface):

Old (con is_external):
```typescript
export interface TripInput {
  scheduled_date: string
  scheduled_time: string | null
  driver_id: string | null
  vehicle_id: string | null
  trailer_id: string | null
  rate_id: string | null
  cost: number | null
  att_permit: boolean
  escort: boolean
  notes: string | null
  is_external: boolean
  attachments?: unknown[] | null
}
```

New (sin is_external):
```typescript
export interface TripInput {
  scheduled_date: string
  scheduled_time: string | null
  driver_id: string | null
  vehicle_id: string | null
  trailer_id: string | null
  rate_id: string | null
  cost: number | null
  att_permit: boolean
  escort: boolean
  notes: string | null
  attachments?: unknown[] | null
}
```

- [ ] **Step 3: Cleanup `useTrips.ts` — TripWithRelations interface línea 110**

Old: `is_external: boolean | null`
New: (línea eliminada — `is_external` no debe aparecer en TripWithRelations)

- [ ] **Step 4: Cleanup `useTrips.ts` — mapTripRow línea 286**

Old: `is_external: (row.is_external as boolean | null) ?? null,`
New: (línea eliminada)

- [ ] **Step 5: Cleanup `useTrips.ts` — fetchTrip línea 782**

Old: `is_external: (row.is_external as boolean | null) ?? null,`
New: (línea eliminada)

- [ ] **Step 6: Cleanup `useTrips.ts` — saveTrip línea ~835**

En el `.insert({...})` del trip, eliminar la línea `is_external: input.is_external,`.

- [ ] **Step 7: Cleanup `useTrips.ts` — updateTrip línea ~957**

En el `.update({...})` del trip, eliminar la línea `is_external: input.is_external,`.

- [ ] **Step 8: Cleanup `TripForm.tsx` — interface initialData línea 47**

Eliminar `isExternal: boolean` de la interface `TripFormProps.initialData`.

- [ ] **Step 9: Cleanup `TripForm.tsx` — state + handler líneas 124-126, 261-268**

Eliminar:
```typescript
const [isExternal, setIsExternal] = useState<boolean>(
  initialData?.isExternal ?? false,
)
```

Y el handler:
```typescript
const handleExternalChange = useCallback(
  (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.checked
    setIsExternal(val)
    propagate({ is_external: val })
  },
  [propagate],
)
```

- [ ] **Step 10: Cleanup `TripForm.tsx` — propagate línea 145**

En el objeto `data: TripInput`, eliminar la línea:
```typescript
is_external: overrides?.is_external !== undefined ? overrides.is_external : isExternal,
```

Y eliminar `isExternal` del array de dependencies del `useCallback`.

- [ ] **Step 11: Cleanup `TripForm.tsx` — checkbox bloque líneas 442-454**

Eliminar todo el bloque del label/checkbox "Viaje externo":

```jsx
{/* Viaje externo (conductor/empresa externa) */}
<label className="flex items-center gap-2 cursor-pointer">
  <input
    type="checkbox"
    checked={isExternal}
    onChange={handleExternalChange}
    disabled={fieldsDisabled}
    className="rounded border-gray-300 text-navy focus:ring-navy disabled:cursor-not-allowed"
  />
  <span className="text-sm font-medium text-gray-700">
    Viaje externo
  </span>
</label>
```

- [ ] **Step 12: Cleanup `viaje/[id]/page.tsx` — tripToInput línea 53**

Eliminar línea: `is_external: trip.is_external ?? false,`

- [ ] **Step 13: Cleanup `viaje/[id]/page.tsx` — initial state línea 331**

En el `useState<TripInput>({...})`, eliminar la línea `is_external: false,`.

- [ ] **Step 14: Cleanup `viaje/[id]/page.tsx` — TripForm initialData línea 792**

Eliminar línea: `isExternal: trip.is_external ?? false,`

- [ ] **Step 15: Cleanup `viaje/nuevo/page.tsx` — state initialization**

Buscar `is_external: false` en el state inicial del TripInput y eliminar. Buscar `isExternal: false` en el initialData del TripForm y eliminar.

```bash
grep -n "is_external\|isExternal" src/app/\(app\)/programacion/viaje/nuevo/page.tsx
```

Eliminar todas las refs encontradas.

- [ ] **Step 16: Build local verde**

```bash
npm run build
```

Expected: build pass, no TypeScript errors. Si falla por refs a `is_external` que no detecté, agregar al cleanup y reintentar.

- [ ] **Step 17: Grep regression**

```bash
grep -rn "is_external" src/ tests/
grep -rn "isExternal" src/ tests/
```

Expected: 0 matches en ambos.

- [ ] **Step 18: Commit**

```bash
git add src/lib/types/database.ts src/hooks/useTrips.ts src/components/programacion/TripForm.tsx "src/app/(app)/programacion/viaje/[id]/page.tsx" "src/app/(app)/programacion/viaje/nuevo/page.tsx"
git commit -m "$(cat <<'EOF'
feat: T1 Cambio 4 — regen database.ts + cleanup is_external

Regenera tipos desde staging post-cambio4_external_provider_redesign +
cambio4_external_add_received_by_columns. Incluye:
- 10 columnas externo en sm_request_lines
- DROP trips.is_external
- CHECK constraint sm_request_lines_pickup_external_exclusive
- cascade_request_status acepta 'Externo Aprobado' como in_progress

Cleanup completo del modelo viejo en código (5 archivos):
- TripInput sin is_external
- TripWithRelations sin is_external
- TripForm sin checkbox + state + handler + prop
- viaje/[id] tripToInput + initial state
- viaje/nuevo state initialization

grep -rn "is_external|isExternal" src/ tests/ → 0 matches.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

```json:metadata
{"files":["src/lib/types/database.ts","src/hooks/useTrips.ts","src/components/programacion/TripForm.tsx","src/app/(app)/programacion/viaje/[id]/page.tsx","src/app/(app)/programacion/viaje/nuevo/page.tsx"],"verifyCommand":"grep -rn \"is_external\\|isExternal\" src/ tests/ && npm run build","acceptanceCriteria":["database.ts regenerado","0 matches grep is_external/isExternal","npm run build verde","TripForm sin checkbox isExternal","viajes nuevo+edit guardan OK"]}
```

---

## Task 2: Hook `useExternal.ts` con 4 funciones espejo

**Goal:** Implementar hook centralizado para operaciones externo, paralelo a `usePickup.ts`. Expone `approveExternal`, `convertLineToExternal`, `completeExternal`, `revertExternalToBacklog`. UPDATE atómicos con WHERE clauses defensivas. Error messages actionable para CHECK constraint pickup/external.

**Files:**
- Create: `src/hooks/useExternal.ts`

**Acceptance Criteria:**
- [ ] Hook exporta 4 funciones + tipos `ApproveExternalResult`, `ConvertLineExternalResult`, `CompleteExternalResult`, `RevertExternalResult`
- [ ] Validación campos obligatorios en `approveExternal`/`convertLineToExternal`: provider trim != '', amount > 0 estricto, attachments.length >= 1
- [ ] `convertLineToExternal` bloquea si `qty_delivered > 0`
- [ ] `revertExternalToBacklog` UPDATE atomic con WHERE `status='Externo Aprobado' AND external_completed_at IS NULL` defensivo
- [ ] `revertExternalToBacklog` setea NULL todos los external_* EXCEPTO `external_invoice_attachments`
- [ ] `completeExternal` append notes con formato `[Entrega <ISO>] <new>`; attachments concat `[...existing, ...new]`
- [ ] `completeExternal` persiste receptor en `external_received_by_id` y `external_received_by_name` (no XOR — pueden ser NULL)
- [ ] CHECK constraint error traducido a "La línea ya tiene un fulfillment asignado. Refresca la página."
- [ ] `npm run build` → verde

**Verify:** `npm run build && grep -n "approveExternal\|convertLineToExternal\|completeExternal\|revertExternalToBacklog" src/hooks/useExternal.ts`

Expected: build verde + 4 matches (uno por función exportada).

**Steps:**

- [ ] **Step 1: Crear `src/hooks/useExternal.ts` con contenido completo**

```typescript
'use client'

import { useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Attachment } from '@/lib/supabase/storage'

export interface ApproveExternalResult {
  ok: boolean
  error?: string
}

export interface ConvertLineExternalResult {
  ok: boolean
  tripCancelled?: boolean
  error?: string
}

export interface CompleteExternalResult {
  ok: boolean
  error?: string
}

export interface RevertExternalResult {
  ok: boolean
  error?: string
}

/**
 * Traduce errores BD a mensajes user-friendly. CHECK constraint
 * sm_request_lines_pickup_external_exclusive se triggerea en concurrencia
 * (2 sesiones de Charris en misma línea) — error PostgreSQL críptico se
 * convierte a mensaje accionable.
 */
function translateBdError(message: string): string {
  if (message.includes('sm_request_lines_pickup_external_exclusive')) {
    return 'La línea ya tiene un fulfillment asignado. Refresca la página.'
  }
  return message
}

/**
 * Hook de operaciones externo (Cambio 4) — gemelo de usePickup.
 * Externo es bandera a nivel de línea (sm_request_lines.external_by_provider),
 * mutuamente excluyente con pickup_by_project (CHECK constraint BD).
 *
 * 4 funciones:
 * - approveExternal: línea Pendiente → Externo Aprobado (sin trip)
 * - convertLineToExternal: línea Programada → Externo Aprobado (DELETE
 *   assignment + UPDATE atómico; auto-cancela trip si era última línea)
 * - completeExternal: Externo Aprobado → Entregada (con receptor opcional,
 *   notas opcionales, attachments opcionales appended)
 * - revertExternalToBacklog: Externo Aprobado → Pendiente (preserva
 *   external_invoice_attachments)
 */
export function useExternal() {
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Aprueba viaje externo desde el backlog (línea Pendiente).
   * Validación: línea status='Pendiente', precondición pickup_by_project=false.
   * UPDATE atómico con WHERE defensivo. cascade_request_status actualiza
   * sm_requests.status a 'En Proceso' automáticamente.
   */
  const approveExternal = useCallback(
    async (
      lineId: string,
      charrisId: string,
      providerName: string,
      invoiceAmount: number,
      invoiceAttachments: Attachment[],
      notes: string | null,
    ): Promise<ApproveExternalResult> => {
      setLoading(true)
      setError(null)

      try {
        // Validación campos obligatorios
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
          const msg = 'Adjuntá al menos una cotización o factura.'
          setError(msg)
          return { ok: false, error: msg }
        }

        const now = new Date().toISOString()

        const { data, error: updateError } = await supabase
          .from('sm_request_lines')
          .update({
            status: 'Externo Aprobado',
            external_by_provider: true,
            external_approved_at: now,
            external_approved_by: charrisId,
            external_provider_name: providerName.trim(),
            external_invoice_amount: invoiceAmount,
            external_invoice_attachments: JSON.parse(JSON.stringify(invoiceAttachments)),
            external_notes: notes?.trim() || null,
          })
          .eq('id', lineId)
          .eq('status', 'Pendiente')
          .eq('pickup_by_project', false)
          .select('id')

        if (updateError) {
          const friendly = translateBdError(updateError.message)
          setError(friendly)
          return { ok: false, error: friendly }
        }

        if (!data || data.length === 0) {
          const msg = 'La línea ya no está disponible para aprobar como externo (puede haber cambiado de estado).'
          setError(msg)
          return { ok: false, error: msg }
        }

        return { ok: true }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al aprobar viaje externo'
        setError(message)
        return { ok: false, error: message }
      } finally {
        setLoading(false)
      }
    },
    [supabase],
  )

  /**
   * Convierte una línea Programada a Externo Aprobado.
   * - Bloquea si qty_delivered > 0 (E2).
   * - DELETE assignment, UPDATE línea atómico (status + flags + qty_scheduled).
   * - Si trip queda con 0 assignments → cancela trip.
   *
   * NOTA deuda técnica: DELETE + UPDATE NO es atómico server-side.
   * Riesgo bajo v1 (1 Charris operando, sin concurrencia). Polish post-merge:
   * convertir a RPC SQL con SECURITY DEFINER y transacción.
   */
  const convertLineToExternal = useCallback(
    async (
      lineId: string,
      assignmentId: string,
      quantityAssigned: number,
      tripId: string,
      charrisId: string,
      providerName: string,
      invoiceAmount: number,
      invoiceAttachments: Attachment[],
      notes: string | null,
    ): Promise<ConvertLineExternalResult> => {
      setLoading(true)
      setError(null)

      try {
        // Validación campos obligatorios
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
          const msg = 'Adjuntá al menos una cotización o factura.'
          setError(msg)
          return { ok: false, error: msg }
        }

        // 1. Validar: qty_delivered debe ser 0 + pickup_by_project debe ser false
        const { data: line, error: fetchError } = await supabase
          .from('sm_request_lines')
          .select('qty_delivered, qty_scheduled, quantity, pickup_by_project')
          .eq('id', lineId)
          .single()

        if (fetchError || !line) {
          const msg = fetchError?.message ?? 'Línea no encontrada'
          setError(msg)
          return { ok: false, error: msg }
        }

        const qtyDelivered = line.qty_delivered ?? 0
        if (qtyDelivered > 0) {
          const msg = `No se puede convertir a externo una línea con entregas previas registradas (${qtyDelivered} de ${line.quantity} entregado). Cancelá la línea o terminá el flow actual.`
          setError(msg)
          return { ok: false, error: msg }
        }

        if (line.pickup_by_project) {
          const msg = 'La línea ya está aprobada como pickup. No se puede convertir a externo.'
          setError(msg)
          return { ok: false, error: msg }
        }

        // 2. DELETE assignment
        const { error: deleteError } = await supabase
          .from('trip_line_assignments')
          .delete()
          .eq('id', assignmentId)

        if (deleteError) {
          setError(deleteError.message)
          return { ok: false, error: deleteError.message }
        }

        // 3. UPDATE línea atómico
        const newQtyScheduled = Math.max(0, (line.qty_scheduled ?? 0) - quantityAssigned)
        const now = new Date().toISOString()

        const { error: updateError } = await supabase
          .from('sm_request_lines')
          .update({
            status: 'Externo Aprobado',
            external_by_provider: true,
            external_approved_at: now,
            external_approved_by: charrisId,
            external_provider_name: providerName.trim(),
            external_invoice_amount: invoiceAmount,
            external_invoice_attachments: JSON.parse(JSON.stringify(invoiceAttachments)),
            external_notes: notes?.trim() || null,
            qty_scheduled: newQtyScheduled,
          })
          .eq('id', lineId)

        if (updateError) {
          const friendly = translateBdError(updateError.message)
          setError(friendly)
          return { ok: false, error: friendly }
        }

        // 4. Verificar si el trip quedó sin assignments
        const { count: remainingCount, error: countError } = await supabase
          .from('trip_line_assignments')
          .select('id', { count: 'exact', head: true })
          .eq('trip_id', tripId)

        if (countError) {
          console.warn('[useExternal] No se pudo verificar count de assignments:', countError.message)
          return { ok: true, tripCancelled: false }
        }

        if ((remainingCount ?? 0) === 0) {
          const { error: cancelError } = await supabase
            .from('trips')
            .update({ status: 'Cancelado' })
            .eq('id', tripId)

          if (cancelError) {
            console.warn('[useExternal] No se pudo cancelar trip vacío:', cancelError.message)
            return { ok: true, tripCancelled: false }
          }

          return { ok: true, tripCancelled: true }
        }

        return { ok: true, tripCancelled: false }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al convertir línea a externo'
        setError(message)
        return { ok: false, error: message }
      } finally {
        setLoading(false)
      }
    },
    [supabase],
  )

  /**
   * Registra entrega externa. Setea status='Entregada', qty_delivered=quantity
   * (todo-o-nada paralelo a pickup), external_completed_at, receptor OPCIONAL
   * (no XOR — ambos campos pueden ser NULL), append attachments y notes.
   *
   * cascade_request_status updatea solicitud padre automáticamente.
   */
  const completeExternal = useCallback(
    async (
      lineId: string,
      receivedById: string | null,
      receivedByName: string | null,
      notes: string | null,
      additionalAttachments: Attachment[],
    ): Promise<CompleteExternalResult> => {
      setLoading(true)
      setError(null)

      try {
        // SELECT línea: quantity (auto-fill qty_delivered) + external_notes existentes (append) + external_invoice_attachments (concat)
        const { data: line, error: fetchError } = await supabase
          .from('sm_request_lines')
          .select('quantity, external_notes, external_invoice_attachments')
          .eq('id', lineId)
          .single()

        if (fetchError || !line) {
          const msg = fetchError?.message ?? 'Línea no encontrada'
          setError(msg)
          return { ok: false, error: msg }
        }

        const now = new Date().toISOString()

        // Append notes preservando approve original
        const trimmedNotes = (notes ?? '').trim()
        const finalNotes = trimmedNotes
          ? (line.external_notes ? `${line.external_notes}\n\n[Entrega ${now}] ${trimmedNotes}` : trimmedNotes)
          : line.external_notes ?? null

        // Concat attachments (approve + delivery)
        const existingAttachments = Array.isArray(line.external_invoice_attachments)
          ? (line.external_invoice_attachments as Attachment[])
          : []
        const finalAttachments = [...existingAttachments, ...additionalAttachments]

        const { error: updateError } = await supabase
          .from('sm_request_lines')
          .update({
            status: 'Entregada',
            qty_delivered: line.quantity,
            external_completed_at: now,
            external_received_by_id: receivedById,
            external_received_by_name: receivedByName?.trim() || null,
            delivered_at: now,
            external_invoice_attachments: JSON.parse(JSON.stringify(finalAttachments)),
            external_notes: finalNotes,
          })
          .eq('id', lineId)

        if (updateError) {
          setError(updateError.message)
          return { ok: false, error: updateError.message }
        }

        return { ok: true }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al registrar entrega externa'
        setError(message)
        return { ok: false, error: message }
      } finally {
        setLoading(false)
      }
    },
    [supabase],
  )

  /**
   * Reverso de externo: línea Externo Aprobado → Pendiente.
   * Disponible solo desde la sección "Viajes Externos Pendientes" (UI ya
   * filtra por status='Externo Aprobado' AND external_completed_at IS NULL).
   *
   * UPDATE con WHERE clauses defensivas (atomic): si la línea cambió de
   * estado entre el render del UI y el confirm del modal, UPDATE no matchea
   * y retornamos error claro.
   *
   * NO toca: external_completed_at, external_received_by_*, qty_scheduled,
   * qty_delivered, trip_line_assignments. PRESERVA external_invoice_attachments
   * (Q4 cerrado — Storage cleanup async no vale la pena v1).
   *
   * cascade_request_status trigger se dispara solo y reevalúa solicitud padre.
   */
  const revertExternalToBacklog = useCallback(
    async (lineId: string): Promise<RevertExternalResult> => {
      setLoading(true)
      setError(null)

      try {
        const { data, error: updateError } = await supabase
          .from('sm_request_lines')
          .update({
            status: 'Pendiente',
            external_by_provider: false,
            external_approved_at: null,
            external_approved_by: null,
            external_provider_name: null,
            external_invoice_amount: null,
            external_notes: null,
            // PRESERVA: external_invoice_attachments (Q4)
          })
          .eq('id', lineId)
          .eq('status', 'Externo Aprobado')
          .is('external_completed_at', null)
          .select('id')

        if (updateError) {
          setError(updateError.message)
          return { ok: false, error: updateError.message }
        }

        if (!data || data.length === 0) {
          const msg = 'La línea ya no está disponible para devolver al backlog (puede haber cambiado de estado).'
          setError(msg)
          return { ok: false, error: msg }
        }

        return { ok: true }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al devolver línea al backlog'
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
    approveExternal,
    convertLineToExternal,
    completeExternal,
    revertExternalToBacklog,
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
git add src/hooks/useExternal.ts
git commit -m "$(cat <<'EOF'
feat: T2 Cambio 4 — hook useExternal con 4 funciones

Hook centralizado de operaciones externo, gemelo de usePickup.ts:
- approveExternal: línea Pendiente → Externo Aprobado (validación strict
  provider/amount/attachments + WHERE defensivo)
- convertLineToExternal: línea Programada → Externo Aprobado (DELETE
  assignment + UPDATE atómico; auto-cancela trip vacío; bloqueo si
  qty_delivered>0)
- completeExternal: Externo Aprobado → Entregada (receptor OPCIONAL no
  XOR; append notes formato [Entrega <ISO>]; concat attachments;
  persistencia en columnas external_received_by_*)
- revertExternalToBacklog: Externo Aprobado → Pendiente (UPDATE atomic
  con WHERE status+external_completed_at IS NULL; PRESERVA
  external_invoice_attachments)

translateBdError() traduce CHECK constraint pickup/external concurrency
a mensaje user-friendly: "La línea ya tiene un fulfillment asignado.
Refresca la página."

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

```json:metadata
{"files":["src/hooks/useExternal.ts"],"verifyCommand":"npm run build && grep -n \"approveExternal\\|convertLineToExternal\\|completeExternal\\|revertExternalToBacklog\" src/hooks/useExternal.ts","acceptanceCriteria":["4 funciones exportadas","WHERE clauses defensivas","CHECK constraint error traducido","build verde"]}
```

---

## Task 3: `ExternalApprovalForm.tsx` shared form fields + validateApprovalForm helper

**Goal:** Componente puro controlled con 4 fields del flow de aprobación (provider, cost, factura, notas) + helper `validateApprovalForm`. Reusado por Surface 1 y Surface 2 modales sin duplicar fields/validación.

**Files:**
- Create: `src/components/programacion/ExternalApprovalForm.tsx`

**Acceptance Criteria:**
- [ ] Componente exporta `ExternalApprovalForm` + types `ExternalApprovalFormValues`, `ExternalApprovalFormErrors` + helper `validateApprovalForm` + constante `EMPTY_FORM_VALUES`
- [ ] Validación: providerName.trim() != '' (max 100 ch), parseFloat(invoiceAmount) > 0 estricto, invoiceAttachments.length >= 1, notes.length <= 500 (opcional)
- [ ] FileUploader integrado con folder dinámico (lineFolderId prop)
- [ ] Sin estado interno (controlled component)
- [ ] `npm run build` → verde

**Verify:** `npm run build`

**Steps:**

- [ ] **Step 1: Crear `src/components/programacion/ExternalApprovalForm.tsx`** con el siguiente contenido completo:

```typescript
'use client'

import FileUploader from '@/components/ui/FileUploader'
import type { Attachment } from '@/lib/supabase/storage'

export interface ExternalApprovalFormValues {
  providerName: string
  invoiceAmount: string
  invoiceAttachments: Attachment[]
  notes: string
}

export type ExternalApprovalFormErrors = Partial<Record<keyof ExternalApprovalFormValues, string>>

export const EMPTY_FORM_VALUES: ExternalApprovalFormValues = {
  providerName: '',
  invoiceAmount: '',
  invoiceAttachments: [],
  notes: '',
}

export function validateApprovalForm(
  values: ExternalApprovalFormValues,
): { valid: boolean; errors: ExternalApprovalFormErrors } {
  const errors: ExternalApprovalFormErrors = {}

  if (values.providerName.trim() === '') {
    errors.providerName = 'El nombre del proveedor es requerido'
  } else if (values.providerName.length > 100) {
    errors.providerName = 'Máximo 100 caracteres'
  }

  const amount = parseFloat(values.invoiceAmount)
  if (!Number.isFinite(amount) || amount <= 0) {
    errors.invoiceAmount = 'El costo debe ser mayor a cero'
  }

  if (values.invoiceAttachments.length === 0) {
    errors.invoiceAttachments = 'Adjuntá al menos una cotización o factura'
  }

  if (values.notes.length > 500) {
    errors.notes = 'Máximo 500 caracteres'
  }

  return { valid: Object.keys(errors).length === 0, errors }
}

interface ExternalApprovalFormProps {
  values: ExternalApprovalFormValues
  onChange: (v: ExternalApprovalFormValues) => void
  errors?: ExternalApprovalFormErrors
  lineFolderId: string
  disabled?: boolean
}

export function ExternalApprovalForm({
  values,
  onChange,
  errors = {},
  lineFolderId,
  disabled = false,
}: ExternalApprovalFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="external-provider" className="mb-1 block text-sm font-medium text-gray-700">
          Proveedor / Empresa transportista <span className="text-red-600">*</span>
        </label>
        <input
          id="external-provider"
          type="text"
          maxLength={100}
          value={values.providerName}
          onChange={(e) => onChange({ ...values, providerName: e.target.value })}
          disabled={disabled}
          placeholder="Nombre del proveedor"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue disabled:bg-gray-50"
        />
        {errors.providerName && (
          <p className="mt-1 text-xs text-red-600">{errors.providerName}</p>
        )}
      </div>

      <div>
        <label htmlFor="external-cost" className="mb-1 block text-sm font-medium text-gray-700">
          Costo del servicio (B/.) <span className="text-red-600">*</span>
        </label>
        <input
          id="external-cost"
          type="number"
          step="0.01"
          min="0.01"
          value={values.invoiceAmount}
          onChange={(e) => onChange({ ...values, invoiceAmount: e.target.value })}
          disabled={disabled}
          placeholder="0.00"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue disabled:bg-gray-50"
        />
        {errors.invoiceAmount && (
          <p className="mt-1 text-xs text-red-600">{errors.invoiceAmount}</p>
        )}
      </div>

      <div>
        <FileUploader
          attachments={values.invoiceAttachments}
          folder={lineFolderId}
          onChange={(files) => onChange({ ...values, invoiceAttachments: files })}
          label="Cotización / Factura"
          hint="PDF, JPG, PNG o WEBP (max 10MB) — al menos 1 archivo requerido"
          disabled={disabled}
        />
        {errors.invoiceAttachments && (
          <p className="mt-1 text-xs text-red-600">{errors.invoiceAttachments}</p>
        )}
      </div>

      <div>
        <label htmlFor="external-notes" className="mb-1 block text-sm font-medium text-gray-700">
          Notas (opcional)
        </label>
        <textarea
          id="external-notes"
          maxLength={500}
          rows={2}
          value={values.notes}
          onChange={(e) => onChange({ ...values, notes: e.target.value })}
          disabled={disabled}
          placeholder="Observaciones del servicio externo..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue disabled:bg-gray-50"
        />
        {errors.notes && (
          <p className="mt-1 text-xs text-red-600">{errors.notes}</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build + commit**

```bash
npm run build
git add src/components/programacion/ExternalApprovalForm.tsx
git commit -m "feat: T3 Cambio 4 — ExternalApprovalForm shared component + validateApprovalForm helper"
```

```json:metadata
{"files":["src/components/programacion/ExternalApprovalForm.tsx"],"verifyCommand":"npm run build","acceptanceCriteria":["validateApprovalForm exportado","FileUploader integrado","componente sin estado interno","build verde"]}
```

---

## Task 4: Surface 1 — BacklogTable button + modal approve inline

**Goal:** Agregar botón "Aprobar viaje externo" en BacklogTable (desktop + mobile) + modal inline en `programacion/page.tsx` que wrappea `ExternalApprovalForm` con header "Aprobar viaje externo".

**Files:**
- Modify: `src/components/programacion/BacklogTable.tsx` (prop nueva + 2 botones)
- Modify: `src/app/(app)/programacion/page.tsx` (state + handlers + modal inline + integración con BacklogTable)

**Acceptance Criteria:**
- [ ] BacklogTable expone prop `onApproveExternal?: (lineId: string) => void` paralelo a `onApprovePickup`
- [ ] Botón estilo `bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 rounded-lg`, sin emoji, sin íconos lucide
- [ ] Modal inline con header "Aprobar viaje externo", form fields, botón primary amber, error display de `external.error`
- [ ] Validación pre-submit usando `validateApprovalForm`, errores inline en form
- [ ] Post-confirm: `refetchBacklog()` (refetchPendingExternals se agrega en T6)
- [ ] Solo logistica/admin ven el botón
- [ ] `npm run build` → verde

**Verify:** `npm run build && grep -n "onApproveExternal\|Aprobar viaje externo" src/components/programacion/BacklogTable.tsx 'src/app/(app)/programacion/page.tsx'`

**Steps:**

- [ ] **Step 1: BacklogTable.tsx — agregar prop al interface**

En `BacklogTableProps` (líneas 7-19), agregar después de `onApprovePickup`:

```typescript
  /** Callback "Aprobar viaje externo" — solo logistica/admin debería pasarlo */
  onApproveExternal?: (lineId: string) => void
```

Y agregar `onApproveExternal` al destructuring de props (líneas 36-45).

- [ ] **Step 2: BacklogTable.tsx — botón desktop**

Después del botón "Aprobar pickup" desktop (línea ~231, antes del cierre `</div>` del bloque desktop), agregar:

```tsx
{/* Aprobar viaje externo (logistica/admin) */}
{onApproveExternal && (
  <button
    type="button"
    onClick={(e) => { e.stopPropagation(); onApproveExternal(line.id) }}
    title="Aprobar viaje externo (proveedor con factura)"
    className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 transition-colors"
  >
    Aprobar viaje externo
  </button>
)}
```

- [ ] **Step 3: BacklogTable.tsx — botón mobile**

Después del botón "Aprobar pickup" mobile (línea ~329), agregar:

```tsx
{/* Aprobar viaje externo (logistica/admin) — mobile */}
{onApproveExternal && (
  <button
    type="button"
    onClick={(e) => { e.stopPropagation(); onApproveExternal(line.id) }}
    className="self-start rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 transition-colors"
  >
    Aprobar viaje externo
  </button>
)}
```

- [ ] **Step 4: programacion/page.tsx — agregar imports**

Agregar después del import de `usePickup`:

```typescript
import { useExternal } from '@/hooks/useExternal'
import {
  ExternalApprovalForm,
  EMPTY_FORM_VALUES,
  validateApprovalForm,
  type ExternalApprovalFormValues,
  type ExternalApprovalFormErrors,
} from '@/components/programacion/ExternalApprovalForm'
```

- [ ] **Step 5: programacion/page.tsx — agregar state**

Después del state de pickup (~línea 48):

```typescript
const external = useExternal()
const [externalApproveModal, setExternalApproveModal] = useState<{
  lineId: string
} | null>(null)
const [externalApproveValues, setExternalApproveValues] = useState<ExternalApprovalFormValues>(EMPTY_FORM_VALUES)
const [externalApproveErrors, setExternalApproveErrors] = useState<ExternalApprovalFormErrors>({})
```

- [ ] **Step 6: programacion/page.tsx — agregar handlers**

Después de `confirmRevertPickup` (~línea 365):

```typescript
const handleApproveExternal = useCallback((lineId: string) => {
  setExternalApproveValues(EMPTY_FORM_VALUES)
  setExternalApproveErrors({})
  setExternalApproveModal({ lineId })
}, [])

const closeExternalApproveModal = useCallback(() => {
  setExternalApproveModal(null)
  setExternalApproveValues(EMPTY_FORM_VALUES)
  setExternalApproveErrors({})
}, [])

const confirmApproveExternal = useCallback(async () => {
  if (!externalApproveModal || !person?.id) return
  const { valid, errors } = validateApprovalForm(externalApproveValues)
  if (!valid) {
    setExternalApproveErrors(errors)
    return
  }
  setExternalApproveErrors({})
  const result = await external.approveExternal(
    externalApproveModal.lineId,
    person.id,
    externalApproveValues.providerName,
    parseFloat(externalApproveValues.invoiceAmount),
    externalApproveValues.invoiceAttachments,
    externalApproveValues.notes,
  )
  if (result.ok) {
    setExternalApproveModal(null)
    setExternalApproveValues(EMPTY_FORM_VALUES)
    setExternalApproveErrors({})
    refetchBacklog()
    // refetchPendingExternals() se llamará después de T6
  }
}, [externalApproveModal, person, external, externalApproveValues, refetchBacklog])
```

- [ ] **Step 7: programacion/page.tsx — pasar prop a BacklogTable**

Encontrar el render de `<BacklogTable ... onApprovePickup={...} />` (~línea 743). Agregar:

```tsx
onApproveExternal={(role === 'logistica' || role === 'admin') ? handleApproveExternal : undefined}
```

- [ ] **Step 8: programacion/page.tsx — agregar modal inline al final del JSX**

Antes del último `</div>` que cierra el root container, después del modal de Aprobar pickup (~línea 1005):

```tsx
{/* Modal Aprobar viaje externo (Cambio 4 — Surface 1) */}
{externalApproveModal && (
  <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
    <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl sm:p-6">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">
        Aprobar viaje externo
      </h3>

      <ExternalApprovalForm
        values={externalApproveValues}
        onChange={setExternalApproveValues}
        errors={externalApproveErrors}
        lineFolderId={`external/${externalApproveModal.lineId}`}
        disabled={external.loading}
      />

      {external.error && (
        <p className="mt-3 text-sm text-red-600">{external.error}</p>
      )}

      <div className="mt-4 flex items-center justify-end gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={closeExternalApproveModal}
          disabled={external.loading}
        >
          Cancelar
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={confirmApproveExternal}
          loading={external.loading}
        >
          Aprobar viaje externo
        </Button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 9: Build + grep + commit**

```bash
npm run build
grep -n "onApproveExternal\|Aprobar viaje externo" src/components/programacion/BacklogTable.tsx "src/app/(app)/programacion/page.tsx"
```

```bash
git add src/components/programacion/BacklogTable.tsx "src/app/(app)/programacion/page.tsx"
git commit -m "feat: T4 Cambio 4 — Surface 1 BacklogTable approve externo (botón + modal inline)"
```

```json:metadata
{"files":["src/components/programacion/BacklogTable.tsx","src/app/(app)/programacion/page.tsx"],"verifyCommand":"npm run build && grep -n \"onApproveExternal\\|Aprobar viaje externo\" src/components/programacion/BacklogTable.tsx 'src/app/(app)/programacion/page.tsx'","acceptanceCriteria":["BacklogTable button desktop+mobile pill amber","modal inline con ExternalApprovalForm","validación pre-submit","permission gate","refetchBacklog post-success"]}
```

---

## Task 5: Surface 2 — AssignmentRow button + modal convert inline con 2 variantes

**Goal:** Botón "Convertir a externo" en AssignmentRow inline de `programacion/viaje/[id]/page.tsx` junto a "Convertir a pickup". Modal inline con 2 variantes (no última línea / última línea cancela trip), wrappea `ExternalApprovalForm`. Bloqueo si `qty_delivered > 0` con mensaje claro.

**Files:**
- Modify: `src/app/(app)/programacion/viaje/[id]/page.tsx` (AssignmentRow prop + state + handlers + modal inline)

**Acceptance Criteria:**
- [ ] AssignmentRow expone prop `onConvertToExternal?: (lineId, assignmentId, qtyAssigned, qtyDelivered) => void`
- [ ] Botón "Convertir a externo" estilo pill amber consistente, sin emoji, sin íconos lucide
- [ ] Modal inline 2 variantes: header normal (no última) + header danger "Cancelar viaje y convertir a externo" (última línea); botón danger rojo en variante última línea
- [ ] Si `qty_delivered > 0`: bloqueo con mensaje claro, sin form fields
- [ ] Validación pre-submit usando `validateApprovalForm`
- [ ] Post-confirm: si `tripCancelled` → `router.push('/programacion')`; si no → refetch trip + backlog
- [ ] Solo logistica/admin (canEditFullTrip mode)
- [ ] `npm run build` → verde

**Verify:** `npm run build && grep -n "onConvertToExternal\|Convertir a externo" "src/app/(app)/programacion/viaje/[id]/page.tsx"`

**Steps:**

- [ ] **Step 1: AssignmentRow interface — agregar prop `onConvertToExternal`**

En `programacion/viaje/[id]/page.tsx` líneas 101-109, agregar al `AssignmentRowProps`:

```typescript
onConvertToExternal?: (lineId: string, assignmentId: string, quantityAssigned: number, qtyDelivered: number) => void
```

Agregar al destructuring de la función `AssignmentRow` (línea 111).

- [ ] **Step 2: AssignmentRow — agregar botón "Convertir a externo"**

Después del botón "Convertir a pickup" (líneas 246-261), agregar:

```tsx
{/* Convertir a externo (Cambio 4 — Surface 2) */}
{onConvertToExternal && line && (
  <button
    type="button"
    onClick={() => onConvertToExternal(
      assignment.request_line_id,
      assignment.id,
      assignment.quantity_assigned,
      assignment.qty_delivered ?? 0,
    )}
    className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 transition-colors"
    title="Convertir a viaje externo"
  >
    Convertir a externo
  </button>
)}
```

- [ ] **Step 3: ViajeDetailPage — imports**

Agregar imports después del bloque de `usePickup`:

```typescript
import { useExternal } from '@/hooks/useExternal'
import {
  ExternalApprovalForm,
  EMPTY_FORM_VALUES,
  validateApprovalForm,
  type ExternalApprovalFormValues,
  type ExternalApprovalFormErrors,
} from '@/components/programacion/ExternalApprovalForm'
```

- [ ] **Step 4: ViajeDetailPage — state**

Después del `pickupModalState` (~línea 313), agregar:

```typescript
const external = useExternal()
const [externalConvertModal, setExternalConvertModal] = useState<{
  lineId: string
  assignmentId: string
  quantityAssigned: number
  qtyDelivered: number
  willCancelTrip: boolean
} | null>(null)
const [externalConvertValues, setExternalConvertValues] = useState<ExternalApprovalFormValues>(EMPTY_FORM_VALUES)
const [externalConvertErrors, setExternalConvertErrors] = useState<ExternalApprovalFormErrors>({})
```

- [ ] **Step 5: ViajeDetailPage — handlers**

Después de `confirmConvertToPickup` (~línea 702), agregar:

```typescript
const handleConvertToExternal = useCallback(
  (lineId: string, assignmentId: string, quantityAssigned: number, qtyDelivered: number) => {
    const willCancelTrip = existingAssignments.length === 1
    setExternalConvertValues(EMPTY_FORM_VALUES)
    setExternalConvertErrors({})
    setExternalConvertModal({ lineId, assignmentId, quantityAssigned, qtyDelivered, willCancelTrip })
  },
  [existingAssignments.length],
)

const closeExternalConvertModal = useCallback(() => {
  setExternalConvertModal(null)
  setExternalConvertValues(EMPTY_FORM_VALUES)
  setExternalConvertErrors({})
}, [])

const confirmConvertToExternal = useCallback(async () => {
  if (!externalConvertModal || !person?.id || !trip) return
  if (externalConvertModal.qtyDelivered > 0) return  // UI bloqueado, defensa extra
  const { valid, errors } = validateApprovalForm(externalConvertValues)
  if (!valid) {
    setExternalConvertErrors(errors)
    return
  }
  setExternalConvertErrors({})
  const result = await external.convertLineToExternal(
    externalConvertModal.lineId,
    externalConvertModal.assignmentId,
    externalConvertModal.quantityAssigned,
    trip.id,
    person.id,
    externalConvertValues.providerName,
    parseFloat(externalConvertValues.invoiceAmount),
    externalConvertValues.invoiceAttachments,
    externalConvertValues.notes,
  )
  if (result.ok) {
    closeExternalConvertModal()
    if (result.tripCancelled) {
      router.push('/programacion')
      return
    }
    const updated = await fetchTrip(id)
    if (updated) {
      setTrip(updated)
      setExistingAssignments(updated.assignments)
      setOriginalAssignments(new Map(updated.assignments.map((a: TripAssignment) => [a.id, a.quantity_assigned])))
    }
    refetchBacklog()
  }
}, [externalConvertModal, person, trip, external, externalConvertValues, fetchTrip, id, refetchBacklog, router, closeExternalConvertModal])
```

- [ ] **Step 6: ViajeDetailPage — pasar prop a AssignmentRow**

En el render de `<AssignmentRow .../>` (~línea 853), agregar:

```tsx
onConvertToExternal={canEditFullTrip ? handleConvertToExternal : undefined}
```

- [ ] **Step 7: ViajeDetailPage — agregar modal inline**

Después del modal "Convertir línea a pickup" (~línea 1069), agregar:

```tsx
{/* Modal Convertir a externo (Cambio 4 — Surface 2) */}
{externalConvertModal && (
  <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
    <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl sm:p-6">
      <h3 className={`mb-2 text-lg font-semibold ${externalConvertModal.willCancelTrip ? 'text-red-700' : 'text-gray-900'}`}>
        {externalConvertModal.willCancelTrip ? 'Cancelar viaje y convertir a externo' : 'Convertir a viaje externo'}
      </h3>

      {externalConvertModal.qtyDelivered > 0 ? (
        <p className="mt-2 mb-4 text-sm text-red-600">
          No se puede convertir a externo una línea con entregas previas registradas
          ({externalConvertModal.qtyDelivered} de {externalConvertModal.quantityAssigned} entregado).
          Cancelá la línea o terminá el flow actual.
        </p>
      ) : externalConvertModal.willCancelTrip ? (
        <p className="mt-2 mb-4 text-sm text-gray-600">
          Esta es la última línea del viaje{' '}
          <span className="font-mono font-bold">{trip?.trip_id ?? trip?.id.slice(0, 8)}</span>.
          Convertirla a viaje externo CANCELARÁ el viaje. Completá los datos del proveedor y confirmá.
        </p>
      ) : (
        <p className="mt-2 mb-4 text-sm text-gray-600">
          La línea saldrá del viaje y pasará a "Viajes Externos Pendientes" con la factura del proveedor. Completá los datos abajo.
        </p>
      )}

      {externalConvertModal.qtyDelivered === 0 && (
        <ExternalApprovalForm
          values={externalConvertValues}
          onChange={setExternalConvertValues}
          errors={externalConvertErrors}
          lineFolderId={`external/${externalConvertModal.lineId}`}
          disabled={external.loading}
        />
      )}

      {external.error && (
        <p className="mt-3 text-sm text-red-600">{external.error}</p>
      )}

      <div className="mt-4 flex items-center justify-end gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={closeExternalConvertModal}
          disabled={external.loading}
        >
          Cancelar
        </Button>
        <Button
          variant={externalConvertModal.willCancelTrip ? 'danger' : 'primary'}
          size="sm"
          onClick={confirmConvertToExternal}
          loading={external.loading}
          disabled={externalConvertModal.qtyDelivered > 0}
        >
          {externalConvertModal.willCancelTrip ? 'Sí, cancelar viaje y convertir' : 'Convertir a externo'}
        </Button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 8: Build + grep + commit**

```bash
npm run build
grep -n "onConvertToExternal\|Convertir a externo" "src/app/(app)/programacion/viaje/[id]/page.tsx"
```

```bash
git add "src/app/(app)/programacion/viaje/[id]/page.tsx"
git commit -m "feat: T5 Cambio 4 — Surface 2 AssignmentRow convert externo (botón + modal 2 variantes)"
```

```json:metadata
{"files":["src/app/(app)/programacion/viaje/[id]/page.tsx"],"verifyCommand":"npm run build && grep -n \"onConvertToExternal\\|Convertir a externo\" 'src/app/(app)/programacion/viaje/[id]/page.tsx'","acceptanceCriteria":["AssignmentRow prop + botón pill amber","modal 2 variantes (normal/danger última)","bloqueo qty_delivered>0","validación pre-submit","redirect si tripCancelled"]}
```

---

## Task 6: Surface 3 — Sección "Viajes Externos Pendientes" + ExternalDeliveryModal + revert modal

**Goal:** Sección dedicada en `/programacion` paralela a Pickups Pendientes (después de pickups, antes de Sin Programar). Lista líneas externas pendientes de entrega con FIFO order. Cada fila tiene botones "Devolver al backlog" + "Confirmar entrega". `ExternalDeliveryModal` componente nuevo. Modal inline para revert. Hide-when-empty.

**Files:**
- Create: `src/components/programacion/ExternalDeliveryModal.tsx`
- Modify: `src/app/(app)/programacion/page.tsx` (state pendingExternals + fetch + sección + handlers + 2 modales)

**Acceptance Criteria:**
- [ ] `ExternalDeliveryModal` componente nuevo con 4 fields (confirmation required, receptor opcional, notas opcional, foto adicional opcional); validación submit = solo confirmation === true
- [ ] Sección "Viajes Externos Pendientes" en programacion/page.tsx después de Pickups Pendientes, antes de Sin Programar
- [ ] Hide entirely cuando `!externalsLoading && pendingExternals.length === 0`
- [ ] Loading state mantiene header con spinner
- [ ] Cada fila muestra: descripción, ruta, cantidad, provider, costo `B/. X.XX`, botón "Ver factura" (abre primer attachment), notas truncadas
- [ ] 2 botones por fila: "Devolver al backlog" outline gris izquierda + "Confirmar entrega" amber primary derecha
- [ ] Solo logistica/admin
- [ ] Post-completeExternal: `refetchPendingExternals()` (cascade trigger cierra solicitud si todas líneas Entregadas)
- [ ] Post-revert: `refetchPendingExternals()` + `refetchBacklog()`
- [ ] T4 ahora también llama `refetchPendingExternals()` post-approve (actualizar handler de T4)
- [ ] `npm run build` → verde

**Verify:** `npm run build && grep -n "ExternalDeliveryModal\|pendingExternals\|Viajes Externos Pendientes" "src/app/(app)/programacion/page.tsx"`

**Steps:**

- [ ] **Step 1: Crear `src/components/programacion/ExternalDeliveryModal.tsx`** con el siguiente contenido completo:

```typescript
'use client'

import { useState, useCallback, useMemo } from 'react'
import { Wrench, Package } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SelectWithFallback, type SelectWithFallbackValue } from '@/components/ui/SelectWithFallback'
import FileUploader from '@/components/ui/FileUploader'
import { formatCurrency, formatQty } from '@/lib/utils/format'
import type { Attachment } from '@/lib/supabase/storage'

export interface PendingExternalLine {
  id: string
  description: string
  line_type: string
  quantity: number
  unitCode: string
  request_id: string
  request_uuid: string
  project_code: string | null
  project_name: string | null
  external_approved_at: string
  external_provider_name: string
  external_invoice_amount: number
  external_invoice_attachments: Attachment[]
  external_notes: string | null
}

interface ExternalDeliveryModalProps {
  line: PendingExternalLine
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

export function ExternalDeliveryModal({
  line,
  receiverOptions,
  onConfirm,
  onClose,
  loading,
  error,
}: ExternalDeliveryModalProps) {
  const [confirmed, setConfirmed] = useState(false)
  const [receiver, setReceiver] = useState<SelectWithFallbackValue>({ id: null, text: null })
  const [notes, setNotes] = useState('')
  const [additionalAttachments, setAdditionalAttachments] = useState<Attachment[]>([])

  const canConfirm = confirmed && !loading

  const folderId = useMemo(() => `external/${line.id}`, [line.id])

  const handleSubmit = useCallback(async () => {
    if (!confirmed) return
    await onConfirm({
      receivedById: receiver.id,
      receivedByName: (receiver.text ?? '').trim(),
      notes: notes.trim(),
      additionalAttachments,
    })
  }, [confirmed, receiver, notes, additionalAttachments, onConfirm])

  const isEquipo = line.line_type === 'Equipo'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl sm:p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Confirmar entrega externo
        </h3>

        {/* Info de la línea */}
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-1">
          <div className="flex items-center gap-2">
            {isEquipo ? (
              <Wrench className="h-4 w-4 text-iconsa-blue" />
            ) : (
              <Package className="h-4 w-4 text-gold" />
            )}
            <span className="text-sm font-medium text-gray-900">{line.description}</span>
          </div>
          <p className="text-xs text-iconsa-gray">
            <span className="font-mono">{line.request_id}</span>
            {line.project_code && <span> · {line.project_code}</span>}
          </p>
          <p className="text-xs text-iconsa-gray">
            Cantidad: <span className="font-medium">{formatQty(line.quantity)} {line.unitCode}</span>
            {' · '}
            Proveedor: <span className="font-medium">{line.external_provider_name}</span>
            {' · '}
            Costo: <span className="font-medium">{formatCurrency(line.external_invoice_amount)}</span>
          </p>
        </div>

        <div className="space-y-4">
          {/* Confirmación obligatoria */}
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

          {/* Receptor (opcional, no XOR) */}
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

          {/* Notas (opcional) */}
          <div>
            <label htmlFor="external-delivery-notes" className="mb-1 block text-sm font-medium text-gray-700">
              Notas adicionales (opcional)
            </label>
            <textarea
              id="external-delivery-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones de la entrega..."
              rows={2}
              maxLength={500}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue"
            />
          </div>

          {/* Foto adicional opcional */}
          <FileUploader
            attachments={additionalAttachments}
            folder={folderId}
            onChange={setAdditionalAttachments}
            label="Foto adicional (opcional)"
            hint="Se agrega a las facturas existentes (max 10MB)"
          />

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

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

- [ ] **Step 2: programacion/page.tsx — agregar imports**

```typescript
import { ExternalDeliveryModal, type PendingExternalLine } from '@/components/programacion/ExternalDeliveryModal'
```

- [ ] **Step 3: programacion/page.tsx — agregar state**

Después del state de externalApproveModal (~después del Step 5 de T4):

```typescript
const [pendingExternals, setPendingExternals] = useState<PendingExternalLine[]>([])
const [externalsLoading, setExternalsLoading] = useState(false)
const [externalDeliveryLine, setExternalDeliveryLine] = useState<PendingExternalLine | null>(null)
const [externalRevertLine, setExternalRevertLine] = useState<PendingExternalLine | null>(null)
```

- [ ] **Step 4: programacion/page.tsx — agregar refetchPendingExternals**

Después de `refetchPendingPickups`:

```typescript
const refetchPendingExternals = useCallback(async () => {
  setExternalsLoading(true)
  try {
    const { data } = await supabase
      .from('sm_request_lines')
      .select(`
        id, description, line_type, quantity, unit_text,
        external_approved_at, external_provider_name, external_invoice_amount,
        external_invoice_attachments, external_notes,
        unit:unit_id(code),
        request:request_id!inner(
          id, request_id,
          project:project_id(code, name)
        )
      `)
      .eq('status', 'Externo Aprobado')
      .eq('external_by_provider', true)
      .is('external_completed_at', null)
      .order('external_approved_at', { ascending: true })

    const mapped: PendingExternalLine[] = (data ?? []).map((row: Record<string, unknown>) => {
      const request = Array.isArray(row.request) ? row.request[0] : row.request
      const reqRec = (request ?? {}) as Record<string, unknown>
      const projRaw = reqRec.project as Record<string, unknown> | Record<string, unknown>[] | null
      const project = Array.isArray(projRaw) ? projRaw[0] : projRaw
      const unitRaw = row.unit as Record<string, unknown> | Record<string, unknown>[] | null
      const unit = Array.isArray(unitRaw) ? unitRaw[0] : unitRaw
      const attachmentsRaw = row.external_invoice_attachments
      const attachments = Array.isArray(attachmentsRaw) ? (attachmentsRaw as Attachment[]) : []
      return {
        id: row.id as string,
        description: row.description as string,
        line_type: row.line_type as string,
        quantity: row.quantity as number,
        unitCode: ((unit as { code?: string } | null)?.code) ?? ((row.unit_text as string | null) ?? ''),
        request_id: ((reqRec.request_id as string | null) ?? ''),
        request_uuid: ((reqRec.id as string | null) ?? ''),
        project_code: ((project as { code?: string } | null)?.code) ?? null,
        project_name: ((project as { name?: string } | null)?.name) ?? null,
        external_approved_at: row.external_approved_at as string,
        external_provider_name: row.external_provider_name as string,
        external_invoice_amount: row.external_invoice_amount as number,
        external_invoice_attachments: attachments,
        external_notes: (row.external_notes as string | null) ?? null,
      }
    })
    setPendingExternals(mapped)
  } finally {
    setExternalsLoading(false)
  }
}, [supabase])
```

- [ ] **Step 5: programacion/page.tsx — agregar useEffect para fetch inicial**

Después del useEffect de pendingPickups:

```typescript
useEffect(() => {
  if (role === 'logistica' || role === 'admin') {
    void refetchPendingExternals()
  }
}, [role, refetchPendingExternals])
```

- [ ] **Step 6: programacion/page.tsx — actualizar `confirmApproveExternal` para llamar refetchPendingExternals**

Editar el handler de T4 — después de `refetchBacklog()`, agregar:
```typescript
void refetchPendingExternals()
```

- [ ] **Step 7: programacion/page.tsx — handlers Surface 3**

```typescript
const handleCompleteExternal = useCallback(async (data: {
  receivedById: string | null
  receivedByName: string
  notes: string
  additionalAttachments: Attachment[]
}) => {
  if (!externalDeliveryLine) return
  const result = await external.completeExternal(
    externalDeliveryLine.id,
    data.receivedById,
    data.receivedByName || null,
    data.notes || null,
    data.additionalAttachments,
  )
  if (result.ok) {
    setExternalDeliveryLine(null)
    void refetchPendingExternals()
  }
}, [externalDeliveryLine, external, refetchPendingExternals])

const confirmRevertExternal = useCallback(async () => {
  if (!externalRevertLine) return
  const result = await external.revertExternalToBacklog(externalRevertLine.id)
  if (result.ok) {
    setExternalRevertLine(null)
    void refetchPendingExternals()
    refetchBacklog()
  }
}, [externalRevertLine, external, refetchPendingExternals, refetchBacklog])
```

- [ ] **Step 8: programacion/page.tsx — agregar sección "Viajes Externos Pendientes"**

Después de la sección "Pickups Pendientes de Retiro" (cierra con `</section>` ~línea 664), antes de "Sección 1: Sin Programar":

```tsx
{/* ─── Sección Viajes Externos Pendientes (Cambio 4 — Surface 3) ─── */}
{(role === 'logistica' || role === 'admin') && (externalsLoading || pendingExternals.length > 0) && (
  <section className="rounded-xl border border-blue-200 bg-blue-50/30">
    <div className="px-4 pt-4 pb-3">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold text-gray-900">Viajes Externos Pendientes</h2>
        {!externalsLoading && (
          <span className="rounded-full bg-blue-200 text-blue-900 px-2 py-0.5 text-xs font-medium">
            {pendingExternals.length}
          </span>
        )}
      </div>
    </div>
    <div className="px-4 pb-4">
      {externalsLoading ? (
        <p className="py-4 text-center text-sm text-iconsa-gray">Cargando externos...</p>
      ) : (
        <div className="space-y-2">
          {pendingExternals.map((p) => {
            const firstInvoiceUrl = p.external_invoice_attachments[0]?.url ?? null
            return (
              <div key={p.id} className="flex items-center gap-3 rounded-lg border border-blue-200 bg-white px-4 py-2.5 flex-wrap">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">{p.description}</p>
                  <p className="text-xs text-iconsa-gray">
                    <span className="font-mono">{p.request_id}</span>
                    {p.project_code && <span> · {p.project_code}</span>}
                    <span> · {p.quantity} {p.unitCode}</span>
                    <span> · {p.external_provider_name}</span>
                    <span> · {formatCurrency(p.external_invoice_amount)}</span>
                  </p>
                  {p.external_notes && (
                    <p className="mt-0.5 text-xs italic text-gray-500 truncate" title={p.external_notes}>
                      {p.external_notes}
                    </p>
                  )}
                </div>
                {firstInvoiceUrl && (
                  <a
                    href={firstInvoiceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 transition-colors"
                    title="Ver factura"
                  >
                    Ver factura
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setExternalRevertLine(p)}
                  className="shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  title="Devolver línea al backlog"
                >
                  Devolver al backlog
                </button>
                <button
                  type="button"
                  onClick={() => setExternalDeliveryLine(p)}
                  className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 transition-colors"
                >
                  Confirmar entrega
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  </section>
)}
```

- [ ] **Step 9: programacion/page.tsx — agregar 2 modales (delivery + revert) al JSX final**

Después del modal Aprobar viaje externo (T4 modal), agregar:

```tsx
{/* Modal Confirmar entrega externo (Cambio 4 — Surface 3) */}
{externalDeliveryLine && (
  <ExternalDeliveryModal
    line={externalDeliveryLine}
    receiverOptions={receiverOptions}
    onConfirm={handleCompleteExternal}
    onClose={() => setExternalDeliveryLine(null)}
    loading={external.loading}
    error={external.error}
  />
)}

{/* Modal Devolver al backlog externo (Cambio 4 — Surface 3 revert) */}
{externalRevertLine && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
      <h3 className="text-lg font-semibold text-gray-900">¿Devolver al backlog?</h3>
      <p className="mt-2 text-sm text-gray-600">
        La línea volverá a estado Pendiente y aparecerá en el backlog. La factura subida queda preservada para evitar archivos huérfanos en Storage. Podrás programarla en un viaje, aprobarla como pickup, o aprobarla de nuevo como externo.
      </p>
      {external.error && (
        <p className="mt-2 text-sm text-red-600">{external.error}</p>
      )}
      <div className="mt-4 flex items-center justify-end gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExternalRevertLine(null)}
          disabled={external.loading}
        >
          Cancelar
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={confirmRevertExternal}
          loading={external.loading}
        >
          Devolver
        </Button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 10: Build + grep + commit**

```bash
npm run build
grep -n "ExternalDeliveryModal\|pendingExternals\|Viajes Externos Pendientes" "src/app/(app)/programacion/page.tsx"
```

```bash
git add src/components/programacion/ExternalDeliveryModal.tsx "src/app/(app)/programacion/page.tsx"
git commit -m "feat: T6 Cambio 4 — Surface 3 sección Viajes Externos Pendientes + ExternalDeliveryModal + revert"
```

```json:metadata
{"files":["src/components/programacion/ExternalDeliveryModal.tsx","src/app/(app)/programacion/page.tsx"],"verifyCommand":"npm run build && grep -n \"ExternalDeliveryModal\\|pendingExternals\\|Viajes Externos Pendientes\" 'src/app/(app)/programacion/page.tsx'","acceptanceCriteria":["ExternalDeliveryModal con confirmation required + receptor opcional","sección posicionada después de pickups","hide-when-empty con loading state","botones Devolver/Confirmar entrega","Ver factura link al primer attachment"]}
```

---

## Task 7: Badge externo en LineRow + cancelSolicitud filter incluye 'Externo Aprobado'

**Goal:** Agregar prop `externalInfo` a LineRow + badges azul "EXTERNO APROBADO" / verde "ENTREGADO (EXTERNO)" con tooltips informativos. Agregar `'Externo Aprobado'` al filter de `cancelSolicitud` en useSolicitudes (paralelo al fix de Pickup en Cambio 3 — evita líneas huérfanas en solicitudes canceladas).

**Files:**
- Modify: `src/components/solicitudes/LineRow.tsx` (prop + badges desktop + mobile)
- Modify: `src/hooks/useSolicitudes.ts` (cancelSolicitud filter + LineWithRelations interface)
- Modify: `src/app/(app)/solicitudes/[id]/page.tsx` (pasar externalInfo prop a LineRow)

**Acceptance Criteria:**
- [ ] LineRow expone prop `externalInfo?: { external_by_provider, external_approved_at, external_completed_at, external_provider_name, external_invoice_amount, external_received_by_id, external_received_by_name }`
- [ ] Badge "EXTERNO APROBADO" blue-100 / blue-700 cuando `external_by_provider && status='Externo Aprobado'`
- [ ] Tooltip badge aprobado: `Externo: {provider}, B/. {amount}, aprobado {fecha}`
- [ ] Badge "ENTREGADO (EXTERNO)" emerald-100 / emerald-800 cuando `external_completed_at != null && status='Entregada'`
- [ ] Tooltip badge entregado: `Externo: {provider}, B/. {amount}, entregado {fecha}, receptor {nombre || '(no captado)'}`
- [ ] LineWithRelations en useSolicitudes incluye 8 columnas externo (paralelo a las pickup)
- [ ] `cancelSolicitud` filter incluye `'Externo Aprobado'` en lineIdsToCancel
- [ ] Sin emojis en badges (texto puro)
- [ ] `npm run build` → verde

**Verify:** `npm run build && grep -n "EXTERNO APROBADO\|external_by_provider" src/components/solicitudes/LineRow.tsx && grep -n "Externo Aprobado" src/hooks/useSolicitudes.ts`

**Steps:**

- [ ] **Step 1: useSolicitudes.ts — actualizar `LineWithRelations`**

En la interface `LineWithRelations` líneas 42-79, después de las columnas pickup, agregar:

```typescript
  // Cambio 4 — external columns
  external_by_provider: boolean
  external_approved_at: string | null
  external_approved_by: string | null
  external_completed_at: string | null
  external_provider_name: string | null
  external_invoice_amount: number | null
  external_received_by_id: string | null
  external_received_by_name: string | null
```

- [ ] **Step 2: useSolicitudes.ts — actualizar mapper de fetchSolicitud**

En el `lines: LineWithRelations[] = sortedLines.map((rawLine) => {...})` (línea 413), después de los campos pickup_*, agregar:

```typescript
  external_by_provider: (line.external_by_provider as boolean) ?? false,
  external_approved_at: (line.external_approved_at as string | null) ?? null,
  external_approved_by: (line.external_approved_by as string | null) ?? null,
  external_completed_at: (line.external_completed_at as string | null) ?? null,
  external_provider_name: (line.external_provider_name as string | null) ?? null,
  external_invoice_amount: (line.external_invoice_amount as number | null) ?? null,
  external_received_by_id: (line.external_received_by_id as string | null) ?? null,
  external_received_by_name: (line.external_received_by_name as string | null) ?? null,
```

- [ ] **Step 3: useSolicitudes.ts — `cancelSolicitud` filter**

En `cancelSolicitud` línea 781-783:

Old:
```typescript
const lineIdsToCancel = (lines ?? [])
  .filter((l) => l.status === 'Pendiente' || l.status === 'Programada' || l.status === 'Pickup Aprobado')
  .map((l) => l.id)
```

New:
```typescript
const lineIdsToCancel = (lines ?? [])
  .filter((l) => l.status === 'Pendiente' || l.status === 'Programada' || l.status === 'Pickup Aprobado' || l.status === 'Externo Aprobado')
  .map((l) => l.id)
```

Y actualizar el comentario sobre el filter:
```typescript
// 3. Actualizar líneas Pendiente, Programada, Pickup Aprobado y Externo Aprobado a Cancelada
// (Cambio 3 fix I1/E8 + Cambio 4 paralelo: sin estos status, líneas
// pickup-aprobadas o externo-aprobadas quedaban huérfanas en solicitud Cancelada)
```

- [ ] **Step 4: LineRow.tsx — agregar prop `externalInfo`**

En la interface `LineRowProps` (líneas 8-29), después de `pickupInfo?:`, agregar:

```typescript
  // Cambio 4 — info de externo per-línea
  externalInfo?: {
    external_by_provider: boolean
    external_approved_at: string | null
    external_completed_at: string | null
    external_provider_name: string | null
    external_invoice_amount: number | null
    external_received_by_id: string | null
    external_received_by_name: string | null
  }
```

Agregar al destructuring de la función LineRow (línea 36-49).

- [ ] **Step 5: LineRow.tsx — formatCurrency import**

Agregar al top del archivo:
```typescript
import { formatQty, formatCurrency } from '@/lib/utils/format'
```

(reemplaza el import actual `import { formatQty } from '@/lib/utils/format'`)

Wait — verificá si ya está importado. Si solo `formatQty`, agregar `formatCurrency`.

- [ ] **Step 6: LineRow.tsx — lógica de badges externo**

Después de las constantes `showPickupApproved` / `showPickupCompleted` (líneas 54-55), agregar:

```typescript
const showExternalApproved = externalInfo?.external_by_provider && status === 'Externo Aprobado'
const showExternalCompleted = externalInfo?.external_completed_at && status === 'Entregada'
```

Helper para tooltip de badge entregado externo:

```typescript
const externalCompletedTooltip = externalInfo?.external_completed_at
  ? (() => {
      const provider = externalInfo.external_provider_name ?? '—'
      const amount = externalInfo.external_invoice_amount != null
        ? formatCurrency(externalInfo.external_invoice_amount)
        : '—'
      const date = externalInfo.external_completed_at
        ? formatPanamaDate(externalInfo.external_completed_at)
        : '—'
      const receiver = externalInfo.external_received_by_name ?? '(no captado)'
      return `Externo: ${provider}, ${amount}, entregado ${date}, receptor ${receiver}`
    })()
  : ''

const externalApprovedTooltip = externalInfo?.external_approved_at
  ? (() => {
      const provider = externalInfo.external_provider_name ?? '—'
      const amount = externalInfo.external_invoice_amount != null
        ? formatCurrency(externalInfo.external_invoice_amount)
        : '—'
      const date = formatPanamaDate(externalInfo.external_approved_at)
      return `Externo: ${provider}, ${amount}, aprobado ${date}`
    })()
  : 'Aprobado como externo'
```

- [ ] **Step 7: LineRow.tsx — desktop badges**

En el bloque desktop, después de los badges pickup (líneas 122-137), agregar:

```tsx
{showExternalApproved && externalInfo && (
  <span
    className="inline-flex items-center rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-xs font-medium"
    title={externalApprovedTooltip}
  >
    EXTERNO APROBADO
  </span>
)}
{showExternalCompleted && externalInfo && (
  <span
    className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-xs font-medium"
    title={externalCompletedTooltip}
  >
    ENTREGADO (EXTERNO)
  </span>
)}
```

- [ ] **Step 8: LineRow.tsx — mobile badges**

En el bloque mobile, después de los badges pickup mobile (líneas 201-216), agregar:

```tsx
{showExternalApproved && externalInfo && (
  <span
    className="inline-flex items-center rounded-full bg-blue-100 text-blue-700 px-1.5 py-0.5 text-[10px] font-medium"
    title={externalApprovedTooltip}
  >
    EXT
  </span>
)}
{showExternalCompleted && externalInfo && (
  <span
    className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 px-1.5 py-0.5 text-[10px] font-medium"
    title={externalCompletedTooltip}
  >
    EXT ✓
  </span>
)}
```

- [ ] **Step 9: solicitudes/[id]/page.tsx — pasar externalInfo a LineRow**

Buscar el render de `<LineRow .../>` en `src/app/(app)/solicitudes/[id]/page.tsx`. Agregar prop:

```tsx
externalInfo={{
  external_by_provider: line.external_by_provider,
  external_approved_at: line.external_approved_at,
  external_completed_at: line.external_completed_at,
  external_provider_name: line.external_provider_name,
  external_invoice_amount: line.external_invoice_amount,
  external_received_by_id: line.external_received_by_id,
  external_received_by_name: line.external_received_by_name,
}}
```

- [ ] **Step 10: Build + grep + commit**

```bash
npm run build
grep -n "EXTERNO APROBADO\|external_by_provider" src/components/solicitudes/LineRow.tsx
grep -n "Externo Aprobado" src/hooks/useSolicitudes.ts
```

```bash
git add src/components/solicitudes/LineRow.tsx src/hooks/useSolicitudes.ts "src/app/(app)/solicitudes/[id]/page.tsx"
git commit -m "feat: T7 Cambio 4 — badges externo en LineRow + cancelSolicitud filter incluye 'Externo Aprobado'"
```

```json:metadata
{"files":["src/components/solicitudes/LineRow.tsx","src/hooks/useSolicitudes.ts","src/app/(app)/solicitudes/[id]/page.tsx"],"verifyCommand":"npm run build && grep -n \"EXTERNO APROBADO\\|external_by_provider\" src/components/solicitudes/LineRow.tsx && grep -n \"Externo Aprobado\" src/hooks/useSolicitudes.ts","acceptanceCriteria":["badge azul EXTERNO APROBADO + tooltip","badge verde ENTREGADO (EXTERNO) + tooltip","cancelSolicitud incluye Externo Aprobado","LineWithRelations con 8 columnas externo","sin emojis"]}
```

---

## Task 8: Costo Trip editable — eliminar `!!rateId` + simplificar handleRateChange

**Goal:** Revert J6 — costo del trip siempre editable como override manual incluso con tarifa seleccionada. One-line fix en `TripForm.tsx:408`. Simplificar `handleRateChange` para que pre-rellene cost del rate.amount pero NO bloquee.

**Files:**
- Modify: `src/components/programacion/TripForm.tsx` (línea 408 + handleRateChange líneas 202-223)

**Acceptance Criteria:**
- [ ] Input cost en TripForm tiene `disabled={fieldsDisabled}` (sin `|| !!rateId`)
- [ ] Seleccionar rate → pre-rellena cost del rate.amount, sigue editable
- [ ] Deseleccionar rate → cost queda con valor manual (no se borra)
- [ ] Editar cost manualmente con rate seleccionada → guarda valor custom
- [ ] `npm run build` → verde

**Verify:** `npm run build && grep -n "disabled={fieldsDisabled" src/components/programacion/TripForm.tsx`

Expected: matches mostrarán `disabled={fieldsDisabled}` (sin `!!rateId`).

**Steps:**

- [ ] **Step 1: TripForm.tsx — eliminar `!!rateId` del disabled del cost input**

Edit línea 408:

Old:
```tsx
disabled={fieldsDisabled || !!rateId}
```

New:
```tsx
disabled={fieldsDisabled}
```

- [ ] **Step 2: TripForm.tsx — actualizar comentario del input cost**

Edit línea 400 (comment encima del Input):

Old:
```tsx
{/* Costo — read-only cuando hay tarifa seleccionada (J6) */}
```

New:
```tsx
{/* Costo — siempre editable; rate solo pre-rellena (Cambio 4 — revert J6) */}
```

- [ ] **Step 3: TripForm.tsx — verificar handleRateChange (líneas 202-223)**

El handler actual:
```tsx
const handleRateChange = useCallback(
  (val: string | null) => {
    // J6: si hay tarifa seleccionada, costo siempre se auto-rellena y queda
    // read-only. Si el usuario quiere un costo custom, debe deseleccionar la
    // tarifa primero. Sin confirmación — el campo no es editable mientras
    // haya rate.
    if (val) {
      const selectedRate = rates.find((r) => r.value === val)
      if (selectedRate?.amount != null) {
        setRateId(val)
        setCost(String(selectedRate.amount))
        onRateChange?.(val)
        propagate({ rate_id: val, cost: selectedRate.amount })
        return
      }
    }
    setRateId(val)
    onRateChange?.(val)
    propagate({ rate_id: val })
  },
  [propagate, onRateChange, rates],
)
```

Update comment para reflejar el revert:

```tsx
const handleRateChange = useCallback(
  (val: string | null) => {
    // Cambio 4 (revert J6): seleccionar rate pre-rellena cost del rate.amount
    // pero el campo SIGUE editable como override manual. Movimientos internos
    // o casos especiales pueden requerir cost custom incluso con rate.
    if (val) {
      const selectedRate = rates.find((r) => r.value === val)
      if (selectedRate?.amount != null) {
        setRateId(val)
        setCost(String(selectedRate.amount))
        onRateChange?.(val)
        propagate({ rate_id: val, cost: selectedRate.amount })
        return
      }
    }
    setRateId(val)
    onRateChange?.(val)
    propagate({ rate_id: val })
  },
  [propagate, onRateChange, rates],
)
```

- [ ] **Step 4: Build + grep + commit**

```bash
npm run build
grep -n "disabled={fieldsDisabled" src/components/programacion/TripForm.tsx
```

```bash
git add src/components/programacion/TripForm.tsx
git commit -m "feat: T8 Cambio 4 — costo del trip editable con rate (revert J6)"
```

```json:metadata
{"files":["src/components/programacion/TripForm.tsx"],"verifyCommand":"npm run build && grep -n \"disabled={fieldsDisabled\" src/components/programacion/TripForm.tsx","acceptanceCriteria":["disabled sin !!rateId","handleRateChange pre-rellena pero no bloquea","comment actualizado a Cambio 4 revert J6"]}
```

---

## Task 9: Polish round 2 — line cards limpieza completa (B1+B2+B3+B4+B5 single commit)

**Goal:** Cleanup cohesivo de TODAS las line cards. B1: eliminar project info + cost code/category de líneas (redundante con header de solicitud). B2: descripción/ruta sin truncate. B3: notas SÍ pueden truncar con tooltip. B4: tooltips universales con metadata útil. B5: aprovechar real estate (mejor wrap que truncate). Single commit por cohesión del scope.

**Files:**
- Modify: `src/components/solicitudes/LineRow.tsx`
- Modify: `src/components/programacion/BacklogTable.tsx`
- Modify: `src/components/programacion/LineSelector.tsx`
- Modify: `src/components/viajes/TripCard.tsx`
- Modify: `src/app/(app)/programacion/viaje/[id]/page.tsx` (AssignmentRow inline)
- Modify: `src/app/(app)/mis-viajes/[id]/page.tsx` (AssignmentRow inline si tiene líneas)
- Modify: `src/lib/utils/format.ts` (helper `statusContextString` nuevo)

**Acceptance Criteria:**
- [ ] B1: 0 matches en line cards de `project.code` (standalone), `project.name`, `cost_code`, `cost_category`
- [ ] B2: 0 matches de `truncate` o `line-clamp-N` aplicados a descripción o ruta (from/to) en line cards
- [ ] B3: notas mantienen `truncate` PERO siempre con `title={notes}` o equivalente
- [ ] B4: helper `statusContextString(status, line)` en format.ts; tooltips universales en descripción, ruta, cantidad, status badge, notas, receptor
- [ ] B5: `max-w-N` constraints removidos de descripción/ruta; mobile permite wrap multi-línea
- [ ] `npm run build` → verde
- [ ] Smoke visual no regresivo: line cards mantienen layout legible

**Verify:**
```bash
npm run build
grep -rEn "truncate.*description|description.*truncate" src/components/solicitudes/ src/components/programacion/ src/components/viajes/ "src/app/(app)/programacion/" "src/app/(app)/mis-viajes/" "src/app/(app)/solicitudes/"
grep -rEn "line-clamp.*description|truncate.*from|truncate.*to" src/
```

Expected: build verde + 0 matches en greps regression.

**Steps:**

- [ ] **Step 1: format.ts — agregar helper `statusContextString`**

Append al final de `src/lib/utils/format.ts`:

```typescript
/**
 * Genera tooltip extendido para badges de status en line cards.
 * Incluye contexto per-status (provider para externo, fecha aprobación
 * para pickup, scheduled date para programada, etc.).
 *
 * @param status - Status canónico de la línea
 * @param info - Objeto con campos opcionales para contexto extendido
 */
export function statusContextString(
  status: string,
  info?: {
    pickup_approved_at?: string | null
    pickup_received_by_name?: string | null
    pickup_completed_at?: string | null
    external_provider_name?: string | null
    external_invoice_amount?: number | null
    external_approved_at?: string | null
    external_completed_at?: string | null
    external_received_by_name?: string | null
    qty_delivered?: number | null
    quantity?: number
    delivered_at?: string | null
  },
): string {
  if (!info) return status
  switch (status) {
    case 'Pickup Aprobado':
      return info.pickup_approved_at
        ? `Pickup Aprobado el ${formatDate(info.pickup_approved_at)}`
        : status
    case 'Externo Aprobado':
      if (info.external_provider_name && info.external_invoice_amount != null) {
        return `Externo: ${info.external_provider_name}, ${formatCurrency(info.external_invoice_amount)}, aprobado ${info.external_approved_at ? formatDate(info.external_approved_at) : '—'}`
      }
      return status
    case 'Entregada':
      if (info.external_completed_at) {
        const receiver = info.external_received_by_name ?? '(no captado)'
        return `Entregada externo: ${info.quantity ?? '—'} el ${formatDate(info.external_completed_at)}, receptor ${receiver}`
      }
      if (info.pickup_completed_at) {
        const receiver = info.pickup_received_by_name ?? '—'
        return `Entregada pickup: ${info.quantity ?? '—'} el ${formatDate(info.pickup_completed_at)}, receptor ${receiver}`
      }
      if (info.delivered_at) {
        return `Entregada: ${info.qty_delivered ?? info.quantity ?? '—'} de ${info.quantity ?? '—'} el ${formatDate(info.delivered_at)}`
      }
      return status
    case 'Parcial':
      return `Parcial: ${info.qty_delivered ?? 0} de ${info.quantity ?? '—'} entregadas`
    default:
      return status
  }
}
```

- [ ] **Step 2: LineRow.tsx — Polish (B1+B2+B4+B5)**

LineRow ya no tiene project.code/name (eliminado en Cambio 2 según comentario línea 105). Solo aplicar B2 + B4 + B5:

**B2/B5 — eliminar `max-w-[200px] truncate` en desktop descripción (línea 84):**

Old:
```tsx
<span className="min-w-0 max-w-[200px] truncate font-medium text-gray-900" title={line.description}>
  {line.description}
</span>
```

New:
```tsx
<span className="min-w-0 font-medium text-gray-900" title={line.description}>
  {line.description}
</span>
```

**B2/B5 — eliminar `max-w-[120px] truncate` en desktop ruta (líneas 90, 92):**

Old:
```tsx
<span className="max-w-[120px] truncate" title={fromName}>{fromName}</span>
<ArrowRight className="h-3.5 w-3.5 shrink-0 text-gray-400" />
<span className="max-w-[120px] truncate" title={toName}>{toName}</span>
```

New:
```tsx
<span title={fromName}>{fromName}</span>
<ArrowRight className="h-3.5 w-3.5 shrink-0 text-gray-400" />
<span title={toName}>{toName}</span>
```

**B2/B5 — eliminar `max-w-[130px] truncate` en mobile ruta (líneas 222, 224):**

Old:
```tsx
<span className="max-w-[130px] truncate">{fromName}</span>
<ArrowRight className="h-3 w-3 shrink-0 text-gray-400" />
<span className="max-w-[130px] truncate">{toName}</span>
```

New:
```tsx
<span title={fromName}>{fromName}</span>
<ArrowRight className="h-3 w-3 shrink-0 text-gray-400" />
<span title={toName}>{toName}</span>
```

**B2/B5 — eliminar `truncate` en mobile descripción (línea 195):**

Old:
```tsx
<span className="min-w-0 truncate text-sm font-medium text-gray-900">
  {line.description}
</span>
```

New:
```tsx
<span className="min-w-0 text-sm font-medium text-gray-900" title={line.description}>
  {line.description}
</span>
```

**B4 — agregar tooltip a status badge usando `statusContextString` (Cambio 4):**

Importar el helper:
```typescript
import { statusContextString } from '@/lib/utils/format'
```

En el render del Badge desktop (línea 121):
```tsx
<Badge variant="line" label={status} title={statusContextString(status, {
  pickup_approved_at: pickupInfo?.pickup_approved_at,
  pickup_received_by_name: pickupInfo?.pickup_received_by_name,
  pickup_completed_at: pickupInfo?.pickup_completed_at,
  external_provider_name: externalInfo?.external_provider_name,
  external_invoice_amount: externalInfo?.external_invoice_amount,
  external_approved_at: externalInfo?.external_approved_at,
  external_completed_at: externalInfo?.external_completed_at,
  external_received_by_name: externalInfo?.external_received_by_name,
  qty_delivered: line.qty_delivered,
  quantity: line.quantity,
})} />
```

Nota: si `Badge` no tiene prop `title`, alternativa: wrap en `<span title={...}>`.

- [ ] **Step 3: BacklogTable.tsx — Polish (B1+B2+B5)**

**B1 — eliminar código de proyecto desktop (líneas 161-163):**

Old:
```tsx
{/* Codigo de proyecto */}
<span className="shrink-0 text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
  {line.request.project?.code ?? '—'}
</span>
```

New: (línea eliminada — el ID de solicitud ya contiene el código de proyecto)

**B1 — eliminar código de proyecto mobile (líneas 268-270):**

Old:
```tsx
<span className="text-gray-400">·</span>
<span className="font-medium text-gray-600">
  {line.request.project?.code ?? '—'}
</span>
```

New: (líneas eliminadas, también eliminar el separador `·` que las precede)

**B2 — eliminar `truncate` y `max-w-50` de descripción desktop (línea 140):**

Old:
```tsx
<span className="min-w-0 max-w-50 truncate font-medium text-gray-900" title={line.description}>
```

New:
```tsx
<span className="min-w-0 font-medium text-gray-900" title={line.description}>
```

**B2 — eliminar `truncate` y `max-w-27.5` de ruta desktop (líneas 167, 171):**

Old:
```tsx
<span className="max-w-27.5 truncate text-xs" title={fromName}>
  {fromName}
</span>
<ArrowRight className="h-3.5 w-3.5 shrink-0 text-gray-400" />
<span className="max-w-27.5 truncate text-xs" title={toName}>
  {toName}
</span>
```

New:
```tsx
<span className="text-xs" title={fromName}>
  {fromName}
</span>
<ArrowRight className="h-3.5 w-3.5 shrink-0 text-gray-400" />
<span className="text-xs" title={toName}>
  {toName}
</span>
```

**B2 — eliminar `truncate max-w-32.5` de ruta mobile (líneas 297, 299):**

Old:
```tsx
<span className="max-w-32.5 truncate">{fromName}</span>
<ArrowRight className="h-3 w-3 shrink-0 text-gray-400" />
<span className="max-w-32.5 truncate">{toName}</span>
```

New:
```tsx
<span title={fromName}>{fromName}</span>
<ArrowRight className="h-3 w-3 shrink-0 text-gray-400" />
<span title={toName}>{toName}</span>
```

**B2 — eliminar `truncate` de descripción mobile (línea 254):**

Old:
```tsx
<span className="min-w-0 truncate text-sm font-medium text-gray-900">
  {line.description}
</span>
```

New:
```tsx
<span className="min-w-0 text-sm font-medium text-gray-900" title={line.description}>
  {line.description}
</span>
```

**B3 — verificar notas truncan CON tooltip:**

Líneas 184-191 (notas solicitud), 194-201 (notas línea): conservar `truncate` PORQUE ya tienen `title={...}`. OK.

**B4 — agregar tooltip de cantidad desktop (línea 204):**

Old:
```tsx
<span className="shrink-0 whitespace-nowrap text-gray-700 text-xs ml-auto">
  {formatQty(Math.max(0, line.quantity - (line.qty_scheduled ?? 0) - (line.qty_delivered ?? 0)))} {unitCode}
```

New:
```tsx
<span className="shrink-0 whitespace-nowrap text-gray-700 text-xs ml-auto"
  title={`Disponible: ${formatQty(Math.max(0, line.quantity - (line.qty_scheduled ?? 0) - (line.qty_delivered ?? 0)))} ${unitCode}. Total: ${formatQty(line.quantity)}, Programado: ${formatQty(line.qty_scheduled ?? 0)}, Entregado: ${formatQty(line.qty_delivered ?? 0)}`}>
  {formatQty(Math.max(0, line.quantity - (line.qty_scheduled ?? 0) - (line.qty_delivered ?? 0)))} {unitCode}
```

- [ ] **Step 4: LineSelector.tsx — Polish (B1+B2+B5)**

**B1 — eliminar project.name del componente LineInfo (líneas 87-92):**

Old:
```tsx
{line.request.project?.name && (
  <span className="text-xs font-medium text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded shrink-0"
    title={line.request.project.code ?? undefined}>
    {line.request.project.name}
  </span>
)}
```

New: (bloque completo eliminado — el ID de solicitud ya contiene el código de proyecto)

**B2 — eliminar `truncate` de descripción (línea 77):**

Old:
```tsx
<span className="text-sm font-medium text-gray-900 truncate">
  {line.description}
</span>
```

New:
```tsx
<span className="text-sm font-medium text-gray-900" title={line.description}>
  {line.description}
</span>
```

**B2 — eliminar `truncate max-w-30` de ruta (líneas 97, 99):**

Old:
```tsx
<span className="truncate max-w-30">{fromName}</span>
<ArrowRight className="h-3 w-3 shrink-0 text-gray-400" />
<span className="truncate max-w-30">{toName}</span>
```

New:
```tsx
<span title={fromName}>{fromName}</span>
<ArrowRight className="h-3 w-3 shrink-0 text-gray-400" />
<span title={toName}>{toName}</span>
```

- [ ] **Step 5: programacion/viaje/[id]/page.tsx AssignmentRow inline — Polish (B1+B2+B5)**

**B1 — eliminar project.name (líneas 157-162):**

Old:
```tsx
{line?.request?.project?.name && (
  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600"
    title={line.request.project.code ?? undefined}>
    {line.request.project.name}
  </span>
)}
```

New: (bloque eliminado)

**B2 — eliminar `truncate` y `max-w-25 sm:max-w-37.5` de ruta (líneas 168, 170):**

Old:
```tsx
<span className="truncate max-w-25 sm:max-w-37.5">{fromName}</span>
<ArrowRight className="h-3 w-3 shrink-0 text-gray-400" />
<span className="truncate max-w-25 sm:max-w-37.5">{toName}</span>
```

New:
```tsx
<span title={fromName}>{fromName}</span>
<ArrowRight className="h-3 w-3 shrink-0 text-gray-400" />
<span title={toName}>{toName}</span>
```

**B2 — eliminar `truncate` de descripción (línea 147):**

Old:
```tsx
<span className="truncate text-sm font-medium text-gray-900">
  {line?.description ?? 'Cargando...'}
</span>
```

New:
```tsx
<span className="text-sm font-medium text-gray-900" title={line?.description}>
  {line?.description ?? 'Cargando...'}
</span>
```

**B2 — eliminar `truncate max-w-24` de solicitante (línea 182):**

Old:
```tsx
<span className="truncate max-w-24">{line.request.requester.name.split(' ').slice(0, 2).join(' ')}</span>
```

New:
```tsx
<span title={line.request.requester.name}>{line.request.requester.name.split(' ').slice(0, 2).join(' ')}</span>
```

**B2 — eliminar `truncate max-w-[250px]` en expandRender de programacion/page.tsx (línea 901):**

Old:
```tsx
<span className="font-medium text-gray-900 truncate max-w-[250px]" title={line.description}>
  {line.description}
</span>
```

New:
```tsx
<span className="font-medium text-gray-900" title={line.description}>
  {line.description}
</span>
```

- [ ] **Step 6: mis-viajes/[id]/page.tsx — Polish AssignmentRow inline**

Buscar en `src/app/(app)/mis-viajes/[id]/page.tsx`:

```bash
grep -n "truncate\|line-clamp\|max-w-" src/app/\(app\)/mis-viajes/\[id\]/page.tsx
```

Aplicar mismo patrón B1+B2: eliminar project.code/name standalone, descripción y ruta sin truncate. Verificar manualmente cada match. Si algún `max-w-` es legítimo (ej. en un container parent que NO es line card), conservar.

- [ ] **Step 7: TripCard.tsx — Polish (verificar)**

`TripCard.tsx` muestra summary trip-level (ID, status, conductor, vehículo, contadores). NO tiene line cards inline. Verificar que no hay refs eliminables:

```bash
grep -n "truncate\|line-clamp\|project.code\|project.name\|cost_code\|cost_category" src/components/viajes/TripCard.tsx
```

Si 0 matches relevantes, no hace falta cambio. Si hay matches, aplicar mismo patrón.

- [ ] **Step 8: Build + greps regression + commit**

```bash
npm run build
grep -rEn "truncate.*description|description.*truncate" src/components/solicitudes/ src/components/programacion/ src/components/viajes/ "src/app/(app)/programacion/" "src/app/(app)/mis-viajes/" "src/app/(app)/solicitudes/"
grep -rEn "line-clamp.*description|truncate.*from|truncate.*to|truncate.*ruta" src/
```

Expected: build verde + 0 matches en greps regression (notas SÍ pueden tener truncate — eso es B3 OK).

```bash
git add src/components/solicitudes/LineRow.tsx src/components/programacion/BacklogTable.tsx src/components/programacion/LineSelector.tsx src/components/viajes/TripCard.tsx src/lib/utils/format.ts "src/app/(app)/programacion/viaje/[id]/page.tsx" "src/app/(app)/programacion/page.tsx" "src/app/(app)/mis-viajes/[id]/page.tsx"
git commit -m "$(cat <<'EOF'
feat: T9 Cambio 4 — Polish round 2 line cards (B1+B2+B3+B4+B5)

B1: eliminar project.code/name standalone + cost_code/cost_category de
TODAS las line cards (LineRow, BacklogTable desktop+mobile, LineSelector,
AssignmentRow inline en programacion/viaje/[id] y mis-viajes/[id]).
Razón: redundante con header de solicitud post-Cambio 2.

B2: descripción + ruta sin truncate/line-clamp/max-w-N. Permitir wrap
multi-línea en mobile.

B3: notas mantienen truncate CON tooltip (title={notes}).

B4: tooltips universales con title HTML nativo. statusContextString()
helper en format.ts arma string per-status (incluye externo provider/cost,
pickup approved_by, partial qty, etc.).

B5: real estate aprovechado — mejor wrap a 2-3 líneas que truncar.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

```json:metadata
{"files":["src/components/solicitudes/LineRow.tsx","src/components/programacion/BacklogTable.tsx","src/components/programacion/LineSelector.tsx","src/components/viajes/TripCard.tsx","src/lib/utils/format.ts","src/app/(app)/programacion/viaje/[id]/page.tsx","src/app/(app)/programacion/page.tsx","src/app/(app)/mis-viajes/[id]/page.tsx"],"verifyCommand":"npm run build && grep -rEn \"truncate.*description|description.*truncate\" src/components/ 'src/app/(app)/'","acceptanceCriteria":["B1: 0 matches project.code/name/cost_code/cost_category en line cards","B2: 0 matches truncate en descripción/ruta","B3: notas truncan CON tooltip","B4: statusContextString helper + tooltips universales","B5: max-w-N removido de desc/ruta","build verde"]}
```

---

## ⏸ PARADA — Smoke test manual de James

**Antes de T10 (T-final docs), Code DEBE:**
1. Reportar a James estado completo del run (commits T1–T9, files cambiados, build status)
2. Listar las 10 verificaciones del smoke test (ver §9 Smoke test list del spec)
3. Esperar OK explícito de James

**Code NO ejecuta T10 automáticamente** — solo después de recibir confirmación de smoke OK.

Si James detecta bug en smoke:
- Documentar en `Docs/cambio4-incidente.md`
- Working tree limpio (no commits a medias)
- James decide qué hacer (fix + re-smoke, rollback, etc.)

---

## Task 10: T-final docs (CHANGELOG + spec maestro v3 + BACKLOG + CLAUDE.md regla #9 + FEATURE_SPEC.md v4 + plan deletion)

**Goal:** Documentar Cambio 4 en docs vivos, revertir CLAUDE.md regla #9 (J6), actualizar FEATURE_SPEC.md v4 línea 385 (eliminar referencia a `is_external` que ya no existe), agregar Sección 4 al spec maestro v3, cerrar items relacionados en BACKLOG, flip frontmatter del spec a `shipped` con commits range, borrar plan + tasks.json per `plan-lifecycle.md`. **NO se ejecuta hasta que James confirme smoke test OK.**

**Files:**
- Modify: `Docs/CHANGELOG.md` (entry [feat] Cambio 4 + 2 entries [bd])
- Modify: `Docs/reference/events-v2-redesign-in-progress-v3.md` (Sección 4 — Cambio 4 Externo)
- Modify: `Docs/BACKLOG.md` (cerrar items relacionados)
- Modify: `CLAUDE.md` (regla #9 — revert J6)
- Modify: `Docs/FEATURE_SPEC.md` (línea 385 — eliminar referencia is_external)
- Modify: `Docs/superpowers/specs/2026-04-28-cambio4-external-design.md` (frontmatter status: shipped + shipped_commits)
- Delete: `Docs/superpowers/plans/2026-04-28-cambio4-external.md` (este plan)
- Delete: `Docs/superpowers/plans/2026-04-28-cambio4-external.md.tasks.json`
- Modify: `Docs/TRAIL.md` (actualizar posición en árbol)

**Acceptance Criteria:**
- [ ] CHANGELOG entry `[feat]` describe los 3 sub-cambios consolidados (A externo, B polish, C cost editable) + decisiones cerradas Q1-Q5 + Issues #1+#2 + 9 commits T1-T9
- [ ] CHANGELOG 2 entries `[bd]` con SQL completo de las 2 migraciones (cambio4_external_provider_redesign + cambio4_external_add_received_by_columns), pendientes prod en merge final v2
- [ ] Spec maestro v3 con Sección 4 Externo agregada, frontmatter v3.3 si Chat aprueba
- [ ] BACKLOG: cerrar D5 (third_party fulfillment) si existe, J9-related, F1.3 si aplica
- [ ] CLAUDE.md regla #9: revert J6 — texto refleja "costo siempre editable; rate solo pre-rellena"
- [ ] FEATURE_SPEC.md línea 385: actualizar fila "Transporte externo" para reflejar modelo nuevo per-línea (no toggle is_external)
- [ ] Spec frontmatter `status: shipped` con `shipped_commits: <hash range T1..T10>`
- [ ] Plan + .tasks.json borrados (per plan-lifecycle.md "borrar al cerrar feature")
- [ ] TRAIL.md actualizado con nueva posición (Cambio 4 cerrado, siguiente target)
- [ ] `npm run build` → verde (último commit T10)

**Verify:** `git log --oneline jaime/dev | head -15 && grep -n "Cambio 4" Docs/CHANGELOG.md && ls Docs/superpowers/plans/2026-04-28-cambio4-external.md 2>&1` (último ls debe fallar — file borrado).

**Steps:**

- [ ] **Step 1: Verificar smoke test OK**

James debe haber confirmado explícitamente vía mensaje en chat que las 10 verificaciones del smoke test list pasaron. Si no hay confirmación, NO proceder.

- [ ] **Step 2: CHANGELOG entry [feat] Cambio 4**

Append al inicio del archivo (bajo "## YYYY-MM-DD" del día actual, crear sección si no existe):

```markdown
## 2026-04-28
- [feat] **Cambio 4 — Viaje Externo + UI Polish round 2 + Costo Trip editable shippeado.**
  - **A. Viaje externo (modelo bandera-en-línea, gemelo de Cambio 3 Pickup)**: hook `useExternal.ts` con 4 funciones (approveExternal/convertLineToExternal/completeExternal/revertExternalToBacklog), 3 UI surfaces (BacklogTable button "Aprobar viaje externo" + modal inline approve; AssignmentRow button "Convertir a externo" + modal inline convert con 2 variantes; sección dedicada "Viajes Externos Pendientes" con `ExternalDeliveryModal` + revert modal), badge "EXTERNO APROBADO" azul + "ENTREGADO (EXTERNO)" verde en LineRow, `cancelSolicitud` filter incluye `'Externo Aprobado'`. Componente shared `ExternalApprovalForm.tsx` consumido por Surface 1+2 modales (provider + cost + factura + notas). UPDATE atómicos con WHERE clauses defensivas. CHECK constraint pickup/external mutuamente excluyente respetado. Permission gate logistica/admin en Surfaces 1+2+3+revert. Cleanup completo del modelo viejo `is_external` (TripForm checkbox + state + handler + prop; useTrips TripInput/mappers/queries; viaje/[id] tripToInput + initial state; viaje/nuevo state). Decisiones cerradas (Q1-Q5): Q1=A form shared + 2 modales inline, Q2=A revert J6, Q3=A solo Surface 3, Q4=preservar `external_invoice_attachments` en revert, Q5=inconsistencia intencional cost validation (externo > 0, trip >= 0). Issue #1 fix: persistencia receptor en columnas dedicadas `external_received_by_id` + `external_received_by_name` (Chat aplicó BD change adicional). Issue #2 fix: grep regression incluye `truncate.*description`.
  - **B. UI Polish round 2 line cards limpieza**: eliminar `project.code/name` standalone + `cost_code/cost_category` per-línea de TODAS las line cards (LineRow, BacklogTable desktop+mobile, LineSelector, AssignmentRow inline en programacion/viaje/[id] y mis-viajes/[id], TripCard summary). Razón: redundante con header de solicitud post-Cambio 2. Descripción + ruta SIN `truncate`/`line-clamp`/`max-w-N` (permitir wrap multi-línea en mobile). Notas mantienen truncate CON tooltip (B3). Tooltips universales con `title` HTML nativo + helper `statusContextString(status, line)` en `format.ts` para context per-status (incluye externo provider/cost, pickup approved_by, partial qty).
  - **C. Costo Trip editable (revert J6)**: `TripForm.tsx:408` `disabled={fieldsDisabled || !!rateId}` → `disabled={fieldsDisabled}`. Costo siempre editable como override manual incluso con rate seleccionada. handleRateChange pre-rellena cost del rate.amount pero NO bloquea. Decisión explícita de James: J6 fue mal aplicado; movimientos internos / casos especiales requieren cost custom. CLAUDE.md regla #9 revertida.
  - **Deuda técnica conocida:** `convertLineToExternal` (Surface 2) NO atómico server-side (DELETE assignment + UPDATE línea son 2 queries; mismo patrón que `convertLineToPickup`; riesgo bajo en v1, polish post-merge a RPC SQL con SECURITY DEFINER). Tests E2E del flow nuevo bloqueados por AD-5. `notification_log` event_types nuevos para externo no agregados v1 — no hay templates de notification.
  - **Edge cases cubiertos**: E1-E12 del spec (Pendiente→Externo directo; bloqueo qty_delivered>0; mixto pickup+externo+programada; trip multi-assignment no cancela; CHECK constraint exclusividad; revert preserva factura; no botón en /solicitudes/[id]; Borrador no posible; cancelSolicitud incluye Externo Aprobado; concurrencia traduce error; receptor opcional NULL OK; race revert during delivery).
  - Cierra items: **AD-3** (Fulfillment a nivel línea — pickup + externo cubren los casos non-fleet), parcialmente cierra contexto de Tier 1 perfeccionar movilizaciones. Plan: `Docs/superpowers/plans/2026-04-28-cambio4-external.md` (borrado al cierre per `plan-lifecycle.md`). Spec: `Docs/superpowers/specs/2026-04-28-cambio4-external-design.md` (status: shipped). Commits: `<rango T1..T10>`.

- [bd] **Cambio 4 BD aplicada por Chat en staging — migración 1: `cambio4_external_provider_redesign`.**
  - 8 columnas externo nuevas en `sm_request_lines`: `external_by_provider boolean DEFAULT false NOT NULL`, `external_approved_at timestamptz`, `external_approved_by uuid REFERENCES people(id)`, `external_completed_at timestamptz`, `external_provider_name text`, `external_invoice_amount numeric(12,2)`, `external_invoice_attachments jsonb DEFAULT '[]'::jsonb NOT NULL`, `external_notes text`.
  - CHECK constraint `sm_request_lines_pickup_external_exclusive`: `(pickup_by_project = false OR external_by_provider = false)` — pickup y externo mutuamente excluyentes per línea.
  - DROP `trips.is_external` (modelo viejo eliminado, 0 trips con `is_external=true` en prod — sin data migration).
  - `cascade_request_status` actualizado para tratar `'Externo Aprobado'` como `in_progress` (paralelo a `'Pickup Aprobado'`).
  - Pendiente aplicar a prod: en el merge final v2 del branch `jaime/dev`.

- [bd] **Cambio 4 BD aplicada por Chat en staging — migración 2: `cambio4_external_add_received_by_columns`.**
  - 2 columnas adicionales en `sm_request_lines`: `external_received_by_id uuid REFERENCES people(id)` + `external_received_by_name text`.
  - Razón: persistencia limpia del receptor de delivery externo. Chat rechazó reuso polimórfico de `pickup_received_by_*` por costos invisibles (naming lies en queries futuros, queries BI naturales que filtrarían externos como pickups, deuda técnica raramente pagada).
  - **Total final: 10 columnas externo** en `sm_request_lines`.
  - Pendiente aplicar a prod: en el merge final v2 (junto con migración 1).
```

- [ ] **Step 3: BACKLOG.md — cerrar items relacionados**

Buscar y actualizar:

- D5 (third_party fulfillment) si existe → marcar como CLOSED Cambio 4
- J9-related → CLOSED Cambio 4
- F1.3 (third_party flow) si aplica → CLOSED Cambio 4
- AD-3 (fulfillment a nivel línea) → CLOSED Cambio 4

Agregar entry pendiente: "Pickup + Externo post-merge: convertir `convertLineToPickup` y `convertLineToExternal` a RPC SQL con SECURITY DEFINER para atomicidad server-side. Riesgo bajo v1 (1 Charris operando). Polish post-merge."

- [ ] **Step 4: CLAUDE.md regla #9 — revert J6**

Buscar regla #9 (texto actual):
> "Tarifa y Costo OPCIONALES. Si se selecciona tarifa, Costo se auto-rellena con `rate.amount` y queda **read-only** (deseleccionar tarifa para editar manualmente). El campo no es editable mientras haya tarifa. **Cambio 2026-04-15 (J6):** antes el campo seguía editable con diálogo de confirmación."

Reemplazar con:
> "Tarifa y Costo OPCIONALES. Si se selecciona tarifa, Costo se auto-rellena con `rate.amount` pero **sigue editable** como override manual (movimientos internos / casos especiales pueden requerir cost custom incluso con rate). Si se deselecciona tarifa, cost mantiene el valor manual (no se borra). **Cambio 2026-04-28 (Cambio 4):** revert J6 — cost editable con rate seleccionada, decisión explícita de James (J6 fue mal aplicado, había falsos read-only)."

- [ ] **Step 5: FEATURE_SPEC.md línea 385 — actualizar referencia is_external**

Edit línea 385 (fila "Transporte externo"):

Old:
```markdown
| Transporte externo | Toggle | ❌ | `is_external`. Default: false. |
```

New:
```markdown
| Transporte externo | (eliminado del trip) | ❌ | Cambio 4 (2026-04-28): el modelo de transporte externo ya no es un toggle del trip. Ahora es una bandera per-línea en `sm_request_lines` (`external_by_provider`) con flow propio: aprobar desde backlog, convertir desde trip detail, sección dedicada con factura. Ver Cambio 4 en CHANGELOG. |
```

- [ ] **Step 6: Spec maestro v3 — agregar Sección 4 Cambio 4 Externo**

Edit `Docs/reference/events-v2-redesign-in-progress-v3.md` agregando al final (antes de cualquier sección de `## Future` o equivalente) una sección 4 nueva. Estructura paralela a la Sección 3 Pickup (si existe). Incluir:

- Goal del Cambio 4 (modelo bandera-en-línea, gemelo de Pickup)
- Diferencias clave vs Pickup (form modal vs confirm only; receptor opcional vs XOR; badge azul vs amber)
- 3 UI surfaces (BacklogTable, AssignmentRow, sección dedicada)
- 4 funciones del hook
- Edge cases E1-E12
- Deuda técnica conocida
- Frontmatter v3.3 si aprobado

Si Chat no ha aprobado v3.3 explícitamente, usar versión actual del frontmatter.

- [ ] **Step 7: Spec frontmatter — flip a shipped**

Edit `Docs/superpowers/specs/2026-04-28-cambio4-external-design.md` frontmatter:

Old:
```yaml
---
name: cambio-4-external-provider
description: Viaje externo (modelo bandera-en-línea, gemelo de Pickup) + UI polish round 2 (line cards limpieza) + costo trip editable (revert J6)
status: draft
feature: Cambio 4 — Externo + Polish round 2 + Cost editable
shipped_commits:
deprecated_reason:
---
```

New (replace `<HASH_T1>` y `<HASH_T9>` con hashes reales):
```yaml
---
name: cambio-4-external-provider
description: Viaje externo (modelo bandera-en-línea, gemelo de Pickup) + UI polish round 2 (line cards limpieza) + costo trip editable (revert J6)
status: shipped
feature: Cambio 4 — Externo + Polish round 2 + Cost editable
shipped_commits: <HASH_T1>..<HASH_T9>
deprecated_reason:
---
```

Para obtener los hashes:
```bash
git log --oneline jaime/dev | head -10
```

- [ ] **Step 8: Borrar plan + tasks.json**

Per `plan-lifecycle.md` "al cerrar una tarea completa: borrar el plan file":

```bash
git rm "Docs/superpowers/plans/2026-04-28-cambio4-external.md"
git rm "Docs/superpowers/plans/2026-04-28-cambio4-external.md.tasks.json"
```

- [ ] **Step 9: TRAIL.md — actualizar posición**

Edit `Docs/TRAIL.md` para reflejar:
- Cambio 4 ✅ shippeado en jaime/dev
- Próximo target: discutir con James (merge v2 staging→prod, otros polish, etc.)
- Plan file activo: ninguno

Marcar el sub-tree de Events V2 v2 con Cambio 4 cerrado (paralelo a cómo se marcó Cambio 3).

- [ ] **Step 10: Build verde + commit T-final**

```bash
npm run build
```

Commit consolidado de todos los cambios docs:

```bash
git add Docs/CHANGELOG.md Docs/BACKLOG.md CLAUDE.md Docs/FEATURE_SPEC.md Docs/reference/events-v2-redesign-in-progress-v3.md Docs/superpowers/specs/2026-04-28-cambio4-external-design.md Docs/TRAIL.md
git commit -m "$(cat <<'EOF'
docs: T-final Cambio 4 — CHANGELOG + spec shipped + BACKLOG + CLAUDE.md regla #9 revert + FEATURE_SPEC v4 + TRAIL

CHANGELOG:
- [feat] entry consolida 3 sub-cambios (Externo + Polish round 2 + Cost
  editable), 5 Q's cerradas, 2 Issues fixed, 9 commits T1-T9
- 2 entries [bd]: cambio4_external_provider_redesign (8 cols + CHECK + DROP) +
  cambio4_external_add_received_by_columns (2 cols receptor)

BACKLOG: cerrar AD-3 (fulfillment per-línea cubierto), D5 third_party,
J9-related, F1.3 si aplica.

CLAUDE.md regla #9: revert J6. Costo siempre editable con rate, rate
solo pre-rellena. Decisión explícita de James (J6 fue mal aplicado).

FEATURE_SPEC.md v4 línea 385: actualizar fila "Transporte externo" —
ya no es toggle del trip, ahora es bandera per-línea (modelo Cambio 4).

Spec maestro v3: Sección 4 Cambio 4 Externo agregada (paralelo a
Sección 3 Pickup). Frontmatter v3.3 si aprobado.

Spec del Cambio 4: frontmatter status=shipped + shipped_commits range.

TRAIL: Cambio 4 cerrado en árbol Events V2 v2.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

Plan + tasks.json deletion en commit separado:

```bash
git commit -m "chore: borrar plan Cambio 4 — feature cerrado per plan-lifecycle.md"
```

```json:metadata
{"files":["Docs/CHANGELOG.md","Docs/BACKLOG.md","CLAUDE.md","Docs/FEATURE_SPEC.md","Docs/reference/events-v2-redesign-in-progress-v3.md","Docs/superpowers/specs/2026-04-28-cambio4-external-design.md","Docs/TRAIL.md"],"verifyCommand":"npm run build && grep -n \"Cambio 4\" Docs/CHANGELOG.md","acceptanceCriteria":["CHANGELOG [feat] + 2 [bd] entries","BACKLOG cierra items relacionados","CLAUDE.md regla #9 revert","FEATURE_SPEC.md línea 385 updated","spec frontmatter shipped","plan + tasks.json borrados","TRAIL actualizado","build verde"]}
```

---

## Self-Review

### 1. Spec coverage check

Verifico cada sub-scope del spec contra tasks:

| Spec section | Coverage |
|---|---|
| §3 A. Externo como gemelo de Pickup | T2 (hook) + T4-T6 (3 surfaces) + T7 (badges + cancelSolicitud) ✅ |
| §3 B. Form shared + 2 modales inline (Q1=A) | T3 (ExternalApprovalForm shared) + T4 (Surface 1 modal inline) + T5 (Surface 2 modal inline) ✅ |
| §3 C. Revert J6 (Q2=A) | T8 (cost editable) + T10 (CLAUDE.md regla #9 revert) ✅ |
| §3 D. Permission gate Surface 3 (Q3=A) | T6 permission gate solo logistica/admin ✅ |
| §3 E. Revert preserva factura (Q4=SÍ) | T2 revertExternalToBacklog NO toca external_invoice_attachments ✅ |
| §3 F. Inconsistencia cost validation (Q5) | T2 hook valida amount > 0 estricto + T8 cost editable >= 0 (sin validación strict) ✅ |
| §3 G. UPDATE atómicos con WHERE defensivas | T2 hook todas las 4 funciones con WHERE ✅ |
| §3 H. Error messages actionable | T2 translateBdError() helper + CHECK constraint message ✅ |
| §3 I. completeExternal append vs replace | T2 completeExternal append notes/attachments ✅ |
| §4 IN — A1-A8 | T1 cleanup is_external + T2 hook + T3 form + T4-T6 surfaces + T7 badges + T8 cost ✅ |
| §4 IN — B1-B5 polish | T9 single commit con greps regression ✅ |
| §4 IN — C cost editable | T8 ✅ |
| §4 IN — T-final docs | T10 ✅ |
| §6 E1-E12 edge cases | Cubiertos por hook validations + UI gating + smoke test list ✅ |
| §9 Acceptance #1-#12 | Mapeados a acceptance criteria de cada task ✅ |
| §9 Smoke test list (10 verificaciones) | Documentado en PARADA antes de T10 ✅ |

**Gap detection**: ninguno. Toda la sección IN del spec está cubierta por tasks específicas.

### 2. Placeholder scan

Búsqueda de patrones prohibidos:

- `TBD` / `TODO` / `implement later` / `fill in details`: 0 matches en plan
- `Add appropriate error handling` / `add validation` / `handle edge cases`: 0 matches genéricos (todos los handlers tienen código explícito)
- `Write tests for the above` sin código: N/A — tests E2E fuera de scope (AD-5 bloqueado)
- `Similar to Task N`: 0 matches — código repetido inline donde aplica
- Steps que describen sin código: 0 — todos los steps tienen old/new diff o código completo
- Refs a tipos/funciones no definidos: ✅ helpers como `statusContextString` definidos en T9 antes de uso, `validateApprovalForm`/`EMPTY_FORM_VALUES` definidos en T3 antes de T4-T5 que los consumen

### 3. Type consistency check

Verifico naming entre tasks:

| Identifier | First defined in | Used consistently in |
|---|---|---|
| `useExternal` (hook) | T2 | T4, T5, T6 ✅ |
| `approveExternal` | T2 | T4 confirmApproveExternal ✅ |
| `convertLineToExternal` | T2 | T5 confirmConvertToExternal ✅ |
| `completeExternal` | T2 | T6 handleCompleteExternal ✅ |
| `revertExternalToBacklog` | T2 | T6 confirmRevertExternal ✅ |
| `ExternalApprovalForm` | T3 | T4, T5 modales ✅ |
| `ExternalApprovalFormValues` | T3 | T4 externalApproveValues, T5 externalConvertValues ✅ |
| `ExternalApprovalFormErrors` | T3 | T4 externalApproveErrors, T5 externalConvertErrors ✅ |
| `validateApprovalForm` | T3 | T4 confirmApproveExternal, T5 confirmConvertToExternal ✅ |
| `EMPTY_FORM_VALUES` | T3 | T4, T5 init state ✅ |
| `ExternalDeliveryModal` | T6 | T6 import + render ✅ |
| `PendingExternalLine` | T6 | T6 state pendingExternals + ExternalDeliveryModal prop ✅ |
| `pickup_received_by_*` | (existente Cambio 3) | NO reusado en T2 (uso `external_received_by_*` per Q1 fix) ✅ |
| `external_received_by_*` | T1 (regen database.ts) | T2 completeExternal, T7 LineRow externalInfo ✅ |
| `external_by_provider` flag | T1 (regen) | T2 hook, T6 fetch query, T7 LineRow ✅ |
| `'Externo Aprobado'` status | T2 hook | T6 fetch query, T7 cancelSolicitud filter, T7 LineRow badge ✅ |

No naming drift detectado.

### 4. Plan completeness

- [ ] Plan header con goal/architecture/tech stack/spec ref ✅
- [ ] File structure overview con 3 new + 13 modify ✅
- [ ] 10 tasks (T1-T10) con dependency graph implícito en orden ✅
- [ ] PARADA explícita antes de T10 ✅
- [ ] Cada task tiene: Goal + Files + Acceptance Criteria + Verify + Steps con código ✅
- [ ] Cada task termina con commit + json:metadata ✅
- [ ] Self-review section (esta) ✅

**Plan listo para review de Chat.**


