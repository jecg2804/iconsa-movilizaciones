# Cambio 3 — Pickup nuevo (modelo bandera-en-línea) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el modelo viejo de pickup-via-trip-especial (`trips.is_self_pickup` + eventos Preparacion/Retiro + función `complete_pickup_trip`) por un flag a nivel de línea (`sm_request_lines.pickup_by_project`) con 3 superficies UX nuevas: aprobar desde backlog, convertir línea Programada, y registrar entrega de pickup.

**Architecture:** El nuevo modelo elimina el concepto de "trip de pickup". Charris aprueba pickup como bandera per-línea (status `'Pickup Aprobado'`). Sin trip, sin tarifa, sin código de confirmación. Líneas pickup viajan por su propio carril operativo (sección "Pickups Pendientes de Retiro" en `/programacion`) y se cierran cuando Charris registra entrega manual con receptor + notas + attachments. Las solicitudes con líneas pickup mixtas siguen la cascada normal (`cascade_request_status` ya updateada por Chat para tratar `Pickup Aprobado` como in-progress).

**Tech Stack:** Next.js 16 App Router + TypeScript ES2022 strict, Supabase PostgreSQL (read-only via MCP, BD ya aplicada por Chat), Tailwind CSS, Lucide icons, Playwright (tests legacy borrados; nuevos quedan como AD-5 follow-up).

---

## ⚠️ Reglas de ejecución autónoma (recordatorio durante run)

James duerme durante este run. Estas reglas son MANDATORY:

1. **NO improvisar mid-run.** Si surge algo no previsto en el plan (edge case nuevo, archivo inesperado que rompe build, bug imprevisto):
   - PARÁ inmediatamente
   - Dejá el working tree LIMPIO (no commits a medias — `git stash` o revertir cambios uncommitted)
   - Creá `Docs/cambio3-incidente.md` con: task que estabas ejecutando, qué pasó (mensaje de error literal o descripción), por qué decidiste parar en lugar de actuar, output de `git log --oneline jaime/dev | head -10` + `git status`
   - James lo lee al despertar y decide

2. **NO consultar a Chat mid-run.** Chat también duerme.

3. **Commits atómicos OBLIGATORIO.** Cada task = 1 commit. NO acumular tasks en un solo commit. Si algo falla, James reverte por commit hash.

4. **Build verde antes de cada commit.** `npm run build` debe pasar. Husky `post-commit` lanza build en background (no necesita correrlo a mano), pero si sospechás de algún task crítico (T2, T7), corré build manual antes del commit.

5. **Tests obligatorios al final (T10/T11).** No skipear, no comentar. Si test falla por razón legítima, reportar en `cambio3-incidente.md`. NO modificar tests para que pasen artificialmente.

6. **NO push.** James pushea cuando despierte.

7. **Reporte final exhaustivo** al terminar T11:
   - `git log --oneline jaime/dev | head -20`
   - Output literal de `npm run build`
   - Output literal de greps regression
   - Lista de files modificados/creados/eliminados con conteo
   - Archivos que requieren smoke test manual
   - Nota si `Docs/cambio3-incidente.md` existe

---

## Recovery Plan (rollback completo)

Si James necesita revertir Cambio 3 entero (post-merge issue grave):

```bash
# 1. Identificar primer commit de Cambio 3 (Task 1)
git log --oneline jaime/dev | grep "Cambio 3" | tail -1
# Ejemplo: abc1234 chore: regenerar database.ts post-Cambio 3

# 2. Revert SOFT al commit ANTERIOR a Task 1
git reset --hard <commit-anterior-a-T1>

# 3. Re-aplicar BD revert (James ejecuta en Supabase SQL Editor):
# ALTER TABLE sm_request_lines DROP COLUMN pickup_by_project, pickup_approved_at, pickup_approved_by, pickup_completed_at, pickup_received_by_id, pickup_received_by_name;
# ALTER TABLE trips ADD COLUMN is_self_pickup BOOLEAN DEFAULT false;
# ALTER TABLE sm_requests ADD COLUMN fulfillment_type TEXT DEFAULT 'fleet';
# CREATE OR REPLACE FUNCTION complete_pickup_trip(...) ... (Chat tiene el body antiguo en historial)
# Actualizar cascade_request_status para excluir 'Pickup Aprobado' (Chat lo aplica)
```

**Alternativa más quirúrgica:** revertir commits específicos (T6/T7/T8 si las superficies UX son el problema, manteniendo refactor T2/T3/T4). Cada commit atómico es revertible aisladamente con `git revert <hash>`.

---

## File Structure

**Modificados (18):**
- `src/lib/types/database.ts` — regen + Row<T> helper
- `src/hooks/useTrips.ts` — eliminar `is_self_pickup` de `TripWithRelations`, `TripInput`, mapeo `mapTripRow`, fetch detail, saveTrip/updateTrip; eliminar `'Pickup Aprobado'` del filtro backlog (ya no lo incluye implícitamente, pero verificar)
- `src/hooks/useMyTrips.ts` — eliminar `is_self_pickup` de interface y SELECT y mapper
- `src/hooks/useSolicitudes.ts` — eliminar `fulfillment_type` de interfaces y todos los inserts/updates; agregar `'Pickup Aprobado'` al filtro de `cancelSolicitud` (T9)
- `src/components/programacion/TripForm.tsx` — eliminar props `isPickup`/`onPickupChange`, eliminar `is_self_pickup` de propagate, eliminar bloque del checkbox "Retiro en Chilibre"
- `src/components/solicitudes/types.ts` — eliminar `is_self_pickup` de `AssociatedTrip`
- `src/components/solicitudes/SolicitudForm.tsx` — eliminar prop `fulfillmentType`, dead state, ref en propagate
- `src/components/viajes/TripCard.tsx` — eliminar `PICKUP_STEPS`, simplificar `ProgressBar` (solo FLEET_STEPS), eliminar prop `isPickup`, eliminar badge "Retiro"
- `src/components/viajes/EventTimeline.tsx` — eliminar cases Preparacion/Retiro de `getEventIcon` y `getEventColor`
- `src/hooks/useTripEvents.ts` — quitar `'Preparacion' | 'Retiro'` de `TripEventType` union
- `src/app/(app)/mis-viajes/[id]/page.tsx` — eliminar imports modales, `hasPreparacion`/`hasRetiro`, simplificar `nextMainEvent`, simplificar `isPickup` ref, simplificar `canSeeConfirmationCode`, eliminar `handlePreparation`, `handlePickup`, branch Retiro de `handleRevert`, quitar `'Retiro'` del filter Llegada guard, quitar render de `<PreparationModal>`/`<PickupModal>`, simplificar filter Parada (`!isPickup` queda obsoleto)
- `src/app/(app)/solicitudes/[id]/page.tsx` — eliminar `is_self_pickup` de SELECT y mapper, eliminar `fulfillment_type` initial state, eliminar pass a `SolicitudForm`; agregar render de badge "Pickup Aprobado" en LineRow (T9)
- `src/app/(app)/solicitudes/nueva/page.tsx` — eliminar `fulfillment_type: 'fleet'` del initial state
- `src/app/(app)/solicitudes/page.tsx` — eliminar bloques de badge "Retiro" en columna status (table + mobile cards)
- `src/app/(app)/programacion/page.tsx` — agregar acción "Aprobar pickup" en BacklogTable (T6); agregar nueva sección "Pickups Pendientes de Retiro" (T8)
- `src/app/(app)/programacion/viaje/[id]/page.tsx` — eliminar gate `!trip.is_self_pickup` en GPS map (línea 744); agregar acción "Convertir a pickup" en `AssignmentRow` (T7)
- `src/app/(app)/programacion/viaje/nuevo/page.tsx` — eliminar `isPickup` state, `onPickupChange` handler, `is_self_pickup: false` initial, lógica auto-MVLPUP
- `src/app/api/gps/trip/[tripId]/position/route.ts` — eliminar `is_self_pickup` del SELECT y branch que retornaba `'pickup'`
- `src/components/programacion/BacklogTable.tsx` — agregar prop `onApprovePickup` opcional + columna acción

**Creados (2):**
- `src/hooks/usePickup.ts` — hook nuevo con `approvePickupFromBacklog`, `convertLineToPickup`, `completePickup`
- `src/components/programacion/PickupDeliveryModal.tsx` — modal "Registrar entrega" pickup (receptor dropdown + texto fallback + notas opc + attachments opc)

**Eliminados (3):**
- `src/components/viajes/PreparationModal.tsx` (109 líneas)
- `src/components/viajes/PickupModal.tsx` (309 líneas)
- `tests/pickup-flow.spec.ts` (~250 líneas — flow viejo entero)

**Tests modificados (3):**
- `tests/programacion-viaje.spec.ts` — eliminar refs a `is_self_pickup` (líneas 39, 48, 158-167; el `test.skip` también)
- `tests/solicitud-creation.spec.ts` — eliminar test "fulfillment_type defaults to fleet" + assertions
- `tests/helpers.ts` — eliminar `opts.isPickup` de `createTrip` + bloque toggle pickup (líneas 285-306) + funciones `registerPreparation` y `registerRetiro` (líneas 510-545 aprox)

**Docs (3):**
- `Docs/CHANGELOG.md` — entry `[feat]` Cambio 3 + entry `[bd]` confirmando aplicación
- `Docs/reference/events-v2-redesign-in-progress-v3.md` — frontmatter `status: shipped` para Cambio 3 + `shipped_commits`
- `Docs/TRAIL.md` — actualizar posición a "Cambio 3 cerrado"
- `Docs/BACKLOG.md` — cerrar items J1, J2, D4, AD-1 si no estaban ya marcados

---

## Task 1: Regenerar database.ts

**Goal:** Sincronizar tipos TypeScript con schema staging post-Cambio 3 BD migration.

**Files:**
- Modify: `src/lib/types/database.ts` (regenerar contra staging `vonwkciosksqspyljzfy`, restaurar Row<T> helper)

**Acceptance Criteria:**
- [ ] `sm_request_lines.Row` incluye 6 columnas pickup nuevas: `pickup_by_project`, `pickup_approved_at`, `pickup_approved_by`, `pickup_completed_at`, `pickup_received_by_id`, `pickup_received_by_name`
- [ ] `trips.Row` NO incluye `is_self_pickup`
- [ ] `sm_requests.Row` NO incluye `fulfillment_type`
- [ ] `Database['public']['Functions']` NO incluye `complete_pickup_trip`
- [ ] `Row<T>` helper presente al final del archivo
- [ ] `npm run build` falla con errores TS esperados (consumers de columnas viejas) — esto es la señal para Tasks 2-4

**Verify:** `grep -E "is_self_pickup|fulfillment_type|complete_pickup_trip" src/lib/types/database.ts` → no matches; `grep "pickup_by_project\|pickup_approved_at" src/lib/types/database.ts | wc -l` → 3+

**Steps:**

- [ ] **Step 1: Regenerar tipos contra staging**

```bash
npx supabase gen types typescript --project-id vonwkciosksqspyljzfy 2>/dev/null > src/lib/types/database.ts
```

- [ ] **Step 2: Verificar que las columnas pickup nuevas están**

```bash
grep -n "pickup_by_project\|pickup_approved_at\|pickup_approved_by\|pickup_completed_at\|pickup_received_by_id\|pickup_received_by_name" src/lib/types/database.ts | head -20
```

Expected: 6 ocurrencias × 3 (Row + Insert + Update) = ~18 líneas para `sm_request_lines`. Más 2 FK constraint refs.

- [ ] **Step 3: Verificar que las columnas viejas NO están**

```bash
grep -n "is_self_pickup\|fulfillment_type\|complete_pickup_trip" src/lib/types/database.ts
```

Expected: 0 matches.

- [ ] **Step 4: Restaurar Row<T> helper al final del archivo**

```bash
echo "" >> src/lib/types/database.ts
echo "// Helper type for row access" >> src/lib/types/database.ts
echo "export type Row<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']" >> src/lib/types/database.ts
```

- [ ] **Step 5: Confirmar que el build rompe con errores esperados**

```bash
npm run build 2>&1 | grep -E "is_self_pickup|fulfillment_type|complete_pickup_trip" | head -30
```

Expected: errores TS en `src/hooks/useTrips.ts`, `src/hooks/useSolicitudes.ts`, `src/app/(app)/mis-viajes/[id]/page.tsx`, etc. Esto es esperado y se resuelve en Tasks 2-4.

- [ ] **Step 6: Commit**

```bash
git add src/lib/types/database.ts
git commit -m "$(cat <<'EOF'
chore: regenerar database.ts post-Cambio 3 BD (Task 1)

- 6 columnas pickup nuevas en sm_request_lines
- DROP is_self_pickup (trips) + fulfillment_type (sm_requests) + complete_pickup_trip
- Row<T> helper restaurado

BD migration: cambio3_pickup_redesign aplicada por Chat en staging
(vonwkciosksqspyljzfy). Build esperado rompe con errores TS en
consumers — se resuelven en Tasks 2-4.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Eliminar is_self_pickup consumers + DELETE PreparationModal/PickupModal + GPS branch + simplificar TripCard

**Goal:** Eliminar todas las referencias a `is_self_pickup` (10 archivos) y borrar archivos PreparationModal.tsx/PickupModal.tsx. Simplificar TripCard sin `PICKUP_STEPS`. Eliminar branch pickup en GPS API route.

**Files:**
- Delete: `src/components/viajes/PreparationModal.tsx`
- Delete: `src/components/viajes/PickupModal.tsx`
- Modify: `src/hooks/useTrips.ts` (líneas 111, 135, 289, 786, 840, 963)
- Modify: `src/hooks/useMyTrips.ts` (líneas 41, 80, 178)
- Modify: `src/components/programacion/TripForm.tsx` (líneas 72, 74, 91-92, 152, 157, 335-355, 382)
- Modify: `src/app/(app)/programacion/viaje/nuevo/page.tsx` (líneas 61-75, 302-323)
- Modify: `src/app/(app)/programacion/viaje/[id]/page.tsx` (línea 744)
- Modify: `src/app/(app)/mis-viajes/[id]/page.tsx` (líneas 28-29, 489, 1324)
- Modify: `src/app/(app)/solicitudes/[id]/page.tsx` (líneas 167, 223)
- Modify: `src/components/solicitudes/types.ts` (línea 31)
- Modify: `src/components/viajes/TripCard.tsx` (líneas 5, 14, 16-17, 84-86, 128)
- Modify: `src/app/api/gps/trip/[tripId]/position/route.ts` (líneas 26, 41-44)

**Acceptance Criteria:**
- [ ] `npm run build` verde
- [ ] `grep -rn "is_self_pickup" src/ tests/` → no matches (excepto `database.ts.new` artifacts si existen — borrarlos)
- [ ] `ls src/components/viajes/PreparationModal.tsx src/components/viajes/PickupModal.tsx` → ambos errores "no such file"
- [ ] TripCard renderiza correctamente sin badge "Retiro" (visual smoke test no obligatorio en autonomous run)
- [ ] GPS route retorna `'no_gps'` o `'live'`/`'stale'`/`'not_in_route'` — nunca `'pickup'`

**Verify:** `npm run build && grep -rn "is_self_pickup\|PreparationModal\|PickupModal\|PICKUP_STEPS" src/ tests/`

**Steps:**

- [ ] **Step 1: DELETE archivos modales legacy**

```bash
rm src/components/viajes/PreparationModal.tsx
rm src/components/viajes/PickupModal.tsx
```

- [ ] **Step 2: Limpiar `useTrips.ts`**

Cambios en `src/hooks/useTrips.ts`:

```typescript
// Línea 111 — eliminar de TripWithRelations
// QUITAR:
//   is_self_pickup: boolean

