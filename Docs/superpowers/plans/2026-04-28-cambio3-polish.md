# Cambio 3 Polish — botones texto + reposicionar Pickups + revert Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish post-Cambio 3 (UI-only): reemplazar emoji 🤝 por botones con texto puro en Surface 1 + 2, mover sección "Pickups Pendientes de Retiro" al top de `/programacion`, y agregar acción reversible "Devolver al backlog" (con `revertPickupToBacklog` hook + botón texto + modal).

**Architecture:** Sin cambios de BD. 3 tasks atómicas, cada una build verde + commit. NO emojis, NO íconos lucide en los 3 botones nuevos — texto puro per James. Estilo coherente: Surface 1+2 botón "Aprobar pickup"/"Convertir a pickup" como pill amber compacto (cohesión con "Registrar entrega" existente); Surface 3 botón "Devolver al backlog" como outline gris sutil (acción secundaria que no compite con primary CTA).

**Tech Stack:** Next.js 16 + TypeScript ES2022 strict, Supabase (read-only via MCP — sin cambios), Tailwind CSS, no íconos lucide nuevos.

---

## ⚠️ Reglas operativas

1. **NO autónomo.** Si surge algo no previsto en el plan, parar y preguntar a James. Run interactivo.
2. **NO BD.** Sin cambios de schema. Hook `revertPickupToBacklog` opera con UPDATE sobre columnas existentes.
3. **NO push.** James pushea cuando decida.
4. **Build verde antes de cada commit.**
5. **`git add` específico, no `git add -A`** (evita arrastrar archivos stale del working tree, lección de Cambio 3 T2).
6. **Tests no obligatorios** para este polish (es UI). `tests/` no usa selector emoji 🤝 (verificado en brainstorming, 0 matches), entonces NO hay tests existentes que arreglar.
7. **Self-review post-plan obligatorio:** placeholder scan, type consistency, spec coverage. Documentado al final del plan.

---

## File Structure

**Modificados (4):**
- `src/components/programacion/BacklogTable.tsx` — Surface 1: botón texto desktop + mobile (T1)
- `src/app/(app)/programacion/viaje/[id]/page.tsx` — Surface 2: botón texto en AssignmentRow (T1)
- `src/app/(app)/programacion/page.tsx` — Surface 3: reposicionar sección + hide-when-empty (T2) + botón "Devolver al backlog" + modal confirmación (T3)
- `src/hooks/usePickup.ts` — agregar función `revertPickupToBacklog` (T3)

**Sin cambios:**
- BD schema — operación pura sobre columnas existentes
- `src/components/programacion/PickupDeliveryModal.tsx` — sin cambios
- `src/components/solicitudes/LineRow.tsx` — los emojis de badge "🤝 PICKUP" y "🤝 RETIRADO" SE MANTIENEN (per James: regla "no emojis en botones" — los badges decorativos en LineRow son visualmente útiles y NO son botones interactivos clickeables; James no pidió cambiarlos)

---

## Task 1: Botones de acción pickup con texto en Surface 1 + 2

**Goal:** Reemplazar `🤝` (emoji o emoji+texto) por botones con **texto puro** ("Aprobar pickup", "Convertir a pickup") en BacklogTable (desktop + mobile) y AssignmentRow (trip detail). Estilo pill amber compacto coherente con "Registrar entrega".

**Files:**
- Modify: `src/components/programacion/BacklogTable.tsx` (líneas 221-231 desktop button + líneas 320-329 mobile button)
- Modify: `src/app/(app)/programacion/viaje/[id]/page.tsx` (líneas 246-261 AssignmentRow button)

**Acceptance Criteria:**
- [ ] BacklogTable desktop: botón texto "Aprobar pickup" sin emoji, sin íconos lucide. Estilo pill amber compacto.
- [ ] BacklogTable mobile: botón texto "Aprobar pickup" sin emoji, sin íconos lucide. Estilo consistente con desktop (mismo pill amber, ajusta tap target si necesario).
- [ ] AssignmentRow (trip detail): botón texto "Convertir a pickup" sin emoji, sin íconos lucide. Estilo pill amber compacto.
- [ ] `grep -rn "🤝" src/components/programacion/ "src/app/(app)/programacion/viaje/"` → 0 matches (los 🤝 emoji desktop+mobile en BacklogTable y AssignmentRow eliminados).
- [ ] LineRow.tsx (badges 🤝 PICKUP / 🤝 RETIRADO) NO se toca — son decorativos, no botones.
- [ ] `npm run build` verde.

