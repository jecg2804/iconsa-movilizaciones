# ActiveTripPanel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extraer un nuevo componente `<ActiveTripPanel>` que consolida la vista operativa del trip activo (header, metadata, líneas en movimiento, mapa en vivo, código de verificación, botón Confirmar Recepción) arriba del formulario en `/solicitudes/[id]`, eliminando el banner azul "Material en camino" actual y el `<TripLiveMap>` embedded en la card histórica.

**Architecture:** Un componente nuevo en `src/components/solicitudes/ActiveTripPanel.tsx` que consume un tipo `AssociatedTrip` extraído a un archivo compartido `src/components/solicitudes/types.ts`. El `page.tsx` importa el panel y lo renderiza 0..N veces (una por trip activo con líneas En Transito o Parcial, ordenado por Salida descendente) inmediatamente antes del `<SolicitudForm>`. El mapa vive **exclusivamente** en el panel arriba — la card histórica pierde su `<TripLiveMap>` interno y la import de page.tsx queda huérfana, se remueve.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4, lucide-react icons, componentes existentes del proyecto (`Badge`, `TripLiveMap`), helpers de `@/lib/utils/format`.

**Spec:** `Docs/superpowers/specs/2026-04-20-active-trip-panel-design.md` (v1.1 aprobada 2026-04-20)

---

## Constraints (from CLAUDE.md and rules)

- **Spanish UI** — todos los strings visibles en español panameño.
- **`jaime/dev` branch** — commits directos, `post-commit` hook corre build en background.
- **RLS / permisos intactos** — el panel solo recibe `role` para gate del código; no cambia auth ni queries.
- **Mobile-first** — panel responsive, probar en viewport chico.
- **No tocar** `SolicitudForm.tsx`, `/solicitudes/nueva`, `/programacion/viaje/[id]`.

---

## File Structure

**New files:**
- `src/components/solicitudes/types.ts` — export de `TripLineInfo`, `TripEventInfo`, `AssociatedTrip` (hoy inline en page.tsx).
- `src/components/solicitudes/ActiveTripPanel.tsx` — componente client con las 6 secciones (header, metadata, líneas, mapa, código, botón Link).

**Modified files:**
- `src/app/(app)/solicitudes/[id]/page.tsx` — 4 cambios coordinados en 4 tasks separados (ver Tasks 1, 3, 4).
- `Docs/CHANGELOG.md` — entry `[feat]` post-implementación (Task 5).

**Files NOT touched (intencional):**
- `src/components/solicitudes/SolicitudForm.tsx` — zero changes.
- `src/app/(app)/solicitudes/nueva/page.tsx` — no carga `associatedTrips`.
- `src/app/(app)/programacion/viaje/[id]/page.tsx` — vista de Charris, distinto flujo.
- `src/components/gps/TripLiveMap.tsx` — consume desde el nuevo lugar sin cambios internos.

---

## Task Granularity Note

5 tasks, cada uno 1 commit. Orden secuencial — cada task construye sobre el anterior. Tasks 1-2 son preparatorios (no cambian UI); Task 3 introduce el panel y es donde aparece el cambio visible; Task 4 limpia el mapa duplicado; Task 5 verifica e ingresa el `[feat]` al CHANGELOG. No hay TDD formal porque no hay infraestructura de unit tests para React components en este repo — la verificación es build + lint + manual smoke.

---

## Task 1: Extraer tipos a `src/components/solicitudes/types.ts`

**Goal:** Mover las 3 interfaces `TripLineInfo`, `TripEventInfo`, `AssociatedTrip` de inline en page.tsx a un archivo compartido que Task 2 (ActiveTripPanel) consuma. Refactor puro — sin cambio de shape, sin cambio de comportamiento.

**Files:**
- Create: `src/components/solicitudes/types.ts`
- Modify: `src/app/(app)/solicitudes/[id]/page.tsx` (eliminar las 3 interfaces inline en líneas 112-138, agregar import en el bloque de imports alrededor de la línea 28)