// Línea 135 — eliminar de TripInput
// QUITAR:
//   is_self_pickup?: boolean

// Línea 289 — eliminar del mapper mapTripRow (return)
// QUITAR:
//   is_self_pickup: (row.is_self_pickup as boolean) ?? false,

// Línea 786 — eliminar del fetchTrip (return)
// QUITAR:
//   is_self_pickup: (row.is_self_pickup as boolean) ?? false,

// Línea 840 — eliminar del INSERT en saveTrip
// QUITAR:
//   is_self_pickup: input.is_self_pickup ?? false,

// Línea 963 — eliminar del UPDATE en updateTrip
// QUITAR:
//   is_self_pickup: input.is_self_pickup ?? false,
```

Comando exacto para verificar post-edit:
```bash
grep -n "is_self_pickup" src/hooks/useTrips.ts
# Expected: 0 matches
```

- [ ] **Step 3: Limpiar `useMyTrips.ts`**

```typescript
// Línea 41 — eliminar de MyTripSummary interface
// QUITAR:
//   is_self_pickup: boolean

// Línea 80 — eliminar del SELECT string
// CAMBIAR:
//   confirmation_code,
//   att_permit,
//   escort,
//   is_self_pickup,
//   driver:driver_id(id, name),
// A:
//   confirmation_code,
//   att_permit,
//   escort,
//   driver:driver_id(id, name),

// Línea 178 — eliminar del mapper return
// QUITAR:
//   is_self_pickup: (r.is_self_pickup as boolean) ?? false,
```

Verificar:
```bash
grep -n "is_self_pickup" src/hooks/useMyTrips.ts
# Expected: 0 matches
```

- [ ] **Step 4: Limpiar `TripForm.tsx` — eliminar props pickup y bloque del checkbox**

Cambios en `src/components/programacion/TripForm.tsx`:

```typescript
// Líneas 71-74 — eliminar JSDoc + props isPickup, onPickupChange
// QUITAR del interface TripFormProps:
//   /** Si es retiro en Chilibre (self-pickup) */
//   isPickup?: boolean
//   /** Callback cuando cambia el toggle de retiro */
//   onPickupChange?: (isPickup: boolean) => void

// Líneas 91-92 — eliminar de destructuring de props
// QUITAR:
//   isPickup = false,
//   onPickupChange,

// Línea 152 — eliminar del propagate data object
// QUITAR:
//   is_self_pickup: overrides?.is_self_pickup !== undefined ? overrides.is_self_pickup : isPickup,

// Línea 157 — eliminar `isPickup` del array de deps de useCallback
// CAMBIAR:
//   [scheduledDate, scheduledTime, driverId, vehicleId, trailerId, rateId, cost, attPermit, escort, notes, isExternal, isPickup, attachments, onChange],
// A:
//   [scheduledDate, scheduledTime, driverId, vehicleId, trailerId, rateId, cost, attPermit, escort, notes, isExternal, attachments, onChange],

// Líneas 335-355 — eliminar bloque entero del checkbox "Retiro en Chilibre"
// (BUSCAR `{mode === 'create' && onPickupChange && (` y borrar todo el bloque hasta el `)}` correspondiente)

// Línea 382 — buscar `{!isPickup &&` y simplificar (siempre renderizar la sección dentro)
// El conditional renderizado adentro probablemente sea conductor/vehículo. Sin pickup, siempre se muestra.
// CAMBIAR:
//   {!isPickup && (
//     <div>...</div>
//   )}
// A: solo `<div>...</div>` (sin el wrap conditional)
```

Verificar:
```bash
grep -n "isPickup\|onPickupChange\|is_self_pickup" src/components/programacion/TripForm.tsx
# Expected: 0 matches
```

- [ ] **Step 5: Limpiar `programacion/viaje/nuevo/page.tsx`**

```typescript
// Línea 61 — eliminar useState de isPickup
// QUITAR:
//   const [isPickup, setIsPickup] = useState(false)

// Línea 74 — eliminar de tripData initial state
// QUITAR:
//   is_self_pickup: false,

// Líneas 302-323 — eliminar todo el bloque isPickup/onPickupChange en TripForm props
// CAMBIAR el render del TripForm a:
//   <TripForm
//     mode="create"
//     drivers={driverOptions}
//     vehicles={vehicleOptions}
//     trailers={trailerOptions}
//     rates={rateOptions}
//     onChange={setTripData}
//     onRateChange={handleRateChange}
//     isTrailerRequired={isCabezal}
//   />

// El useState de isPickup ya no es necesario. La validación J1 (líneas 200-213) ya es correcta sin pickup
// (driver_id y vehicle_id siempre requeridos). No tocar la función validate().
```

Verificar:
```bash
grep -n "isPickup\|is_self_pickup\|MVLPUP" "src/app/(app)/programacion/viaje/nuevo/page.tsx"
# Expected: 0 matches
```

- [ ] **Step 6: Limpiar `programacion/viaje/[id]/page.tsx` — solo el GPS gate**

```typescript
// Línea 744 — eliminar el `!trip.is_self_pickup &&` del conditional render
// CAMBIAR:
//   {trip.status === 'En Ruta' &&
//     !trip.is_self_pickup &&
//     trip.vehicle?.gps_vehicle_id && (
//       <div className="mt-6">
//         <TripLiveMap tripId={trip.id} variant="full" />
//       </div>
//     )}
// A:
//   {trip.status === 'En Ruta' && trip.vehicle?.gps_vehicle_id && (
//     <div className="mt-6">
//       <TripLiveMap tripId={trip.id} variant="full" />
//     </div>
//   )}
```

NOTA: La acción "Convertir a pickup" en este archivo es Task 7 — no la tocamos en T2.

- [ ] **Step 7: Limpiar `mis-viajes/[id]/page.tsx` — solo refs simples a is_self_pickup**

Las refs en este archivo a Preparacion/Retiro/handlers se borran en Task 4. En T2 solo limpiamos:

```typescript
// Líneas 28-29 — eliminar imports de modals borrados
// QUITAR:
//   import { PreparationModal } from '@/components/viajes/PreparationModal'
//   import { PickupModal, type PickupData } from '@/components/viajes/PickupModal'

// Línea 489 — simplificar isPickup (queda como const)
// CAMBIAR:
//   const isPickup = trip?.is_self_pickup === true
// A:
//   const isPickup = false  // Pickup ya no existe a nivel trip — Cambio 3 lo movió a línea

// NOTA: dejamos `isPickup = false` como const literal para minimizar diff en T2.
// En T4 borramos completamente toda la lógica que depende de isPickup (nextMainEvent,
// hasPreparacion, hasRetiro, branch Retiro de handleRevert, modal renders, button filter Parada).

// Línea 1324 — simplificar canSeeConfirmationCode (sin gate de pickup)
// CAMBIAR:
//   const canSeeConfirmationCode = role === 'logistica' || role === 'admin' || (role === 'pm' && !trip.is_self_pickup)
// A:
//   const canSeeConfirmationCode = role === 'logistica' || role === 'admin' || role === 'pm'
```

Verificar parcial (Preparation/Pickup/Retiro siguen porque T4 los borra):
```bash
grep -n "is_self_pickup\|PreparationModal\|PickupModal" "src/app/(app)/mis-viajes/[id]/page.tsx"
# Expected: 0 matches (T2 limpia esto)
# Pero todavía van a aparecer "Preparacion", "Retiro", "handlePreparation", "handlePickup" — eso es T4
```

- [ ] **Step 8: Limpiar `solicitudes/[id]/page.tsx` — solo is_self_pickup**

```typescript
// Línea 167 — eliminar del SELECT string
// CAMBIAR:
//   .select(`
//     trip_id,
//     ...
//     is_self_pickup,
//     ...
// A:
//   .select(`
//     trip_id,
//     ...   (sin is_self_pickup)

// Línea 223 — eliminar del mapper en tripMap.set
// QUITAR:
//   is_self_pickup: (t.is_self_pickup as boolean) ?? false,
```

- [ ] **Step 9: Limpiar `solicitudes/types.ts`**

```typescript
// Línea 31 — eliminar de AssociatedTrip
// QUITAR:
//   is_self_pickup: boolean
```

- [ ] **Step 10: Limpiar `TripCard.tsx` — eliminar PICKUP_STEPS, ProgressBar simplificado, sin badge Retiro**

```typescript
// Línea 5 — eliminar MyTripEvent del import si ya no se usa
// (si solo se usaba para PICKUP_STEPS, se puede dejar — es type)

// Línea 14 — eliminar PICKUP_STEPS
// QUITAR:
//   const PICKUP_STEPS: MyTripEvent['event_type'][] = ['Preparacion', 'Retiro']

// Línea 16 — simplificar ProgressBar firma
// CAMBIAR:
//   function ProgressBar({ events, isPickup }: { events: MyTripEvent[]; isPickup: boolean }) {
//     const PROGRESS_STEPS = isPickup ? PICKUP_STEPS : FLEET_STEPS
// A:
//   function ProgressBar({ events }: { events: MyTripEvent[] }) {
//     const PROGRESS_STEPS = FLEET_STEPS

// Líneas 84-86 — eliminar bloque badge "Retiro"
// QUITAR:
//   {trip.is_self_pickup && (
//     <Badge variant="custom" label="Retiro" bg="bg-amber-100" text="text-amber-800" />
//   )}

// Línea 128 — eliminar prop isPickup
// CAMBIAR:
//   <ProgressBar events={trip.events} isPickup={trip.is_self_pickup} />
// A:
//   <ProgressBar events={trip.events} />
```

- [ ] **Step 11: Limpiar GPS route**

Cambios en `src/app/api/gps/trip/[tripId]/position/route.ts`:

```typescript
// Línea 26 — eliminar is_self_pickup del SELECT
// CAMBIAR:
//   .select('id, status, is_self_pickup, vehicle_id')
// A:
//   .select('id, status, vehicle_id')

// Líneas 41-44 — eliminar branch pickup
// QUITAR:
//   if (trip.is_self_pickup) {
//     const body: GpsTripPosition = { status: 'pickup' }
//     return NextResponse.json(body)
//   }
```

- [ ] **Step 12: Verificación intermedia con build**

```bash
npm run build 2>&1 | tail -50
```

Expected: build podría seguir rompiendo por refs a `Preparacion`/`Retiro`/`fulfillment_type` que se limpian en Tasks 3-4. Acceptable mientras los errores listados arriba para T2 sean cero.

Verificar específicamente que los errores de `is_self_pickup` desaparecieron:
```bash
npm run build 2>&1 | grep "is_self_pickup"
# Expected: 0 matches
```

- [ ] **Step 13: Grep regression final T2**

```bash
grep -rn "is_self_pickup\|PreparationModal\|PickupModal\|PICKUP_STEPS" src/ tests/
# Expected: 0 matches en src/. tests/ todavía tiene refs (cleanup en T10).
```

- [ ] **Step 14: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
refactor: eliminar is_self_pickup + modals legacy de pickup (Task 2)

- DELETE PreparationModal.tsx + PickupModal.tsx (legacy de modelo viejo)
- Eliminar is_self_pickup en useTrips, useMyTrips, TripForm,
  programacion/viaje/nuevo+[id], mis-viajes/[id], solicitudes/[id],
  solicitudes/types, TripCard, GPS API route
- Simplificar ProgressBar (solo FLEET_STEPS), sin badge "Retiro"
- canSeeConfirmationCode sin gate de pickup (PM siempre puede ver)
- GPS route sin branch 'pickup' (solo not_in_route/no_gps/stale/live)

Tests todavía tienen refs (cleanup en Task 10). Refs a Preparacion/
Retiro/handlers se mantienen — Task 4 las borra completas.

Cambio 3 — Pickup nuevo. Contexto: pickup ya no es trip especial,
es bandera per-línea (sm_request_lines.pickup_by_project).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Eliminar fulfillment_type consumers + badge "Retiro" en lista solicitudes

**Goal:** Eliminar todas las refs a `fulfillment_type` (5 archivos) y eliminar el badge "Retiro" en `/solicitudes` table+mobile (Q1=c).

**Files:**
- Modify: `src/hooks/useSolicitudes.ts` (líneas 31, 82, 344, 469, 506, 620)
- Modify: `src/components/solicitudes/SolicitudForm.tsx` (líneas 31, 83, 104, 110)
- Modify: `src/app/(app)/solicitudes/page.tsx` (líneas 334-336, 393-395)
- Modify: `src/app/(app)/solicitudes/[id]/page.tsx` (líneas 97, 559)
- Modify: `src/app/(app)/solicitudes/nueva/page.tsx` (línea 70)

**Acceptance Criteria:**
- [ ] `npm run build` verde (no errores TS por `fulfillment_type`)
- [ ] `grep -rn "fulfillment_type\|fulfillmentType" src/` → 0 matches
- [ ] Badge "Retiro" ya no aparece en columna estado de `/solicitudes` (eliminado por Q1=c)

**Verify:** `npm run build && grep -rn "fulfillment_type\|fulfillmentType" src/`

**Steps:**

- [ ] **Step 1: Limpiar `useSolicitudes.ts`**

```typescript
// Línea 31 — eliminar de SolicitudWithRelations
// QUITAR:
//   fulfillment_type: string | null

// Línea 82 — eliminar de SolicitudInput
// QUITAR:
//   fulfillment_type?: string | null

// Línea 344 — eliminar de mapper en refetchList (return)
// QUITAR:
//   fulfillment_type: row.fulfillment_type ?? 'fleet',

// Línea 469 — eliminar de mapper en fetchSolicitud (return)
// QUITAR:
//   fulfillment_type: data.fulfillment_type ?? 'fleet',

// Línea 506 — eliminar del headerPayload en saveSolicitud
// QUITAR:
//   fulfillment_type: header.fulfillment_type ?? 'fleet',

// Línea 620 — eliminar del headerUpdate condicional en updateSolicitud
// QUITAR:
//   if (header.fulfillment_type !== undefined) headerUpdate.fulfillment_type = header.fulfillment_type
```

Verificar:
```bash
grep -n "fulfillment_type" src/hooks/useSolicitudes.ts
# Expected: 0 matches
```

- [ ] **Step 2: Limpiar `SolicitudForm.tsx`**

```typescript
// Línea 31 — eliminar de initialData prop
// QUITAR:
//   fulfillmentType?: string | null

// Línea 83 — eliminar useState de fulfillmentType
// QUITAR:
//   const [fulfillmentType, setFulfillmentType] = useState<string>(initialData?.fulfillmentType ?? 'fleet')

// Línea 104 — eliminar del propagate data object
// QUITAR:
//   fulfillment_type: overrides?.fulfillment_type ?? fulfillmentType,