**Verify:** `npm run build && grep -rn "🤝" src/components/programacion/ "src/app/(app)/programacion/viaje/"`

**Steps:**

- [ ] **Step 1: Surface 1 desktop — BacklogTable botón "Aprobar pickup"**

Cambios en `src/components/programacion/BacklogTable.tsx` (líneas 221-231):

```typescript
// CAMBIAR:
//   {/* Aprobar pickup (logistica/admin) */}
//   {onApprovePickup && (
//     <button
//       type="button"
//       onClick={(e) => { e.stopPropagation(); onApprovePickup(line.id) }}
//       title="Aprobar como retiro por proyecto"
//       className="shrink-0 rounded p-1 text-amber-600 hover:bg-amber-50 transition-colors"
//     >
//       🤝
//     </button>
//   )}
//
// A:
//   {/* Aprobar pickup (logistica/admin) */}
//   {onApprovePickup && (
//     <button
//       type="button"
//       onClick={(e) => { e.stopPropagation(); onApprovePickup(line.id) }}
//       title="Aprobar como retiro por proyecto"
//       className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 transition-colors"
//     >
//       Aprobar pickup
//     </button>
//   )}
```

- [ ] **Step 2: Surface 1 mobile — BacklogTable botón "Aprobar pickup"**

Cambios en `src/components/programacion/BacklogTable.tsx` (líneas 320-329):

```typescript
// CAMBIAR:
//   {/* Aprobar pickup (logistica/admin) — mobile */}
//   {onApprovePickup && (
//     <button
//       type="button"
//       onClick={(e) => { e.stopPropagation(); onApprovePickup(line.id) }}
//       className="text-xs font-medium text-amber-700 hover:underline self-start"
//     >
//       🤝 Aprobar pickup
//     </button>
//   )}
//
// A:
//   {/* Aprobar pickup (logistica/admin) — mobile */}
//   {onApprovePickup && (
//     <button
//       type="button"
//       onClick={(e) => { e.stopPropagation(); onApprovePickup(line.id) }}
//       className="self-start rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 transition-colors"
//     >
//       Aprobar pickup
//     </button>
//   )}
```

- [ ] **Step 3: Surface 2 — AssignmentRow botón "Convertir a pickup"**

Cambios en `src/app/(app)/programacion/viaje/[id]/page.tsx` (líneas 246-261):

```typescript
// CAMBIAR:
//   {/* Convertir a pickup (Cambio 3 — Surface 2) */}
//   {onConvertToPickup && line && (
//     <button
//       type="button"
//       onClick={() => onConvertToPickup(
//         assignment.request_line_id,
//         assignment.id,
//         assignment.quantity_assigned,
//         assignment.qty_delivered ?? 0,
//       )}
//       className="shrink-0 rounded p-1.5 text-amber-700 hover:bg-amber-50 transition-colors"
//       title="Convertir a pickup"
//     >
//       🤝
//     </button>
//   )}
//
// A:
//   {/* Convertir a pickup (Cambio 3 — Surface 2) */}
//   {onConvertToPickup && line && (
//     <button
//       type="button"
//       onClick={() => onConvertToPickup(
//         assignment.request_line_id,
//         assignment.id,
//         assignment.quantity_assigned,
//         assignment.qty_delivered ?? 0,
//       )}
//       className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 transition-colors"
//       title="Convertir a pickup"
//     >
//       Convertir a pickup
//     </button>
//   )}
```

- [ ] **Step 4: Verificar build + grep regression**

```bash
npm run build 2>&1 | grep -E "Compiled|Failed|error TS" | head -3
# Expected: ✓ Compiled successfully

grep -rn "🤝" src/components/programacion/ "src/app/(app)/programacion/viaje/"
# Expected: 0 matches (LineRow no entra en este grep — sus 🤝 son badges decorativos, no botones)
```

