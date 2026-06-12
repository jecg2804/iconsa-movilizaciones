# Cambio 1 — Parada Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar el modal Parada para imponer ubicación elegida del dropdown filtrado del trip o free-text "Otra", ≥1 línea afectada, ≥1 attachment. Eliminar `stop_type` y `oc_reference` del modelo. Actualizar tests + regression tests.

**Architecture:** Sistema híbrido dropdown + free-text fallback en `ParadaModal`. El dropdown se puebla a partir de `trip.assignments[].line.{from,to}_location/text`, deduplicado por label, filtrado para excluir `location_type='proyecto'` y `'taller'` (lowercase per BD verificada). Opción especial "Otra ubicación" abre input free-text condicional. `useTrips.fetchTrip` se extiende para traer `location_type` en `from_location`/`to_location` (necesario para el filtro). `stop_type` ya está dropeado de staging por Chat (migration `drop_stop_type_from_trip_events` 2026-04-26); Code regenera `database.ts` y limpia consumidores. `oc_reference` no era columna BD — solo se borra del modal y prefijo en handler.

**Tech Stack:** Next.js 16 (App Router), TypeScript ES2022 strict, Tailwind, Supabase (read-only via MCP), Playwright tests, Lucide icons, `@/components/ui/FileUploader`.

**Master spec:** `Docs/reference/events-v2-redesign-in-progress-v3.md` Sección 3 Cambio 1.
**Brainstorming clarifications:** `Docs/superpowers/specs/2026-04-26-cambio1-parada-redesign.md`.

**Out of scope (NO TOCAR):**
- D8 (PM no botón Incidencia) — diferido a Cambio 2/3
- Notificaciones de Parada — Sección 4 master, post-merge
- Pickup, cost code refactor — Cambios 2 y 3
- D1 lógica de Retorno — ya correcta
- DispatchModal role-based — ya correcto
- BD changes — Code NO toca BD; staging ya aplicado, prod queda para merge final

---

## Task 1: Master spec v3.1 + CHANGELOG entry

**Goal:** Reflejar en docs vivos las correcciones surgidas en brainstorming + la BD ya aplicada en staging.

**Files:**
- Modify: `Docs/reference/events-v2-redesign-in-progress-v3.md` (frontmatter + Sección 1.4 + Sección 2 Decisión 24 + Sección 3 Cambio 1 BD block + filtro lowercase)
- Modify: `Docs/CHANGELOG.md` (nueva sección `## 2026-04-26` con entry `[bd]`)

**Acceptance Criteria:**
- [ ] Frontmatter `updated:` muestra `2026-04-26 (v3.1: lowercase fix + bd applied)`
- [ ] Sección 3 Cambio 1 pseudocódigo del filtro usa lowercase `'proyecto'` y `'taller'`
- [ ] Nota sobre valores reales BD (6/1/1 entries) agregada bajo el pseudocódigo
- [ ] Sección 3 Cambio 1 bloque "BD" reescrito reflejando que stop_type ya fue aplicado y oc_reference no existía
- [ ] Sección 1.4 sin `trip_events.stop_type` en lista de "Críticas"
- [ ] Nueva sub-sección "Aplicados en este merge (Chat via MCP)" en Sección 1.4 con entry de 2026-04-26
- [ ] Decisión 24 agregada al final de la tabla en Sección 2
- [ ] CHANGELOG sección `## 2026-04-26` arriba de `## 2026-04-20` con entry `[bd]` per James

**Verify:** `git diff --stat HEAD` muestra 2 archivos modificados (1 doc reference + CHANGELOG). Build no aplica (solo docs).

**Steps:**

- [ ] **Step 1: Editar frontmatter del master spec**

En `Docs/reference/events-v2-redesign-in-progress-v3.md` líneas 1-9, cambiar:
```yaml
updated: 2026-04-26
```
por:
```yaml
updated: 2026-04-26 (v3.1: lowercase fix + bd applied)
```

- [ ] **Step 2: Editar Sección 1.4 — eliminar `trip_events.stop_type` de "Críticas"**

Buscar el bullet:
```
- `trip_events.reverts_event_id`, `source`, `stop_type` (este último se DROP en este merge), `location`
```
Reemplazar por:
```
- `trip_events.reverts_event_id`, `source`, `location`
```

- [ ] **Step 3: Agregar sub-sección "Aplicados en este merge" en Sección 1.4**

Después del bloque de "Implicación" en Sección 1.4 (al final de la sección, antes del separador `---`), agregar:

```markdown
**Aplicados en este merge (Chat via MCP):**
- 2026-04-26: `trip_events DROP COLUMN stop_type` aplicado en staging (migration `drop_stop_type_from_trip_events`). Pendiente prod en merge final.
```

- [ ] **Step 4: Agregar Decisión 24 a la tabla de Sección 2**

Al final de la tabla de decisiones (después de Decisión 23), agregar fila:

```markdown
| 24 | 2026-04-26 | Valores reales de `locations.location_type` verificados en BD: `'proyecto'`, `'taller'`, `'otro'` (todos lowercase). Filtros del dropdown deben usar lowercase. Doc v3 inicial decía capitalized — bug que hubiera causado que el filtro no funcione | Verificado via MCP en staging y prod |
```

- [ ] **Step 5: Corregir filtro lowercase en pseudocódigo de Sección 3 Cambio 1**

En el bloque ```typescript del pseudocódigo del dropdown, cambiar:
```typescript
.filter(opt => 
  opt.location_type !== 'Proyecto' &&  // excluir proyectos
  opt.location_type !== 'Taller'        // excluir taller
)
```
por:
```typescript
.filter(opt => 
  opt.location_type !== 'proyecto' &&  // excluir proyectos (lowercase per BD)
  opt.location_type !== 'taller'        // excluir taller (lowercase per BD)
)
```

- [ ] **Step 6: Agregar nota sobre valores reales BD bajo el pseudocódigo**

Inmediatamente después del bloque de pseudocódigo cerrado y antes de "**Comportamiento:**", insertar párrafo:

```markdown
**Nota:** Valores reales en BD verificados 2026-04-26: `'proyecto'` (6 entries), `'taller'` (1, Taller Chilibre), `'otro'` (1, Oficina Central). Entradas con `location_type='otro'` o `null` pasan al dropdown (proveedores típicamente entran via `from_text`/`to_text` con `location_type=null`).
```

- [ ] **Step 7: Reescribir bloque "Cambios técnicos — BD" en Sección 3 Cambio 1**

Reemplazar el bloque entero "**BD (aplica Chat via MCP, NO Code):**" hasta antes de "**Código (Code implementa con Superpowers):**" por:

```markdown
**BD (aplicado por Chat el 2026-04-26):**
- `ALTER TABLE trip_events DROP COLUMN stop_type` — APLICADO en staging via migration `drop_stop_type_from_trip_events`. Verificación pre-aplicación: 0 filas con `stop_type` asignado.
- `oc_reference`: NO existe como columna en `trip_events`. Era prefijo a `notes` en el modal. NO hay ALTER que hacer. Solo borrar campo del modal y prefijo en `handleParada`.
- Pendiente aplicar a prod: `stop_type` DROP en el merge final junto con resto de pendientes BD.
```

- [ ] **Step 8: Agregar sección 2026-04-26 al CHANGELOG**

En `Docs/CHANGELOG.md`, después del separador en línea 5 (`---`) y antes de `## 2026-04-20` (línea 7), insertar:

```markdown
## 2026-04-26
- [bd] Cambio 1 Parada — `ALTER TABLE trip_events DROP COLUMN stop_type` aplicado en staging (`vonwkciosksqspyljzfy`) via Chat MCP. Migration `drop_stop_type_from_trip_events`. Justificación: toda Parada es retiro de proveedor por diseño (decisión 17 del rediseño Events V2). Verificado pre-aplicación: 0 filas con stop_type. `oc_reference` NO existe como columna (era prefijo a notes en modal). Pendiente aplicar a prod en el merge final.

```

- [ ] **Step 9: Commit**