// Línea 110 — eliminar `fulfillmentType` del array de deps de useCallback
// CAMBIAR:
//   [projectId, requesterId, approvedBy, dateRequired, notes, attachments, fulfillmentType, cascade.costCodeId, cascade.costCategoryId, onChange],
// A:
//   [projectId, requesterId, approvedBy, dateRequired, notes, attachments, cascade.costCodeId, cascade.costCategoryId, onChange],

// NOTA: el setter setFulfillmentType nunca se usa en el componente. Es dead state. La eliminación
// es total (no usa initialData?.fulfillmentType siquiera, era propagado pero no rendereado).
```

- [ ] **Step 3: Limpiar `solicitudes/page.tsx` — eliminar bloques de badge "Retiro"**

```typescript
// Líneas 334-336 — eliminar bloque del badge en columna status (desktop)
// QUITAR:
//   {row.fulfillment_type === 'pickup' && (
//     <Badge variant="custom" label="Retiro" bg="bg-amber-100" text="text-amber-800" />
//   )}

// Líneas 393-395 — eliminar bloque del badge en mobileRender
// QUITAR:
//   {row.fulfillment_type === 'pickup' && (
//     <Badge variant="custom" label="Retiro" bg="bg-amber-100" text="text-amber-800" />
//   )}
```

- [ ] **Step 4: Limpiar `solicitudes/[id]/page.tsx`**

```typescript
// Línea 97 — eliminar de header initial state
// CAMBIAR:
//   const [header, setHeader] = useState<SolicitudInput>({
//     project_id: '',
//     requester_id: '',
//     date_required: '',
//     fulfillment_type: 'fleet',
//   })
// A:
//   const [header, setHeader] = useState<SolicitudInput>({
//     project_id: '',
//     requester_id: '',
//     date_required: '',
//   })

// Línea 559 — eliminar fulfillmentType del SolicitudForm initialData
// QUITAR:
//   fulfillmentType: solicitud.fulfillment_type ?? 'fleet',
```

- [ ] **Step 5: Limpiar `solicitudes/nueva/page.tsx`**

```typescript
// Línea 70 — eliminar de header initial state
// QUITAR:
//   fulfillment_type: 'fleet',
```

- [ ] **Step 6: Verificación de build + grep**

```bash
npm run build 2>&1 | grep "fulfillment_type" | head -5
# Expected: 0 matches

grep -rn "fulfillment_type\|fulfillmentType" src/
# Expected: 0 matches
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
refactor: eliminar fulfillment_type — modelo pickup per-línea (Task 3)

- Eliminar fulfillment_type de SolicitudWithRelations, SolicitudInput,
  todos los inserts/updates en useSolicitudes
- Eliminar dead state en SolicitudForm (prop + state + propagate)
- Eliminar badge "Retiro" en /solicitudes table + mobile cards
  (Q1=c: ruido sin información accionable; sección "Pickups Pendientes
  de Retiro" + badge per-line en /solicitudes/[id] cubren las 2
  perspectivas relevantes)
- Limpiar initial state en nueva/[id]/page.tsx

Cambio 3 — Pickup nuevo. La columna sm_requests.fulfillment_type fue
DROP-eada por Chat (modelo viejo no tenía uso real: 0 solicitudes con
fulfillment_type='pickup' en staging).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Eliminar event types Preparacion/Retiro + handlers + branch revert

**Goal:** Eliminar event types `'Preparacion'` y `'Retiro'` de TypeScript union, sus icons/colors en EventTimeline, handlePreparation/handlePickup, branch Retiro de handleRevert, ref `'Retiro'` del filter Llegada guard, render de modals (ya borrados en T2 pero sus uses siguen aquí), simplificar nextMainEvent y filter Parada.

**Files:**
- Modify: `src/hooks/useTripEvents.ts` (línea 9)
- Modify: `src/components/viajes/EventTimeline.tsx` (líneas 37-40, 63-66)
- Modify: `src/app/(app)/mis-viajes/[id]/page.tsx` (líneas 489, 494-507, 849, 997-1061, 1080-1118, 1169-1277, 1515, 1580-1598, 1611)

**Acceptance Criteria:**
- [ ] `npm run build` verde
- [ ] `grep -n "'Preparacion'\|'Retiro'\|handlePreparation\|handlePickup" src/` → 0 matches
- [ ] `mis-viajes/[id]/page.tsx` no tiene refs a `isPickup` ni a `hasPreparacion`/`hasRetiro`
- [ ] EventTimeline solo tiene icons/colors para Salida/Llegada/Entrega/Retorno/Incidencia/Reversion/Parada
- [ ] Handler revert para Llegada filtra solo `['Entrega', 'Parada']` (sin Retiro)
- [ ] Botón Parada está disponible siempre que haya Salida (sin filtro `!isPickup`)

**Verify:** `npm run build && grep -n "'Preparacion'\|'Retiro'\|handlePreparation\|handlePickup\|hasPreparacion\|hasRetiro\|isPickup" "src/app/(app)/mis-viajes/[id]/page.tsx"`

**Steps:**

- [ ] **Step 1: Limpiar `useTripEvents.ts`**

```typescript
// Línea 9 — eliminar 'Preparacion' | 'Retiro' del union
// CAMBIAR:
//   export type TripEventType = 'Salida' | 'Llegada' | 'Entrega' | 'Retorno' | 'Incidencia' | 'Preparacion' | 'Retiro' | 'Parada'
// A:
//   export type TripEventType = 'Salida' | 'Llegada' | 'Entrega' | 'Retorno' | 'Incidencia' | 'Parada'
```

- [ ] **Step 2: Limpiar `EventTimeline.tsx`**

```typescript
// Líneas 37-40 — eliminar cases Preparacion + Retiro de getEventIcon
// QUITAR:
//     case 'Preparacion':
//       return <ClipboardCheck className="h-4 w-4" />
//     case 'Retiro':
//       return <Car className="h-4 w-4" />

// Líneas 63-66 — eliminar cases Preparacion + Retiro de getEventColor
// QUITAR:
//     case 'Preparacion':
//       return 'bg-amber-500 text-white'
//     case 'Retiro':
//       return 'bg-iconsa-green text-white'

// También: revisar imports al inicio del archivo (línea 3) — si ClipboardCheck o Car
// quedan unused, sacarlos del import de lucide-react. Otros usos de esos iconos
// fuera de EventTimeline no existen.
```

Verificar imports unused:
```bash
grep -n "ClipboardCheck\|Car" src/components/viajes/EventTimeline.tsx
# Si solo aparece en el import de la línea 3, eliminar de ahí también
```

- [ ] **Step 3: Limpiar `mis-viajes/[id]/page.tsx` — eliminar imports + lógica isPickup**

```typescript
// Líneas 28-29 — ya borradas en T2 (verificar)
// grep "PreparationModal\|PickupModal" en este archivo debería dar 0

// Línea 489 — eliminar isPickup (ya seteado a false en T2, ahora borrar la línea entera)
// QUITAR:
//   const isPickup = false  // Pickup ya no existe a nivel trip — Cambio 3 lo movió a línea
//   (la línea entera)

// Líneas 494-495 — eliminar hasPreparacion y hasRetiro
// QUITAR:
//   const hasPreparacion = events.some((e) => e.event_type === 'Preparacion' && !revertedIds.has(e.id))
//   const hasRetiro = events.some((e) => e.event_type === 'Retiro' && !revertedIds.has(e.id))

// Líneas 500-504 — simplificar nextMainEvent (sin branch isPickup)
// CAMBIAR:
//   const nextMainEvent: TripEventType | null = tripDone
//     ? null
//     : isPickup
//       ? (!hasPreparacion ? 'Preparacion' : !hasRetiro ? 'Retiro' : null)
//       : (!hasSalida ? 'Salida' : !hasEntrega ? 'Entrega' : !hasRetorno ? 'Retorno' : null)
// A:
//   const nextMainEvent: TripEventType | null = tripDone
//     ? null
//     : (!hasSalida ? 'Salida' : !hasEntrega ? 'Entrega' : !hasRetorno ? 'Retorno' : null)

// Línea 507 — simplificar showLlegadaButton (eliminar `!isPickup`)
// CAMBIAR:
//   const showLlegadaButton = !isPickup && hasSalida && !hasLlegada && !hasEntrega && !tripDone
// A:
//   const showLlegadaButton = hasSalida && !hasLlegada && !hasEntrega && !tripDone
```

- [ ] **Step 4: Limpiar branch `'Retiro'` del Llegada guard en handleRevert**

```typescript
// Línea 849 — eliminar 'Retiro' del array filter
// CAMBIAR:
//   ['Entrega', 'Retiro', 'Parada'].includes(e.event_type) &&
// A:
//   ['Entrega', 'Parada'].includes(e.event_type) &&
```

- [ ] **Step 5: Eliminar branch Retiro completo de handleRevert**

```typescript
// Líneas 997-1061 — eliminar bloque completo
// QUITAR el bloque entero:
//   if (eventType === 'Retiro') {
//     // Espejo de Entrega para los efectos de cantidades + rollback del trip
//     // ... (todo el bloque hasta la línea 1061)
//   }
```

- [ ] **Step 6: Eliminar `handlePreparation` completo**

```typescript
// Líneas 1080-1118 — eliminar useCallback completo
// QUITAR:
//   // --- Preparación (pickup — informativo, no cambia estados) ---
//   const handlePreparation = useCallback(
//     async (data: { event_id: string; notes: string; attachments: Attachment[] }) => {
//       // ... cuerpo entero
//     },
//     [supabase, trip, person, fetchTrip, id, loadEvents],
//   )
```

NOTA: También eliminar el import `notifyMaterialPreparado` si solo se usa aquí — verificar:
```bash
grep -n "notifyMaterialPreparado" "src/app/(app)/mis-viajes/[id]/page.tsx"
# Si solo el import + 1 uso (dentro del bloque a borrar), eliminar import también
```

- [ ] **Step 7: Eliminar `handlePickup` completo**

```typescript
// Líneas 1169-1277 — eliminar useCallback completo
// QUITAR:
//   // --- Retiro (pickup — delivery + complete trip via RPC) ---
//   const handlePickup = useCallback(
//     async (data: PickupData) => {
//       // ... cuerpo entero (~108 líneas)
//     },
//     [supabase, trip, person, fetchTrip, id, loadEvents],
//   )
```

NOTA: También verificar si `PickupData` import se queda huérfano:
```bash
grep -n "PickupData\|type PickupData" "src/app/(app)/mis-viajes/[id]/page.tsx"
# Expected: 0 matches después de borrar (PickupModal.tsx ya no existe)
```

- [ ] **Step 8: Simplificar filter Parada button**

```typescript
// Línea 1515 — eliminar `!isPickup`
// CAMBIAR:
//   {hasSalida && !tripDone && !isPM && !isPickup && (
//     <EventButton eventType="Parada" ...
// A:
//   {hasSalida && !tripDone && !isPM && (
//     <EventButton eventType="Parada" ...
```

- [ ] **Step 9: Eliminar render de PreparationModal y PickupModal**

```typescript
// Líneas 1580-1587 — eliminar bloque PreparationModal
// QUITAR:
//   {/* Overlay de preparación (pickup) */}
//   {activeEvent === 'Preparacion' && trip && isPickup && (
//     <PreparationModal
//       trip={trip}
//       onConfirm={handlePreparation}
//       onClose={() => setActiveEvent(null)}
//       loading={eventBusy}
//     />
//   )}

// Líneas 1589-1598 — eliminar bloque PickupModal
// QUITAR:
//   {/* Overlay de retiro (pickup) */}
//   {activeEvent === 'Retiro' && trip && isPickup && (
//     <PickupModal
//       trip={trip}
//       onConfirm={handlePickup}
//       onClose={() => setActiveEvent(null)}
//       loading={delivering}
//       person={person}
//     />
//   )}

// Línea 1611 — actualizar lista de eventos no-EventModal (eliminar Preparacion/Retiro)
// CAMBIAR:
//   {activeEvent && !['Salida', 'Entrega', 'Preparacion', 'Retiro', 'Parada'].includes(activeEvent) && (
// A:
//   {activeEvent && !['Salida', 'Entrega', 'Parada'].includes(activeEvent) && (
```

- [ ] **Step 10: Verificación final T4**

```bash
grep -n "'Preparacion'\|'Retiro'\|handlePreparation\|handlePickup\|hasPreparacion\|hasRetiro\|isPickup" "src/app/(app)/mis-viajes/[id]/page.tsx"
# Expected: 0 matches

grep -n "'Preparacion'\|'Retiro'" src/components/viajes/EventTimeline.tsx src/hooks/useTripEvents.ts
# Expected: 0 matches

npm run build 2>&1 | tail -30
# Expected: build verde (al menos no errores de Preparacion/Retiro/handlePreparation/handlePickup)
```

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
refactor: eliminar eventos Preparacion/Retiro + handlers (Task 4)

- TripEventType union sin 'Preparacion' | 'Retiro'
- EventTimeline sin icons/colors para Preparacion/Retiro
- mis-viajes/[id]: borrar handlePreparation, handlePickup, branch
  Retiro de handleRevert (~108 + ~38 + ~65 líneas)
- Quitar 'Retiro' del filter de Llegada guard (línea 849)
- nextMainEvent simplificado (sin branch isPickup)
- showLlegadaButton + filter Parada button sin `!isPickup` gate
- Eliminar render de <PreparationModal> y <PickupModal>
- EventModal exclude list ya no incluye Preparacion/Retiro

Cambio 3 — Pickup nuevo. Pickup ahora es bandera per-línea, no trip
especial con eventos Preparacion/Retiro. complete_pickup_trip RPC ya
no se llama (función DROP-eada por Chat en BD).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Hook usePickup.ts con 3 funciones

**Goal:** Crear `src/hooks/usePickup.ts` con `approvePickupFromBacklog`, `convertLineToPickup` (con auto-cancel-trip), y `completePickup`. Cohesión por dominio en archivo separado para mantener `useSolicitudes.ts` y `useTrips.ts` enfocados.

**Files:**
- Create: `src/hooks/usePickup.ts`

**Acceptance Criteria:**
- [ ] `npm run build` verde
- [ ] Hook exporta 3 funciones async + estado `loading`/`error`
- [ ] `approvePickupFromBacklog(lineId, charrisId)` setea status='Pickup Aprobado', `pickup_by_project=true`, `pickup_approved_at=now()`, `pickup_approved_by=charrisId`. NO toca qty_scheduled (queda como está; típicamente 0 para Pendiente).
- [ ] `convertLineToPickup(lineId, assignmentId, quantityAssigned, tripId, charrisId)`:
  1. SELECT línea actual: status, qty_scheduled, qty_delivered, quantity
  2. Bloquear si `qty_delivered > 0` (E2/Q7) — return `{ ok: false, error: '...' }`
  3. DELETE `trip_line_assignments` WHERE id = assignmentId
  4. UPDATE `sm_request_lines` atómico: status='Pickup Aprobado', pickup_by_project=true, pickup_approved_at, pickup_approved_by=charrisId, qty_scheduled=Math.max(0, qty_scheduled - quantityAssigned)
  5. SELECT count de assignments restantes en el trip
  6. Si count = 0 → UPDATE `trips`: status='Cancelado', date_cancelled=now(), notes appended con razón "Todas las líneas convertidas a pickup"
  7. Return `{ ok: true, tripCancelled: boolean }`
