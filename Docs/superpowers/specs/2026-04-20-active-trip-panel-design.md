# ActiveTripPanel — Feature Spec

**Version:** 1.0
**Status:** Design approved — pending implementation plan
**Depende de:** GPS live tracking MVP shippeado (commits `91dca65..ad2ac2d`), guard `Parcial` del mapa (`fbe74ba`), reorder previo revertido (`8c405fc`).
**No toca:** `SolicitudForm.tsx`, la card histórica "Movilizaciones Programadas", `/solicitudes/nueva`, `/programacion/viaje/[id]`.

---

## 1. Contexto

Hoy la información operativa de un trip activo (conductor, vehículo, mapa GPS, código de verificación, botón para confirmar recepción) vive **dispersa** en `/solicitudes/[id]`:

- **Banner azul "Material en camino"** en el top de la página, con el CTA "Confirmar Recepción →" que lleva a `/mis-viajes/[id]?action=deliver`.
- **Card "Movilizaciones Programadas"** más abajo, que muestra TODAS las movilizaciones de la solicitud (Programado + En Ruta + Completado) con metadata, mapa (si aplica), código de verificación, timeline de eventos.

Esto genera tres problemas:

1. **Scroll para el PM**: el código de verificación y el mapa viven al final de la página; el botón para confirmar la entrega vive al principio. Son las 3 piezas que el PM más necesita cuando hay un trip activo y están separadas.
2. **Ruido visual**: mientras un trip está activo, tanto el banner como la card muestran info redundante.
3. **Mix de contextos**: la card histórica muestra trips Programados y Completados mezclados con el activo — el PM tiene que parsear cuál es el relevante hoy.

La solución es consolidar toda la vista operativa del trip activo en **un único panel arriba de la página**, y dejar la card histórica abajo para consulta (sin cambios — trips Programados/Completados siguen viviendo ahí).

## 2. Scope

### 2.1 — IN

- Nuevo componente `<ActiveTripPanel>` en `src/components/solicitudes/ActiveTripPanel.tsx`.
- Nuevo archivo compartido `src/components/solicitudes/types.ts` que re-exporta el tipo `AssociatedTrip` (hoy declarado inline en `page.tsx`), consumido tanto por la page como por el nuevo componente. Evita duplicación y silent drift.
- En `src/app/(app)/solicitudes/[id]/page.tsx`:
  - Eliminar el banner "Material en camino" (IIFE actual en el top).
  - Renderizar 0..N `<ActiveTripPanel>` inmediatamente después del error banner, antes del `<SolicitudForm>`, uno por cada trip activo con líneas en movimiento.
  - Importar el tipo `AssociatedTrip` desde el nuevo archivo compartido (en vez de declararlo inline).

### 2.2 — OUT

- **Card "Movilizaciones Programadas"** (histórica, abajo del form): sin cambios. Sigue mostrando todos los trips — Programados, En Ruta, Completados, Cancelados. Coexistencia intencional con el panel durante trip activo.
- **`SolicitudForm.tsx`**: no se toca. La ID bar interna y los campos siguen como están.
- **`/solicitudes/nueva`**: no se toca. Sin trips activos, el filter devuelve `[]`, ningún panel se monta.
- **`/programacion/viaje/[id]`** (vista de Charris): no se toca. Layout distinto, contexto distinto.
- **Generalización del panel** (ej. variant prop para reutilizar en otras páginas): YAGNI. Un solo uso por ahora.
- **Modal in-place de Entrega**: el botón sigue siendo un `<Link>` a `/mis-viajes/[id]?action=deliver` que abre el modal allá. No se duplica la lógica en /solicitudes.
- **Orden "correcto" de Salida cuando hay reversión**: `find()` sobre `t.events` devuelve la primera Salida encontrada, que puede ser una revertida si hubo varias. Edge case conocido, no-bloqueante, se difiere.

## 3. Arquitectura

### 3.1 — Estructura del panel (render vertical)