```bash
git add Docs/reference/events-v2-redesign-in-progress-v3.md Docs/CHANGELOG.md
git commit -m "docs: spec v3.1 + CHANGELOG — Cambio 1 BD applied + lowercase fix

Master spec actualizado con correcciones brainstorming:
- Frontmatter v3.1
- Sección 1.4 sin trip_events.stop_type (ya dropeado staging)
- Sección 1.4 nueva sub-sección 'Aplicados en este merge'
- Sección 2 Decisión 24 (lowercase verification)
- Sección 3 filtro lowercase + nota BD
- Sección 3 BD block reescrito post-aplicación

CHANGELOG entry [bd] documentando DROP COLUMN stop_type en staging.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Regenerar database.ts + cleanup completo de `stop_type`

**Goal:** Sincronizar tipos generados con staging post-DDL y eliminar todas las referencias a `stop_type` del código de producción para que TypeScript compile sin errores.

**Files:**
- Modify (regenerate): `src/lib/types/database.ts`
- Modify: `src/app/(app)/mis-viajes/[id]/page.tsx` (interface `TripEvent` línea 50, SELECT en `loadEvents` línea 432, mapper línea 455, INSERT en `handleParada` línea 1137)
- Modify: `src/components/viajes/EventTimeline.tsx` (interface `EventItem` línea 17, render Parada líneas 154-157)
- Modify: `src/components/viajes/ParadaModal.tsx` (interface `ParadaData` línea 11-18, state `stopType` línea 41, constante `STOP_TYPES` líneas 27-31, JSX radios líneas 142-162, payload línea 103)

**Acceptance Criteria:**
- [ ] `database.ts` regenerado contra staging — `trip_events` row no tiene `stop_type`
- [ ] `grep -r "stop_type" src/` retorna cero matches
- [ ] `npm run build` pasa sin errores TypeScript
- [ ] `ParadaData` interface no tiene `stop_type`
- [ ] Modal Parada UI ya no muestra los radios de tipo (Retiro/Entrega/Intercambio)
- [ ] EventTimeline render de Parada solo muestra `location` (sin badge de stop_type)

**Verify:**
```bash
grep -rn "stop_type" src/
# Expected: 0 matches
npm run build
# Expected: build pasa sin errores
```

**Steps:**

- [ ] **Step 1: Regenerar `database.ts` desde staging**

```bash
npx supabase gen types typescript --project-id vonwkciosksqspyljzfy > src/lib/types/database.ts
```

Verificar que el bloque `trip_events.Row` ya no contiene `stop_type`:
```bash
grep -n "stop_type" src/lib/types/database.ts
# Expected: 0 matches
```

- [ ] **Step 2: Eliminar `stop_type` del SELECT en `loadEvents`**

En `src/app/(app)/mis-viajes/[id]/page.tsx` líneas 422-433, el SELECT actual:
```ts
.select(`
  id,
  event_type,
  event_timestamp,
  registered_by:registered_by(id, name),
  received_by_name,
  notes,
  attachments,
  reverts_event_id,
  location,
  stop_type
`)
```
Cambiar a:
```ts
.select(`
  id,
  event_type,
  event_timestamp,
  registered_by:registered_by(id, name),
  received_by_name,
  notes,
  attachments,
  reverts_event_id,
  location
`)
```

- [ ] **Step 3: Eliminar `stop_type` del mapper de eventos**

En el mismo archivo, línea 455:
```ts
stop_type: (row.stop_type as string | null) ?? null,
```
Borrar esa línea completa.

- [ ] **Step 4: Eliminar `stop_type` del interface `TripEvent`**

Línea 50 del mismo archivo:
```ts
stop_type: string | null
```
Borrar la línea.

- [ ] **Step 5: Eliminar `stop_type` del INSERT en `handleParada`**

Línea 1137 del mismo archivo:
```ts
stop_type: data.stop_type,
```
Borrar la línea. El INSERT queda sin esa propiedad.

- [ ] **Step 6: Eliminar `stop_type` de `EventTimeline`**

En `src/components/viajes/EventTimeline.tsx` línea 17, en interface `EventItem`:
```ts
stop_type?: string | null
```
Borrar la línea.

- [ ] **Step 7: Eliminar render del badge `stop_type` en `EventTimeline`**

En el mismo archivo, líneas 149-160 contienen el bloque de render para Parada. Reemplazar:
```tsx
{event.event_type === 'Parada' && !isReverted && (
  <div className="mt-0.5 flex flex-wrap items-center gap-2">
    {event.location && (
      <span className="text-xs font-medium text-cyan-700">📍 {event.location}</span>
    )}
    {event.stop_type && (
      <span className="inline-flex rounded-full bg-cyan-50 px-2 py-0.5 text-xs text-cyan-700 border border-cyan-200">
        {event.stop_type === 'retiro' ? 'Retiro' : event.stop_type === 'entrega' ? 'Entrega' : 'Intercambio'}
      </span>
    )}
  </div>
)}
```
por:
```tsx
{event.event_type === 'Parada' && !isReverted && event.location && (
  <div className="mt-0.5">
    <span className="text-xs font-medium text-cyan-700">📍 {event.location}</span>
  </div>
)}
```

- [ ] **Step 8: Eliminar `stop_type` y `STOP_TYPES` de `ParadaModal`**

En `src/components/viajes/ParadaModal.tsx`:

(a) Líneas 11-18, interface `ParadaData`. Reemplazar:
```ts
export interface ParadaData {
  location: string
  stop_type: 'retiro' | 'entrega' | 'intercambio'
  lines?: { request_line_id: string; line_status: string; quantity: number; notes?: string }[]
  oc_reference?: string
  notes: string
  attachments: Attachment[]
}
```
por (cleanup también de `oc_reference` ya que será reemplazo en Task 4):
```ts
export interface ParadaData {
  location: string
  lines: { request_line_id: string; line_status: string; quantity: number; notes?: string }[]
  notes: string
  attachments: Attachment[]
}
```

(b) Líneas 27-31, borrar la constante `STOP_TYPES` completa:
```ts
const STOP_TYPES = [
  { value: 'retiro', label: 'Retiro de material/equipo' },
  { value: 'entrega', label: 'Entrega de material/equipo' },
  { value: 'intercambio', label: 'Intercambio (deja y recoge)' },
] as const
```

(c) Línea 41, borrar el state `stopType`:
```ts
const [stopType, setStopType] = useState<'retiro' | 'entrega' | 'intercambio'>('retiro')
```

(d) Líneas 142-162 (bloque "Tipo de parada" con radios), borrar todo el bloque:
```tsx
{/* Tipo de parada */}
<div>
  <label className="mb-2 block text-sm font-medium text-gray-700">
    Tipo de parada <span className="text-red-500">*</span>
  </label>
  <div className="flex flex-wrap gap-3">
    {STOP_TYPES.map((st) => (
      <label key={st.value} className="flex items-center gap-1.5 text-sm cursor-pointer">
        <input
          type="radio"
          name="stop_type"
          value={st.value}
          checked={stopType === st.value}
          onChange={() => setStopType(st.value as typeof stopType)}
          className="accent-cyan-600"
        />
        {st.label}
      </label>
    ))}
  </div>
</div>
```

(e) En el `handleConfirm` de la línea 83, eliminar `stop_type: stopType` del objeto pasado a `onConfirm`. El call queda:
```ts
await onConfirm({
  location: location.trim(),
  lines: checkedLines,
  notes: fullNotes,
  attachments,
})
```
Nota: en este Task 2 quedan `oc_reference` y `fullNotes` (con prefijo) intactos — Task 4 los limpia. Por ahora, ajustar solo el campo `lines` para que no use `length > 0 ? ... : undefined` (el tipo ahora lo requiere como array — pero en Task 4 las validaciones ≥1 línea aplican; para que Task 2 compile, usar `checkedLines` directo).

(f) Quitar el import `Wrench, Package, ChevronDown, ChevronUp` si ya no son necesarios — verificar después de los cambios. Si `showLines` y la sección colapsable se mantienen (sí, hasta Task 4), `ChevronDown/Up` siguen necesarios. `Wrench` y `Package` también siguen (render de líneas).

- [ ] **Step 9: Verificar build**

```bash
npm run build
```
Expected: build pasa sin errores. Si hay TS errors, son tipos derivados de `database.ts` que necesitan ajuste — chequear cualquier import de `Database['public']['Tables']['trip_events']['Row']` que use `stop_type` y eliminar.

- [ ] **Step 10: Verificar grep cero matches**

```bash
grep -rn "stop_type" src/
```
Expected: 0 matches (excepto archivos en `node_modules` que el grep ya excluye por defecto).

- [ ] **Step 11: Commit**

```bash
git add src/lib/types/database.ts src/app/\(app\)/mis-viajes/\[id\]/page.tsx src/components/viajes/EventTimeline.tsx src/components/viajes/ParadaModal.tsx
git commit -m "refactor: eliminar stop_type del modelo Parada