- [ ] `completePickup(lineId, receivedById, receivedByName, notes, attachments)`:
  1. Validación: `receivedById !== null || receivedByName.trim() !== ''` (Q6 XOR)
  2. SELECT línea: quantity (para auto-fill qty_delivered)
  3. UPDATE `sm_request_lines`: status='Entregada', qty_delivered=quantity, pickup_completed_at=now(), pickup_received_by_id, pickup_received_by_name, delivered_at=now(), **attachments=attachments** (persistir evidencias). cascade_request_status trigger updatea solicitud padre automáticamente.
  4. Chat aplicó migración adicional `cambio3_pickup_add_attachments_to_lines` (`ALTER TABLE sm_request_lines ADD COLUMN attachments JSONB DEFAULT '[]'::jsonb NOT NULL`) — la columna existe, persistencia directa.

**Verify:** `npm run build && grep -n "export function approvePickup\|export function convertLine\|export function completePickup" src/hooks/usePickup.ts`

**Steps:**

- [ ] **Step 1: Verificar regen de tipos refleja columna attachments**

Chat aplicó migración adicional `cambio3_pickup_add_attachments_to_lines` después del brainstorming:
```sql
ALTER TABLE sm_request_lines ADD COLUMN attachments JSONB DEFAULT '[]'::jsonb NOT NULL
```

Razón: persistir evidencias de pickup completion (fotos del receptor, condiciones del material) per-línea.

Verificar que el regen de Task 1 trajo la columna:
```bash
grep -A 5 "attachments:" src/lib/types/database.ts | grep -B 1 "sm_request_lines\|Json" | head -10
```

Expected: ver `attachments: Json` (tipo Json/Json[] o similar) dentro del bloque `sm_request_lines`. Si no aparece, regenerar tipos antes de continuar:
```bash
npx supabase gen types typescript --project-id vonwkciosksqspyljzfy 2>/dev/null > src/lib/types/database.ts
echo "" >> src/lib/types/database.ts
echo "// Helper type for row access" >> src/lib/types/database.ts
echo "export type Row<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']" >> src/lib/types/database.ts
```

Persistencia directa en el hook — el modal sube los Attachment[] a Storage via FileUploader y guardamos el array en la columna JSONB de la línea (mismo patrón que `trips.attachments`, `trip_events.attachments`, `sm_requests.attachments`).

- [ ] **Step 2: Crear `src/hooks/usePickup.ts`**

```typescript
'use client'

import { useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Attachment } from '@/lib/supabase/storage'

export interface ConvertLineResult {
  ok: boolean
  tripCancelled?: boolean
  error?: string
}

export interface ApprovePickupResult {
  ok: boolean
  error?: string
}

export interface CompletePickupResult {
  ok: boolean
  error?: string
}

export function usePickup() {
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Aprueba pickup desde el backlog (línea Pendiente).
   * NO toca qty_scheduled — la línea Pendiente típicamente tiene qty_scheduled=0.
   * cascade_request_status trigger en BD updatea sm_requests.status automáticamente.
   */
  const approvePickupFromBacklog = useCallback(
    async (lineId: string, charrisId: string): Promise<ApprovePickupResult> => {
      setLoading(true)
      setError(null)

      try {
        const { error: updateError } = await supabase
          .from('sm_request_lines')
          .update({
            status: 'Pickup Aprobado',
            pickup_by_project: true,
            pickup_approved_at: new Date().toISOString(),
            pickup_approved_by: charrisId,
          })
          .eq('id', lineId)

        if (updateError) {
          setError(updateError.message)
          return { ok: false, error: updateError.message }
        }

        return { ok: true }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al aprobar pickup'
        setError(message)
        return { ok: false, error: message }
      } finally {
        setLoading(false)
      }
    },
    [supabase],
  )

  /**
   * Convierte una línea Programada a Pickup Aprobado.
   * - Bloquea si qty_delivered > 0 (E2/Q7).
   * - DELETE assignment, UPDATE línea atómico (status + flags + qty_scheduled).
   * - Si trip queda con 0 assignments → cancela trip con razón.
   *
   * NO usa releaseLineFromAssignment para evitar round-trip Pendiente→Pickup Aprobado
   * que dispararía cascade dos veces.
   */
  const convertLineToPickup = useCallback(
    async (
      lineId: string,
      assignmentId: string,
      quantityAssigned: number,
      tripId: string,
      charrisId: string,
    ): Promise<ConvertLineResult> => {
      setLoading(true)
      setError(null)

      try {
        // 1. Validar: qty_delivered debe ser 0
        const { data: line, error: fetchError } = await supabase
          .from('sm_request_lines')
          .select('qty_delivered, qty_scheduled, quantity')
          .eq('id', lineId)
          .single()

        if (fetchError || !line) {
          const msg = fetchError?.message ?? 'Línea no encontrada'
          setError(msg)
          return { ok: false, error: msg }
        }

        const qtyDelivered = line.qty_delivered ?? 0
        if (qtyDelivered > 0) {
          const msg = `No se puede convertir a pickup una línea con entregas previas registradas (${qtyDelivered} de ${line.quantity} entregado). Cancelá la línea o terminá el flow actual.`
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

        // 3. UPDATE línea atómico: status + flags + qty_scheduled
        const newQtyScheduled = Math.max(0, (line.qty_scheduled ?? 0) - quantityAssigned)

        const { error: updateError } = await supabase
          .from('sm_request_lines')
          .update({
            status: 'Pickup Aprobado',
            pickup_by_project: true,
            pickup_approved_at: new Date().toISOString(),
            pickup_approved_by: charrisId,
            qty_scheduled: newQtyScheduled,
          })
          .eq('id', lineId)

        if (updateError) {
          setError(updateError.message)
          return { ok: false, error: updateError.message }
        }

        // 4. Verificar si el trip quedó sin assignments
        const { data: remaining, error: countError } = await supabase
          .from('trip_line_assignments')
          .select('id', { count: 'exact', head: true })
          .eq('trip_id', tripId)

        if (countError) {
          // Trip cancel best-effort. La conversión ya pasó.
          console.warn('[usePickup] No se pudo verificar count de assignments:', countError.message)
          return { ok: true, tripCancelled: false }
        }

        // count viene como `count` en la response del supabase client
        const remainingCount = (remaining as unknown as { count?: number } | null)?.count ?? 0

        if (remainingCount === 0) {
          // Cancelar trip
          const { error: cancelError } = await supabase
            .from('trips')
            .update({
              status: 'Cancelado',
            })
            .eq('id', tripId)

          if (cancelError) {
            console.warn('[usePickup] No se pudo cancelar trip vacío:', cancelError.message)
            return { ok: true, tripCancelled: false }
          }

          return { ok: true, tripCancelled: true }
        }

        return { ok: true, tripCancelled: false }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al convertir línea a pickup'
        setError(message)
        return { ok: false, error: message }
      } finally {
        setLoading(false)
      }
    },
    [supabase],
  )

  /**
   * Registra entrega de pickup. Setea status='Entregada', qty_delivered=quantity,
   * pickup_completed_at, receptor (id O nombre — XOR validation), y persiste
   * attachments en sm_request_lines.attachments (columna JSONB agregada por Chat
   * en migración cambio3_pickup_add_attachments_to_lines).
   * cascade_request_status updatea solicitud padre automáticamente.
   */
  const completePickup = useCallback(
    async (
      lineId: string,
      receivedById: string | null,
      receivedByName: string,
      notes: string,
      attachments: Attachment[],
    ): Promise<CompletePickupResult> => {
      setLoading(true)
      setError(null)

      try {
        // Validación XOR: al menos uno de id o nombre
        if (!receivedById && receivedByName.trim() === '') {
          const msg = 'Receptor requerido (selecciona persona o escribe nombre)'
          setError(msg)
          return { ok: false, error: msg }
        }

        // SELECT quantity total para auto-fill qty_delivered (Q4: todo o nada)
        const { data: line, error: fetchError } = await supabase
          .from('sm_request_lines')
          .select('quantity')
          .eq('id', lineId)
          .single()

        if (fetchError || !line) {
          const msg = fetchError?.message ?? 'Línea no encontrada'
          setError(msg)
          return { ok: false, error: msg }
        }

        const now = new Date().toISOString()

        const { error: updateError } = await supabase
          .from('sm_request_lines')
          .update({
            status: 'Entregada',
            qty_delivered: line.quantity, // Q4: pickup todo-o-nada
            pickup_completed_at: now,
            pickup_received_by_id: receivedById,
            pickup_received_by_name: receivedByName.trim() || null,
            delivered_at: now,
            attachments: JSON.parse(JSON.stringify(attachments)), // persistir evidencias en JSONB
            notes: notes.trim() || null,
          })
          .eq('id', lineId)

        if (updateError) {
          setError(updateError.message)
          return { ok: false, error: updateError.message }
        }

        return { ok: true }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al registrar entrega de pickup'
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
    approvePickupFromBacklog,
    convertLineToPickup,
    completePickup,
  }
}
```

**ATENCIÓN sobre `notes` field en completePickup:**
La línea ya puede tener notes pre-existentes del solicitante. Sobreescribir con notes de pickup pierde info. **Decisión:**
- Si la línea ya tiene `notes` no-null, append: `${existingNotes}\n\n[Pickup ${now}] ${pickupNotes}`.
- Si está null, usar pickupNotes directamente.

Refinar el código del UPDATE:
```typescript
// Antes del UPDATE en completePickup, fetch notes existentes:
const { data: existing } = await supabase
  .from('sm_request_lines')
  .select('notes')
  .eq('id', lineId)
  .single()

const finalNotes = notes.trim()
  ? (existing?.notes ? `${existing.notes}\n\n[Pickup ${now}] ${notes.trim()}` : notes.trim())
  : existing?.notes ?? null
```

Actualizar el código del hook con este refinamiento. (Steps inline aplica esta lógica al cuerpo de completePickup.)

- [ ] **Step 3: Verificar build**

```bash
npm run build 2>&1 | tail -20
# Expected: verde
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks/usePickup.ts
git commit -m "$(cat <<'EOF'
feat: hook usePickup con approve/convert/complete (Task 5)

Nuevo archivo src/hooks/usePickup.ts con 3 funciones:

- approvePickupFromBacklog(lineId, charrisId) — línea Pendiente →
  Pickup Aprobado, sin tocar qty_scheduled
- convertLineToPickup(lineId, assignmentId, qtyAssigned, tripId,
  charrisId) — línea Programada → Pickup Aprobado:
  - Bloquea si qty_delivered>0 (E2/Q7)
  - DELETE assignment + UPDATE atómico de línea
  - Auto-cancela trip si remainingCount=0
- completePickup(lineId, receivedById, receivedByName, notes,
  attachments) — Pickup Aprobado → Entregada:
  - XOR validation receptor (Q6)
  - qty_delivered = quantity total (Q4 todo-o-nada)
  - Notes append a notes existentes (preserva info original)
  - Attachments persistidos en sm_request_lines.attachments
    (columna JSONB agregada por Chat en migración
    cambio3_pickup_add_attachments_to_lines)

Cohesión por dominio (Chat decision): archivo separado para mantener
useSolicitudes y useTrips enfocados.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: UI Surface 1 — Aprobar pickup desde backlog

**Goal:** Agregar acción "Aprobar pickup" en cada fila de `BacklogTable` con modal de confirmación mínimo (Q8). Solo logistica/admin (Decisión 21).

**Files:**
- Modify: `src/components/programacion/BacklogTable.tsx` (agregar prop `onApprovePickup` opcional + botón en cada fila)
- Modify: `src/app/(app)/programacion/page.tsx` (cablear handler con `usePickup` + modal de confirmación)

**Acceptance Criteria:**
- [ ] Botón "Aprobar pickup" visible en backlog SOLO para logistica/admin (no PM)
- [ ] Click → modal de confirmación con texto: "¿Aprobar como retiro por proyecto? La línea pasará a 'Pickups Pendientes de Retiro'."
- [ ] Confirmar → línea desaparece del backlog (status → 'Pickup Aprobado')
- [ ] Solicitud padre cambia a 'En Proceso' automático (cascade trigger)
- [ ] `npm run build` verde

**Verify:** Build verde + manual smoke test (en autonomous: solo build verde, smoke se anota como pending).

**Steps:**

- [ ] **Step 1: Agregar prop `onApprovePickup` a BacklogTable**

Cambios en `src/components/programacion/BacklogTable.tsx`:

```typescript
// Agregar al interface BacklogTableProps:
//   /** Callback "Aprobar pickup" — solo logistica/admin debería pasarlo */
//   onApprovePickup?: (lineId: string) => void

// Destructurar el prop (línea ~42):
//   onApprovePickup,

// Render: agregar botón al final de cada fila (desktop layout, después de la fecha
// requerida, dentro del bloque que envuelve cada `line`):
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

// Mobile layout: agregar el mismo botón dentro del último bloque de la fila mobile
// (aprox al lado de "fecha requerida con color"):
//   {onApprovePickup && (
//     <button
//       type="button"
//       onClick={(e) => { e.stopPropagation(); onApprovePickup(line.id) }}
//       className="text-xs font-medium text-amber-600 hover:underline ml-2"
//     >
//       🤝 Pickup
//     </button>
//   )}
```

- [ ] **Step 2: Cablear en `programacion/page.tsx`**

Cambios en `src/app/(app)/programacion/page.tsx`:

```typescript
// Agregar imports (top):
//   import { usePickup } from '@/hooks/usePickup'
//   import { useState } from 'react'  (ya está)

// En el componente, agregar hook y estado del modal:
//   const { person } = useAuth()  // ya está
//   const pickup = usePickup()
//   const [pickupConfirmLineId, setPickupConfirmLineId] = useState<string | null>(null)

// Handler:
//   const handleApprovePickup = useCallback((lineId: string) => {
//     setPickupConfirmLineId(lineId)
//   }, [])

//   const confirmApprovePickup = useCallback(async () => {
//     if (!pickupConfirmLineId || !person?.id) return
//     const result = await pickup.approvePickupFromBacklog(pickupConfirmLineId, person.id)
//     setPickupConfirmLineId(null)
//     if (result.ok) {
//       refetchBacklog()  // viene de useTrips
//     }
//     // Errores se muestran via pickup.error
//   }, [pickupConfirmLineId, person, pickup, refetchBacklog])

// Pasar handler a BacklogTable solo si rol es logistica/admin:
//   <BacklogTable
//     lines={filteredBacklog}
//     loading={backlogLoading}
//     selectable={puedeCrearViaje}
//     selectedLineIds={selectedLineIds}
//     onToggleSelect={handleToggleSelect}
//     onSelectAll={handleSelectAll}
//     onRequestClick={handleRequestClick}
//     onApprovePickup={(role === 'logistica' || role === 'admin') ? handleApprovePickup : undefined}
//   />