**Acceptance Criteria:**
- [ ] `src/components/solicitudes/types.ts` existe y exporta `TripLineInfo`, `TripEventInfo`, `AssociatedTrip` con el shape exacto que estaban inline.
- [ ] `grep -n "interface TripLineInfo\|interface TripEventInfo\|interface AssociatedTrip" src/app/\(app\)/solicitudes/\[id\]/page.tsx` → 0 matches.
- [ ] `grep -n "AssociatedTrip" src/app/\(app\)/solicitudes/\[id\]/page.tsx` → al menos 1 match (el import).
- [ ] `npm run build` exit 0.
- [ ] `npx eslint src/components/solicitudes/types.ts "src/app/(app)/solicitudes/[id]/page.tsx"` sin errores ni warnings nuevos.

**Verify:** `npm run build` → `✓ Compiled successfully`.

**Steps:**

- [ ] **Step 1: Create `src/components/solicitudes/types.ts`**

Use `Write` tool. Contenido exacto:

```typescript
// Tipos compartidos entre /solicitudes/[id]/page.tsx y ActiveTripPanel.
// Estaban declarados inline en page.tsx hasta que la extracción del panel
// los hizo compartidos. El shape es idéntico al que tenía page.tsx antes.

export interface TripLineInfo {
  description: string
  line_type: string
  status: string
  quantity_assigned: number
  qty_delivered: number
}

export interface TripEventInfo {
  event_type: string
  event_timestamp: string
  received_by_name: string | null
  notes: string | null
}

export interface AssociatedTrip {
  id: string
  trip_id: string | null
  scheduled_date: string
  status: string
  confirmation_code: string | null
  driver: { name: string } | null
  vehicle: { description: string; spectrum_code: string | null; gps_vehicle_id: string | null } | null
  trailer: { description: string; spectrum_code: string | null } | null
  att_permit: boolean
  escort: boolean
  is_self_pickup: boolean
  lines: TripLineInfo[]
  events: TripEventInfo[]
}
```

- [ ] **Step 2: Agregar import type a page.tsx**

En `src/app/(app)/solicitudes/[id]/page.tsx`, agregar esta línea al bloque de imports (después del `import { LineRow } from '@/components/solicitudes/LineRow'` que está en línea 30):

```typescript
import type { AssociatedTrip } from '@/components/solicitudes/types'
```

(`TripLineInfo` y `TripEventInfo` no se importan porque no se referencian por nombre fuera de la definición de `AssociatedTrip.lines` / `.events` — son tipos internos anidados.)

Use `Edit` tool con contexto de 2-3 líneas para hacer unique el match.

- [ ] **Step 3: Eliminar las 3 interfaces inline**

Find este bloque en page.tsx (líneas 111-138) y reemplazar con nada (solo eliminar; el `const [associatedTrips, setAssociatedTrips] = useState<AssociatedTrip[]>([])` sigue funcionando porque el tipo ahora viene del import):

```typescript
  // Viajes asociados a esta solicitud
  interface TripLineInfo {
    description: string
    line_type: string
    status: string
    quantity_assigned: number
    qty_delivered: number
  }
  interface TripEventInfo {
    event_type: string
    event_timestamp: string
    received_by_name: string | null
    notes: string | null
  }
  interface AssociatedTrip {
    id: string
    trip_id: string | null
    scheduled_date: string
    status: string
    confirmation_code: string | null
    driver: { name: string } | null
    vehicle: { description: string; spectrum_code: string | null; gps_vehicle_id: string | null } | null
    trailer: { description: string; spectrum_code: string | null } | null
    att_permit: boolean
    escort: boolean
    is_self_pickup: boolean
    lines: TripLineInfo[]
    events: TripEventInfo[]
  }
```

Use `Edit` tool con el bloque completo como `old_string` y el comentario `  // Viajes asociados a esta solicitud` solo como `new_string` (el comentario se preserva como anchor útil):

```typescript
  // Viajes asociados a esta solicitud
```

- [ ] **Step 4: Verificar build + lint**

Run: `npm run build`
Expected: exit 0, compiled successfully, sin errores de TypeScript sobre `AssociatedTrip`, `TripLineInfo`, o `TripEventInfo`.

Run: `npx eslint src/components/solicitudes/types.ts "src/app/(app)/solicitudes/[id]/page.tsx" 2>&1 | tail -10`
Expected: sin errores nuevos. Pre-existing warnings (`'index' is defined but never used` etc) aceptados.

Run: `grep -n "interface TripLineInfo\|interface TripEventInfo\|interface AssociatedTrip" "src/app/(app)/solicitudes/[id]/page.tsx"` → sin output (0 matches).