Sincroniza con BD post-DROP COLUMN aplicado en staging 2026-04-26:
- database.ts regenerado contra staging
- mis-viajes/[id]/page.tsx: SELECT, mapper, interface, handleParada
- EventTimeline.tsx: interface y render del badge
- ParadaModal.tsx: ParadaData type, state, STOP_TYPES, radios JSX

Decisión 17 del rediseño Events V2: toda Parada es retiro de
proveedor por diseño. Tipo de parada deja de tener sentido como
campo per-evento.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: `useTrips.fetchTrip` — agregar `location_type` a `from_location`/`to_location`

**Goal:** Hacer disponible `location_type` en `trip.assignments[].line.{from,to}_location` para que `ParadaModal` (Task 4) pueda filtrar `'proyecto'` y `'taller'` del dropdown.

**Files:**
- Modify: `src/hooks/useTrips.ts` (3 SELECT extensions + 2 type extensions + 3 mapper updates)

**Acceptance Criteria:**
- [ ] Los 3 SELECT (`useBacklog`/equivalent en línea 460, `refetchTrips` línea 623, `fetchTrip` línea 735) traen `location_type` en `from_location`/`to_location`
- [ ] `TripAssignment['line']['from_location']` y `to_location` incluyen `location_type: string | null`
- [ ] `BacklogLine['from_location']` y `to_location` incluyen `location_type: string | null`
- [ ] Los 3 mappers preservan `location_type`
- [ ] `npm run build` pasa
- [ ] No se introducen tipos `any` ni `unknown` casts inseguros

**Verify:**
```bash
grep -n "location_type" src/hooks/useTrips.ts
# Expected: ≥6 matches (3 en SELECTs + 2 en type defs + 3 en mappers approx)
npm run build
# Expected: pasa
```

**Steps:**

- [ ] **Step 1: Localizar y extender los 3 SELECT**

En `src/hooks/useTrips.ts`:

Línea 460-461 (query de backlog):
```ts
from_location:from_location_id(id, name),
to_location:to_location_id(id, name),
```
Cambiar a:
```ts
from_location:from_location_id(id, name, location_type),
to_location:to_location_id(id, name, location_type),
```

Línea 623-624 (query de lista de trips, dentro de `refetchTrips`):
```ts
from_location:from_location_id(id, name),
to_location:to_location_id(id, name),
```
Cambiar a:
```ts
from_location:from_location_id(id, name, location_type),
to_location:to_location_id(id, name, location_type),
```

Línea 735-736 (query de `fetchTrip`):
```ts
from_location:from_location_id(id, name),
to_location:to_location_id(id, name),
```
Cambiar a:
```ts
from_location:from_location_id(id, name, location_type),
to_location:to_location_id(id, name, location_type),
```

- [ ] **Step 2: Extender el tipo `TripAssignment['line']['from_location']` y `to_location`**

Buscar la definición del tipo `TripAssignment` (líneas ~30-90 aprox según los grep matches anteriores). Ubicar el campo:
```ts
from_location: { id: string; name: string } | null
to_location: { id: string; name: string } | null
```
Cambiar a:
```ts
from_location: { id: string; name: string; location_type: string | null } | null
to_location: { id: string; name: string; location_type: string | null } | null
```

- [ ] **Step 3: Extender el tipo `BacklogLine['from_location']` y `to_location`**

Buscar la interface `BacklogLine` (líneas ~20-30 según grep). Mismo cambio:
```ts
from_location: { id: string; name: string; location_type: string | null } | null
to_location: { id: string; name: string; location_type: string | null } | null
```

- [ ] **Step 4: Actualizar los 3 mappers para preservar `location_type`**

Mapper en línea 225-226 (dentro de `mapTripRow`):
```ts
const fromLoc = unwrapRelation(rawLine.from_location as { id: string; name: string } | null)
const toLoc = unwrapRelation(rawLine.to_location as { id: string; name: string } | null)
```
Cambiar a:
```ts
const fromLoc = unwrapRelation(rawLine.from_location as { id: string; name: string; location_type: string | null } | null)
const toLoc = unwrapRelation(rawLine.to_location as { id: string; name: string; location_type: string | null } | null)
```

Mapper en línea 309-310 (dentro de `mapAssignmentWithLine` o equivalente — buscar por contexto):
```ts
const fromLoc = unwrapRelation(rawLine.from_location as { id: string; name: string } | null)
const toLoc = unwrapRelation(rawLine.to_location as { id: string; name: string } | null)
```
Mismo cambio — extender el cast con `location_type`.

Mapper en línea 489-490 (dentro de `useBacklog` o equivalente — buscar por contexto):
```ts
const fromLoc = unwrapRelation(row.from_location as BacklogLine['from_location'] | BacklogLine['from_location'][])
const toLoc = unwrapRelation(row.to_location as BacklogLine['to_location'] | BacklogLine['to_location'][])
```
Esto NO requiere cambio en el cast (ya usa el tipo `BacklogLine['from_location']`). Como ya extendiste `BacklogLine`, este mapper recoge el cambio automáticamente. Verificar que el resultado del `unwrapRelation` se asigne a un campo con el tipo extendido.

- [ ] **Step 5: Verificar que ningún consumer down-stream rompe**

Hay otros archivos que consumen `TripAssignment['line']` (ParadaModal, otros modals, components/programacion, etc.). Como solo agregué un campo opcional al tipo — no rompí ningún campo existente — TypeScript no debería quejarse. Hacer:
```bash
npm run build
```
Si hay errores, probablemente sean accesos `from_location.location_type` que no existían antes y algún cast intermedio se queja. Resolver case-by-case.

- [ ] **Step 6: Verificar grep**

```bash
grep -n "location_type" src/hooks/useTrips.ts
```
Expected: ≥6 matches (3 SELECTs + 2 type defs en `TripAssignment` y `BacklogLine` + 3 mapper casts).

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useTrips.ts
git commit -m "feat: useTrips trae location_type en from_location/to_location

Necesario para que ParadaModal pueda filtrar dropdown excluyendo
location_type='proyecto' y 'taller' (lowercase per BD).

Cambios:
- 3 SELECTs extendidos (backlog, refetchTrips, fetchTrip)
- TripAssignment['line']['from_location']/['to_location'] gana
  campo location_type: string | null
- BacklogLine['from_location']/['to_location'] mismo cambio
- 3 mappers actualizan casts

Sin breaking changes para consumers existentes (solo se agrega
campo opcional).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: `ParadaModal` rediseño — dropdown estricto + validaciones + sin `oc_reference`

**Goal:** Implementar el modal final per spec: ubicación elegida del dropdown filtrado o "Otra" → free-text, ≥1 línea afectada (no más colapsable), ≥1 attachment, sin OC reference.

**Files:**
- Modify: `src/components/viajes/ParadaModal.tsx` (rediseño completo del JSX + lógica + validaciones; ya está limpio de `stop_type`/`STOP_TYPES`/`oc_reference` en parte; resto del cleanup)
- Modify: `src/app/(app)/mis-viajes/[id]/page.tsx` (`handleParada` adapta a nuevo `ParadaData` sin prefijo OC en notes)

**Acceptance Criteria:**
- [ ] Modal Parada usa `<select>` (no `<input list>`) poblado de `trip.assignments[].line.{from,to}_location/text`
- [ ] Dropdown excluye entradas con `location_type === 'proyecto'` o `=== 'taller'` (lowercase)
- [ ] Entradas con `location_type === null` o `=== 'otro'` se incluyen
- [ ] Última opción del dropdown es "Otra ubicación (escribir libre)"
- [ ] Cuando se elige "Otra", aparece input free-text requerido debajo
- [ ] Cambiar de "Otra" a una opción del dropdown limpia el free-text
- [ ] Sección "Líneas afectadas" siempre visible (no colapsable)
- [ ] Validación bloquea submit si: ubicación vacía / ningún free-text con "Otra" / 0 líneas marcadas / 0 attachments
- [ ] Campo `Referencia OC` y prefijo `"OC: ..."` en `notes` ELIMINADOS
- [ ] `npm run build` pasa
- [ ] Modal abre, dropdown poblado, validaciones funcionan en runtime (verificación humana opcional)