```
┌─────────────────────────────────────────────────┐
│ MOV-2026-001  [En Ruta]              Salió HH:MM│  ← Header
├─────────────────────────────────────────────────┤
│ Conductor: X · Vehículo: Y · Remolque: Z        │  ← Metadata
├─────────────────────────────────────────────────┤
│ 🔧 AND001 — SIST ANDAMIO ×1    [En Transito]    │  ← Líneas filtradas
├─────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────┐   │
│  │                                          │   │
│  │          <TripLiveMap compact>           │   │  ← Mapa
│  │                                          │   │
│  └──────────────────────────────────────────┘   │
├─────────────────────────────────────────────────┤
│ 🔑 Código:  1 2 3 4                             │  ← Código (gated)
├─────────────────────────────────────────────────┤
│                    [ Confirmar Recepción → ]    │  ← Botón Link
└─────────────────────────────────────────────────┘
```

### 3.2 — Decisiones arquitectónicas

**Componente separado, no inline.** El panel tiene 6 secciones internas con su propia lógica de gating (código por rol, líneas filtradas, mapa condicional, metadata opcional para remolque). Extraerlo a su propio archivo mantiene `page.tsx` legible y permite testearlo aisladamente en el futuro si se justifica.

**Tipo `AssociatedTrip` a archivo compartido.** Hoy vive inline en `page.tsx`. Moverlo a `src/components/solicitudes/types.ts` antes de que el nuevo componente lo consuma evita duplicación y silent drift. Cleanup natural al extraer.

**Botón "Confirmar Recepción" es un `<Link>`, no un handler.** Sigue la misma URL que el banner actual: `/mis-viajes/[tripId]?action=deliver`. La pantalla de destino parsea el query param y abre el DeliveryModal. El PM tiene acceso a esa ruta por middleware (verificado por el banner existente que hace lo mismo). Implementar un modal in-place duplicaría toda la lógica de DeliveryModal — fuera de scope.

**Role gate del código: `pm | logistica | admin`.** Mismo gate que la card histórica actual (línea ~820 de `page.tsx`). Consistente con regla #15 de CLAUDE.md: campo/almacen NUNCA ven el código.

**Múltiples paneles = múltiples polling.** Si una solicitud tiene 2+ trips activos simultáneos (caso raro — típicamente 2 viajes paralelos entregando líneas distintas de la misma solicitud), cada panel monta su propio `<TripLiveMap>` que pollea `/api/gps/trip/[id]/position` independientemente. El caché server-side de 10s en `skydata-client.ts` amortigua: aunque 3 paneles polleen al mismo tiempo, solo 1 hit real a SkyData por ventana de 10s.

**Stale banner vive dentro de `<TripLiveMap>`.** El componente GPS ya maneja internamente el banner amber "Último reporte hace N h" cuando `status === 'stale'`. No se duplica responsabilidad.

### 3.3 — Gate del panel

```ts
const activeTrips = associatedTrips
  .filter(t =>
    t.status === 'En Ruta' &&
    t.lines.some(l => l.status === 'En Transito' || l.status === 'Parcial')
  )
  .sort((a, b) => {
    const aSalida = a.events.find(e => e.event_type === 'Salida')?.event_timestamp ?? ''
    const bSalida = b.events.find(e => e.event_type === 'Salida')?.event_timestamp ?? ''
    return bSalida.localeCompare(aSalida) // descendente — el más reciente primero
  })
```

Efectos observables de este gate:

| Estado de la solicitud y sus trips | Paneles renderizados |
|---|---|
| Borrador / Enviada sin trip programado | 0 |
| Enviada con trip Programado (no ha salido) | 0 |
| En Proceso con trip En Ruta + línea En Transito | 1 |
| En Proceso con trip En Ruta + línea Parcial (camión sigue con carga pendiente) | 1 |
| En Proceso con 2 trips En Ruta simultáneos (ambos con líneas en movimiento) | 2 (ordenados por Salida desc) |
| Completada — todas las líneas Entregadas, trip aún no hizo Retorno | 0 |
| Completada — trip retornado | 0 |

## 4. Componente `<ActiveTripPanel>`

### 4.1 — Props

```ts
interface ActiveTripPanelProps {
  trip: AssociatedTrip
  role: string | null
}
```

### 4.2 — Secciones internas

1. **Header** — `<div>` flex con:
   - Button (no link — abre el detail page via `router.push`) `MOV-XXXX` monospace bold text-navy
   - `<Badge variant="trip" label={trip.status} />`
   - `Salió HH:MM` (si `trip.events.find(e => e.event_type === 'Salida')` existe) usando `formatTimePanama`