- [ ] **Step 5: Commit**

```bash
git add src/components/solicitudes/types.ts "src/app/(app)/solicitudes/[id]/page.tsx"
git commit -m "refactor: extraer tipos AssociatedTrip a src/components/solicitudes/types.ts"
```

---

## Task 2: Crear componente `<ActiveTripPanel>`

**Goal:** Crear el componente cliente que renderiza las 6 secciones operativas de un trip activo. El archivo vive aislado — no se importa ni se usa todavía. Task 3 lo wire-uppea.

**Files:**
- Create: `src/components/solicitudes/ActiveTripPanel.tsx`

**Acceptance Criteria:**
- [ ] Archivo existe con `'use client'` como primera línea (usa `<Link>` y `<TripLiveMap>` que son client-side).
- [ ] Export default del componente.
- [ ] Props: `{ trip: AssociatedTrip, role: string | null }`.
- [ ] Render vertical contiene las 6 secciones definidas en §4.2 del spec: header (MOV + Badge + Salió HH:MM), metadata (conductor/vehículo/remolque), líneas filtradas por En Transito o Parcial con badge, `<TripLiveMap variant="compact">`, código de verificación (gated por role), botón Link "Confirmar Recepción →".
- [ ] Gate del código: `role === 'pm' || role === 'logistica' || role === 'admin'` Y `trip.confirmation_code` existe.
- [ ] `npm run build` exit 0.
- [ ] `npx eslint src/components/solicitudes/ActiveTripPanel.tsx` sin errores ni warnings nuevos.

**Verify:** `npm run build` → exit 0. Grep `"ActiveTripPanel"` en el resto del codebase → solo 1 match (el propio archivo) porque aún no se importó.

**Steps:**

- [ ] **Step 1: Create el archivo**

Path: `src/components/solicitudes/ActiveTripPanel.tsx`