**Verify:**
```bash
grep -n "ocReference\|oc_reference\|datalist\|STOP_TYPES" src/components/viajes/ParadaModal.tsx
# Expected: 0 matches
npm run build
# Expected: pasa
```

**Steps:**

- [ ] **Step 1: Reemplazar el cuerpo de `ParadaModal.tsx` completo**

El modal post-Task 2 tiene state limpio de `stopType`/`STOP_TYPES` pero conserva `ocReference`, `datalist`, `showLines` colapsable, validación liviana. Reescribir el archivo entero. Reemplazar `src/components/viajes/ParadaModal.tsx` por:

```tsx
'use client'

import { useState, useCallback, useMemo } from 'react'
import { MapPin, Wrench, Package } from 'lucide-react'
import type { TripWithRelations } from '@/hooks/useTrips'
import { Button } from '@/components/ui/Button'
import FileUploader from '@/components/ui/FileUploader'
import { formatQty } from '@/lib/utils/format'
import type { Attachment } from '@/lib/supabase/storage'

export interface ParadaData {
  location: string
  lines: { request_line_id: string; line_status: string; quantity: number; notes?: string }[]
  notes: string
  attachments: Attachment[]
}

interface ParadaModalProps {
  trip: TripWithRelations
  onConfirm: (data: ParadaData) => Promise<void>
  onClose: () => void
  loading: boolean
}

const LINE_STATUSES = [
  { value: 'completo', label: 'Completo' },
  { value: 'parcial', label: 'Parcial' },
  { value: 'no_disponible', label: 'No disponible' },
] as const

const OTHER_OPTION = '__OTHER__'

interface LocationOption {
  label: string
}

export function ParadaModal({ trip, onConfirm, onClose, loading }: ParadaModalProps) {
  // Selección del dropdown: '' (sin elegir), label de opción, o OTHER_OPTION
  const [selectedOption, setSelectedOption] = useState<string>('')
  // Free-text aplica solo cuando selectedOption === OTHER_OPTION
  const [freeText, setFreeText] = useState('')
  const [notes, setNotes] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [selectedLines, setSelectedLines] = useState<Record<string, { checked: boolean; status: string; notes: string }>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)

  // Construir opciones del dropdown desde las líneas del trip
  const dropdownOptions = useMemo<LocationOption[]>(() => {
    const seen = new Set<string>()
    const opts: LocationOption[] = []
    for (const a of trip.assignments) {
      const line = a.line
      if (!line) continue
      // from
      const fromLabel = line.from_location?.name ?? line.from_text
      const fromType = line.from_location?.location_type ?? null
      if (fromLabel && fromType !== 'proyecto' && fromType !== 'taller') {
        if (!seen.has(fromLabel)) {
          seen.add(fromLabel)
          opts.push({ label: fromLabel })
        }
      }
      // to
      const toLabel = line.to_location?.name ?? line.to_text
      const toType = line.to_location?.location_type ?? null
      if (toLabel && toType !== 'proyecto' && toType !== 'taller') {
        if (!seen.has(toLabel)) {
          seen.add(toLabel)
          opts.push({ label: toLabel })
        }
      }
    }
    return opts
  }, [trip.assignments])

  // Calcular ubicación final y errores de validación
  const finalLocation =
    selectedOption === OTHER_OPTION ? freeText.trim() : selectedOption
  const checkedLineEntries = Object.entries(selectedLines).filter(([, v]) => v.checked)
  const linesValid = checkedLineEntries.length >= 1
  const attachmentsValid = attachments.length >= 1
  const locationValid = finalLocation.length > 0

  const canConfirm = locationValid && linesValid && attachmentsValid && !loading

  const handleSelectChange = useCallback((value: string) => {
    setSelectedOption(value)
    if (value !== OTHER_OPTION) {
      // Limpiar free-text al volver al dropdown (E2 confirmado)
      setFreeText('')
    }
  }, [])

  const handleLineToggle = useCallback((lineId: string, checked: boolean) => {
    setSelectedLines(prev => ({
      ...prev,
      [lineId]: { ...prev[lineId], checked, status: prev[lineId]?.status || 'completo', notes: prev[lineId]?.notes || '' },
    }))
  }, [])

  const handleLineStatusChange = useCallback((lineId: string, status: string) => {
    setSelectedLines(prev => ({
      ...prev,
      [lineId]: { ...prev[lineId], status },
    }))
  }, [])

  const handleLineNotesChange = useCallback((lineId: string, lineNotes: string) => {
    setSelectedLines(prev => ({
      ...prev,
      [lineId]: { ...prev[lineId], notes: lineNotes },
    }))
  }, [])

  const handleConfirm = useCallback(async () => {
    setSubmitAttempted(true)
    if (!canConfirm) return

    const checkedLines = checkedLineEntries.map(([id, v]) => {
      const assignment = trip.assignments.find(a => a.request_line_id === id)
      return {
        request_line_id: id,
        line_status: v.status,
        quantity: assignment?.quantity_assigned ?? 0,
        notes: v.notes.trim() || undefined,
      }
    })

    await onConfirm({
      location: finalLocation,
      lines: checkedLines,
      notes: notes.trim(),
      attachments,
    })
  }, [canConfirm, checkedLineEntries, finalLocation, notes, attachments, trip.assignments, onConfirm])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-cyan-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Parada Intermedia — {trip.trip_id}
          </h3>
        </div>

        <div className="space-y-4">
          {/* Ubicación */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Ubicación <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedOption}
              onChange={(e) => handleSelectChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="">Seleccionar...</option>
              {dropdownOptions.map((opt) => (
                <option key={opt.label} value={opt.label}>📍 {opt.label}</option>
              ))}
              <option value={OTHER_OPTION}>✏️ Otra ubicación (escribir libre)</option>
            </select>
            {selectedOption === OTHER_OPTION && (
              <input
                type="text"
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                placeholder="Escriba la ubicación"
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            )}
            {submitAttempted && !locationValid && (
              <p className="mt-1 text-xs text-red-600">La ubicación es requerida.</p>
            )}
          </div>

          {/* Líneas afectadas (siempre visible, requeridas ≥1) */}
          <div className="rounded-lg border border-gray-200">
            <div className="px-3 py-2 text-sm font-medium text-gray-700 border-b border-gray-200 bg-gray-50">
              Líneas afectadas <span className="text-red-500">*</span>
              <span className="ml-1 text-xs font-normal text-gray-500">(marcar al menos una)</span>
            </div>
            <div className="space-y-2 p-3">
              {trip.assignments.length === 0 && (
                <p className="text-sm italic text-gray-500">El viaje no tiene líneas asignadas.</p>
              )}
              {trip.assignments.map((a) => {
                const lineState = selectedLines[a.request_line_id]
                return (
                  <div key={a.request_line_id} className="space-y-1">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        data-testid={`parada-line-${a.request_line_id}`}
                        checked={lineState?.checked ?? false}
                        onChange={(e) => handleLineToggle(a.request_line_id, e.target.checked)}
                        className="accent-cyan-600"
                      />
                      {a.line?.line_type === 'Equipo' ? (
                        <Wrench className="h-3.5 w-3.5 shrink-0 text-iconsa-blue" />
                      ) : (
                        <Package className="h-3.5 w-3.5 shrink-0 text-iconsa-gold" />
                      )}
                      <span className="flex-1 text-sm text-gray-700 truncate">
                        {a.line?.description ?? 'Línea'}
                      </span>
                      <span className="text-xs text-iconsa-gray">
                        {formatQty(a.quantity_assigned)} {a.line?.unit?.code ?? ''}
                      </span>
                    </label>
                    {lineState?.checked && (
                      <div className="ml-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                        <select
                          value={lineState.status}
                          onChange={(e) => handleLineStatusChange(a.request_line_id, e.target.value)}
                          className="rounded border border-gray-300 px-2 py-1 text-xs focus:border-cyan-500 focus:outline-none"
                        >
                          {LINE_STATUSES.map((ls) => (
                            <option key={ls.value} value={ls.value}>{ls.label}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={lineState.notes}
                          onChange={(e) => handleLineNotesChange(a.request_line_id, e.target.value)}
                          placeholder="Notas (ej: faltan 65 tubos)"
                          className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs placeholder:text-gray-400 focus:border-cyan-500 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            {submitAttempted && !linesValid && (
              <p className="px-3 py-2 text-xs text-red-600 border-t border-gray-200">
                Marcar al menos una línea afectada.
              </p>
            )}
          </div>

          {/* Foto de factura (requerida ≥1) */}
          <div>
            <FileUploader
              attachments={attachments}
              folder={`events/${trip.id}`}
              onChange={setAttachments}
              label={
                <>
                  Foto de factura <span className="text-red-500">*</span>
                </>
              }
              hint="Foto / PDF (max 10MB). Al menos 1 archivo requerido."
            />
            {submitAttempted && !attachmentsValid && (
              <p className="mt-1 text-xs text-red-600">Subir al menos un archivo (foto de factura).</p>
            )}
          </div>

          {/* Notas generales (opcional) */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Notas generales (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Material parcial, restan 65 tubos PVC para el jueves"
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <Button variant="primary" onClick={handleConfirm} loading={loading} disabled={loading}>
            Registrar Parada
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  )
}
```