// Render del modal de confirmación (al final del JSX, antes del </div> de cierre):
//   {pickupConfirmLineId && (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
//       <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
//         <h3 className="text-lg font-semibold text-gray-900">Aprobar pickup</h3>
//         <p className="mt-2 text-sm text-gray-600">
//           ¿Aprobar como retiro por proyecto? La línea pasará a "Pickups Pendientes de Retiro".
//         </p>
//         {pickup.error && (
//           <p className="mt-2 text-sm text-red-600">{pickup.error}</p>
//         )}
//         <div className="mt-4 flex items-center justify-end gap-3">
//           <Button variant="ghost" size="sm" onClick={() => setPickupConfirmLineId(null)} disabled={pickup.loading}>
//             Cancelar
//           </Button>
//           <Button variant="primary" size="sm" onClick={confirmApprovePickup} loading={pickup.loading}>
//             Aprobar
//           </Button>
//         </div>
//       </div>
//     </div>
//   )}
```

- [ ] **Step 3: Verificar build**

```bash
npm run build 2>&1 | tail -20
# Expected: verde
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: aprobar pickup desde backlog (Task 6)

UI Surface 1 de Cambio 3:

- BacklogTable: prop opcional onApprovePickup + botón 🤝 en cada
  fila (desktop + mobile)
- /programacion: cableado con usePickup hook + modal confirmación
  mínimo ("¿Aprobar como retiro por proyecto?")
- Solo logistica/admin (Decisión 21 — solicitante NO puede iniciar
  pickup)
- refetchBacklog post-aprobación → línea desaparece del backlog

Q8 confirmado: modal mínimo sin notas/attachments/receptor (eso
viene en Registrar entrega del Surface 3).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: UI Surface 2 — Convertir línea Programada a pickup desde trip detail

**Goal:** Agregar acción "Convertir a pickup" en cada `AssignmentRow` del trip detail. Modal de confirmación que (a) avisa si trip queda vacío y será cancelado, (b) bloquea si línea tiene qty_delivered > 0 (E2).

**Files:**
- Modify: `src/app/(app)/programacion/viaje/[id]/page.tsx` (agregar prop a AssignmentRow + handler + modal)

**Acceptance Criteria:**
- [ ] Botón "Convertir a pickup" visible en cada AssignmentRow SOLO para logistica/admin Y trip status='Programado'
- [ ] Click → modal de confirmación con dos variantes según count assignments restantes:
  - Si última línea: "Esta es la última línea del viaje {trip_id}. Convertirla a pickup CANCELARÁ el viaje. ¿Confirmar?"
  - Si no es última: "¿Convertir esta línea a pickup? Saldrá del viaje y pasará a 'Pickups Pendientes de Retiro'."
- [ ] Si línea tiene `qty_delivered > 0` → modal muestra error y no permite confirmar (bloqueo client-side; hook también valida server-side)
- [ ] Confirmar → línea sale del trip + auto-cancel si era última
- [ ] `npm run build` verde

**Verify:** Build verde + manual smoke test del flow auto-cancel con Solicitud B (data de prueba en brief).

**Steps:**

- [ ] **Step 1: Agregar prop a AssignmentRow**

Cambios en `src/app/(app)/programacion/viaje/[id]/page.tsx`:

```typescript
// AssignmentRowProps interface (líneas ~100):
//   interface AssignmentRowProps {
//     assignment: TripAssignment
//     originalQty: number
//     canRemove: boolean
//     canEdit: boolean
//     onRemove: (assignmentId: string) => void
//     onQtyChange?: (assignmentId: string, newQty: number) => void
//     // Nuevo:
//     onConvertToPickup?: (lineId: string, assignmentId: string, quantityAssigned: number, qtyDelivered: number) => void
//   }

// Destructurar nuevo prop:
//   function AssignmentRow({ assignment, originalQty, canRemove, canEdit, onRemove, onQtyChange, onConvertToPickup }: AssignmentRowProps) {

// Agregar botón "Convertir a pickup" al lado del botón "Quitar" (después del bloque canRemove):
//   {onConvertToPickup && assignment.line && (
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
```

- [ ] **Step 2: Agregar handler + modal en el componente principal**

```typescript
// Top of component, agregar imports (si no están):
//   import { usePickup } from '@/hooks/usePickup'

// Hook + estado del modal:
//   const pickup = usePickup()
//   const [pickupModalState, setPickupModalState] = useState<{
//     lineId: string
//     assignmentId: string
//     quantityAssigned: number
//     qtyDelivered: number
//     willCancelTrip: boolean
//   } | null>(null)

// Handler que abre el modal:
//   const handleConvertToPickup = useCallback((
//     lineId: string,
//     assignmentId: string,
//     quantityAssigned: number,
//     qtyDelivered: number,
//   ) => {
//     // Calcular si esta es la última línea del trip (en el state cliente)
//     const willCancelTrip = existingAssignments.length === 1
//     setPickupModalState({ lineId, assignmentId, quantityAssigned, qtyDelivered, willCancelTrip })
//   }, [existingAssignments.length])

// Handler que confirma:
//   const confirmConvertToPickup = useCallback(async () => {
//     if (!pickupModalState || !person?.id || !trip) return
//     const result = await pickup.convertLineToPickup(
//       pickupModalState.lineId,
//       pickupModalState.assignmentId,
//       pickupModalState.quantityAssigned,
//       trip.id,
//       person.id,
//     )
//     if (result.ok) {
//       setPickupModalState(null)
//       // Refetch trip + backlog
//       const updated = await fetchTrip(id)
//       if (updated) {
//         setTrip(updated)
//         setExistingAssignments(updated.assignments)
//         // Si trip cancelado, redirigir a /programacion
//         if (result.tripCancelled) {
//           router.push('/programacion')
//         }
//       }
//       refetchBacklog()
//     }
//     // Errores via pickup.error
//   }, [pickupModalState, person, trip, pickup, fetchTrip, id, refetchBacklog, router])

// Pasar handler a AssignmentRow (solo si canEditFullTrip — modo edit + trip Programado):
//   {existingAssignments.map((assignment) => (
//     <AssignmentRow
//       key={assignment.id}
//       assignment={assignment}
//       originalQty={originalAssignments.get(assignment.id) ?? assignment.quantity_assigned}
//       canRemove={canRemoveAssignments}
//       canEdit={canEditFullTrip}
//       onRemove={handleRemoveExisting}
//       onQtyChange={handleExistingQtyChange}
//       onConvertToPickup={canEditFullTrip ? handleConvertToPickup : undefined}
//     />
//   ))}

// Render del modal (al final del JSX antes del </div> outer):
//   {pickupModalState && (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
//       <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
//         <h3 className="text-lg font-semibold text-gray-900">
//           {pickupModalState.willCancelTrip ? 'Cancelar viaje y convertir a pickup' : 'Convertir a pickup'}
//         </h3>
//         {pickupModalState.qtyDelivered > 0 ? (
//           <p className="mt-2 text-sm text-red-600">
//             No se puede convertir a pickup una línea con entregas previas registradas
//             ({pickupModalState.qtyDelivered} de {pickupModalState.quantityAssigned} entregado).
//             Cancelá la línea o terminá el flow actual.
//           </p>
//         ) : pickupModalState.willCancelTrip ? (
//           <p className="mt-2 text-sm text-gray-600">
//             Esta es la última línea del viaje <span className="font-mono font-bold">{trip?.trip_id ?? trip?.id.slice(0, 8)}</span>.
//             Convertirla a pickup CANCELARÁ el viaje. ¿Confirmar?
//           </p>
//         ) : (
//           <p className="mt-2 text-sm text-gray-600">
//             ¿Convertir esta línea a pickup? Saldrá del viaje y pasará a "Pickups Pendientes de Retiro".
//           </p>
//         )}
//         {pickup.error && (
//           <p className="mt-2 text-sm text-red-600">{pickup.error}</p>
//         )}
//         <div className="mt-4 flex items-center justify-end gap-3">
//           <Button variant="ghost" size="sm" onClick={() => setPickupModalState(null)} disabled={pickup.loading}>
//             Cancelar
//           </Button>
//           <Button
//             variant={pickupModalState.willCancelTrip ? 'danger' : 'primary'}
//             size="sm"
//             onClick={confirmConvertToPickup}
//             loading={pickup.loading}
//             disabled={pickupModalState.qtyDelivered > 0}
//           >
//             {pickupModalState.willCancelTrip ? 'Sí, cancelar viaje' : 'Convertir a pickup'}
//           </Button>
//         </div>
//       </div>
//     </div>
//   )}
```

- [ ] **Step 3: Verificar build**

```bash
npm run build 2>&1 | tail -20
# Expected: verde
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: convertir línea programada a pickup (Task 7)

UI Surface 2 de Cambio 3:

- AssignmentRow: prop onConvertToPickup opcional + botón 🤝
- programacion/viaje/[id]: cableado con usePickup hook
- Modal con dos variantes:
  - Última línea: "CANCELARÁ el viaje" + botón danger
  - Otras: "Saldrá del viaje" + botón primary
- Bloqueo client-side si qty_delivered > 0 (E2/Q7) — hook también
  valida server-side
- Solo canEditFullTrip (logistica/admin + trip Programado)
- Si trip cancelado → redirect a /programacion

I3 implementado: NO usa releaseLineFromAssignment (round-trip
Pendiente→Pickup Aprobado dispara cascade dos veces). UPDATE atómico
en convertLineToPickup.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: UI Surface 3 — Sección "Pickups Pendientes de Retiro" + modal Registrar entrega

**Goal:** Agregar nueva sección en `/programacion` listando líneas con `pickup_by_project=true AND pickup_completed_at IS NULL`. Cada item tiene botón "Registrar entrega" → modal con receptor (dropdown people + texto fallback) + notas opc + attachments opc.

**Files:**
- Create: `src/components/programacion/PickupDeliveryModal.tsx`
- Modify: `src/app/(app)/programacion/page.tsx` (agregar sección "Pickups Pendientes de Retiro")

**Acceptance Criteria:**
- [ ] Nueva sección "Pickups Pendientes de Retiro" en `/programacion` solo visible para logistica/admin
- [ ] Lista líneas con `status='Pickup Aprobado'` (filtro server-side)
- [ ] Cada item muestra: descripción línea, ID solicitud, proyecto, fecha aprobada, botón "Registrar entrega"
- [ ] Click "Registrar entrega" → modal con receptor (dropdown personas + texto), notas opc, attachments opc
- [ ] Validación XOR receptor (id O nombre, al menos uno)
- [ ] Submit → línea pasa a 'Entregada', `qty_delivered=quantity` (todo-o-nada Q4), `pickup_completed_at`, receptor flags
- [ ] `npm run build` verde

**Verify:** Build verde + manual smoke test con Solicitud A (luego de aprobar pickup desde T6).

**Steps:**

- [ ] **Step 1: Crear `PickupDeliveryModal.tsx`**

```typescript
// src/components/programacion/PickupDeliveryModal.tsx
'use client'

import { useState, useCallback, useMemo } from 'react'
import { Wrench, Package } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SelectWithFallback, type SelectWithFallbackValue } from '@/components/ui/SelectWithFallback'
import FileUploader from '@/components/ui/FileUploader'
import { formatQty } from '@/lib/utils/format'
import type { Attachment } from '@/lib/supabase/storage'

export interface PendingPickupLine {
  id: string
  description: string
  line_type: string
  quantity: number
  unitCode: string
  request_id: string
  request_uuid: string
  project_code: string | null
  project_name: string | null
  pickup_approved_at: string
}

interface PickupDeliveryModalProps {
  line: PendingPickupLine
  receiverOptions: { value: string; label: string }[]
  onConfirm: (data: {
    receivedById: string | null
    receivedByName: string
    notes: string
    attachments: Attachment[]
  }) => Promise<void>
  onClose: () => void
  loading: boolean
  error: string | null
}