```typescript
'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { KeyRound, Wrench, Package } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import TripLiveMap from '@/components/gps/TripLiveMap'
import { formatDate, formatTimePanama, formatQty } from '@/lib/utils/format'
import type { AssociatedTrip } from '@/components/solicitudes/types'

interface ActiveTripPanelProps {
  trip: AssociatedTrip
  role: string | null
}

export default function ActiveTripPanel({ trip, role }: ActiveTripPanelProps) {
  const router = useRouter()

  const salidaEvent = trip.events.find((e) => e.event_type === 'Salida')
  const activeLines = trip.lines.filter(
    (l) => l.status === 'En Transito' || l.status === 'Parcial',
  )
  const canSeeCode =
    (role === 'pm' || role === 'logistica' || role === 'admin') &&
    !!trip.confirmation_code

  return (
    <div className="rounded-lg border border-navy/20 bg-white p-4 shadow-sm sm:p-6 space-y-4">
      {/* 1. Header — código MOV + badge status + hora de salida */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push(`/programacion/viaje/${trip.id}`)}
            className="font-mono text-base font-bold text-navy hover:underline cursor-pointer"
          >
            {trip.trip_id ?? trip.id.slice(0, 8)}
          </button>
          <Badge variant="trip" label={trip.status} />
        </div>
        <div className="flex items-center gap-3 text-sm text-iconsa-gray">
          <span>{formatDate(trip.scheduled_date)}</span>
          {salidaEvent && (
            <span>Salió {formatTimePanama(salidaEvent.event_timestamp)}</span>
          )}
        </div>
      </div>

      {/* 2. Metadata — conductor, vehículo, remolque */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700">
        {trip.driver && (
          <span>
            <span className="text-iconsa-gray">Conductor:</span> {trip.driver.name}
          </span>
        )}
        {trip.vehicle && (
          <span>
            <span className="text-iconsa-gray">Vehículo:</span>{' '}
            {trip.vehicle.spectrum_code ? `${trip.vehicle.spectrum_code} — ` : ''}
            {trip.vehicle.description}
          </span>
        )}
        {trip.trailer && (
          <span>
            <span className="text-iconsa-gray">Remolque:</span>{' '}
            {trip.trailer.spectrum_code ? `${trip.trailer.spectrum_code} — ` : ''}
            {trip.trailer.description}
          </span>
        )}
      </div>

      {/* 3. Líneas filtradas (En Transito o Parcial) */}
      {activeLines.length > 0 && (
        <ul className="space-y-1">
          {activeLines.map((line, idx) => (
            <li
              key={idx}
              className="flex items-center gap-2 text-sm text-gray-700"
            >
              <span className="shrink-0" title={line.line_type}>
                {line.line_type === 'Equipo' ? (
                  <Wrench className="h-4 w-4 text-iconsa-blue" />
                ) : (
                  <Package className="h-4 w-4 text-gold" />
                )}
              </span>
              <span className="truncate">{line.description}</span>
              <span className="shrink-0 text-xs text-iconsa-gray">
                ×{formatQty(line.quantity_assigned)}
              </span>
              <Badge variant="line" label={line.status} />
            </li>
          ))}
        </ul>
      )}

      {/* 4. Mapa en vivo — hereda visibility-aware polling, auto-follow, stale banner,
             Reactivar button, Seguir vehículo button, placeholder coords inválidas. */}
      <TripLiveMap tripId={trip.id} variant="compact" />

      {/* 5. Código de verificación — gated por rol (pm/logistica/admin) */}
      {canSeeCode && (
        <div className="flex items-center gap-2 rounded-lg bg-navy/5 border border-navy/20 px-3 py-2">
          <KeyRound className="h-4 w-4 text-navy shrink-0" />
          <span className="text-sm text-iconsa-gray">Código:</span>
          <span className="font-mono text-lg font-bold text-navy tracking-[0.25em]">
            {trip.confirmation_code}
          </span>
        </div>
      )}

      {/* 6. Botón Confirmar Recepción — Link a /mis-viajes con action=deliver */}
      <div className="flex justify-end">
        <Link
          href={`/mis-viajes/${trip.id}?action=deliver`}
          className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy/90 transition-colors"
        >
          Confirmar Recepción →
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar build + lint + aislación**

Run: `npm run build`
Expected: exit 0.

Run: `npx eslint src/components/solicitudes/ActiveTripPanel.tsx`
Expected: sin output (0 issues).

Run: `grep -rn "ActiveTripPanel" src/ | grep -v "ActiveTripPanel.tsx:"`
Expected: sin output. El componente aún no se importa en ningún lado.

- [ ] **Step 3: Commit**

```bash
git add src/components/solicitudes/ActiveTripPanel.tsx
git commit -m "feat: componente ActiveTripPanel (6 secciones operativas, aún no wire-upped)"
```

---

## Task 3: Wire up en page.tsx — eliminar banner azul + renderizar paneles

**Goal:** En `/solicitudes/[id]`, eliminar el banner IIFE "Material en camino" (top-level con CTA azul) y renderizar 0..N `<ActiveTripPanel>` en su lugar — uno por trip activo con líneas En Transito o Parcial, ordenados por Salida descendente. El cambio es donde aparece el feature visualmente.

**Files:**
- Modify: `src/app/(app)/solicitudes/[id]/page.tsx`

**Acceptance Criteria:**
- [ ] Banner IIFE `"Material en camino"` (líneas 572-597 del archivo pre-task) eliminado.
- [ ] `import ActiveTripPanel` agregado.
- [ ] En su lugar, render del filter+sort+map de paneles inmediatamente después del error banner y antes del `<SolicitudForm>`.
- [ ] Con solicitud + trip En Ruta + línea En Transito: el panel aparece; el banner azul ya no.
- [ ] Con solicitud Borrador o sin trips activos: ningún panel renderiza; layout como antes (sin regresión visual de otras secciones).
- [ ] `npm run build` exit 0.

**Verify:** `npm run build` → exit 0. Manual: abrir `/solicitudes/[id]` con trip activo — debería aparecer el panel arriba con el mapa.

**Steps:**

- [ ] **Step 1: Agregar import**

En el bloque de imports (después del `import type { AssociatedTrip } from '@/components/solicitudes/types'` agregado en Task 1), agregar:

```typescript
import ActiveTripPanel from '@/components/solicitudes/ActiveTripPanel'
```

- [ ] **Step 2: Eliminar el banner IIFE y reemplazar con el render de paneles**

Find este bloque en page.tsx (líneas 572-597 del archivo original; con Task 1 aplicado los números shiftean en -27 porque se eliminaron 27 líneas de interfaces; ajustar según el estado actual del archivo — buscar por contenido, no por línea):

```typescript
      {/* Banner de entrega — solo si hay líneas en tránsito */}
      {(() => {
        const tripEnRoute = associatedTrips.find(t => t.status === 'En Ruta')
        const hasLinesInTransit = solicitud.lines?.some((l: { status: string }) => l.status === 'En Transito')
        if (!tripEnRoute || !hasLinesInTransit) return null
        const salidaEvent = tripEnRoute.events?.find((e: { event_type: string }) => e.event_type === 'Salida')
        return (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-sm font-semibold text-blue-900">
                🚛 Material en camino
              </p>
              <p className="text-xs text-blue-700">
                Viaje <span className="font-mono font-bold">{tripEnRoute.trip_id}</span>
                {salidaEvent && <> | Salió {formatTimePanama(salidaEvent.event_timestamp)}</>}
              </p>
            </div>
            <Link
              href={`/mis-viajes/${tripEnRoute.id}?action=deliver`}
              className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy/90 transition-colors"
            >
              Confirmar Recepción →
            </Link>
          </div>
        )
      })()}