Notas de implementación:
- Botón Confirmar `disabled={loading}` (no `!canConfirm`) — para que se pueda clickear y dispare validaciones (`setSubmitAttempted(true)`). El `if (!canConfirm) return` adentro evita el submit inválido. Esto da feedback visible.
- `OTHER_OPTION = '__OTHER__'` constante para evitar colisión con label de proveedor real.
- Dropdown deduplicación por `seen` set sobre label (per Q4 confirmado: dedup por label).

- [ ] **Step 2: Verificar que `FileUploader` acepta `label` como `ReactNode`**

Si `FileUploader` espera `label?: string`, hay que envolver el JSX `<>... <span>*</span></>` en un cambio de tipo. Leer `src/components/ui/FileUploader.tsx` para confirmar. Si no acepta `ReactNode`, usar:
```tsx
label="Foto de factura *"
hint="Foto / PDF (max 10MB). Al menos 1 archivo requerido."
```
y dejar el asterisco como string. Es funcional pero pierde el rojo del span. Trade-off aceptable si no queremos modificar `FileUploader`.

- [ ] **Step 3: Actualizar `handleParada` en `mis-viajes/[id]/page.tsx`**

El handler actual en líneas 1124-1172 ya está limpio de `stop_type` post-Task 2. Pero el nuevo `ParadaData` ya no tiene `lines?: ...` opcional — ahora `lines` es requerido y siempre array. Verificar que la rama `if (data.lines && data.lines.length > 0)` sigue funcionando correctamente: con `lines.length >= 1` por validación, siempre entra. Cambiar la condicional a:
```ts
// data.lines siempre tiene ≥1 (validado en modal)
const { error: lineError } = await supabase.from('trip_event_lines').insert(
  data.lines.map((l) => ({
    trip_event_id: event.id,
    request_line_id: l.request_line_id,
    quantity: l.quantity,
    line_status: l.line_status,
  }))
)
if (lineError) throw lineError
```
(Eliminar el `if (data.lines && data.lines.length > 0)` wrap.)

- [ ] **Step 4: Verificar build**

```bash
npm run build
```
Expected: pasa.

- [ ] **Step 5: Verificar grep**

```bash
grep -n "ocReference\|oc_reference\|datalist\|STOP_TYPES" src/components/viajes/ParadaModal.tsx
```
Expected: 0 matches.

- [ ] **Step 6: Commit**

```bash
git add src/components/viajes/ParadaModal.tsx src/app/\(app\)/mis-viajes/\[id\]/page.tsx
git commit -m "feat: ParadaModal — dropdown estricto + validaciones requeridas

Rediseño completo del modal Parada per spec Cambio 1:
- <select> reemplaza <input list=datalist> (estandarización)
- Dropdown poblado de trip.assignments excluyendo location_type
  'proyecto' y 'taller' (lowercase)
- Opción 'Otra ubicación' abre free-text condicional
- Cambio de Otra a opción del dropdown limpia el free-text (E2)
- Líneas afectadas: requeridas ≥1, siempre visibles (no colapsable)
- Foto de factura: requerida ≥1
- Eliminado campo Referencia OC y prefijo OC: ... en notes
- Validaciones bloquean submit con mensajes inline

handleParada en mis-viajes simplificado: data.lines siempre tiene
≥1 elemento por validación, sin guard condicional.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Helper `registerParada` + tests `parada-complete.spec.ts`

**Goal:** Reescribir el helper de tests para el nuevo flow, y reemplazar los tests legacy con casos cubriendo: dropdown poblado, filtro por location_type, free-text "Otra", validaciones bloqueantes (3), happy paths.

**Files:**
- Modify: `tests/helpers.ts` (helper `registerParada` líneas 358-384)
- Rewrite: `tests/parada-complete.spec.ts`

**Acceptance Criteria:**
- [ ] Helper `registerParada` acepta `{ location?: string, useOther?: boolean, freeText?: string, lineIds?: string[], lineStatus?: 'completo'|'parcial'|'no_disponible', filePath?: string, notes?: string }`
- [ ] Helper sin parámetro `stopType`
- [ ] `parada-complete.spec.ts` cubre: dropdown poblado correcto, filtro por location_type, free-text "Otra" + validación, 3 validaciones bloqueantes (sin ubicación, sin línea, sin attachment), 1 happy path con dropdown, 1 happy path con free-text
- [ ] Tests usan `attachments` reales (path a fixture) — NO simular el upload con `setInputFiles`
- [ ] Suite `parada-complete.spec.ts` corre verde standalone (Playwright). NOTA: no correr; solo diseñar (regla #4 del master spec).

**Verify:**
```bash
grep -n "stopType\|stop_type" tests/parada-complete.spec.ts tests/helpers.ts
# Expected: 0 matches en ambos archivos
```

**Steps:**

- [ ] **Step 1: Reescribir helper `registerParada` en `tests/helpers.ts`**

Reemplazar líneas 358-384 (la función `registerParada`):

```ts
// --- Register Parada ---
/**
 * Registra una Parada en el trip detail page.
 *
 * - Si `useOther=true`: selecciona "Otra ubicación" y rellena `freeText`.
 * - Si `useOther=false`: selecciona `location` del dropdown.
 * - `lineIds`: ids de líneas a marcar (≥1 requerido por el nuevo modal).
 * - `filePath`: path absoluto a archivo a subir (≥1 requerido).
 * - `notes`: opcional, notas generales.
 */
export async function registerParada(
  page: Page,
  opts: {
    location?: string
    useOther?: boolean
    freeText?: string
    lineIds: string[]
    lineStatus?: 'completo' | 'parcial' | 'no_disponible'
    filePath: string
    notes?: string
  },
) {
  await page.getByRole('button', { name: 'Registrar Parada' }).first().click()
  await page.waitForTimeout(500)

  // Ubicación
  const locationSelect = page.locator('select').first()
  if (opts.useOther) {
    await locationSelect.selectOption({ value: '__OTHER__' })
    const freeTextInput = page.locator('input[placeholder="Escriba la ubicación"]')
    await freeTextInput.fill(opts.freeText ?? '')
  } else {
    if (!opts.location) throw new Error('registerParada: location requerido cuando useOther=false')
    await locationSelect.selectOption({ label: new RegExp(opts.location) })
  }

  // Líneas afectadas — usar data-testid={parada-line-{lineId}} agregado en ParadaModal Task 4
  for (const lineId of opts.lineIds) {
    await page.getByTestId(`parada-line-${lineId}`).check()
  }

  // Status de línea (aplicado a todas las marcadas — simplificación)
  if (opts.lineStatus && opts.lineStatus !== 'completo') {
    const statusSelects = page.locator('select').nth(1) // primer status select tras location
    await statusSelects.selectOption(opts.lineStatus)
  }

  // Foto de factura
  const fileInput = page.locator('input[type="file"]').first()
  await fileInput.setInputFiles(opts.filePath)
  await page.waitForTimeout(800) // esperar upload

  // Notas
  if (opts.notes) {
    await page.locator('textarea').last().fill(opts.notes)
  }

  // Confirm — modal's "Registrar Parada" button (2nd button con ese name)
  await page.getByRole('button', { name: 'Registrar Parada' }).nth(1).click()
  await page.waitForTimeout(3000)
}
```

NOTA importante: el `getByRole('checkbox').nth(opts.lineIds.indexOf(lineId))` es frágil — depende del orden DOM. Para un test robusto, agregar `data-testid={`parada-line-${lineId}`}` al checkbox del modal y usar `page.getByTestId(...)`. **Decisión:** Tarea 5 incluye agregar `data-testid` en el modal solo si el approach simple falla en pruebas.

- [ ] **Step 2: Reescribir `tests/parada-complete.spec.ts` completo**

Reemplazar el archivo entero por:

```ts
/**
 * Parada (Intermediate Stop) Tests — Cambio 1 redesign.
 * Cubre: dropdown poblado y filtrado, free-text "Otra", 3 validaciones
 * bloqueantes, happy paths con dropdown y con free-text.
 *
 * Run: npx playwright test tests/parada-complete.spec.ts
 */