export function PickupDeliveryModal({
  line,
  receiverOptions,
  onConfirm,
  onClose,
  loading,
  error,
}: PickupDeliveryModalProps) {
  const [receiver, setReceiver] = useState<SelectWithFallbackValue>({ id: null, text: '' })
  const [notes, setNotes] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])

  // Validación XOR: id O texto, al menos uno
  const canConfirm = useMemo(() => {
    const hasId = receiver.id !== null
    const hasText = receiver.text.trim() !== ''
    return (hasId || hasText) && !loading
  }, [receiver, loading])

  const folderId = useMemo(() => `pickup/${line.id}`, [line.id])

  const handleSubmit = useCallback(async () => {
    await onConfirm({
      receivedById: receiver.id,
      receivedByName: receiver.text.trim(),
      notes: notes.trim(),
      attachments,
    })
  }, [receiver, notes, attachments, onConfirm])

  const isEquipo = line.line_type === 'Equipo'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl sm:p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Registrar entrega de pickup
        </h3>

        {/* Info de la línea */}
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-1">
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
            Cantidad a entregar: <span className="font-medium">{formatQty(line.quantity)} {line.unitCode}</span>
          </p>
        </div>

        <div className="space-y-4">
          {/* Receptor (XOR — id o texto) */}
          <SelectWithFallback
            label="Receptor"
            placeholder="Seleccionar persona..."
            options={receiverOptions}
            value={receiver}
            onChange={setReceiver}
            fallbackPlaceholder="Escribir nombre del receptor"
          />
          <p className="text-xs text-iconsa-gray -mt-2">
            Selecciona una persona O escribe el nombre si no está en la lista.
          </p>

          {/* Notas (opcional) */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Notas (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones de la entrega..."
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue"
            />
          </div>

          {/* Attachments (opcional, sin persistencia v1 — quedan en Storage) */}
          <FileUploader
            attachments={attachments}
            folder={folderId}
            onChange={setAttachments}
            label="Fotos / PDF (opcional)"
            hint="PDF, JPG, PNG o WEBP (max 10MB)"
          />

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          {/* Acciones */}
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

- [ ] **Step 2: Verificar SelectWithFallback API**

```bash
grep -n "SelectWithFallbackValue\|interface SelectWithFallbackProps" src/components/ui/SelectWithFallback.tsx | head -10
```

Expected: confirmar shape de `SelectWithFallbackValue` (debería ser `{ id: string | null; text: string }`). Si no es así, ajustar el modal arriba para matchear el contrato real.

- [ ] **Step 3: Agregar sección + cableado en `programacion/page.tsx`**

```typescript
// Top: agregar imports
//   import { PickupDeliveryModal, type PendingPickupLine } from '@/components/programacion/PickupDeliveryModal'

// Estado para pickups pendientes:
//   const [pendingPickups, setPendingPickups] = useState<PendingPickupLine[]>([])
//   const [pickupsLoading, setPickupsLoading] = useState(false)
//   const [pickupDeliveryLine, setPickupDeliveryLine] = useState<PendingPickupLine | null>(null)
//   const [people, setPeople] = useState<{ id: string; name: string }[]>([])

// Fetch pickups pendientes:
//   const refetchPendingPickups = useCallback(async () => {
//     setPickupsLoading(true)
//     try {
//       const { data } = await supabase
//         .from('sm_request_lines')
//         .select(`
//           id, description, line_type, quantity, unit_text,
//           pickup_approved_at,
//           unit:unit_id(code),
//           request:request_id!inner(
//             id, request_id,
//             project:project_id(code, name)
//           )
//         `)
//         .eq('status', 'Pickup Aprobado')
//         .eq('pickup_by_project', true)
//         .is('pickup_completed_at', null)
//         .order('pickup_approved_at', { ascending: true })
//
//       const mapped: PendingPickupLine[] = (data ?? []).map((row: Record<string, unknown>) => {
//         const request = Array.isArray(row.request) ? row.request[0] : row.request
//         const project = request ? (Array.isArray((request as Record<string, unknown>).project) ? ((request as Record<string, unknown>).project as Record<string, unknown>[])[0] : (request as Record<string, unknown>).project) : null
//         const unit = Array.isArray(row.unit) ? row.unit[0] : row.unit
//         return {
//           id: row.id as string,
//           description: row.description as string,
//           line_type: row.line_type as string,
//           quantity: row.quantity as number,
//           unitCode: ((unit as { code?: string } | null)?.code) ?? ((row.unit_text as string | null) ?? ''),
//           request_id: ((request as { request_id?: string } | null)?.request_id) ?? '',
//           request_uuid: ((request as { id?: string } | null)?.id) ?? '',
//           project_code: ((project as { code?: string } | null)?.code) ?? null,
//           project_name: ((project as { name?: string } | null)?.name) ?? null,
//           pickup_approved_at: row.pickup_approved_at as string,
//         }
//       })
//       setPendingPickups(mapped)
//     } finally {
//       setPickupsLoading(false)
//     }
//   }, [supabase])

// useEffect para fetch initial:
//   useEffect(() => {
//     if (role === 'logistica' || role === 'admin') {
//       void refetchPendingPickups()
//     }
//   }, [role, refetchPendingPickups])

// Fetch people para receptor dropdown:
//   useEffect(() => {
//     supabase.from('people').select('id, name').eq('status', 'Activo').order('name')
//       .then(({ data }) => setPeople(data ?? []))
//   }, [supabase])

// receiverOptions:
//   const receiverOptions = useMemo(
//     () => people.map((p) => ({ value: p.id, label: p.name })),
//     [people],
//   )

// Handler confirm pickup delivery:
//   const handleCompletePickup = useCallback(async (data: {
//     receivedById: string | null
//     receivedByName: string
//     notes: string
//     attachments: Attachment[]
//   }) => {
//     if (!pickupDeliveryLine || !person?.id) return
//     const result = await pickup.completePickup(
//       pickupDeliveryLine.id,
//       data.receivedById,
//       data.receivedByName,
//       data.notes,
//       data.attachments,
//     )
//     if (result.ok) {
//       setPickupDeliveryLine(null)
//       refetchPendingPickups()
//     }
//     // Errores via pickup.error en el modal
//   }, [pickupDeliveryLine, person, pickup, refetchPendingPickups])

// Render de la sección (insertar después de la sección "Movilizaciones", antes del </div> outer):
//   {(role === 'logistica' || role === 'admin') && (
//     <section className="rounded-xl border border-amber-200 bg-amber-50/30">
//       <div className="px-4 pt-4 pb-3">
//         <div className="flex items-center gap-2">
//           <h2 className="text-base font-semibold text-gray-900">Pickups Pendientes de Retiro</h2>
//           {!pickupsLoading && (
//             <span className="rounded-full bg-amber-200 text-amber-900 px-2 py-0.5 text-xs font-medium">
//               {pendingPickups.length}
//             </span>
//           )}
//         </div>
//       </div>
//       <div className="px-4 pb-4">
//         {pickupsLoading ? (
//           <p className="py-4 text-center text-sm text-iconsa-gray">Cargando pickups...</p>
//         ) : pendingPickups.length === 0 ? (
//           <p className="py-4 text-center text-sm text-iconsa-gray">
//             No hay pickups pendientes de retiro.
//           </p>
//         ) : (
//           <div className="space-y-2">
//             {pendingPickups.map((p) => (
//               <div key={p.id} className="flex items-center gap-3 rounded-lg border border-amber-200 bg-white px-4 py-2.5">
//                 <span className="text-base">🤝</span>
//                 <div className="min-w-0 flex-1">
//                   <p className="truncate text-sm font-medium text-gray-900">{p.description}</p>
//                   <p className="text-xs text-iconsa-gray">
//                     <span className="font-mono">{p.request_id}</span>
//                     {p.project_code && <span> · {p.project_code}</span>}
//                     <span> · {formatQty(p.quantity)} {p.unitCode}</span>
//                   </p>
//                 </div>
//                 <button
//                   type="button"
//                   onClick={() => setPickupDeliveryLine(p)}
//                   className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 transition-colors"
//                 >
//                   Registrar entrega
//                 </button>
//               </div>
//             ))}
//           </div>
//         )}
//       </div>
//     </section>
//   )}

// Render del modal (al final del JSX):
//   {pickupDeliveryLine && (
//     <PickupDeliveryModal
//       line={pickupDeliveryLine}
//       receiverOptions={receiverOptions}
//       onConfirm={handleCompletePickup}
//       onClose={() => setPickupDeliveryLine(null)}
//       loading={pickup.loading}
//       error={pickup.error}
//     />
//   )}
```

- [ ] **Step 4: Verificar build**

```bash
npm run build 2>&1 | tail -20
# Expected: verde
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: registrar entrega de pickup (Task 8)

UI Surface 3 de Cambio 3:

- Nuevo componente PickupDeliveryModal.tsx con receptor XOR
  (dropdown personas + texto), notas opcional, attachments opcional
- Sección "Pickups Pendientes de Retiro" en /programacion (solo
  logistica/admin)
- Filtro server-side: status='Pickup Aprobado' AND pickup_by_project
  AND pickup_completed_at IS NULL
- Click "Registrar entrega" → modal → completePickup hook
- qty_delivered = quantity total (Q4 todo-o-nada)
- Notes append a notes existentes (preserva info original)

Q5: receptor sin filtrar por proyecto (todas personas activas)
Q6: validación XOR receptor (id O nombre, al menos uno)
A6 a confirmar: Charris registra entrega — no almacenista

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Badge "Pickup Aprobado" en LineRow + fix cancelSolicitud

**Goal:** Mostrar badge distintivo (color amarillo) en LineRow de `/solicitudes/[id]` cuando línea es Pickup Aprobado, con tooltip de fecha aprobación. Si `pickup_completed_at`, mostrar info de "Retirado por". Fix `cancelSolicitud` para incluir `'Pickup Aprobado'` en filtro de cancelación (I1/E8).

**Files:**
- Modify: `src/hooks/useSolicitudes.ts` (línea 773 — agregar 'Pickup Aprobado' al filtro)
- Modify: `src/components/solicitudes/LineRow.tsx` (badge condicional + tooltip + info pickup)

**Acceptance Criteria:**
- [ ] Línea con `status='Pickup Aprobado'` muestra badge amarillo "PICKUP APROBADO"
- [ ] Si línea tiene `pickup_completed_at` (status='Entregada' post-pickup), badge "RETIRADO" con info receptor + fecha
- [ ] `cancelSolicitud` cancela también líneas Pickup Aprobado (no solo Pendiente/Programada)
- [ ] `npm run build` verde

**Verify:** `npm run build && grep -n "Pickup Aprobado" src/components/solicitudes/LineRow.tsx src/hooks/useSolicitudes.ts`

**Steps:**

- [ ] **Step 1: Fix cancelSolicitud (I1/E8)**

Cambios en `src/hooks/useSolicitudes.ts`:

```typescript
// Línea ~773 — actualizar filtro
// CAMBIAR:
//   const lineIdsToCancel = (lines ?? [])
//     .filter((l) => l.status === 'Pendiente' || l.status === 'Programada')
//     .map((l) => l.id)
// A:
//   const lineIdsToCancel = (lines ?? [])
//     .filter((l) => l.status === 'Pendiente' || l.status === 'Programada' || l.status === 'Pickup Aprobado')
//     .map((l) => l.id)

// También: el bloque "Para lineas Programadas: eliminar asignaciones de viaje" (líneas ~762-769)
// solo opera en Programadas, NO en Pickup Aprobado (que no tienen assignments). Mantener tal cual.
```

- [ ] **Step 2: Pasar info pickup a LineRow desde solicitudes/[id]**

Cambios en `src/app/(app)/solicitudes/[id]/page.tsx`:

```typescript
// En el render de cada LineRow (busque el bloque {lines.map((line, index) => { ... })}):
// La línea actual NO incluye pickup_*. Hay que pasarlos via originalLine.

// Buscar el bloque (líneas ~603-628):
//   {lines.map((line, index) => {
//     const names = getLineDisplayNames(line, index)
//     const originalLine = solicitud.lines.find((l) => l.id === line.id)
//     const lineStatus = originalLine?.status ?? 'Pendiente'
//     const isScheduled = lineStatus === 'Programada'
//     return (
//       <LineRow
//         ...
//         line={{ ...line, status: lineStatus }}
//         ...
//       />
//     )
//   })}

// Cambiar para pasar pickup info:
//   {lines.map((line, index) => {
//     const names = getLineDisplayNames(line, index)
//     const originalLine = solicitud.lines.find((l) => l.id === line.id)
//     const lineStatus = originalLine?.status ?? 'Pendiente'
//     const isScheduled = lineStatus === 'Programada'
//     return (
//       <LineRow
//         key={line.id ?? `new-${index}`}
//         line={{ ...line, status: lineStatus }}
//         lineNumber={index + 1}
//         editable={mode === 'edit'}
//         canDelete={canDeleteLines}
//         isScheduled={isScheduled}
//         onEdit={...}
//         onDelete={...}
//         onDuplicate={canAddLines ? () => handleDuplicateLine(index) : undefined}
//         fromDisplay={names.fromDisplay}
//         toDisplay={names.toDisplay}
//         unitDisplay={names.unitDisplay}
//         pickupInfo={originalLine ? {
//           pickup_by_project: ((originalLine as unknown as Record<string, unknown>).pickup_by_project as boolean) ?? false,
//           pickup_approved_at: ((originalLine as unknown as Record<string, unknown>).pickup_approved_at as string | null) ?? null,
//           pickup_completed_at: ((originalLine as unknown as Record<string, unknown>).pickup_completed_at as string | null) ?? null,
//           pickup_received_by_name: ((originalLine as unknown as Record<string, unknown>).pickup_received_by_name as string | null) ?? null,
//         } : undefined}
//       />
//     )
//   })}

// NOTA sobre el cast: `originalLine` es de tipo LineWithRelations en useSolicitudes, que
// fue actualizado por T1 con las columnas pickup nuevas vía gen types. Si las columnas
// están en LineWithRelations, el cast `as unknown as Record<string, unknown>` se puede
// reemplazar por acceso directo. Verificar:

// grep "pickup_by_project\|pickup_approved_at" src/hooks/useSolicitudes.ts
// Si LineWithRelations las tiene, ajustar el código a:
//   pickupInfo={originalLine ? {
//     pickup_by_project: originalLine.pickup_by_project,
//     pickup_approved_at: originalLine.pickup_approved_at,
//     pickup_completed_at: originalLine.pickup_completed_at,
//     pickup_received_by_name: originalLine.pickup_received_by_name,
//   } : undefined}

// IMPORTANTE: T1 regenera database.ts pero LineWithRelations en useSolicitudes.ts
// puede no haberse actualizado (es una interface manual). Hay que agregarle las
// columnas pickup. Hacer en este task como sub-step.
```

- [ ] **Step 3: Agregar columnas pickup a LineWithRelations interface en useSolicitudes.ts**

```typescript
// Buscar el interface LineWithRelations (línea ~43) y agregar:
//   designated_receiver_id: string | null
//   designated_receiver_name: string | null
//   created_at: string
//   updated_at: string
//   // ... resto
//   // AGREGAR:
//   pickup_by_project: boolean
//   pickup_approved_at: string | null
//   pickup_approved_by: string | null
//   pickup_completed_at: string | null
//   pickup_received_by_id: string | null
//   pickup_received_by_name: string | null

// También agregar al mapper en fetchSolicitud (línea ~409 sortedLines.map):
//   pickup_by_project: (line.pickup_by_project as boolean) ?? false,
//   pickup_approved_at: (line.pickup_approved_at as string | null) ?? null,
//   pickup_approved_by: (line.pickup_approved_by as string | null) ?? null,
//   pickup_completed_at: (line.pickup_completed_at as string | null) ?? null,
//   pickup_received_by_id: (line.pickup_received_by_id as string | null) ?? null,
//   pickup_received_by_name: (line.pickup_received_by_name as string | null) ?? null,

// El SELECT con `*` ya trae las columnas; solo el mapper estructurado las omitía.
```

- [ ] **Step 4: Modificar LineRow para aceptar y renderizar pickupInfo**

Cambios en `src/components/solicitudes/LineRow.tsx`:

```typescript
// Agregar interface field para pickupInfo (top del archivo, donde declara LineRowProps o similar):
//   interface LineRowProps {
//     // ... props existentes
//     pickupInfo?: {
//       pickup_by_project: boolean
//       pickup_approved_at: string | null
//       pickup_completed_at: string | null
//       pickup_received_by_name: string | null
//     }
//   }

// Destructurar en la firma del componente:
//   function LineRow({ ..., pickupInfo, ...rest }: LineRowProps) {

// En el render, buscar donde se renderiza el Badge de status (probablemente cerca del header
// de la fila o en la columna de estado). Agregar antes o después:
//   {pickupInfo?.pickup_by_project && line.status === 'Pickup Aprobado' && (
//     <span
//       className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-medium"
//       title={pickupInfo.pickup_approved_at ? `Aprobado el ${new Date(pickupInfo.pickup_approved_at).toLocaleDateString('es-PA', { timeZone: 'America/Panama' })}` : 'Aprobado como pickup'}
//     >
//       🤝 PICKUP APROBADO
//     </span>
//   )}
//   {pickupInfo?.pickup_completed_at && line.status === 'Entregada' && (
//     <span
//       className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-xs font-medium"
//       title={`Retirado por ${pickupInfo.pickup_received_by_name ?? '—'} el ${new Date(pickupInfo.pickup_completed_at).toLocaleDateString('es-PA', { timeZone: 'America/Panama' })}`}
//     >
//       🤝 RETIRADO
//     </span>
//   )}
```

NOTA: leer LineRow.tsx primero para ubicar exactamente dónde agregar los badges. Estructura exacta depende del layout actual del componente. Si LineRow tiene un Badge de status existente, los pickup badges van como suplemento (no reemplazo) — el usuario ve `Status` + `🤝 PICKUP APROBADO` lado a lado.

- [ ] **Step 5: Verificar build + greps**

```bash
npm run build 2>&1 | tail -20
# Expected: verde

grep -n "Pickup Aprobado" src/components/solicitudes/LineRow.tsx src/hooks/useSolicitudes.ts
# Expected: matches en ambos archivos
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: badge pickup en LineRow + cancelSolicitud incluye Pickup Aprobado (Task 9)

Polish + fix de pre-existente en código:

- LineRow muestra badge amarillo "🤝 PICKUP APROBADO" cuando
  status='Pickup Aprobado' y pickup_by_project=true
- LineRow muestra badge verde "🤝 RETIRADO" + tooltip con receptor +
  fecha cuando pickup_completed_at no-null y status='Entregada'
- LineWithRelations interface + mapper en useSolicitudes incluye 6
  columnas pickup nuevas (T1 regen ya las trae a nivel database.ts)
- solicitudes/[id] pasa pickupInfo a cada LineRow desde originalLine

Fix I1/E8 (cancelSolicitud):

- cancelSolicitud filtro lineIdsToCancel ahora incluye 'Pickup
  Aprobado' además de 'Pendiente' y 'Programada'. Sin esto, cancelar
  una solicitud con líneas pickup-aprobadas dejaba esas líneas
  huérfanas (status preservado en una solicitud Cancelada).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Cleanup tests legacy

**Goal:** DELETE `tests/pickup-flow.spec.ts`. Limpiar refs a `is_self_pickup` y `fulfillment_type` en `tests/programacion-viaje.spec.ts`, `tests/solicitud-creation.spec.ts`. Eliminar funciones `registerPreparation` y `registerRetiro` + opt `isPickup` de `tests/helpers.ts`.

**Files:**
- Delete: `tests/pickup-flow.spec.ts`
- Modify: `tests/programacion-viaje.spec.ts` (líneas 39, 48, 158-167 — eliminar refs y test.skip)
- Modify: `tests/solicitud-creation.spec.ts` (líneas 43, 134, 142-143 — eliminar test "fulfillment_type defaults to fleet")
- Modify: `tests/helpers.ts` (líneas 250, 285-306, 510-545 aprox)

**Acceptance Criteria:**
- [ ] `ls tests/pickup-flow.spec.ts` → no such file
- [ ] `grep -rn "is_self_pickup\|fulfillment_type\|registerPreparation\|registerRetiro\|opts.isPickup\|opts?.isPickup" tests/` → 0 matches
- [ ] `npx playwright test --list` ejecuta sin errores TS (los tests legacy del pickup ya no existen, los modificados no rompen)
- [ ] Tests E2E que NO dependían del pickup flow viejo siguen funcionando

**Verify:** `npx playwright test --list 2>&1 | tail -30 && grep -rn "is_self_pickup\|fulfillment_type\|registerPreparation\|registerRetiro" tests/`

**Steps:**

- [ ] **Step 1: DELETE pickup-flow.spec.ts**

```bash
rm tests/pickup-flow.spec.ts
```

- [ ] **Step 2: Limpiar programacion-viaje.spec.ts**

```typescript
// Línea 39 — eliminar is_self_pickup del SELECT
// CAMBIAR:
//   .select('id, trip_id, status, driver_id, vehicle_id, scheduled_date, confirmation_code, is_self_pickup')
// A:
//   .select('id, trip_id, status, driver_id, vehicle_id, scheduled_date, confirmation_code')

// Línea 48 — eliminar assertion
// QUITAR:
//   expect(data!.is_self_pickup).toBe(false)

// Líneas 158-167 — eliminar test.skip entero (era pickup trip creation)
// QUITAR:
//   test.skip('Create pickup trip → is_self_pickup=true in BD (checkbox selector WIP)', async () => {
//     const trip = await createTrip(page, { isPickup: true, solicitudId: sol.dbId })
//     ...
//   })
```

- [ ] **Step 3: Limpiar solicitud-creation.spec.ts**

```typescript
// Línea 43 — eliminar assertion
// QUITAR:
//   expect(data!.fulfillment_type).toBe('fleet')

// Líneas 134-145 aprox — eliminar test entero
// QUITAR:
//   test('fulfillment_type defaults to fleet', async () => {
//     ...
//     const { data } = await db.from('sm_requests').select('fulfillment_type').eq('id', result.dbId).single()
//     expect(data!.fulfillment_type).toBe('fleet')
//   })
```

- [ ] **Step 4: Limpiar helpers.ts**

```typescript
// Línea 250 — eliminar opt isPickup de createTrip
// CAMBIAR:
//   opts?: {
//     isPickup?: boolean
//     conductor?: RegExp
//     ...
//   },
// A:
//   opts?: {
//     conductor?: RegExp
//     vehicle?: RegExp
//     date?: string
//     lineCount?: number
//     solicitudId?: string
//   },

// Líneas 285-306 — eliminar bloque toggle pickup checkbox
// QUITAR:
//   // Toggle pickup checkbox
//   const retiroLabel = page.getByText('Retiro en Chilibre')
//   if (await retiroLabel.isVisible().catch(() => false)) {
//     ...
//   }
//
//   // Date
//   await page.locator('input[type="date"]').first().fill(opts?.date ?? '2026-04-15')
//
//   // Conductor
//   if (!opts?.isPickup) {  // <-- también este conditional
//     await pick(page, /Conductor/, opts?.conductor ?? /Rafael|Conductor|Diaz/)
//     ...
//   }

// Reescribir como:
//   // Date
//   await page.locator('input[type="date"]').first().fill(opts?.date ?? '2026-04-15')
//
//   // Conductor (siempre requerido — pickup ya no existe a nivel trip)
//   await pick(page, /Conductor/, opts?.conductor ?? /Rafael|Conductor|Diaz/)
//   await pick(page, /Veh/, opts?.vehicle ?? /CAB|VOL|PIC/)

// Líneas 510-545 aprox — eliminar funciones registerPreparation y registerRetiro
// QUITAR:
//   export async function registerPreparation(page: Page) {
//     // Botón principal del trip cuando es pickup → abre PickupModal
//     ...
//   }
//
//   export async function registerRetiro(...) {
//     ...
//   }

// VERIFICAR exports actuales y borrar las dos funciones completas.
```

- [ ] **Step 5: Verificar tests/helpers.ts no tiene refs huérfanas**

```bash
grep -n "isPickup\|registerPreparation\|registerRetiro\|PickupModal\|PreparationModal" tests/helpers.ts
# Expected: 0 matches

grep -rn "registerPreparation\|registerRetiro" tests/
# Expected: 0 matches (porque pickup-flow.spec.ts era el único consumidor además de helpers, y ya lo borramos)
```

- [ ] **Step 6: Verificar Playwright list parsea**

```bash
npx playwright test --list 2>&1 | tail -30
# Expected: lista de tests sin errores TS, sin pickup-flow.spec.ts
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
test: cleanup tests pickup viejos (Task 10)

- DELETE tests/pickup-flow.spec.ts (~250 líneas, flow viejo entero)
- programacion-viaje.spec.ts: quitar refs a is_self_pickup
  (SELECT + assertion) + DELETE test.skip "Create pickup trip"
- solicitud-creation.spec.ts: DELETE assertion fulfillment_type +
  test "fulfillment_type defaults to fleet"
- helpers.ts: quitar opt isPickup de createTrip + bloque toggle
  pickup checkbox + funciones registerPreparation / registerRetiro

Tests E2E del flow nuevo quedan como AD-5 follow-up (helpers
completos primero — createSolicitud sigue roto). Smoke test manual
en T11 cubre verificación funcional.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Docs — CHANGELOG + spec frontmatter shipped + TRAIL update + grep regression

**Goal:** Cerrar Cambio 3 con docs vivos: CHANGELOG entry `[feat]` + entry `[bd]` confirmando aplicación; spec frontmatter `status: shipped`; TRAIL actualizado; BACKLOG cierra J1, J2, D4, AD-1; grep regression final + reporte exhaustivo.

**Files:**
- Modify: `Docs/CHANGELOG.md`
- Modify: `Docs/reference/events-v2-redesign-in-progress-v3.md` (frontmatter shipped + shipped_commits)
- Modify: `Docs/TRAIL.md`
- Modify: `Docs/BACKLOG.md` (cerrar J1, J2, D4, AD-1)

**Acceptance Criteria:**
- [ ] CHANGELOG tiene entry hoy (2026-04-27) bajo `[feat]` describiendo Cambio 3 + entry `[bd]` confirmando migration aplicada
- [ ] Spec v3 frontmatter Cambio 3: status `shipped` + `shipped_commits` con rango (T1 hash..T11 hash)
- [ ] TRAIL.md actualizado: posición = "Cambio 3 cerrado, próximo: ..."
- [ ] BACKLOG cierra los items J1 (Pickup flow bloqueado → BORRADO), J2 ya cerrado en sprint anterior, D4 (Pickup + fleet lines mezcladas → CERRADO por modelo nuevo), AD-1 (PickupOrder vs Trip → OBSOLETO)
- [ ] `grep -rn "is_self_pickup\|fulfillment_type\|complete_pickup_trip\|PreparationModal\|PickupModal\|PICKUP_STEPS\|handlePreparation\|handlePickup\|registerPreparation\|registerRetiro" src/ tests/` → 0 matches
- [ ] `npm run build` verde (final)

**Verify:** `npm run build && grep -rn "is_self_pickup\|fulfillment_type\|complete_pickup_trip\|PreparationModal\|PickupModal\|PICKUP_STEPS\|handlePreparation\|handlePickup\|registerPreparation\|registerRetiro" src/ tests/`

**Steps:**

- [ ] **Step 1: Recolectar commits T1..T10 para shipped_commits**

```bash
git log --oneline jaime/dev | head -15
# Anotar el hash del commit de T1 (chore: regenerar database.ts post-Cambio 3)
# y el hash del commit de T10 (test: cleanup tests pickup viejos)
# Rango: <T1-hash>..<T10-hash> — usar este en frontmatter.
```

- [ ] **Step 2: Agregar entry al CHANGELOG.md**

Insertar al inicio del CHANGELOG bajo nueva fecha (o agregar a la del 2026-04-27 si existen otras entries hoy):

```markdown
- [feat] **Cambio 3 — Pickup nuevo (modelo bandera-en-línea) shippeado.** Eliminación completa del modelo viejo de pickup-via-trip-especial. Pickup ahora es flag a nivel de línea (`sm_request_lines.pickup_by_project`) sin trip, sin tarifa, sin código. Tres superficies UX nuevas:
  1. **Aprobar pickup desde backlog** (`/programacion`): botón 🤝 en cada línea del backlog para logistica/admin → modal mínimo → línea pasa a `'Pickup Aprobado'` y desaparece del backlog. cascade_request_status mueve solicitud padre a 'En Proceso'.
  2. **Convertir línea Programada a pickup** (`/programacion/viaje/[id]`): botón 🤝 en cada AssignmentRow para logistica/admin con trip Programado → modal con dos variantes (última línea: cancela trip; otras: solo saca línea). Bloqueo si `qty_delivered>0`. UPDATE atómico evita round-trip Pendiente→Pickup Aprobado en cascade.
  3. **Sección "Pickups Pendientes de Retiro"** (`/programacion`): lista líneas con `pickup_by_project=true AND pickup_completed_at IS NULL` → modal "Registrar entrega" con receptor (dropdown personas + texto fallback, validación XOR), notas opc, attachments opc → línea pasa a 'Entregada' con `qty_delivered=quantity` (todo-o-nada Q4) y cascade cierra solicitud si todas las líneas están Entregadas.
  
  **Eliminaciones de código viejo:** `PreparationModal.tsx`, `PickupModal.tsx`, eventos `Preparacion`/`Retiro` (icons/colors en EventTimeline + TripEventType union), handlers `handlePreparation`/`handlePickup`, branch `Retiro` en `handleRevert`, refs a `complete_pickup_trip`, `PICKUP_STEPS` y bandera `isPickup` en `TripCard`/ProgressBar, badge "Retiro" en lista solicitudes, `is_self_pickup` en TripForm + nuevo trip page + GPS API route, `fulfillment_type` en SolicitudForm + useSolicitudes + initial states, validación J1 obsoleta. Tests legacy: `tests/pickup-flow.spec.ts` borrado entero (~250 líneas), helpers `registerPreparation`/`registerRetiro` eliminados.
  
  **Polish/fixes pre-existentes:** `cancelSolicitud` ahora incluye `'Pickup Aprobado'` en filtro de cancelación (fix I1/E8 — antes líneas pickup-aprobadas quedaban huérfanas en solicitud Cancelada). Badge "🤝 PICKUP APROBADO" en LineRow de `/solicitudes/[id]` con tooltip de fecha. Badge "🤝 RETIRADO" cuando línea completada con receptor + fecha en tooltip. GPS API route sin branch 'pickup' (solo not_in_route/no_gps/stale/live).
  
  **Decisiones cerradas:** Q1=eliminar badge agregado en lista solicitudes; Q2=DELETE pickup-flow.spec.ts; Q3=eliminar badge TripCard sin reemplazo; Q4=todo-o-nada; Q5=todas personas activas + texto fallback; Q6=XOR receptor; Q7=NO permitir pickup si qty_delivered>0; Q8=modal mínimo de confirmación al aprobar.
  
  **Edge cases cubiertos:** E1 Pendiente sin trip → Pickup Aprobado directo; E2 Programada con qty_delivered>0 bloqueada; E3 solicitud mixta (cascade trigger ya updateado por Chat); E4 trip con N>1 assignments NO se cancela; E5 pickup parcial NO soportado v1; E6 solicitante NO puede iniciar pickup; E7 línea pickup en trip con campaign no aplica; E8 cancelar solicitud con líneas Pickup Aprobado (I1 fix); E9 NO reversible v1; E10 borrador con líneas Pickup Aprobado no posible.
  
  **Deuda técnica conocida:** `convertLineToPickup` (UI Surface 2) NO es atómico server-side — DELETE assignment + UPDATE línea son 2 queries separadas. Riesgo bajo en v1 (1 Charris operando, sin concurrencia). Si una falla mid-flow, la otra queda aplicada (parcial inconsistencia: línea sin assignment pero con qty_scheduled no-recalculado, o viceversa). Polish post-merge: convertir a RPC SQL `convert_line_to_pickup(line_id, assignment_id, charris_id)` con SECURITY DEFINER y transacción server-side. Tests E2E del flow nuevo quedan como AD-5 follow-up.
  
  Cierra items: **J1** (Pickup flow bloqueado → BORRADO; modelo viejo eliminado), **D4** (Pickup + fleet lines mezcladas → CERRADO por modelo nuevo), **AD-1** (PickupOrder vs Trip → OBSOLETO; Decisión 11/3 del rediseño Events V2).

- [bd] **Cambio 3 BD aplicada por Chat en staging.** Migration `cambio3_pickup_redesign`:
  - 6 columnas pickup nuevas en `sm_request_lines`: `pickup_by_project boolean default false`, `pickup_approved_at timestamptz`, `pickup_approved_by uuid references people(id)`, `pickup_completed_at timestamptz`, `pickup_received_by_id uuid references people(id)`, `pickup_received_by_name text`.
  - Status nuevo `'Pickup Aprobado'` aceptado en validación de status (no hay CHECK constraint en BD — validación solo en código TypeScript).
  - DROP `trips.is_self_pickup`, `sm_requests.fulfillment_type`, función `complete_pickup_trip`. Verificación pre-aplicación: 0 trips con `is_self_pickup=true`, 0 solicitudes con `fulfillment_type='pickup'` — modelo viejo no tenía uso real.
  - `cascade_request_status` actualizado para tratar `'Pickup Aprobado'` como `in_progress` (igual que `'Programada'`). Verificado funcionalmente con seeding (Solicitud B pasó a 'En Proceso' al actualizar líneas a 'Programada').
  - **Adicional:** migración separada `cambio3_pickup_add_attachments_to_lines` aplicada por Chat post-brainstorming: `ALTER TABLE sm_request_lines ADD COLUMN attachments JSONB DEFAULT '[]'::jsonb NOT NULL`. Razón: persistir evidencias de pickup completion per-línea (foto receptor, condiciones del material). El hook `completePickup` y `PickupDeliveryModal` persisten directamente en este campo.
  - Pendiente aplicar a prod: ambas migraciones (`cambio3_pickup_redesign` + `cambio3_pickup_add_attachments_to_lines`) en el merge final v2 del branch `jaime/dev` (junto con resto de pendientes BD acumuladas).
```

- [ ] **Step 3: Actualizar spec frontmatter**

Cambios en `Docs/reference/events-v2-redesign-in-progress-v3.md`:

```yaml
# Buscar el frontmatter al inicio del archivo (líneas 1-20 aprox)
# Si tiene un campo `status` para Cambio 3, cambiar a `shipped`
# Si tiene `shipped_commits` agregarle el rango T1..T11

# Si el frontmatter está estructurado como `cambio_3: { status: ..., ... }`:
# CAMBIAR:
#   cambio_3:
#     status: in-progress
# A:
#   cambio_3:
#     status: shipped
#     shipped_commits: <T1-hash>..<T11-hash>
#     shipped_date: 2026-04-27

# Si el frontmatter es simple para todo el doc, agregar al final del frontmatter:
#   ---
#   cambio_3_status: shipped
#   cambio_3_shipped_commits: <T1-hash>..<T11-hash>
#   cambio_3_shipped_date: 2026-04-27
#   ---

# El formato exacto depende del frontmatter actual del archivo. Leer primero las
# primeras 30 líneas del archivo y adaptar.
```

NOTA: Spec v3 NO debería editarse fuera del frontmatter (regla `no-modify-specs`). Solo el frontmatter de control de status es excepción explícita.

Verificar primero:
```bash
head -30 "Docs/reference/events-v2-redesign-in-progress-v3.md"
```

Adaptar el formato según lo que ya tiene.

- [ ] **Step 4: Actualizar TRAIL.md**

Cambios en `Docs/TRAIL.md`:

```markdown
# Buscar la línea de "Última actualización" (línea ~3) y cambiarla a:
#   **Última actualización:** 2026-04-27 (Cambio 3 Pickup shippeado)

# Buscar el bloque "Position actual" (línea ~16) y actualizar el tree:
# - Marcar Cambio 3 como ✅
# - Mover el árbol a próxima posición

# Ejemplo:
#  └─ [⏳] Siguiente: staging-track Events V2 polish
#      ├─ [✅] Cambio 1 Parada redesign (shipped 2026-04-26)
#      ├─ [✅] Cambio 2 Cost code refactor (shipped 2026-04-27)
#      ├─ [✅] Cambio 3 Pickup nuevo (shipped 2026-04-27)
#      ├─ J1 Pickup flow bloqueado — CERRADO por Cambio 3
#      ├─ J5 Overarching event design (en discusión activa)
#      ├─ G-items sobrevivientes (G4, G5, G11)
#      └─ ...

# Actualizar también el "Plan file activo" al final:
#   - **Plan file activo:** ninguno activo
#   (Cambio 3 plan se borra al final — ver `.claude/rules/plan-lifecycle.md`)
```

- [ ] **Step 5: Actualizar BACKLOG.md**

Cambios en `Docs/BACKLOG.md`:

Buscar en sección "Items que sobreviven post-merge" o similar y mover los siguientes a la sección de "Completado recientemente":
- **J1** Pickup flow bloqueado → CERRADO por Cambio 3 (modelo viejo eliminado)
- **D4** Pickup + fleet lines mezcladas → CERRADO (modelo nuevo lo permite naturalmente — líneas pickup salen del flow trip)
- **AD-1** PickupOrder vs Trip → OBSOLETO (Decisión 11 del rediseño Events V2; cerrado por Cambio 3)

Si J2 ya estaba marcado como cerrado en sprint anterior, no tocarlo. Solo confirmar que J9 (cost code refactor — Cambio 2) ya está marcado como cerrado.

Agregar una nota en sección de pickup follow-ups:
```markdown
## Pickup post-Cambio 3 (follow-ups opcionales)

- Persistir attachments del modal "Registrar entrega" — agregar columna `pickup_attachments JSONB` en `sm_request_lines` y guardar Attachment[]. v1 los acepta pero ignora (quedan en Storage huérfanos). Priority: bajo, depende de feedback de Charris.
- Tests E2E del flow nuevo (3 superficies). Bloqueado por AD-5 (helpers `createSolicitud`/`createTrip` rotos). Hacer cuando AD-5 se cierre.
- Filtrar dropdown de receptor por proyecto destino — actualmente trae todas las personas activas. Polish menor.
- A6 confirmar con Charris: ¿Charris (logistica) registra entrega o almacenista? v1 asume Charris.
- A5 confirmar con Charris: ¿Pickup parcial necesario? v1 NO soporta — proyecto retira todo o nada.
```

- [ ] **Step 6: Grep regression final**

```bash
echo "=== GREP REGRESSION FINAL ==="
grep -rn "is_self_pickup\|fulfillment_type\|complete_pickup_trip\|PreparationModal\|PickupModal\|PICKUP_STEPS\|handlePreparation\|handlePickup\|registerPreparation\|registerRetiro" src/ tests/
# Expected: 0 matches
echo "=== END GREP ==="
```

Si HAY matches, parar y reportar en `Docs/cambio3-incidente.md`.

- [ ] **Step 7: Build final**

```bash
npm run build 2>&1 | tail -20
# Expected: verde
```

Si build rompe, parar y reportar en `Docs/cambio3-incidente.md`.

- [ ] **Step 8: Reporte final exhaustivo (output a stdout antes del commit)**

```bash
echo "=== REPORTE FINAL CAMBIO 3 ==="
echo ""
echo "--- git log Cambio 3 (últimos 12 commits) ---"
git log --oneline jaime/dev | head -12
echo ""
echo "--- git status (working tree) ---"
git status
echo ""
echo "--- npm run build (re-run para confirmar) ---"
npm run build 2>&1 | tail -10
echo ""
echo "--- grep regression (debe ser vacío) ---"
grep -rn "is_self_pickup\|fulfillment_type\|complete_pickup_trip\|PreparationModal\|PickupModal\|PICKUP_STEPS\|handlePreparation\|handlePickup\|registerPreparation\|registerRetiro" src/ tests/ || echo "(no matches — ✅)"
echo ""
echo "--- archivos modificados (diff stats Cambio 3) ---"
git diff --stat $(git log --oneline jaime/dev | grep "Task 1" | tail -1 | cut -d' ' -f1)~..HEAD
echo ""
echo "--- archivos eliminados ---"
echo "  src/components/viajes/PreparationModal.tsx"
echo "  src/components/viajes/PickupModal.tsx"
echo "  tests/pickup-flow.spec.ts"
echo ""
echo "--- archivos creados ---"
echo "  src/hooks/usePickup.ts"
echo "  src/components/programacion/PickupDeliveryModal.tsx"
echo ""
echo "--- smoke test manual (NO ejecutado en autonomous run) ---"
echo "  1. Solicitud A (26-604-SM-005): aprobar pickup desde backlog → línea sale del backlog"
echo "  2. Solicitud B (26-604-SM-006): convertir ambas líneas de Trip MOV-2026-006 → trip queda Cancelado"
echo "  3. Sección 'Pickups Pendientes de Retiro': registrar entrega de líneas A1/A2 → status Entregada + cascade Completada"
echo "  4. cancelSolicitud con líneas Pickup Aprobado → todas las líneas cancelan correctamente"
echo "  5. Trip sin línea pickup: GPS map sigue funcionando (verifica que branch pickup eliminado no rompió GPS fleet)"
echo ""
echo "--- incidente file ---"
ls Docs/cambio3-incidente.md 2>/dev/null && echo "⚠️  EXISTE — leer para detalles" || echo "(no existe — ✅ run completo sin issues)"
echo ""
echo "=== FIN REPORTE ==="
```

- [ ] **Step 9: Commit final**

```bash
git add -A
git commit -m "$(cat <<'EOF'
docs: cerrar Cambio 3 — pickup redesign (Task 11)

CHANGELOG entry [feat] + [bd] documentando:
- 3 superficies UX nuevas (aprobar backlog, convertir, registrar
  entrega)
- Eliminaciones de código viejo (~700 líneas)
- Polish I1 (cancelSolicitud incluye Pickup Aprobado)
- Decisiones Q1-Q8, edge cases E1-E10
- Limitations conocidas (attachments parkeados, tests E2E AD-5
  follow-up)
- Items cerrados: J1, D4, AD-1

Spec v3 frontmatter Cambio 3: status=shipped + shipped_commits.
TRAIL.md actualizado: Cambio 3 marcado ✅ en árbol.
BACKLOG.md: J1/D4/AD-1 movidos a "Completado recientemente".

Pendiente: aplicar BD a prod en merge final v2 (junto con resto
de pendientes acumuladas desde último release).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 10: Borrar plan file (per `.claude/rules/plan-lifecycle.md`)**

```bash
rm Docs/superpowers/plans/2026-04-27-cambio3-pickup-redesign.md
rm Docs/superpowers/plans/2026-04-27-cambio3-pickup-redesign.md.tasks.json
```

Y commit final del cleanup:

```bash
git add Docs/superpowers/plans/
git commit -m "$(cat <<'EOF'
chore: borrar plan Cambio 3 — feature cerrado

Plan file ya no necesario per .claude/rules/plan-lifecycle.md
(features cerrados borran su plan; valor histórico vive en
CHANGELOG + spec frontmatter shipped).
EOF
)"
```

---

## Self-Review (post-plan write)

Ejecuto este checklist con ojos frescos antes de invocar AskUserQuestion:

### 1. Spec coverage

Cada decisión Q1-Q8 + issue I1-I6 + edge case E1-E10 mapeado a una task:

| Item | Task | Dónde |
|---|---|---|
| Q1 (badge eliminar) | T3 | Step 3 (eliminar bloques 334-336, 393-395) |
| Q2 (DELETE pickup-flow.spec.ts) | T10 | Step 1 |
| Q3 (TripCard sin badge) | T2 | Step 10 (eliminar líneas 84-86, 128) |
| Q4 (todo-o-nada) | T5/T8 | usePickup.completePickup `qty_delivered = quantity`; modal sin qty input |
| Q5 (todas personas activas) | T8 | Fetch people sin filtro de proyecto |
| Q6 (XOR receptor) | T5/T8 | usePickup.completePickup validation `id || name`; modal `canConfirm` logic |
| Q7 (bloquear si qty_delivered>0) | T5/T7 | usePickup.convertLineToPickup validación; modal disabled state |
| Q8 (modal mínimo aprobar) | T6 | Step 2 (modal sin notas/attachments/receptor) |
| I1 (cancelSolicitud) | T9 | Step 1 |
| I2 (badge Retiro lista) | T3 | Resuelto por Q1=c |
| I3 (orden DELETE+UPDATE atómico) | T5 | Step 2 (NO usa releaseLineFromAssignment) |
| I4 (handleRevert Llegada filter) | T4 | Step 4 (eliminar 'Retiro' del array) |
| I5 (GPS API route branch) | T2 | Step 11 |
| I6 (botón Parada filter) | T4 | Step 8 (simplificar `!isPickup`) |
| E1 (Pendiente → Pickup) | T5 | approvePickupFromBacklog |
| E2 (qty_delivered>0 bloqueado) | T5 | convertLineToPickup validación |
| E3 (solicitud mixta — cascade) | BD | Chat ya updateó cascade_request_status (V1) |
| E4 (trip con N>1 NO cancelar) | T5 | convertLineToPickup count check |
| E5 (no parcial) | T5/T8 | qty_delivered = quantity total |
| E6 (solicitante NO inicia) | T6/T8 | Gate por rol (logistica/admin only) |
| E7 (campaign no aplica) | N/A | Confirmado en brainstorming |
| E8 (cancelar con Pickup Aprobado) | T9 | I1 fix |
| E9 (NO reversible v1) | Docs | T11 documenta limitation |
| E10 (Borrador no posible) | N/A | Cubierto por gating |

✅ Coverage 100%.

### 2. Placeholder scan

Busco patrones rojos:
- "TBD" / "TODO" / "implement later" / "fill in details": 0 ocurrencias en plan ✅
- "Add appropriate error handling": 0 ✅ (cada hook tiene try/catch + setError explícito)
- "similar to Task N": 0 ✅ (cada task tiene código completo, no referencias cruzadas)
- "verify schema in T5 step 1": existe — pero es una verificación legítima, no un placeholder

⚠️ T5 Step 1 verifica schema de attachments dynamically. Si la columna NO existe (caso esperado), se documenta como limitation. Si existe, el código del hook usa el campo. Esto es runtime branching legítimo, no placeholder.

### 3. Type consistency

- `usePickup` interface: `ApprovePickupResult`, `ConvertLineResult`, `CompletePickupResult` — todas con `ok: boolean`, `error?: string` ✅
- `PendingPickupLine` interface (T8) — fields consistentes con la query (id, description, line_type, quantity, unitCode, request_id, project_code/name, pickup_approved_at) ✅
- `pickupInfo` prop en LineRow (T9): `pickup_by_project`, `pickup_approved_at`, `pickup_completed_at`, `pickup_received_by_name` — consistente con columnas BD ✅
- `LineWithRelations` extendido en T9 con 6 columnas pickup matching `database.ts` — consistente ✅
- `TripEventType` post-T4: `'Salida' | 'Llegada' | 'Entrega' | 'Retorno' | 'Incidencia' | 'Parada'` — usado consistente en EventTimeline + handlers ✅

### 4. Recovery plan ✅

Sección "Recovery Plan (rollback completo)" al inicio del plan con git reset commands + BD revert SQL note. Alternativa quirúrgica con git revert por commit.

### 5. Reglas de ejecución autónoma ✅

Sección "⚠️ Reglas de ejecución autónoma" al inicio del plan con 7 reglas explícitas (no improvisar, no consultar, atomic commits, build verde, tests obligatorios, no push, reporte final).

---

## Riesgos y mitigaciones

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| `LineWithRelations` interface manual en useSolicitudes.ts no tiene los nuevos campos pickup, queries existentes podrían no traer los campos | media | T9 Step 3 explícitamente extiende la interface + mapper; T1 verifica regen tipos |
| LineRow.tsx layout no acomoda dos badges juntos (status + pickup) | baja | T9 Step 4 instruye a leer LineRow primero y agregar pickup badge como suplemento; visual acceptable en autonomous run |
| `SelectWithFallback` tiene API distinta a la asumida en PickupDeliveryModal | media | T8 Step 2 verifica el contrato real antes de implementar |
| `npm run build` rompe en T2 mid-task antes de T3-T4 cierre | esperado | T1 dice explícitamente que build romperá hasta T4. T2-T4 son refactor coordinado. NO commitear si build rompe en T4 final |
| Tests rotos en T10 por cambios coordinados | baja | Verificar `npx playwright test --list` post-T10. Si algún test ajeno al pickup rompe, parar y reportar |
| Plan file borrado en T11 antes de tests pasen | bajo riesgo | T11 Step 10 ocurre DESPUÉS del commit final + reporte. Si James quiere el plan, lo recupera del git history (`git show <T11-prev>:Docs/superpowers/plans/2026-04-27-cambio3-pickup-redesign.md`) |