```

Reemplazar con:

```typescript
      {/* Paneles operativos de trips activos — uno por cada trip En Ruta
          con al menos una línea En Transito o Parcial. Ordenados por Salida
          descendente (más reciente primero). Reemplaza el antiguo banner
          "Material en camino" — todo el contexto operativo (código, mapa,
          botón Confirmar Recepción) vive ahora dentro del panel. */}
      {associatedTrips
        .filter(
          (t) =>
            t.status === 'En Ruta' &&
            t.lines.some(
              (l) => l.status === 'En Transito' || l.status === 'Parcial',
            ),
        )
        .sort((a, b) => {
          const aSalida =
            a.events.find((e) => e.event_type === 'Salida')?.event_timestamp ??
            ''
          const bSalida =
            b.events.find((e) => e.event_type === 'Salida')?.event_timestamp ??
            ''
          return bSalida.localeCompare(aSalida)
        })
        .map((t) => <ActiveTripPanel key={t.id} trip={t} role={role} />)}
```

- [ ] **Step 3: Verificar que no queden referencias huérfanas**

El banner usaba `formatTimePanama` y `Link` — ambos siguen usados en otros lugares del archivo (por ejemplo, `<Link>` se usa en el botón del panel… wait, no, el botón vive en `ActiveTripPanel.tsx`, no en page.tsx). Verificar si `Link` y `formatTimePanama` siguen teniendo otros usos en page.tsx:

Run: `grep -n "^import Link from 'next/link'\|formatTimePanama\|<Link " "src/app/(app)/solicitudes/[id]/page.tsx"`

- Si `Link` NO se usa más (solo en el banner que ahora borramos), eliminar la import `import Link from 'next/link'` que está en línea 21. (Revisar con el grep — no especular.)
- Si `formatTimePanama` NO se usa más, quitarlo de la línea de import de `@/lib/utils/format`.

Si ambos siguen usados en otros lados del archivo, no tocar imports.

- [ ] **Step 4: Verificar build + lint**

Run: `npm run build`
Expected: exit 0.

Run: `npx eslint "src/app/(app)/solicitudes/[id]/page.tsx"`
Expected: sin nuevos errores. Pre-existing warnings aceptados.

Run: `grep -n "Material en camino\|tripEnRoute = associatedTrips.find" "src/app/(app)/solicitudes/[id]/page.tsx"`
Expected: sin output (banner eliminado).

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/solicitudes/[id]/page.tsx"
git commit -m "feat: renderizar ActiveTripPanel arriba + eliminar banner 'Material en camino'"
```

---

## Task 4: Eliminar `<TripLiveMap>` embedded de card histórica + import huérfana

**Goal:** Remover el `<TripLiveMap variant="compact">` que vive dentro del per-trip card de "Movilizaciones Programadas" más abajo, más la import de `TripLiveMap` de page.tsx que queda huérfana (ahora `<TripLiveMap>` solo se consume desde `ActiveTripPanel.tsx`). El mapa queda **exclusivamente** en el panel arriba — elimina la duplicación visual.

**Files:**
- Modify: `src/app/(app)/solicitudes/[id]/page.tsx`