import { test, expect, type Page } from '@playwright/test'
import path from 'node:path'
import {
  db,
  login,
  createSolicitud,
  createTrip,
  openTripDetail,
  dispatch,
  registerParada,
  cleanupSolicitud,
} from './helpers'

const FIXTURE_FILE = path.resolve(__dirname, 'fixtures', 'sample-invoice.pdf')

test.describe.serial('Parada Intermediate Stop (Cambio 1 redesign)', () => {
  let page: Page
  let solicitudId: string
  let tripDbId: string
  let lineIdsByDescription: Record<string, string> = {}

  test.setTimeout(180000)

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    await login(page)

    // Solicitud con 2 líneas: una con from='TUBOTEC' (proveedor free-text), otra con to='Muelle 14' (proyecto)
    const sol = await createSolicitud(page, {
      lines: [
        {
          type: 'Material',
          description: 'TEST-PARADA Tubos PVC',
          from: 'TUBOTEC SA',
          to: { dropdown: /Muelle 14/ },
          quantity: 100,
          unit: /und/,
        },
        {
          type: 'Equipo',
          equipmentSearch: 'AND',
          from: { dropdown: /Taller Chilibre/ },
          to: { dropdown: /Muelle 14/ },
        },
      ],
    })
    solicitudId = sol.dbId

    const trip = await createTrip(page, { solicitudId })
    tripDbId = trip.dbId
    await openTripDetail(page, tripDbId)
    await dispatch(page)

    // Cargar lineIds desde BD para usarlos en helpers
    const { data: lines } = await db
      .from('sm_request_lines')
      .select('id, description')
      .eq('request_id', solicitudId)
    lineIdsByDescription = (lines ?? []).reduce<Record<string, string>>((acc, l) => {
      acc[l.description] = l.id
      return acc
    }, {})
  })

  test.afterAll(async () => {
    if (solicitudId) await cleanupSolicitud(solicitudId).catch(() => {})
    await page.close()
  })

  // --- Dropdown contents ---

  test('Dropdown del modal Parada se puebla de las líneas del trip', async () => {
    await page.getByRole('button', { name: 'Registrar Parada' }).first().click()
    await page.waitForTimeout(500)

    const select = page.locator('select').first()
    const options = await select.locator('option').allTextContents()

    // Debe estar 'TUBOTEC SA' (from_text de la línea Material — sin location_type, pasa)
    expect(options.some(o => o.includes('TUBOTEC SA'))).toBe(true)

    // NO debe estar 'Muelle 14' (location_type='proyecto', filtrado)
    expect(options.some(o => o.includes('Muelle 14'))).toBe(false)

    // NO debe estar 'Taller Chilibre' (location_type='taller', filtrado)
    expect(options.some(o => o.includes('Taller Chilibre'))).toBe(false)

    // Última opción debe ser 'Otra ubicación'
    expect(options[options.length - 1]).toContain('Otra ubicación')

    // Cancelar para no interferir con tests siguientes
    await page.getByRole('button', { name: 'Cancelar' }).click()
    await page.waitForTimeout(300)
  })

  // --- Validaciones bloqueantes ---

  test('Submit bloqueado sin ubicación', async () => {
    await page.getByRole('button', { name: 'Registrar Parada' }).first().click()
    await page.waitForTimeout(500)

    // Seleccionar línea via data-testid robusto
    const someLineId = lineIdsByDescription['TEST-PARADA Tubos PVC']
    await page.getByTestId(`parada-line-${someLineId}`).check()
    // Subir archivo
    await page.locator('input[type="file"]').first().setInputFiles(FIXTURE_FILE)
    await page.waitForTimeout(500)
    // Click submit sin location
    await page.getByRole('button', { name: 'Registrar Parada' }).nth(1).click()
    await page.waitForTimeout(500)

    // Mensaje de error visible
    await expect(page.getByText('La ubicación es requerida.')).toBeVisible()

    // No se creó evento Parada en BD
    const { data: events } = await db
      .from('trip_events')
      .select('event_type')
      .eq('trip_id', tripDbId)
      .eq('event_type', 'Parada')
    expect(events ?? []).toHaveLength(0)

    await page.getByRole('button', { name: 'Cancelar' }).click()
    await page.waitForTimeout(300)
  })

  test('Submit bloqueado sin líneas marcadas', async () => {
    await page.getByRole('button', { name: 'Registrar Parada' }).first().click()
    await page.waitForTimeout(500)

    // Seleccionar location del dropdown
    await page.locator('select').first().selectOption({ label: /TUBOTEC/ })
    // Subir archivo
    await page.locator('input[type="file"]').first().setInputFiles(FIXTURE_FILE)
    await page.waitForTimeout(500)
    // Click submit sin marcar líneas
    await page.getByRole('button', { name: 'Registrar Parada' }).nth(1).click()
    await page.waitForTimeout(500)

    await expect(page.getByText('Marcar al menos una línea afectada.')).toBeVisible()

    const { data: events } = await db
      .from('trip_events')
      .select('event_type')
      .eq('trip_id', tripDbId)
      .eq('event_type', 'Parada')
    expect(events ?? []).toHaveLength(0)

    await page.getByRole('button', { name: 'Cancelar' }).click()
    await page.waitForTimeout(300)
  })

  test('Submit bloqueado sin attachment', async () => {
    await page.getByRole('button', { name: 'Registrar Parada' }).first().click()
    await page.waitForTimeout(500)

    await page.locator('select').first().selectOption({ label: /TUBOTEC/ })
    const someLineId = lineIdsByDescription['TEST-PARADA Tubos PVC']
    await page.getByTestId(`parada-line-${someLineId}`).check()
    // No subir archivo
    await page.getByRole('button', { name: 'Registrar Parada' }).nth(1).click()
    await page.waitForTimeout(500)

    await expect(page.getByText('Subir al menos un archivo')).toBeVisible()

    const { data: events } = await db
      .from('trip_events')
      .select('event_type')
      .eq('trip_id', tripDbId)
      .eq('event_type', 'Parada')
    expect(events ?? []).toHaveLength(0)

    await page.getByRole('button', { name: 'Cancelar' }).click()
    await page.waitForTimeout(300)
  })

  // --- Happy paths ---

  test('Happy path: Parada con dropdown + 1 línea + 1 attachment', async () => {
    await registerParada(page, {
      location: 'TUBOTEC',
      lineIds: [lineIdsByDescription['TEST-PARADA Tubos PVC']],
      lineStatus: 'parcial',
      filePath: FIXTURE_FILE,
      notes: 'Retiro parcial 35 tubos',
    })

    await expect(page.getByText('Parada').first()).toBeVisible()
    await expect(page.getByText('TUBOTEC').first()).toBeVisible()

    const { data: events } = await db
      .from('trip_events')
      .select('event_type, location, notes')
      .eq('trip_id', tripDbId)
      .eq('event_type', 'Parada')

    expect((events ?? []).length).toBeGreaterThanOrEqual(1)
    const parada = events![0]
    expect(parada.location).toContain('TUBOTEC')
    expect(parada.notes).toContain('Retiro parcial')
  })

  test('Happy path: Parada con free-text "Otra ubicación"', async () => {
    await registerParada(page, {
      useOther: true,
      freeText: 'Mini-super La Esquina',
      lineIds: [lineIdsByDescription['TEST-PARADA Tubos PVC']],
      lineStatus: 'completo',
      filePath: FIXTURE_FILE,
      notes: 'Imprevisto en ruta',
    })

    const { data: events } = await db
      .from('trip_events')
      .select('event_type, location')
      .eq('trip_id', tripDbId)
      .eq('event_type', 'Parada')
      .order('event_timestamp', { ascending: false })

    expect((events ?? [])[0]?.location).toContain('Mini-super La Esquina')
  })

  // --- BD invariants ---

  test('BD: Líneas no cambian status tras Parada (informational)', async () => {
    const { data: assignments } = await db
      .from('trip_line_assignments')
      .select('request_line_id')
      .eq('trip_id', tripDbId)

    for (const a of assignments ?? []) {
      const { data: line } = await db
        .from('sm_request_lines')
        .select('status')
        .eq('id', a.request_line_id)
        .single()
      expect(line!.status).toBe('En Transito')
    }
  })

  test('BD: Trip sigue En Ruta tras Parada', async () => {
    const { data: trip } = await db
      .from('trips')
      .select('status')
      .eq('id', tripDbId)
      .single()
    expect(trip!.status).toBe('En Ruta')
  })

  test('BD: trip_event_lines registró líneas afectadas', async () => {
    const { data: paradas } = await db
      .from('trip_events')
      .select('id')
      .eq('trip_id', tripDbId)
      .eq('event_type', 'Parada')
      .order('event_timestamp')

    expect((paradas ?? []).length).toBeGreaterThanOrEqual(2)
    for (const p of paradas ?? []) {
      const { data: tel } = await db
        .from('trip_event_lines')
        .select('request_line_id, line_status')
        .eq('trip_event_id', p.id)
      expect((tel ?? []).length).toBeGreaterThanOrEqual(1)
    }
  })
})
```

NOTA: Este test asume que existe `tests/fixtures/sample-invoice.pdf`. Si no existe, **agregarlo en `tests/fixtures/`** como parte de este step (cualquier PDF chico válido sirve). Verificar via `ls tests/fixtures/`.

- [ ] **Step 3: Verificar fixture y crear si no existe**

```bash
ls tests/fixtures/ 2>/dev/null
```
Si `sample-invoice.pdf` no existe, copiar uno existente:
```bash
ls tests/fixtures/*.pdf 2>/dev/null
# Si hay otro PDF: cp tests/fixtures/<existente>.pdf tests/fixtures/sample-invoice.pdf
# Si no hay ninguno: crear el directorio y agregar un fixture mínimo
mkdir -p tests/fixtures
# Generar PDF mínimo con bash (16 bytes — es un PDF "vacío" válido para testing):
printf '%%PDF-1.4\n%%%%EOF\n' > tests/fixtures/sample-invoice.pdf
```

- [ ] **Step 4: Verificar grep**

```bash
grep -n "stopType\|stop_type" tests/parada-complete.spec.ts tests/helpers.ts
```
Expected: 0 matches.

- [ ] **Step 5: Commit**

```bash
git add tests/helpers.ts tests/parada-complete.spec.ts tests/fixtures/sample-invoice.pdf
git commit -m "test: parada-complete reescrito + helper para nuevo modal

Helper registerParada:
- Sin parámetro stopType (eliminado del modelo)
- Acepta location o useOther+freeText
- Acepta lineIds (≥1 requerido) y lineStatus
- Acepta filePath (attachment requerido)

parada-complete.spec.ts cubre:
- Dropdown poblado correctamente desde trip lines
- Filtro de location_type='proyecto'/'taller' (excluye Muelle, Taller)
- 3 validaciones bloqueantes (sin ubicación, sin línea, sin attachment)
- Happy path con dropdown
- Happy path con free-text 'Otra ubicación'
- BD invariants (líneas y trip no cambian status)

Fixture tests/fixtures/sample-invoice.pdf agregado (PDF mínimo).

Tests diseñados, no corridos (regla #4 master spec).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Regression tests update

**Goal:** Actualizar otros tests E2E que llaman `registerParada` con el viejo `stopType` o asertan `stop_type` en BD, para que sigan pasando con el nuevo modelo.

**Files:**
- Modify: `tests/e2e-full-flow.spec.ts` (tests 4.5, 4.6, 4.7, 5.2)
- Modify: `tests/reversion-complete.spec.ts` (línea 224, llamada a `registerParada`)
- Modify: `tests/retorno-complete.spec.ts` (líneas 183-184, 2 llamadas)

**Acceptance Criteria:**
- [ ] `grep -n "stopType\|stop_type" tests/` retorna 0 matches
- [ ] `tests/e2e-full-flow.spec.ts` test 4.5 usa el nuevo modal (select + line check + attachment) en lugar de input+radios
- [ ] `tests/e2e-full-flow.spec.ts` test 4.6 SELECT no incluye `stop_type`, no asserta sobre él
- [ ] `tests/e2e-full-flow.spec.ts` test 5.2 SELECT no incluye `stop_type`
- [ ] `tests/reversion-complete.spec.ts:224` llama a `registerParada` con shape nuevo (lineIds, filePath)
- [ ] `tests/retorno-complete.spec.ts:183-184` llama a `registerParada` con shape nuevo

**Verify:**
```bash
grep -rn "stopType\|stop_type" tests/
# Expected: 0 matches
```

**Steps:**

- [ ] **Step 1: Actualizar `tests/e2e-full-flow.spec.ts` test 4.5**

Reemplazar líneas 476-504 (todo el test `4.5 Register Parada at TUBOTEC`):

```ts
test('4.5 Register Parada at TUBOTEC', async () => {
  await page.getByRole('button', { name: /Parada/ }).first().click()
  await page.waitForTimeout(500)
  await snap(page, 'e2e-14-parada-modal')

  // Verify modal title
  await expect(page.getByText('Parada Intermedia')).toBeVisible()

  // Seleccionar location del dropdown
  const locationSelect = page.locator('select').first()
  await locationSelect.selectOption({ label: /TUBOTEC/ })

  // Marcar primera línea
  await page.getByRole('checkbox').first().check()

  // Subir attachment
  const FIXTURE = path.resolve(__dirname, 'fixtures', 'sample-invoice.pdf')
  await page.locator('input[type="file"]').first().setInputFiles(FIXTURE)
  await page.waitForTimeout(800)

  // Add notes
  const notesArea = page.locator('textarea').last()
  await notesArea.fill('Retiro parcial - faltan 65 tubos PVC, disponibles el jueves')

  await snap(page, 'e2e-15-parada-filled')

  // Submit
  await page.getByRole('button', { name: 'Registrar Parada' }).nth(1).click()
  await page.waitForTimeout(3000)
  await snap(page, 'e2e-16-after-parada')

  // Verify in timeline
  await expect(page.getByText('Parada').first()).toBeVisible()
  await expect(page.getByText('TUBOTEC').first()).toBeVisible()
})
```

Asegurarse de que `import path from 'node:path'` esté presente al inicio del archivo. Si no, agregarlo.

- [ ] **Step 2: Actualizar `tests/e2e-full-flow.spec.ts` test 4.6**

Reemplazar el SELECT en líneas 508-516:

```ts
test('4.6 BD: Parada event created, trip still En Ruta', async () => {
  // Verify Parada event exists
  const { data: events } = await db
    .from('trip_events')
    .select('event_type, location, notes')
    .eq('trip_id', tripDbId)
    .eq('event_type', 'Parada')

  expect(events!.length).toBeGreaterThanOrEqual(1)
  expect(events![0].location).toContain('TUBOTEC')
  // (assertion sobre stop_type eliminada — ya no existe)

  // Trip should still be En Ruta (Parada doesn't change status)
  // ... resto del test sin cambios
```

- [ ] **Step 3: Actualizar `tests/e2e-full-flow.spec.ts` test 4.7**

Localizar el test 4.7 `Register second Parada at FEINSA` (línea 541 aprox). El test ya hace click en `getByRole('button', { name: 'Registrar Parada' }).nth(1)` para submit, lo cual sigue funcionando. Pero el flujo de fill probablemente usaba un placeholder de TUBOTEC + radio. Reescribirlo igual que test 4.5 pero con FEINSA:

Buscar el bloque entre `await paradaBtn.click()` (línea 545 aprox) y el submit (línea 551 aprox). Reemplazar por:

```ts
await page.locator('select').first().selectOption({ value: '__OTHER__' })
await page.locator('input[placeholder="Escriba la ubicación"]').fill('FEINSA SA')
await page.getByRole('checkbox').first().check()
const FIXTURE = path.resolve(__dirname, 'fixtures', 'sample-invoice.pdf')
await page.locator('input[type="file"]').first().setInputFiles(FIXTURE)
await page.waitForTimeout(800)
await page.locator('textarea').last().fill('Entrega parcial')
await page.getByRole('button', { name: 'Registrar Parada' }).nth(1).click()
await page.waitForTimeout(3000)
```

- [ ] **Step 4: Actualizar `tests/e2e-full-flow.spec.ts` test 5.2**

Línea 669 `.select('event_type, location, stop_type')` → `.select('event_type, location')`.

- [ ] **Step 5: Actualizar `tests/reversion-complete.spec.ts:224`**

Línea 224:
```ts
await registerParada(page, { location: 'PROVEEDOR TEST', stopType: 'retiro', notes: 'Will revert' })
```
Cambiar a (necesita lineIds + filePath para nuevo modal):

```ts
const FIXTURE = path.resolve(__dirname, 'fixtures', 'sample-invoice.pdf')
const { data: lines } = await db
  .from('sm_request_lines')
  .select('id')
  .eq('request_id', solicitudId)
  .limit(1)
await registerParada(page, {
  useOther: true,
  freeText: 'PROVEEDOR TEST',
  lineIds: [lines![0].id],
  filePath: FIXTURE,
  notes: 'Will revert',
})
```
Verificar que `solicitudId` está en scope (probablemente sí). Agregar `import path from 'node:path'` si falta.

- [ ] **Step 6: Actualizar `tests/retorno-complete.spec.ts:183-184`**

Líneas 183-184:
```ts
await registerParada(page, { location: 'PROVEEDOR X', stopType: 'retiro', notes: 'Pickup completo' })
await registerParada(page, { location: 'Bodega Temp', stopType: 'entrega', notes: 'Drop temporal' })
```
Cambiar a:

```ts
const FIXTURE = path.resolve(__dirname, 'fixtures', 'sample-invoice.pdf')
const { data: lines } = await db
  .from('sm_request_lines')
  .select('id')
  .eq('request_id', solicitudId)
await registerParada(page, {
  useOther: true,
  freeText: 'PROVEEDOR X',
  lineIds: [lines![0].id],
  filePath: FIXTURE,
  notes: 'Pickup completo',
})
await registerParada(page, {
  useOther: true,
  freeText: 'Bodega Temp',
  lineIds: [lines![0].id],
  filePath: FIXTURE,
  notes: 'Drop temporal',
})
```
Agregar `import path from 'node:path'` si falta.

- [ ] **Step 7: Verificar grep final**

```bash
grep -rn "stopType\|stop_type" tests/
```
Expected: 0 matches.

- [ ] **Step 8: Commit**

```bash
git add tests/e2e-full-flow.spec.ts tests/reversion-complete.spec.ts tests/retorno-complete.spec.ts
git commit -m "test: regression Parada — eliminar stop_type assertions y migrar callsites

Tests E2E que tocaban Parada actualizados al nuevo modelo:
- e2e-full-flow.spec.ts tests 4.5, 4.6, 4.7, 5.2
- reversion-complete.spec.ts:224
- retorno-complete.spec.ts:183-184

Cambios: helper registerParada llamado con nueva firma
(useOther/freeText/lineIds/filePath en lugar de stopType), y
SELECTs de BD sin columna stop_type.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Final verification (no commit)

**Goal:** Confirmar que el codebase quedó consistente después de los 6 commits.

**Files:** N/A (solo verificación)

**Acceptance Criteria:**
- [ ] `npm run build` pasa
- [ ] `grep -rn "stop_type" src/ tests/` retorna 0 matches
- [ ] `grep -rn "ocReference\|oc_reference" src/ tests/` retorna 0 matches
- [ ] `grep -rn "stopType" src/ tests/` retorna 0 matches
- [ ] `grep -rn "STOP_TYPES" src/ tests/` retorna 0 matches
- [ ] `git log --oneline jaime/dev` muestra 6 commits del Cambio 1
- [ ] No hay archivos modificados sin commit

**Steps:**

- [ ] **Step 1: Build final**

```bash
npm run build
```
Expected: build pasa sin warnings nuevos. Reportar cualquier error y resolver antes de cerrar.

- [ ] **Step 2: Grep regression final**

```bash
grep -rn "stop_type\|stopType\|STOP_TYPES\|ocReference\|oc_reference" src/ tests/
```
Expected: 0 matches en todos.

- [ ] **Step 3: Verificar commits del Cambio 1**

```bash
git log --oneline jaime/dev | head -10
```
Expected: top 6 commits son los del plan, en orden:
1. `test: regression Parada — eliminar stop_type assertions y migrar callsites`
2. `test: parada-complete reescrito + helper para nuevo modal`
3. `feat: ParadaModal — dropdown estricto + validaciones requeridas`
4. `feat: useTrips trae location_type en from_location/to_location`
5. `refactor: eliminar stop_type del modelo Parada`
6. `docs: spec v3.1 + CHANGELOG — Cambio 1 BD applied + lowercase fix`

- [ ] **Step 4: Status limpio**

```bash
git status
```
Expected: working tree clean.

- [ ] **Step 5: Reportar a James**

Output format:
```
Cambio 1 completo. 6 commits en jaime/dev.

Hashes:
- <hash> docs: spec v3.1 + CHANGELOG
- <hash> refactor: eliminar stop_type del modelo
- <hash> feat: useTrips location_type
- <hash> feat: ParadaModal redesign
- <hash> test: parada-complete reescrito
- <hash> test: regression Parada

Build verde. grep stop_type/oc_reference: 0 matches.

Tests diseñados (regla #4): 9 tests en parada-complete.spec.ts cubriendo
dropdown, filtros, 3 validaciones, 2 happy paths, 3 BD invariants.

Pendientes para James:
- Push a remote (Code no pushea)
- Smoke test E2E manual o correr `npx playwright test tests/parada-complete.spec.ts`
- Cuando llegue el merge final v2: aplicar `DROP COLUMN stop_type` en prod
- Decisiones AD-1, custody_transfers, etc. quedan para futuros cambios
```

---

## Self-Review (writing-plans)

**Spec coverage check:**
- ✅ Master Sección 3 Cambio 1 modal final → Task 4
- ✅ Master Sección 3 Cambio 1 lógica del dropdown → Task 4 step 1 (con filtro lowercase per Decisión 24)
- ✅ Master Sección 3 Cambio 1 validaciones → Task 4 step 1 (líneas, attachment, ubicación)
- ✅ Master Sección 3 Cambio 1 BD changes → Task 1 (doc update, ya aplicado por Chat)
- ✅ Master Sección 3 Cambio 1 código → Task 2, 3, 4
- ✅ James: actualizar doc maestro v3.1 → Task 1
- ✅ James: CHANGELOG entry → Task 1
- ✅ James: extender useTrips → Task 3
- ✅ James: filtro lowercase → Task 4 step 1
- ✅ James: tests dropdown filtrado, free-text, validaciones, happy paths → Task 5
- ✅ James: grep regression para stop_type → Task 7
- ✅ Brainstorming clarifications spec (lowercase, useTrips, oc_reference, EventTimeline) → Task 1, 2, 3

**Placeholder scan:**
- Sin "TBD", "TODO", "implement later".
- Steps tienen código completo.
- Excepción: Task 5 step 1 helper tiene NOTA sobre `data-testid` opcional como fallback — describe condición concreta de cuándo aplicar, no es "fix later".

**Type consistency check:**
- `ParadaData` interface: definida en Task 2 step 8(a) y Task 4 step 1 — consistentes (sin `stop_type`, sin `oc_reference`, `lines` requerido).
- `TripAssignment['line']['from_location']` y `to_location`: extendidos en Task 3 step 2 con `location_type: string | null` — consistente con uso en Task 4 step 1 (`a.line.from_location?.location_type`).
- `LocationOption`: definido en Task 4 step 1 dentro del modal, no exportado. OK.
- `OTHER_OPTION = '__OTHER__'`: usado consistentemente en Task 4 step 1 (modal) y Task 5 step 1 (helper) y Task 6 step 3 (regression test 4.7).

**Out-of-scope cleanup verificado:**
- Task 2 incluye eliminación de `oc_reference` del tipo y prefijo en notes — completo en Task 4. Task 2 trae el cleanup parcial (tipo) y Task 4 cierra (UI + handler).
- D8 (PM no botón Incidencia): explícitamente no tocado.
- Notificaciones: explícitamente no tocadas.

Todo coherente. Plan listo para ejecución.