NOTA sobre el emoji `🤝` en `programacion/page.tsx` línea 890 (sección Pickups Pendientes): se elimina en Task 2 cuando refactorizo la sección. T1 NO lo toca.

NOTA sobre el emoji `🤝` en `LineRow.tsx` (badges PICKUP / RETIRADO): estos NO son botones — son badges visuales decorativos que se mantienen. James pidió "no emojis en botones", no "no emojis en badges". Confirmado en brainstorming.

- [ ] **Step 5: Commit**

```bash
git add src/components/programacion/BacklogTable.tsx "src/app/(app)/programacion/viaje/[id]/page.tsx"
git commit -m "$(cat <<'EOF'
feat: botones de acción pickup con texto en lugar de emoji (Task 1)

Surface 1 (BacklogTable) + Surface 2 (AssignmentRow trip detail):

- Eliminar emoji 🤝 de los 3 botones de acción pickup (desktop +
  mobile en BacklogTable, desktop en AssignmentRow)
- Botones ahora con texto puro: "Aprobar pickup" / "Convertir a
  pickup" — sin emojis ni íconos lucide (decisión James)
- Estilo unificado pill amber compacto (bg-amber-500 px-3 py-1.5
  text-xs font-semibold text-white hover:bg-amber-600 rounded-lg) —
  cohesión visual con "Registrar entrega" existente en sección de
  pickups pendientes

LineRow.tsx (badges 🤝 PICKUP / 🤝 RETIRADO) NO tocado — son
decorativos, no botones interactivos.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Reposicionar sección "Pickups Pendientes de Retiro" + hide-when-empty

**Goal:** Mover la sección desde después de "Movilizaciones" (final del page) a **antes de "Sin Programar"** (top del page, después del header). Ocultar entera cuando vacía. Eliminar el emoji `🤝` decorativo de cada fila pickup pendiente.

**Files:**
- Modify: `src/app/(app)/programacion/page.tsx` (mover bloque líneas 866-916 al inicio del JSX, después del header; ajustar conditional render para hide-when-empty; eliminar `<span>🤝</span>` de cada item)

**Acceptance Criteria:**
- [ ] Sección "Pickups Pendientes de Retiro" aparece **inmediatamente después del header** (antes de "Sin Programar") en `/programacion`.
- [ ] Cuando `!pickupsLoading && pendingPickups.length === 0`: sección **NO renderiza** (hidden entirely, sin header, sin mensaje).
- [ ] Durante `pickupsLoading`: header con spinner se mantiene visible (evita layout jump).
- [ ] Cuando `pendingPickups.length > 0`: sección visible con header + count + lista.
- [ ] Cada item de pickup pendiente NO tiene emoji `🤝` decorativo a la izquierda (eliminar `<span className="text-base">🤝</span>`).
- [ ] La sección sigue siendo visible solo para `role === 'logistica' || role === 'admin'`.
- [ ] `npm run build` verde.

**Verify:** `npm run build && grep -n "🤝" "src/app/(app)/programacion/page.tsx"` → 0 matches.

**Steps:**

- [ ] **Step 1: Eliminar bloque actual (líneas 866-916) en posición actual**

Localizar el bloque `{/* ─── Sección 3: Pickups Pendientes de Retiro (Cambio 3 — Surface 3) ─── */}` (después de `</section>` de "Movilizaciones") y borrarlo entero.

```typescript
// BORRAR el bloque entero (líneas ~866-916):
//   {/* ─── Sección 3: Pickups Pendientes de Retiro (Cambio 3 — Surface 3) ─── */}
//   {(role === 'logistica' || role === 'admin') && (
//     <section className="rounded-xl border border-amber-200 bg-amber-50/30">
//       ...
//     </section>
//   )}
```

NO borrar todavía los modals (PickupDeliveryModal, modal Aprobar pickup) que vienen después — esos quedan en su posición actual.

- [ ] **Step 2: Insertar bloque reposicionado después del header con hide-when-empty + sin emoji**

Localizar el cierre del header `</div>` (después del `<Button>` "Crear Movilización"/"Nueva Movilización", aprox línea 601 actual) e insertar inmediatamente después:

```typescript
{/* ─── Sección Pickups Pendientes de Retiro (Cambio 3 — Surface 3) ─── */}
{(role === 'logistica' || role === 'admin') && (pickupsLoading || pendingPickups.length > 0) && (
  <section className="rounded-xl border border-amber-200 bg-amber-50/30">
    <div className="px-4 pt-4 pb-3">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold text-gray-900">Pickups Pendientes de Retiro</h2>
        {!pickupsLoading && (
          <span className="rounded-full bg-amber-200 text-amber-900 px-2 py-0.5 text-xs font-medium">
            {pendingPickups.length}
          </span>
        )}
      </div>
    </div>
    <div className="px-4 pb-4">
      {pickupsLoading ? (
        <p className="py-4 text-center text-sm text-iconsa-gray">Cargando pickups...</p>
      ) : (
        <div className="space-y-2">
          {pendingPickups.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-lg border border-amber-200 bg-white px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{p.description}</p>
                <p className="text-xs text-iconsa-gray">
                  <span className="font-mono">{p.request_id}</span>
                  {p.project_code && <span> · {p.project_code}</span>}
                  <span> · {p.quantity} {p.unitCode}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPickupDeliveryLine(p)}
                className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 transition-colors"
              >
                Registrar entrega
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  </section>
)}
```

**Cambios respecto al bloque original:**
1. Conditional outer: `(role === 'logistica' || role === 'admin') && (pickupsLoading || pendingPickups.length > 0)` — hide entirely cuando vacío y no loading.
2. Eliminado el branch `pendingPickups.length === 0` que mostraba "No hay pickups pendientes de retiro." (la sección entera ahora se oculta).
3. Eliminado el `<span className="text-base">🤝</span>` de cada item.

- [ ] **Step 3: Verificar posición + build**

```bash
# Verificar que la sección apareció antes de "Sin Programar"
grep -n "Pickups Pendientes de Retiro\|Sección 1: Sin Programar\|Sin Programar" "src/app/(app)/programacion/page.tsx" | head -10
# Expected: línea de "Pickups Pendientes" debe ser MENOR que la de "Sin Programar"

# Verificar emoji eliminado del archivo
grep -n "🤝" "src/app/(app)/programacion/page.tsx"
# Expected: 0 matches

npm run build 2>&1 | grep -E "Compiled|Failed|error TS" | head -3
# Expected: ✓ Compiled successfully
```

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/programacion/page.tsx"
git commit -m "$(cat <<'EOF'
feat: reposicionar Pickups Pendientes al top + hide-when-empty (Task 2)

- Sección "Pickups Pendientes de Retiro" movida desde el final de
  /programacion (después de Movilizaciones) al top (después del
  header, antes de "Sin Programar")
- Hide entirely cuando !pickupsLoading && pendingPickups.length === 0
  (NO ocupa espacio cuando vacía, per James)
- Loading state mantiene header visible con spinner (evita layout
  jump al cargar)
- Eliminado emoji 🤝 decorativo de cada fila pickup pendiente —
  sin emojis en /programacion (LineRow.tsx badges siguen igual,
  son contexto distinto)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Hook revertPickupToBacklog + botón "Devolver al backlog" + modal confirmación

**Goal:** Implementar reverso de pickup. Hook `revertPickupToBacklog(lineId)` con UPDATE atomic + WHERE clauses defensivas. Botón "Devolver al backlog" (texto puro, outline gris sutil) en cada fila de pickup pendiente. Modal de confirmación corto.

**Files:**
- Modify: `src/hooks/usePickup.ts` — agregar `revertPickupToBacklog` función + tipo `RevertPickupResult`
- Modify: `src/app/(app)/programacion/page.tsx` — agregar handler + estado modal + botón texto en cada item + render modal

**Acceptance Criteria:**
- [ ] Hook `revertPickupToBacklog(lineId)` exportado en `usePickup.ts`.
- [ ] UPDATE atomic con `WHERE id=lineId AND status='Pickup Aprobado' AND pickup_completed_at IS NULL`. Si 0 rows updated → `{ ok: false, error: '...' }`.
- [ ] UPDATE setea: `status='Pendiente', pickup_by_project=false, pickup_approved_at=null, pickup_approved_by=null`. NO toca: `pickup_completed_at`, `pickup_received_by_id`, `pickup_received_by_name`, `qty_scheduled`, `qty_delivered`, `notes`, `attachments`, `trip_line_assignments`.
- [ ] Botón "Devolver al backlog" visible en cada fila de pickup pendiente, posición **izquierda** (antes de "Registrar entrega"). Estilo: `border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-1.5 text-xs font-semibold rounded-lg`.
- [ ] Click → modal de confirmación con título "¿Devolver al backlog?", body explicativo, botones "Cancelar" (ghost) | "Devolver" (primary).
- [ ] Confirm → llama `revertPickupToBacklog`. Post-éxito: cierra modal + `refetchPendingPickups()` + `refetchBacklog()`. Errores muestran via `pickup.error` en el modal.
- [ ] `npm run build` verde.

**Verify:** `npm run build && grep -n "revertPickupToBacklog\|Devolver al backlog" src/hooks/usePickup.ts "src/app/(app)/programacion/page.tsx"`

**Steps:**

- [ ] **Step 1: Agregar tipo `RevertPickupResult` + función `revertPickupToBacklog` en usePickup.ts**

Cambios en `src/hooks/usePickup.ts`:

Agregar el tipo cerca de los otros tipos de resultado (después de `CompletePickupResult`):

```typescript
export interface RevertPickupResult {
  ok: boolean
  error?: string
}
```

Agregar la función `revertPickupToBacklog` dentro del hook, antes del `return { ... }` final:

```typescript
  /**
   * Reverso de pickup: línea Pickup Aprobado → Pendiente.
   * Disponible solo desde la sección "Pickups Pendientes de Retiro" (UI ya
   * filtra por status='Pickup Aprobado' AND pickup_completed_at IS NULL).
   *
   * UPDATE con WHERE clauses defensivas (atomic): si la línea cambió de
   * estado entre el render del UI y el confirm del modal (race condition con
   * cancelación de solicitud o registro de entrega), el UPDATE no matchea
   * y retornamos error claro al cliente.
   *
   * NO toca: pickup_completed_at, pickup_received_by_id, pickup_received_by_name
   * (ya son NULL por la condición de UI). NO toca qty_scheduled, qty_delivered
   * (ambos en 0 por el flow original). NO toca trip_line_assignments (el trip
   * ya cambió o se canceló durante el flow original).
   *
   * cascade_request_status trigger se dispara solo y reevalúa solicitud padre:
   * - Si todas las líneas no-canceladas vuelven a Pendiente → solicitud='Enviada'
   * - Si hay otras Programada/Pickup Aprobado/En Transito → solicitud sigue
   *   'En Proceso'
   */
  const revertPickupToBacklog = useCallback(
    async (lineId: string): Promise<RevertPickupResult> => {
      setLoading(true)
      setError(null)

      try {
        const { data, error: updateError } = await supabase
          .from('sm_request_lines')
          .update({
            status: 'Pendiente',
            pickup_by_project: false,
            pickup_approved_at: null,
            pickup_approved_by: null,
          })
          .eq('id', lineId)
          .eq('status', 'Pickup Aprobado')
          .is('pickup_completed_at', null)
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
```

Actualizar el `return` del hook para incluir `revertPickupToBacklog`:

```typescript
// CAMBIAR:
//   return {
//     loading,
//     error,
//     approvePickupFromBacklog,
//     convertLineToPickup,
//     completePickup,
//   }
//
// A:
//   return {
//     loading,
//     error,
//     approvePickupFromBacklog,
//     convertLineToPickup,
//     completePickup,
//     revertPickupToBacklog,
//   }
```

- [ ] **Step 2: Agregar estado modal + handler en programacion/page.tsx**

Cambios en `src/app/(app)/programacion/page.tsx`:

Agregar estado del modal cerca de los otros estados pickup (después de `pickupDeliveryLine`):

```typescript
// Buscar:
//   const [pickupDeliveryLine, setPickupDeliveryLine] = useState<PendingPickupLine | null>(null)
//
// Agregar inmediatamente después:
//   const [pickupRevertLine, setPickupRevertLine] = useState<PendingPickupLine | null>(null)
```

Agregar el handler cerca de los otros handlers pickup (después de `handleCompletePickup`):

```typescript
// Buscar el final del bloque handleCompletePickup (cierra con `}, [pickupDeliveryLine, pickup, refetchPendingPickups])`)
// Agregar inmediatamente después:

  const confirmRevertPickup = useCallback(async () => {
    if (!pickupRevertLine) return
    const result = await pickup.revertPickupToBacklog(pickupRevertLine.id)
    if (result.ok) {
      setPickupRevertLine(null)
      void refetchPendingPickups()
      refetchBacklog()
    }
    // Errores se muestran via pickup.error en el modal
  }, [pickupRevertLine, pickup, refetchPendingPickups, refetchBacklog])
```

- [ ] **Step 3: Agregar botón "Devolver al backlog" en cada item de pickup pendiente**

Cambios en `src/app/(app)/programacion/page.tsx`, dentro del bloque insertado en Task 2 (sección Pickups Pendientes), modificar la fila de cada item para agregar el botón "Devolver al backlog" a la izquierda de "Registrar entrega":

```typescript
// CAMBIAR:
//   {pendingPickups.map((p) => (
//     <div key={p.id} className="flex items-center gap-3 rounded-lg border border-amber-200 bg-white px-4 py-2.5">
//       <div className="min-w-0 flex-1">
//         <p className="truncate text-sm font-medium text-gray-900">{p.description}</p>
//         <p className="text-xs text-iconsa-gray">
//           <span className="font-mono">{p.request_id}</span>
//           {p.project_code && <span> · {p.project_code}</span>}
//           <span> · {p.quantity} {p.unitCode}</span>
//         </p>
//       </div>
//       <button
//         type="button"
//         onClick={() => setPickupDeliveryLine(p)}
//         className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 transition-colors"
//       >
//         Registrar entrega
//       </button>
//     </div>
//   ))}
//
// A:
//   {pendingPickups.map((p) => (
//     <div key={p.id} className="flex items-center gap-3 rounded-lg border border-amber-200 bg-white px-4 py-2.5">
//       <div className="min-w-0 flex-1">
//         <p className="truncate text-sm font-medium text-gray-900">{p.description}</p>
//         <p className="text-xs text-iconsa-gray">
//           <span className="font-mono">{p.request_id}</span>
//           {p.project_code && <span> · {p.project_code}</span>}
//           <span> · {p.quantity} {p.unitCode}</span>
//         </p>
//       </div>
//       <button
//         type="button"
//         onClick={() => setPickupRevertLine(p)}
//         className="shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
//         title="Devolver línea al backlog"
//       >
//         Devolver al backlog
//       </button>
//       <button
//         type="button"
//         onClick={() => setPickupDeliveryLine(p)}
//         className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 transition-colors"
//       >
//         Registrar entrega
//       </button>
//     </div>
//   ))}
```

Posición confirmada: el botón "Devolver al backlog" va **antes** del botón "Registrar entrega" en el flex (left = secundario, right = primary).

- [ ] **Step 4: Agregar render del modal de confirmación de revert**

Cambios en `src/app/(app)/programacion/page.tsx`. Buscar el bloque del modal `{pickupConfirmLineId && (...)}` (modal Aprobar pickup, al final del JSX) e insertar el modal de revert **antes** de él:

```typescript
// Insertar antes de:
//   {/* Modal confirmación Aprobar pickup (Cambio 3 — Surface 1) */}
//   {pickupConfirmLineId && ( ... )}

      {/* Modal confirmación Devolver al backlog (Cambio 3 polish — revert pickup) */}
      {pickupRevertLine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">¿Devolver al backlog?</h3>
            <p className="mt-2 text-sm text-gray-600">
              La línea volverá a estado Pendiente y aparecerá en el backlog. Podrás programarla en un viaje o aprobarla como pickup de nuevo.
            </p>
            {pickup.error && (
              <p className="mt-2 text-sm text-red-600">{pickup.error}</p>
            )}
            <div className="mt-4 flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPickupRevertLine(null)}
                disabled={pickup.loading}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={confirmRevertPickup}
                loading={pickup.loading}
              >
                Devolver
              </Button>
            </div>
          </div>
        </div>
      )}
```

- [ ] **Step 5: Verificar build + grep regression**

```bash
npm run build 2>&1 | grep -E "Compiled|Failed|error TS" | head -3
# Expected: ✓ Compiled successfully

# Verificar que la nueva función está exportada
grep -n "revertPickupToBacklog" src/hooks/usePickup.ts
# Expected: definición + export en return

# Verificar texto del botón
grep -n "Devolver al backlog\|pickupRevertLine\|confirmRevertPickup" "src/app/(app)/programacion/page.tsx"
# Expected: matches en estado, handler, botón, modal
```

- [ ] **Step 6: Commit**

```bash
git add src/hooks/usePickup.ts "src/app/(app)/programacion/page.tsx"
git commit -m "$(cat <<'EOF'
feat: revertPickupToBacklog + botón "Devolver al backlog" (Task 3)

Reverso de pickup en sección "Pickups Pendientes de Retiro":

- Hook usePickup.revertPickupToBacklog(lineId) — UPDATE atomic con
  WHERE clauses defensivas (id=lineId AND status='Pickup Aprobado'
  AND pickup_completed_at IS NULL). Si 0 rows updated → error claro
  (race condition con cancel solicitud o registro de entrega)
- UPDATE setea: status='Pendiente', pickup_by_project=false,
  pickup_approved_at=null, pickup_approved_by=null
- NO toca: pickup_completed_at/received_by_id/received_by_name (ya
  NULL), qty_scheduled/qty_delivered (en 0), trip_line_assignments,
  notes, attachments
- cascade_request_status trigger reevalúa solicitud padre solo

UI:

- Botón "Devolver al backlog" en cada fila de pickup pendiente —
  texto puro (sin emoji ni icon lucide), outline gris sutil
  (border-gray-300 text-gray-700 hover:bg-gray-50) — acción
  secundaria que NO compite con "Registrar entrega" (primary amber)
- Posición: izquierda (secondary), "Registrar entrega" derecha
  (primary) — patrón estándar UX
- Modal confirmación corto: título "¿Devolver al backlog?", body
  explicativo, Cancelar (ghost) + Devolver (primary)
- Post-confirm: refetchPendingPickups (line desaparece) +
  refetchBacklog (line aparece en Sin Programar)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

### 1. Spec coverage

Cada decisión y cambio del brief mapeado a una task:

| Item del brief | Task |
|---|---|
| Surface 1 BacklogTable: botón "Aprobar pickup" texto puro | T1 Step 1 (desktop) + T1 Step 2 (mobile) |
| Surface 2 AssignmentRow: botón "Convertir a pickup" texto puro | T1 Step 3 |
| Estilo pill amber compacto Surface 1+2 (Q2=a) | T1 Steps 1-3 (className idéntico al de "Registrar entrega" — bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 rounded-lg) |
| Reposicionar sección "Pickups Pendientes" al top | T2 Steps 1-2 (DELETE + INSERT al inicio del JSX) |
| Hide-when-empty (Q1) | T2 Step 2 conditional `(pickupsLoading || pendingPickups.length > 0)` |
| Loading state mantiene header con spinner | T2 Step 2 — el branch `pickupsLoading` se mantiene |
| Eliminar emoji 🤝 decorativo en items pickup pendientes | T2 Step 2 (no `<span>🤝</span>` en el item) |
| Botón "Devolver al backlog" texto puro (Q3) | T3 Step 3 |
| Estilo outline gris sutil (acción secundaria) | T3 Step 3 className `border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-1.5 text-xs font-semibold rounded-lg` |
| Posición [Devolver][Registrar entrega] (Q4) | T3 Step 3 — orden DOM: Devolver primero, Registrar entrega después |
| Modal confirmación corto | T3 Step 4 (título, body, Cancelar/Devolver) |
| `revertPickupToBacklog(lineId)` función | T3 Step 1 |
| UPDATE setea 4 campos exactos per spec | T3 Step 1 — status, pickup_by_project, pickup_approved_at, pickup_approved_by |
| NO toca pickup_completed/received fields, qty_*, trip_line_assignments | T3 Step 1 — UPDATE no incluye esos campos |
| WHERE clauses defensivas (Q5 race conditions) | T3 Step 1 — `.eq('status', 'Pickup Aprobado').is('pickup_completed_at', null)` + check `data.length === 0` |
| refetch dual (pendingPickups + backlog) | T3 Step 2 — handler `confirmRevertPickup` |
| LineRow.tsx badges 🤝 PICKUP/RETIRADO NO se tocan | Documentado en File Structure + T1 Step 4 nota explícita |

✅ Coverage 100%.

### 2. Placeholder scan

- "TBD" / "TODO" / "implement later": 0 ocurrencias ✅
- "Add appropriate error handling": 0 ✅ (cada hook tiene try/catch + setError)
- "similar to Task N": 0 ✅
- "Write tests for the above": 0 ✅ (tests no obligatorios per James)
- Code blocks completos en cada Step: ✅

### 3. Type consistency

- `RevertPickupResult` interface idéntica al pattern de `ApprovePickupResult`/`ConvertLineResult`/`CompletePickupResult` (`ok: boolean`, `error?: string`) ✅
- `revertPickupToBacklog(lineId: string)` firma consistente con `approvePickupFromBacklog(lineId: string, charrisId: string)` (sin charrisId — el revert no necesita registrar quién lo hizo, no hay columna `pickup_reverted_by` y no es scope de este polish) ✅
- Estado `pickupRevertLine: PendingPickupLine | null` consistente con `pickupDeliveryLine: PendingPickupLine | null` ✅
- Handler `confirmRevertPickup` consistente con `confirmApprovePickup` y `handleCompletePickup` patterns ✅

### 4. Smoke test manual (post-ejecución, NO obligatorio para commit)

1. Aprobar pickup desde backlog → línea desaparece del backlog → aparece en sección "Pickups Pendientes de Retiro" en el TOP de la página.
2. Click "Devolver al backlog" → modal aparece → Cancelar → modal cierra, línea sigue en pickups pendientes.
3. Click "Devolver al backlog" → modal → Confirmar → línea desaparece de pickups pendientes Y aparece en backlog (Sin Programar).
4. Solicitud padre vuelve a 'Enviada' (si era la única línea in_progress) o sigue 'En Proceso' (si hay otras).
5. Sección "Pickups Pendientes" sin pickups → completamente oculta (no ocupa espacio).
6. Sección durante load → header con spinner visible.
7. Botones BacklogTable + AssignmentRow muestran texto sin emoji ni íconos.

### 5. Recovery plan

Si algo sale mal post-merge, rollback simple: `git revert <hash-T1> <hash-T2> <hash-T3>` (3 commits atómicos). No hay BD changes — rollback es 100% código.

---

## Riesgos y mitigaciones

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Re-emerge del emoji 🤝 al copiar bloques en T2 | baja | T2 Step 2 reescribe el bloque entero sin emoji explícitamente; T2 Step 3 grep verifica 0 matches |
| Botón "Devolver al backlog" en posición incorrecta (a la derecha de "Registrar entrega") | baja | T3 Step 3 muestra el JSX exacto con orden DOM `[Devolver][Registrar entrega]` |
| `revertPickupToBacklog` UPDATE matchea cuando no debería (race) | muy baja | WHERE clauses `.eq('status', 'Pickup Aprobado').is('pickup_completed_at', null)` + check `data.length === 0` |
| `refetchBacklog` no actualiza tras revert (línea no aparece en backlog) | baja | Confirmado en Cambio 3 T6: `refetchBacklog` re-fetch completo del backlog tras approve. Mismo pattern usado aquí |
| Sección oculta durante loading rompe UX (layout jump) | baja | T2 Step 2 conditional incluye `pickupsLoading` en el outer check — header + spinner visible durante load |
| `Button` import de programacion/page.tsx no resuelve para el modal nuevo | muy baja | `Button` ya importado (Cambio 3 T6 lo agregó para modal Aprobar pickup) |
| Build rompe entre tasks | baja | Cada task es UI-only sin dependencias cruzadas (T2 mueve bloque pero no toca lógica; T3 agrega función pero no remueve nada existente) — cada commit debe pasar build solo |