**Acceptance Criteria:**
- [ ] El bloque del mapa embedded (líneas 802-818 del archivo post-Task 3, o buscar por contenido) eliminado en su totalidad: comentario, guard, `<div>` wrapper, `<TripLiveMap>`.
- [ ] `import TripLiveMap from '@/components/gps/TripLiveMap'` (línea 31) eliminado.
- [ ] `grep -n "TripLiveMap" "src/app/(app)/solicitudes/[id]/page.tsx"` → 0 matches.
- [ ] Card histórica sigue renderizando header/metadata/líneas/timeline/código. Solo el mapa desapareció.
- [ ] `npm run build` exit 0.
- [ ] `npx eslint "src/app/(app)/solicitudes/[id]/page.tsx"` sin warning de unused import.

**Verify:** `npm run build` → exit 0. `grep -n "TripLiveMap" "src/app/(app)/solicitudes/[id]/page.tsx"` → sin output. Manual: ver la card histórica (scroll abajo) — el mapa ya no aparece dentro; el resto (código, timeline) sí.

**Steps:**

- [ ] **Step 1: Eliminar el bloque del mapa embedded en la card histórica**

Find este bloque en page.tsx (dentro del `.map((t) => ...)` de "Movilizaciones Programadas", después del `</ul>` de líneas y antes del mini-timeline):

```typescript
                {/* Mapa en vivo del vehículo (compact) — solo si al menos
                    una línea de este trip (asociada a ESTA solicitud) sigue
                    en movimiento (En Transito o Parcial). Apagar después de
                    Entregada evita polling innecesario hasta que el camión
                    vuelve a base. Parcial se incluye porque es estado
                    terminal hasta la próxima Entrega — el material sigue
                    viajando y el PM todavía quiere ver el mapa. */}
                {t.status === 'En Ruta' &&
                  !t.is_self_pickup &&
                  t.vehicle?.gps_vehicle_id &&
                  t.lines.some(
                    (line) => line.status === 'En Transito' || line.status === 'Parcial',
                  ) && (
                    <div className="mt-2">
                      <TripLiveMap tripId={t.id} variant="compact" />
                    </div>
                  )}
```

Eliminarlo completamente (reemplazar con nada).

Use `Edit` tool con el `old_string` completo arriba y `new_string` vacío.

- [ ] **Step 2: Eliminar la import huérfana**

Find en línea 31 (aprox):

```typescript
import TripLiveMap from '@/components/gps/TripLiveMap'
```

Eliminar la línea entera.

- [ ] **Step 3: Verificar grep final**

Run: `grep -n "TripLiveMap" "src/app/(app)/solicitudes/[id]/page.tsx"`
Expected: sin output. Zero matches.

- [ ] **Step 4: Verificar build + lint**

Run: `npm run build`
Expected: exit 0, sin warnings de unused import sobre `TripLiveMap`.

Run: `npx eslint "src/app/(app)/solicitudes/[id]/page.tsx"`
Expected: sin errores nuevos.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/solicitudes/[id]/page.tsx"
git commit -m "refactor: eliminar <TripLiveMap> de card histórica — mapa vive solo en ActiveTripPanel"
```

---

## Task 5: Verificación manual + entry `[feat]` en CHANGELOG

**Goal:** Smoke test del feature completo contra los 6 escenarios del spec §7, y anotar el feature en `Docs/CHANGELOG.md` como `[feat]` para cerrar la sesión.

**Files:**
- Modify: `Docs/CHANGELOG.md` (agregar entry al bloque `## 2026-04-20`)

**Acceptance Criteria:**
- [ ] `npm run build` final exit 0.
- [ ] `npm run lint` sin warnings nuevos en los 3 archivos tocados (types.ts, ActiveTripPanel.tsx, page.tsx).
- [ ] Smoke manual contra los escenarios del spec §7 (ver checklist abajo).
- [ ] `Docs/CHANGELOG.md` tiene entry `[feat]` describiendo el panel.

**Verify:** `npm run build && npm run lint` → exit 0. Smoke manual en browser.

**Steps:**

- [ ] **Step 1: Build + lint final**

Run: `npm run build 2>&1 | tail -4`
Expected: `✓ Compiled successfully`.

Run: `npx eslint src/components/solicitudes/types.ts src/components/solicitudes/ActiveTripPanel.tsx "src/app/(app)/solicitudes/[id]/page.tsx" 2>&1 | tail -10`
Expected: sin errores nuevos. Pre-existing warnings (`index`, `setFulfillmentType` etc.) siguen OK.