2. **Metadata** — `<div>` flex-wrap con separadores:
   - `Conductor: {trip.driver?.name}` (si presente)
   - `Vehículo: {trip.vehicle.spectrum_code} — {trip.vehicle.description}` (si presente)
   - `Remolque: {trip.trailer.spectrum_code} — {trip.trailer.description}` (condicional — solo si trailer existe)

3. **Líneas filtradas** — `<ul>` con `trip.lines.filter(l => l.status === 'En Transito' || l.status === 'Parcial')`:
   - Icon 🔧 / 📦 según `line_type`
   - Descripción
   - `×{quantity_assigned}`
   - `<Badge variant="line" label={l.status} />` siempre (tanto para En Transito como Parcial). Consistente con la card histórica abajo que también muestra badge por línea.

4. **Mapa** — `<TripLiveMap tripId={trip.id} variant="compact" />`. Hereda toda la UX del commit `ad2ac2d`: visibility-aware polling, auto-follow, Reactivar button en stale, Seguir vehículo button tras interacción, placeholder de coords inválidas manteniendo altura.

5. **Código de verificación** (gated) — solo si `role === 'pm' || role === 'logistica' || role === 'admin'` Y `trip.confirmation_code` existe:
   - KeyRound icon
   - "Código:" label
   - Código en monospace grande, tracking-wide, font-bold

6. **Botón "Confirmar Recepción →"** — `<Link href={`/mis-viajes/${trip.id}?action=deliver`}>` con estilo primary (bg-navy). Sin role gate extra — si el PM puede ver la solicitud, puede confirmar recepción (mismo criterio que el banner actual).

### 4.3 — Ubicación del archivo

`src/components/solicitudes/ActiveTripPanel.tsx`.

### 4.4 — Dependencias de import

- React / Next.js: `Link` de `next/link`, `useRouter` de `next/navigation`.
- Componentes: `Badge` de `@/components/ui/Badge`, `TripLiveMap` de `@/components/gps/TripLiveMap`.
- Icons: `KeyRound` de `lucide-react`.
- Utils: `formatTimePanama` de `@/lib/utils/format`.
- Tipos: `AssociatedTrip` de `@/components/solicitudes/types` (nuevo archivo).

## 5. Archivo compartido `types.ts`

### 5.1 — Path y contenido

`src/components/solicitudes/types.ts`:

```ts
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

(Mismo shape que lo hoy declarado inline en `page.tsx` líneas 111-138.)

### 5.2 — Regresión-safe

`page.tsx` consume el tipo de este archivo en vez de declararlo inline. El tipo es idéntico — ningún cambio de shape. El `useState<AssociatedTrip[]>`, el mapping del row de Supabase, y los consumidores del estado no cambian comportamiento.

## 6. Cambios en `page.tsx`

### 6.1 — Imports nuevos

```ts
import ActiveTripPanel from '@/components/solicitudes/ActiveTripPanel'
import type { AssociatedTrip, TripLineInfo, TripEventInfo } from '@/components/solicitudes/types'
```

### 6.2 — Interfaces inline a borrar

Las 3 interfaces locales (`TripLineInfo`, `TripEventInfo`, `AssociatedTrip`) en líneas ~112-138 se eliminan. El tipo vive en el nuevo `types.ts`.

### 6.3 — Banner "Material en camino" a eliminar

El IIFE completo de líneas ~572-597 (la búsqueda inline de `tripEnRoute`, la detección de `hasLinesInTransit`, el JSX del banner azul con `<Link>`) se borra. Su funcionalidad queda absorbida por `<ActiveTripPanel>`.

### 6.4 — Render de los paneles

Inmediatamente después del error banner (línea ~570) y antes del `<SolicitudForm>` (línea ~599), agregar:

```tsx
{associatedTrips
  .filter(t =>
    t.status === 'En Ruta' &&
    t.lines.some(l => l.status === 'En Transito' || l.status === 'Parcial')
  )
  .sort((a, b) => {
    const aSalida = a.events.find(e => e.event_type === 'Salida')?.event_timestamp ?? ''
    const bSalida = b.events.find(e => e.event_type === 'Salida')?.event_timestamp ?? ''
    return bSalida.localeCompare(aSalida)
  })
  .map(t => (
    <ActiveTripPanel key={t.id} trip={t} role={role} />
  ))}
