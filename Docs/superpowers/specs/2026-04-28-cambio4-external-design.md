---
name: cambio-4-external-provider
description: Viaje externo (modelo bandera-en-línea, gemelo de Pickup) + UI polish round 2 (line cards limpieza) + costo trip editable (revert J6)
status: draft
feature: Cambio 4 — Externo + Polish round 2 + Cost editable
shipped_commits:
deprecated_reason:
---

# Cambio 4 — Viaje Externo + UI Polish round 2 + Costo Trip Editable

## §1 Contexto

Tercer cambio del rediseño Events V2 v2 (post-Cambio 1 Parada y Cambio 2 cost code, post-Cambio 3 Pickup). Consolida 3 sub-cambios atómicos en una corrida:

- **A. Viaje Externo** — modelo nuevo bandera-en-línea, gemelo arquitectónico del Cambio 3 Pickup. Reemplaza el modelo viejo `trips.is_external` (checkbox en TripForm) que estaba acoplado a la entidad Trip de manera incoherente con el dominio (un viaje externo no es un viaje de la flota interna; es la delegación del transporte a un tercero, con factura y costo, sin Trip).
- **B. UI Polish round 2** — limpieza de TODAS las line cards: eliminar info de proyecto + cost code/category (redundante con header de solicitud post-Cambio 2), descripción y ruta nunca trunca, tooltips universales con metadata útil.
- **C. Costo Trip editable** — revert J6 (regla #9 actual): cuando hay tarifa seleccionada el costo está bloqueado read-only. James decide explícitamente que el costo siga editable como override manual incluso con rate seleccionada.

**BD ya aplicada por Chat en staging** (2 migraciones):
- `cambio4_external_provider_redesign`:
  - 8 columnas externo en `sm_request_lines`: `external_by_provider`, `external_approved_at`, `external_approved_by`, `external_completed_at`, `external_provider_name`, `external_invoice_amount`, `external_invoice_attachments`, `external_notes`
  - CHECK constraint `sm_request_lines_pickup_external_exclusive` (mutuamente excluyentes per línea)
  - DROP `trips.is_external` (modelo viejo eliminado, 0 trips con `is_external=true` en prod — sin data migration)
  - `cascade_request_status` actualizado para tratar `'Externo Aprobado'` como `in_progress` (paralelo a `'Pickup Aprobado'`)
- `cambio4_external_add_received_by_columns` (aplicada durante brainstorming Cambio 4 tras detectar gap):
  - 2 columnas adicionales en `sm_request_lines`: `external_received_by_id uuid` (FK a `people(id)`) + `external_received_by_name text`
  - Razón: persistencia limpia del receptor de delivery externo (Q1 fix de spec; Chat rechazó reuso polimórfico de `pickup_received_by_*` por costos invisibles de naming lies en queries futuros)

**Total: 10 columnas externo** en `sm_request_lines`. Pendiente prod en merge final v2 (ambas migraciones).

Code en este sprint NO toca BD. Si encuentra algo que requiere BD durante el run, parar y reportar.

## §2 Goal

Una solicitud puede tener líneas mezcladas en su fulfillment:
- **Línea normal**: programada en un Trip de flota interna, con conductor + vehículo + entrega física verificada con código.
- **Línea pickup**: aprobada para retiro por proyecto destino (post-Cambio 3), sin Trip, sin conductor.
- **Línea externa** (Cambio 4): delegada a proveedor externo con factura, sin Trip de flota, con costo y notas registradas al aprobar.

UX consistente con Pickup: 3 surfaces (backlog, trip detail, sección dedicada), botones pill amber con texto puro, modales con validación, badges per-línea diferenciables (azul para externo vs amber para pickup).

Polish round 2 cierra deuda visual de las line cards después de Cambios 2 y 3 que dejaron campos redundantes.

Costo Trip editable cierra la regresión funcional de J6 que bloqueaba override manual del costo cuando había tarifa (James decide explícitamente que J6 fue mal aplicado: hay casos legítimos de override manual con rate seleccionada).

## §3 Architecture decisions

### A. Externo como gemelo de Pickup

Reuso del patrón Cambio 3 con diferencias localizadas. Mapeo 1:1:

| Aspecto | Pickup (existente) | Externo (nuevo) |
|---|---|---|
| Hook | `usePickup.ts` | `useExternal.ts` |
| BD flag línea | `pickup_by_project` | `external_by_provider` |
| Status nuevo | `'Pickup Aprobado'` | `'Externo Aprobado'` |
| Surface 1 botón | "Aprobar pickup" amber | "Aprobar viaje externo" amber |
| Surface 2 botón | "Convertir a pickup" amber | "Convertir a externo" amber |
| Surface 3 sección | Pickups Pendientes de Retiro | Viajes Externos Pendientes |
| Approve modal | Confirm-only inline (1 botón) | **Form modal** (provider + cost + factura + notas) |
| Convert modal | Inline 2 variantes | Inline 2 variantes (mismo form) |
| Delivery modal | `PickupDeliveryModal.tsx` | `ExternalDeliveryModal.tsx` |
| Receptor en delivery | XOR obligatorio (id O texto) | **OPCIONAL** (factura es prueba primaria, ambos campos pueden ser NULL) |
| Receptor BD persistencia | `pickup_received_by_id` + `pickup_received_by_name` | `external_received_by_id` + `external_received_by_name` (columnas dedicadas, agregadas por Chat tras Q1 fix) |
| Badge color aprobado | amber-100 / amber-800 | **blue-100 / blue-700** |
| Badge color entregado | emerald-100 / emerald-800 | emerald-100 / emerald-800 (igual) |
| Revert hook | `revertPickupToBacklog` | `revertExternalToBacklog` |
| Revert preserva | (n/a — pickup no tiene assets) | `external_invoice_attachments` |
| Permission Surface 1+2 | logistica + admin | logistica + admin |
| Permission Surface 3 | logistica + admin | logistica + admin |

### B. Form shared + 2 modales inline (Q1 = A)

`ExternalApprovalForm.tsx` es un **componente puro** con los 4 campos del flow de aprobación (provider, cost, factura, notas). Sin modal wrapper, sin estado interno — controlled component.

Los 2 wrappers son **modales inline en sus pages** que consumen el form:
- Surface 1: modal inline en `programacion/page.tsx` con header "Aprobar viaje externo" + botón primary amber
- Surface 2: modal inline en `programacion/viaje/[id]/page.tsx` con 2 variantes:
  - No última línea: header "Convertir a externo" + mensaje normal + botón primary amber
  - Última línea: header danger "Cancelar viaje y convertir a externo" + advertencia "Esta es la última línea del viaje X. Convertirla CANCELARÁ el viaje" + botón danger rojo

Razón de Q1=A:
- Paralelismo con pickup (modales inline en pages, no componentes wrapper universales)
- Form fields idénticos = DRY justificado
- Wrappers diferentes = contenido visual distinto, evita prop branching interno que se complica con el tiempo
- Validación expuesta como helper (`validateApprovalForm(values) → { valid, errors }`) que ambos wrappers pueden correr antes de submit

### C. Revert J6 (Q2 = A)

Regla #9 de CLAUDE.md actual (J6, 2026-04-15):
> "Tarifa y Costo OPCIONALES. Si se selecciona tarifa, Costo se auto-rellena con `rate.amount` y queda **read-only** (deseleccionar tarifa para editar manualmente). El campo no es editable mientras haya tarifa."

Revert por decisión explícita de James: el costo siempre editable como override manual incluso con rate seleccionada. Razón: movimientos internos / casos especiales (ej. ajuste por kilometraje, condiciones del día) requieren costo custom que la tarifa estándar no captura.

Cambio en código:
- `TripForm.tsx:408`: `disabled={fieldsDisabled || !!rateId}` → `disabled={fieldsDisabled}`
- `TripForm.tsx:202–223 (handleRateChange)`: ya hace pre-rellena cost del rate.amount; mantener esa lógica pero NO bloquear el campo
- `programacion/viaje/[id]/page.tsx:437–447 (handleRateChange)`: ya hace pre-rellena no-blocking, verificar consistencia

T-final docs incluye actualización de CLAUDE.md regla #9 al revés del J6 actual.

### D. Permission "Confirmar entrega externo": solo Surface 3 (Q3 = A)

Patrón actual de la app:
- `/solicitudes/[id]` muestra **estado** (PM lee, no acciona)
- `/programacion` y `/mis-viajes` ejecutan **acciones operativas**

"Confirmar entrega externo" es UX intensiva (modal con file upload + receptor opcional + notas + foto). No encaja en el flow de "leer solicitud". Centralizar acción en Surface 3 evita doble surface (mantenimiento + bugs duplicados).

PM ve el resultado vía badge "ENTREGADO (EXTERNO)" verde con tooltip que incluye provider, costo, fecha entrega, receptor (si captado).

Permission gate Surface 3: **logistica + admin** únicamente (sin PM, sin campo, sin almacén).

### E. Revert externo preserva `external_invoice_attachments` (Q4 = SÍ)

`revertExternalToBacklog(lineId)` setea NULL todos los `external_*` excepto `external_invoice_attachments`. Razones:
- Storage cleanup async no vale la pena para v1 (1 Charris operando, sin concurrencia)
- Si re-aprueban como externo → no hay que re-subir factura
- Si la línea termina como Programada o Entregada por flota → el campo queda como histórico no usado pero sin daño
- Consistente con pickup pattern (revert pickup tampoco toca `attachments` JSONB)

Edge case "factura equivocada": se mitiga con re-aprobar (sobreescribe el array). Caso raro, no justifica complejidad de cleanup.

### F. Validación cost: inconsistencia intencional (Q5)

- **Externo approve (Surface 1 y 2)**: `amount > 0` estricto. El feature existe POR la facturación a proveedor externo. Costo cero contradice el propósito del feature.
- **Trip cost (flota, parte C)**: `cost >= 0` permitido. Movimientos internos sin tarifa formal pueden tener costo cero válidamente.

No es inconsistencia técnica — son **semánticas distintas** justificadas por dominio.

### G. UPDATE atómicos con WHERE clauses defensivas

Patrón establecido en Cambio 3 (revertPickupToBacklog):
- UPDATE con WHERE `status='X' AND <flags>` defensivos
- Si BD devuelve 0 rows → línea cambió de estado entre render y submit (race condition con cancelación de solicitud, etc.)
- Hook devuelve error claro: "La línea ya no está disponible para [acción] (puede haber cambiado de estado)."

Aplica a todas las funciones de useExternal con WHERE específico per función.

### H. Error messages actionable, no técnicos

CHECK constraint `sm_request_lines_pickup_external_exclusive` puede triggerearse en concurrencia (2 sesiones de Charris simultáneas: pestaña 1 aprueba externo, pestaña 2 aprueba pickup en la misma línea antes de que la 1 complete).

Hook traduce error PostgreSQL a mensaje user-friendly:
- BD: `new row for relation "sm_request_lines" violates check constraint "sm_request_lines_pickup_external_exclusive"`
- UI: **"La línea ya tiene un fulfillment asignado. Refresca la página."**

Implementación: catch del UPDATE error, match string del constraint name, mensaje amigable. Si match falla, mostrar mensaje genérico de error.

### I. completeExternal — append vs replace

Notes:
- Si línea tiene `notes` previas (típicamente el campo `external_notes` del approve original) y user agrega notas en delivery → concatenar:
  - Sin notas previas + sin notas nuevas: `null`
  - Sin notas previas + notas nuevas: `<nuevas>`
  - Notas previas + sin notas nuevas: preservar `<previas>`
  - Notas previas + notas nuevas: `<previas>\n\n[Entrega <ISO timestamp>] <nuevas>`

Attachments:
- Append simple `[...existing, ...new]` sin metadata distintiva (approve vs delivery)
- El timestamp implícito viene del `created_at` del archivo en Supabase Storage
- Si eventualmente queremos diferenciar fuente de cada attachment, agregamos shape `{ url, name, source: 'approve' | 'delivery', uploaded_at }` al JSONB — fuera de scope v1

## §4 Scope

### IN

**A — Externo (8 sub-tasks A1–A8 del brief consolidados)**:
- `useExternal.ts` con 4 funciones (approveExternal, convertLineToExternal, completeExternal, revertExternalToBacklog)
- `ExternalApprovalForm.tsx` (shared form fields)
- `ExternalDeliveryModal.tsx` (Surface 3 confirm entrega)
- 3 UI surfaces (BacklogTable button + modal inline; AssignmentRow button + modal inline; sección "Viajes Externos Pendientes" con 2 botones por fila + 2 modales)
- Badge "EXTERNO APROBADO" azul + "ENTREGADO (EXTERNO)" verde en LineRow (`/solicitudes/[id]`)
- `cancelSolicitud` filter incluye `'Externo Aprobado'`
- Cleanup completo del modelo viejo: checkbox isExternal de TripForm, `is_external` de useTrips/useMyTrips/types/pages

**B — Polish round 2 line cards**:
- B1: eliminar `project.code` standalone, `project.name`, `cost_code`, `cost_category` de TODAS las line cards (LineRow, BacklogTable desktop+mobile, LineSelector, AssignmentRow inline en `programacion/viaje/[id]` y `mis-viajes/[id]`, TripCard summary)
- B2: descripción + ruta sin `truncate`/`line-clamp`/`max-w-N` constraints; permitir wrap multi-línea en mobile
- B3: notas pueden truncar CON tooltip (`title={notes}`)
- B4: tooltips universales con `title` HTML nativo; helper `statusContextString(status, line)` en `format.ts` para tooltip de status badges (incluye externo provider/cost/fecha, pickup approved_by, etc.)
- B5: aprovechar real estate; mejor wrap a 2-3 líneas que truncar

**C — Costo Trip editable**:
- Eliminar `!!rateId` del disabled del input cost en TripForm.tsx
- Simplificar handleRateChange para que pre-rellene sin bloquear
- Verificar handleRateChange en `viaje/[id]/page.tsx` mantiene consistencia

**T-final docs**:
- `Docs/CHANGELOG.md` entry `[feat]` Cambio 4 + 2 entries `[bd]` (`cambio4_external_provider_redesign` + `cambio4_external_add_received_by_columns`)
- `Docs/reference/events-v2-redesign-in-progress-v3.md` Sección 4 — Cambio 4 Externo agregada
- `Docs/BACKLOG.md` cierre de items relacionados (D5 si existe, J9-related, F1.3 si aplica)
- `CLAUDE.md` regla #9: revert texto J6 (cost editable con rate, rate solo pre-rellena)
- `Docs/FEATURE_SPEC.md` (v4 activo) línea 385: actualizar referencia a `is_external` para reflejar el modelo nuevo de externo per-línea
- Plan file deletion al cerrar (per `plan-lifecycle.md`)

### OUT

- BD changes (Chat ya aplicó **2 migraciones** en staging: `cambio4_external_provider_redesign` + `cambio4_external_add_received_by_columns`; pendiente prod en merge final v2 — ambas)
- Notificaciones nuevas (no se agregan templates de email; el flow externo no notifica explícitamente — los PMs ven el badge en su solicitud)
- Checkboxes ATTT y escolta del TripForm (intactos, no se tocan)
- `Docs/FEATURE_SPEC_v3_FOUNDATIONAL.md` (deprecated desde 2026-03-18, no se toca per regla `no-modify-specs`)
- Tests E2E nuevos del flow externo (AD-5 sigue bloqueado — `createSolicitud`/`createTrip` helpers rotos)
- Migración de cost de `external_invoice_amount` a `numeric(10,2)` u otra precisión — el tipo BD aplicado por Chat es `numeric(12,2)`, suficiente para v1
- "Confirmar entrega externo" en `/solicitudes/[id]` (Q3 cerrado: solo Surface 3)
- PickupOrder vs Trip arquitectura (AD-1 cerrado por Cambio 3; Cambio 4 hereda solución)

### Deuda técnica conocida (post-merge)

- `convertLineToExternal` (Surface 2) NO atómico server-side: DELETE assignment + UPDATE línea son 2 queries separadas (mismo patrón que `convertLineToPickup`). Riesgo bajo en v1 (1 Charris operando, sin concurrencia). Polish post-merge: convertir a RPC SQL con SECURITY DEFINER y transacción server-side.
- Tests E2E del flow nuevo: bloqueado por AD-5. Hacer cuando AD-5 se cierre.
- `notification_log` event_types nuevos para externo (`externo_aprobado`, `externo_entregado`): no agregados en v1 — el constraint `valid_event_type` no recibe nuevos tipos hasta que haya templates de notification email.

## §5 Components & data flow

### `useExternal.ts`

```typescript
interface ApproveExternalResult { ok: boolean; error?: string }
interface ConvertLineExternalResult { ok: boolean; tripCancelled?: boolean; error?: string }
interface CompleteExternalResult { ok: boolean; error?: string }
interface RevertExternalResult { ok: boolean; error?: string }

function useExternal() {
  // approveExternal: línea Pendiente → Externo Aprobado (sin Trip)
  // convertLineToExternal: línea Programada → Externo Aprobado (DELETE assignment + UPDATE atómico, auto-cancela trip si era última)
  // completeExternal: Externo Aprobado → Entregada (qty_delivered=quantity, append notes/attachments, persiste receptor en columnas dedicadas)
  // revertExternalToBacklog: Externo Aprobado → Pendiente (preserva external_invoice_attachments)
  return { loading, error, approveExternal, convertLineToExternal, completeExternal, revertExternalToBacklog }
}
```

**`completeExternal` UPDATE shape (canónico)**:

```typescript
.update({
  status: 'Entregada',
  qty_delivered: line.quantity,            // todo-o-nada (paralelo a pickup)
  external_completed_at: now,
  external_received_by_id: receivedById,   // null OK (no XOR)
  external_received_by_name: receivedByName?.trim() || null,  // null OK (no XOR)
  delivered_at: now,
  external_invoice_attachments: [...existingAttachments, ...newAttachments],  // append simple, no metadata distintiva
  external_notes: finalNotes,              // append: existing + '\n\n[Entrega <ISO>] <user notes>'
})
.eq('id', lineId)
```

**Diferencias clave vs `completePickup`**:
- Receptor NO es XOR: ambos `received_by_*` pueden ser NULL (factura es prueba primaria)
- Persistencia en columnas dedicadas `external_received_by_*` (no reuso polimórfico de `pickup_received_by_*`)
- Append a `external_invoice_attachments` (no a `attachments` JSONB genérico)
- Append a `external_notes` (no a `notes` genérico de la línea)

### `ExternalApprovalForm.tsx`

```typescript
interface ExternalApprovalFormValues {
  providerName: string
  invoiceAmount: string  // string para input controlled, parsed en submit
  invoiceAttachments: Attachment[]
  notes: string
}

interface ExternalApprovalFormProps {
  values: ExternalApprovalFormValues
  onChange: (v: ExternalApprovalFormValues) => void
  errors: Partial<Record<keyof ExternalApprovalFormValues, string>>
  lineFolderId: string  // para FileUploader storage path
  disabled?: boolean
}

// Validación helper exportada:
function validateApprovalForm(values): { valid: boolean; errors: Record<string, string> }
// - providerName.trim() !== '' (max 100 chars)
// - parseFloat(invoiceAmount) > 0
// - invoiceAttachments.length >= 1
// - notes.length <= 500 (opcional)
```

### `ExternalDeliveryModal.tsx`

```typescript
interface PendingExternalLine {
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
  // Para Surface 3 (pending), estos siempre son null por definición (línea aún no entregada).
  // Se persisten al confirmar entrega via useExternal.completeExternal.
  external_received_by_id: string | null
  external_received_by_name: string | null
}

interface ExternalDeliveryModalProps {
  line: PendingExternalLine
  receiverOptions: { value: string; label: string }[]
  onConfirm: (data: {
    confirmed: boolean
    receivedById: string | null              // null OK (no XOR)
    receivedByName: string                   // empty string OK (se traduce a null en hook)
    notes: string                            // empty string OK (se traduce a null en hook)
    additionalAttachments: Attachment[]      // [] OK (foto adicional opcional)
  }) => Promise<void>
  onClose: () => void
  loading: boolean
  error: string | null
}

// Fields:
// - Confirmation checkbox required ("Confirmo que el material llegó al proyecto destino")
// - Receptor SelectWithFallback OPCIONAL (no XOR — puede skipearse, ambos campos NULL en BD)
// - Notas opcional textarea
// - Foto adicional FileUploader opcional (append a external_invoice_attachments existente)
// Validación submit: solo confirmation === true
```

### Data flow Surface 1 (BacklogTable approve)

```
User click "Aprobar viaje externo" en BacklogTable row
  → onApproveExternal(lineId) prop callback
  → setExternalApproveModal({ lineId }) en programacion/page.tsx
  → Modal inline render con <ExternalApprovalForm values={...} onChange={...} />
  → User completa fields → validateApprovalForm() en submit
  → useExternal.approveExternal(lineId, person.id, providerName, amount, attachments, notes)
  → BD UPDATE atómico
  → Si ok: setExternalApproveModal(null), refetchBacklog(), refetchPendingExternals()
  → Si error: set pickup.error → mostrado en modal
```

### Data flow Surface 2 (AssignmentRow convert)

```
User click "Convertir a externo" en AssignmentRow
  → onConvertToExternal(lineId, assignmentId, qtyAssigned, qtyDelivered) prop callback
  → setExternalConvertModal({ ..., willCancelTrip: existingAssignments.length === 1 })
  → Modal inline render con header danger condicional + <ExternalApprovalForm />
  → Si qtyDelivered > 0: bloqueo con mensaje claro, sin form
  → User completa fields → validateApprovalForm() en submit
  → useExternal.convertLineToExternal(...)
  → BD: DELETE assignment + UPDATE línea atomic
  → Si ok && tripCancelled: redirect /programacion
  → Si ok && !tripCancelled: refetch trip + backlog
```

### Data flow Surface 3 (sección + delivery + revert)

```
useEffect on mount: refetchPendingExternals() para logistica/admin
  → SELECT sm_request_lines WHERE external_by_provider=true AND external_completed_at IS NULL
  → ORDER BY external_approved_at ASC (FIFO)
  → setPendingExternals(...)

User click "Confirmar entrega" en row
  → setExternalDeliveryLine(line)
  → <ExternalDeliveryModal line={...} />
  → User completa form (confirmation required, resto opcional)
  → useExternal.completeExternal(lineId, receivedById, receivedByName, notes, additionalAttachments)
  → BD UPDATE atomic con append notes + concat attachments
  → Si ok: setExternalDeliveryLine(null), refetchPendingExternals()
  → cascade_request_status trigger cierra solicitud si todas las líneas Entregadas

User click "Devolver al backlog" en row
  → setExternalRevertLine(line)
  → Modal inline "¿Devolver al backlog?"
  → useExternal.revertExternalToBacklog(lineId)
  → BD UPDATE atomic con WHERE status='Externo Aprobado' AND external_completed_at IS NULL
  → external_* a NULL excepto external_invoice_attachments
  → Si ok: refetchPendingExternals(), refetchBacklog()
```

## §6 Edge cases

| # | Caso | Comportamiento |
|---|---|---|
| E1 | Línea Pendiente sin trip → Externo Aprobado | UPDATE atómico directo (no DELETE assignment); UI muestra botón solo en backlog |
| E2 | Línea Programada con `qty_delivered > 0` → bloqueo conversión externo | Modal Surface 2 muestra mensaje de error, no presenta form |
| E3 | Solicitud mixta (Pendiente + Pickup Aprobado + Externo Aprobado + Programada) | cascade_request_status trigger maneja correctamente (in_progress IN clause incluye ambos status nuevos) |
| E4 | Trip con N>1 assignments, 1 línea convertida a externo | DELETE assignment, NO cancela trip; cancela solo si último assignment |
| E5 | CHECK constraint pickup/external mutuamente excluyente | UI gateado por filtro de status (línea ya aprobada como pickup no aparece en backlog ni en trip detail post-flow) |
| E6 | Revertir externo: factura attachments | Se preservan en `external_invoice_attachments` (Q4 cerrado) |
| E7 | "Confirmar entrega externo" en `/solicitudes/[id]` | NO se ofrece (Q3 cerrado: solo Surface 3) |
| E8 | Solicitud Borrador con líneas Externo Aprobado | No posible (Borrador → líneas Pendiente; aprobar externo requiere status='Enviada' o más; UI gateado por backlog que excluye Borrador) |
| E9 | Cancelar solicitud con líneas Externo Aprobado | `cancelSolicitud` filter incluye `'Externo Aprobado'`; líneas pasan a `'Cancelada'` (no quedan huérfanas) |
| E10 | Concurrencia 2 sesiones Charris (pickup approve vs externo approve en misma línea) | BD CHECK constraint rechaza el segundo submit; hook traduce a "La línea ya tiene un fulfillment asignado. Refresca la página." |
| E11 | `completeExternal` sin receptor (ni id ni texto) | Permitido (factura es prueba primaria); BD recibe NULL en ambos `external_received_by_id` y `external_received_by_name`. NO XOR a diferencia de pickup. Tooltip "ENTREGADO (EXTERNO)" muestra "(no captado)" en lugar del receptor. |
| E12 | `revertExternalToBacklog` mientras delivery modal abierto | UPDATE atomic con WHERE `external_completed_at IS NULL` rechaza si entre tanto se completó; mensaje "La línea ya no está disponible para devolver al backlog" |

## §7 Risks identified

1. **T1 monolítico (~5 archivos)**: cleanup de `is_external` debe ir en mismo commit que regen de `database.ts` para mantener build verde. Mitigación: grep exhaustivo `grep -rn "is_external" src/ tests/` antes de commit; build local verde antes de commit.
2. **Polish round 2 single commit (~6 archivos)**: scope cohesivo justifica consolidación (precedente Cambio 3 consolidación per James). Mitigación: smoke test post-T9 cubre regresiones de layout; regression grep para `project.code` / `project.name` / `cost_code` / `cost_category` aplicados a líneas + `truncate` aplicado a desc/route post-T9.
3. **CHECK constraint pickup/external concurrency**: edge case raro (1 Charris operando v1). Mitigación: hook traduce error a mensaje user-friendly actionable.
4. **Drift `qty_dispatched` prod vs staging** (J2 conocido): regen desde staging incluye `qty_dispatched`. No es problema nuevo; ya existía. Documentar en CHANGELOG si aparece en database.ts diff.
5. **Cost editable + handleRateChange interaction**: 2 handlers (TripForm.tsx + viaje/[id]/page.tsx parent). T8 alinea ambos behaviors para que pre-rellena pero NO bloquee.
6. **`completeExternal` append vs replace**: spec del hook dice append. Decisión: notes con `\n\n[Entrega <ISO>] <nuevas>` formato; attachments simple `[...existing, ...new]` sin metadata distintiva.
7. **Smoke test bloqueante de T-final**: si James detecta bug en smoke, T-final no corre. Mitigación: 10 verificaciones explícitas (§9 Smoke test list), smoke tarda <30 min.

## §8 Implementation order (10 tasks)

**Dependency graph**:
```
T1 (regen + cleanup is_external)
├── T2 (useExternal hook)
│   ├── T4 (Surface 1)
│   ├── T5 (Surface 2)
│   ├── T6 (Surface 3 + ExternalDeliveryModal + revert)
│   └── T7 (badges + cancelSolicitud filter)
├── T3 (ExternalApprovalForm shared) → T4, T5
└── T8 (cost editable — independent of A)

T7 → T9 (polish ajusta layout post-badges externos)
T1–T9 verde + smoke test OK → T10 (T-final docs)
```

**Tasks**:
- **T1** — Regen `database.ts` + cleanup completo `is_external` (5 archivos: regen + 4 consumers verificados via grep)
- **T2** — Hook `useExternal.ts` con 4 funciones espejo
- **T3** — `ExternalApprovalForm.tsx` shared form fields + validación helper
- **T4** — Surface 1: BacklogTable button + modal approve inline en `programacion/page.tsx`
- **T5** — Surface 2: AssignmentRow button + modal convert inline en `programacion/viaje/[id]/page.tsx` con 2 variantes
- **T6** — Surface 3: sección "Viajes Externos Pendientes" + `ExternalDeliveryModal.tsx` + revert modal inline
- **T7** — Badges externo en `LineRow.tsx` + `cancelSolicitud` filter externo
- **T8** — Costo Trip editable: eliminar `!!rateId` + simplificar handleRateChange
- **T9** — Polish round 2: line cards limpieza completa (B1+B2+B3+B4+B5 single commit por cohesión)
- **PARADA** — reporte completo a James para smoke test manual
- **T10 (T-final)** — Docs: CHANGELOG, spec maestro v3, BACKLOG, CLAUDE.md regla #9, FEATURE_SPEC.md v4 línea 385, plan file deletion

## §9 Acceptance criteria

### Funcionales

1. UX nueva 3 surfaces externo funciona end-to-end (aprobar, convertir, confirmar entrega, devolver al backlog)
2. Trip auto-cancel cuando última línea se convierte a externo (con modal warning danger)
3. cascade_request_status NO modificado por Code (Chat ya aplicó)
4. Código viejo de `is_external` eliminado completamente del repositorio
5. CHECK constraint pickup/external respetado por UI (no se ofrecen acciones contradictorias)
6. Polish round 2: line cards sin código proyecto, sin nombre proyecto, sin cost code, sin cost category
7. Descripción y ruta NUNCA truncan en ningún componente
8. Tooltips universales con metadata útil (status, descripción, ruta, cantidad, notas, receptor)
9. Costo del trip editable en modo Edit incluso con tarifa seleccionada
10. Permission gate respetado: Surface 1+2+3+revert solo logistica/admin
11. Tests existentes pasan, build verde
12. Sin matches en grep regression:
    - `grep -rn "is_external" src/ tests/` → 0 matches (post-T1)
    - `grep -rn "isExternal" src/ tests/` → 0 matches (post-T1)
    - `grep -rEn "truncate.*description|description.*truncate" src/components/solicitudes/ src/components/programacion/ src/components/viajes/ src/app/\(app\)/programacion/ src/app/\(app\)/mis-viajes/ src/app/\(app\)/solicitudes/` → 0 matches (post-T9)
    - `grep -rEn "line-clamp.*description|truncate.*from|truncate.*to|truncate.*ruta" src/` → 0 matches (post-T9)
    - Notas SÍ pueden tener `truncate` con tooltip (B3 — OK)

### Smoke test list (post-T9, antes de T10)

1. **Surface 1 BacklogTable**: aprobar línea como externo (provider+cost+factura+notas) → desaparece del backlog → aparece en "Viajes Externos Pendientes" → solicitud padre pasa a 'En Proceso'
2. **Surface 2 AssignmentRow no última**: convertir línea de viaje a externo (no última) → DELETE assignment, trip continúa con resto
3. **Surface 2 AssignmentRow última**: convertir última línea → modal danger con advertencia → trip se cancela, redirect a `/programacion`
4. **Surface 3 ExternalDeliveryModal**: confirmar entrega solo con confirmación checkbox (sin receptor) → línea pasa a 'Entregada' → desaparece de Externos Pendientes → cascade cierra solicitud si todas las líneas Entregadas. Verificar que `external_received_by_id` y `external_received_by_name` quedan NULL en BD cuando user no llena receptor. En segunda iteración, llenar receptor → verificar persistencia en columnas dedicadas + tooltip de "ENTREGADO (EXTERNO)" muestra el nombre.
5. **Devolver al backlog**: línea Externo Aprobado → confirmar revert → línea vuelve a 'Pendiente' en backlog, factura preservada en `external_invoice_attachments`
6. **CHECK constraint**: intentar aprobar pickup en línea ya externa (vía manipulación de URL o concurrencia) → backend rechaza, UI muestra "La línea ya tiene un fulfillment asignado. Refresca la página."
7. **Badge LineRow**: línea Externo Aprobado muestra badge azul "EXTERNO APROBADO" con tooltip provider+cost+fecha; línea entregada muestra "ENTREGADO (EXTERNO)" verde con tooltip extendido
8. **cancelSolicitud incluye externo**: cancelar solicitud con líneas Externo Aprobado → líneas pasan a Cancelada (no quedan huérfanas)
9. **Polish round 2**: líneas en BacklogTable, LineRow, AssignmentRow no muestran código proyecto, nombre proyecto, cost code, cost category. Descripción y ruta nunca truncan. Tooltips se ven al hover en todos los campos.
10. **Costo Trip editable**: en TripForm, seleccionar rate → cost se pre-rellena → editar manualmente → guarda valor custom. Deseleccionar rate → cost queda con valor manual (no se borra).

### Verify commands

- `grep -rn "is_external" src/ tests/` → 0 matches (post-T1)
- `grep -rn "isExternal" src/ tests/` → 0 matches (post-T1)
- `npm run build` → verde (cada commit)
- `grep -rn "useExternal" src/` → matches en hook + Surface 1+2+3 pages (post-T6)
- Smoke test list completa OK → T10 corre

## §10 References

- **Cambio 3 Pickup spec** (predecesor arquitectónico): patrón de hook + 3 surfaces + badges per-línea. Spec deleted al shippear Cambio 3 per `plan-lifecycle.md`; el patrón quedó documentado en `Docs/CHANGELOG.md` 2026-04-27 y en el código (`src/hooks/usePickup.ts`)
- **Cambio 2 Cost code refactor** (BD-1, BD-2): movimiento de `cost_code_id` a `sm_requests` justifica eliminar de line cards en Polish round 2
- **Master spec Events V2 v3**: `Docs/reference/events-v2-redesign-in-progress-v3.md` — Sección 4 se agrega en T-final
- **Self-pickup reference** (legacy): `Docs/reference/Self-pickup.md` — modelo viejo PickupOrder, ya obsoleto post-Cambio 3
- **CLAUDE.md regla #9** (J6 actual): se actualiza en T-final con revert
- **plan-lifecycle.md**: plan file `Docs/superpowers/plans/2026-04-28-cambio4-external.md` se borra al cerrar
- **spec-lifecycle.md**: este spec con frontmatter `status: shipped` post-T-final con `shipped_commits: <hash range>`