- [ ] **Step 2: Smoke manual — 6 escenarios del spec §7**

Requiere dev server corriendo (`npm run dev`). Abrir browser en `http://localhost:3000/solicitudes/[id]`. Probar:

1. **Trip En Ruta + línea En Transito:** panel aparece arriba con header MOV + badge + Salió HH:MM, metadata (conductor/vehículo/remolque), lista de líneas con badge, mapa con pin, código de verificación visible (si eres admin/pm/logistica), botón "Confirmar Recepción →". Banner azul "Material en camino" NO aparece.
2. **Click "Confirmar Recepción →":** navega a `/mis-viajes/[tripId]?action=deliver` y abre el DeliveryModal allá.
3. **Solicitud Borrador o Enviada sin trip:** ningún panel renderiza; layout previo intacto (SolicitudForm, líneas, card histórica sin mapa embedded).
4. **Solicitud Completada con trip retornado:** ningún panel renderiza. Card histórica abajo muestra el trip como Completado (sin mapa, con timeline lleno).
5. **Entrega parcial:** registrar una entrega parcial desde `/mis-viajes/[id]` → volver a `/solicitudes/[id]` → panel sigue visible (línea ahora Parcial, guard la incluye).
6. **Card histórica:** scroll abajo → confirmar que la card sigue apareciendo con header, metadata, líneas, código, timeline. **Sin mapa embedded** — el mapa ahora vive solo en el panel arriba.

Registrar cualquier anomalía en notas para ajustar antes del close.

- [ ] **Step 3: Agregar entry `[feat]` al CHANGELOG**

En `Docs/CHANGELOG.md`, dentro del bloque `## 2026-04-20` (después del entry del constraint `valid_event_type` y antes del entry `[bd]` del GPS), agregar:

```markdown
- [feat] **ActiveTripPanel — vista operativa consolidada del trip activo en `/solicitudes/[id]`**: nuevo componente `src/components/solicitudes/ActiveTripPanel.tsx` que encapsula las 6 secciones operativas (header MOV + badge + hora salida, metadata conductor/vehículo/remolque, líneas filtradas por En Transito/Parcial, mapa `<TripLiveMap variant="compact">`, código de verificación gated por rol pm/logistica/admin, botón "Confirmar Recepción →" como Link a `/mis-viajes/[id]?action=deliver`). Se renderiza 0..N veces (una por trip activo) inmediatamente antes del `<SolicitudForm>`, ordenado por Salida descendente. Tres cambios coordinados: (1) tipos `TripLineInfo`/`TripEventInfo`/`AssociatedTrip` extraídos de inline a `src/components/solicitudes/types.ts` compartido; (2) banner azul "Material en camino" del top de page.tsx eliminado — toda la info operativa ahora vive en el panel; (3) `<TripLiveMap>` embedded dentro de la card histórica "Movilizaciones Programadas" eliminado junto con la import huérfana — el mapa vive **exclusivamente** en el panel arriba, sin duplicación. Card histórica mantiene header/metadata/líneas/código/timeline. Spec: `Docs/superpowers/specs/2026-04-20-active-trip-panel-design.md` (v1.1).
```

- [ ] **Step 4: Commit**

```bash
git add Docs/CHANGELOG.md
git commit -m "docs: CHANGELOG — [feat] ActiveTripPanel + cleanup card histórica"
```

---

## Out of Scope (re-stated for safety)

Por §2.2 del spec, este plan NO:
- Toca `SolicitudForm.tsx`.
- Toca `/solicitudes/nueva` ni `/programacion/viaje/[id]`.
- Reordena otros bloques del layout (el reorder anterior fue revertido; este cambio es additive arriba y cleanup abajo).
- Elimina la card histórica "Movilizaciones Programadas" — solo le quita el mapa.
- Implementa un modal in-place para Confirmar Recepción — sigue siendo un Link a `/mis-viajes`.
- Cubre el edge case de reversión de Salida (multiple Salida events → `find()` devuelve la primera, potencialmente revertida). Anotado en §2.2 OUT del spec.
- Expone `variant` prop en `<ActiveTripPanel>` — un solo uso, YAGNI.

Si una step parece requerir cualquiera de las anteriores, detenerse y re-leer el spec.