```

### 6.5 — Card histórica "Movilizaciones Programadas"

Sin cambios. Líneas ~723+ permanecen idénticas. El `.map(t => ...)` sigue iterando sobre `associatedTrips` completo (incluyendo el trip activo que también aparece en el panel arriba). Coexistencia intencional.

## 7. Criterios de Éxito

**Funcional:**

- [ ] Con solicitud En Proceso + trip En Ruta + línea En Transito: `<ActiveTripPanel>` aparece inmediatamente después del error banner, antes del `<SolicitudForm>`.
- [ ] Panel contiene las 6 secciones: header MOV+Badge+Salida, metadata, líneas filtradas, mapa, código, botón.
- [ ] Banner azul "Material en camino" del top NO aparece (fue eliminado).
- [ ] Click en "Confirmar Recepción →" navega a `/mis-viajes/[tripId]?action=deliver` y abre el modal allá (mismo comportamiento que el banner anterior).
- [ ] Solicitud sin trips activos (Borrador, Enviada sin programar, Completada con todo Entregado): panel NO se renderiza; el resto de la página se ve igual que antes del commit.
- [ ] Solicitud con 2 trips activos simultáneos: 2 paneles apilados, más reciente primero.
- [ ] Línea Parcial (guard del commit `fbe74ba`): panel sigue visible; el status badge de la línea muestra "Parcial".
- [ ] Mapa dentro del panel hereda polling hygiene, auto-follow, Reactivar, Seguir vehículo, y placeholder de coords inválidas — sin regresión.
- [ ] Card histórica "Movilizaciones Programadas" abajo sigue apareciendo exactamente igual.

**No-funcional:**

- [ ] `npm run build` pasa sin errores.
- [ ] `npm run lint` sin warnings nuevos en los archivos tocados.
- [ ] Panel es responsive (mobile + desktop).
- [ ] RLS y permisos sin cambios: el panel recibe `role` y lo usa solo para el gate del código.
- [ ] Sin console.error ni console.log nuevos en el panel.

**Regression-safe:**

- [ ] `SolicitudForm.tsx` sin modificar.
- [ ] `/solicitudes/nueva` sin regresión visual ni funcional.
- [ ] `/programacion/viaje/[id]` sin cambios.
- [ ] La card histórica muestra el mismo set de trips que antes.

## 8. Riesgos y Mitigación

| Riesgo | Prob. | Impacto | Mitigación |
|--------|-------|---------|-----------|
| Duplicación visual PM ve el mapa + código dos veces (arriba en el panel, abajo en la card) | Segura | Bajo | Es intencional por el spec — contextos distintos (operativo vs histórico). Aceptado por James en el aprobado del design. |
| Múltiples paneles triplican polling bajo carga | Baja | Bajo | Caché 10s compartido mitiga. Caso raro (2+ trips simultáneos por solicitud). Si escala mal se introduce dedup client-side por `tripId` en una iteración futura. |
| Edge case: múltiples Salidas por reversión — `find()` devuelve la primera (potencialmente revertida) | Baja | Bajo | James lo anotó como no-bloqueante. Documentado en sección OUT. Fix futuro: filtrar eventos revertidos antes del `find()`. |
| Drift entre `AssociatedTrip` en `types.ts` y el shape real del SELECT de Supabase en `page.tsx` | Baja | Medio | Mismo archivo mantiene el tipo + el mapping. Si cambia el SELECT se cambia el tipo en el mismo commit. Documentado como convención. |
| `/solicitudes/nueva` importa `SolicitudForm` pero no este panel — cualquier refactor futuro que introduzca trips ahí romperá el assumption | Baja | Bajo | Actualmente `/solicitudes/nueva` no carga `associatedTrips`. No hay trips que mostrar. Acepted risk. |

## 9. Preguntas Abiertas

Ninguna bloqueante. James aprobó las 6 micro-decisiones en el mensaje del aprobado. La anotación sobre reversión de Salida queda documentada como edge case futuro.

## 10. Changelog

| Version | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | 2026-04-20 | Versión inicial tras aprobación del design por James. 6 micro-decisiones confirmadas. Edge case de reversión de Salida anotado como OUT no-bloqueante. |
