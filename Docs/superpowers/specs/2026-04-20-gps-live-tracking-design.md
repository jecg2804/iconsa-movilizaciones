---
status: shipped
feature: GPS Live Tracking MVP — SkyData integration + MapLibre + OpenFreeMap Liberty
shipped_commits: 91dca65..fbe74ba
---

# GPS Live Tracking (MVP) — Feature Spec

**Version:** 1.2
**Status:** Ready for implementation — spec saved, pending user review
**Scope decision:** MVP solo live tracking. Sin geocercas de proyecto, sin analytics, sin webhooks, sin historial de ruta.
**Stack decision:** MapLibre GL JS + OpenFreeMap (100% open source, $0, sin API keys de mapa).
**BD convention:** cambios de schema se ejecutan via `[bd-pending]` → `[bd]` en `Docs/CHANGELOG.md` (James corre SQL en Supabase SQL Editor). No se usan archivos de migración.
**Depende de:** Events V2 estable; tabla `public.equipment` con columna `spectrum_code` poblada.
**Confirmado:** acceso al API REST de SkyData incluido en el contrato actual de ICONSA (2026-04-20, James).

---

## 1. Contexto

MovimientOS tiene 17 usuarios diarios en producción y un flujo de movilización completo (solicitud → programación → eventos de viaje). La sección "En Tránsito Ahora" del dashboard y la página `/programacion/viaje/[id]` no tienen información espacial — Charris sabe que un viaje salió pero no dónde está el vehículo. El PM recibe email "Viaje X En Ruta → Destino" pero solo puede esperar el próximo evento (Entrega) para saber progreso.

SkyData/SkyGlobal (plataforma Startrack white-labeled) tiene los 13 vehículos de ICONSA reportando posición via GPS. Integrar esa data cierra el hueco visual sin construir nuestra propia infraestructura telemática.

**Carril específico de este spec:** Carril 2 del three-carril strategy. Mostrar la ubicación en vivo del vehículo asignado a un viaje En Ruta, dentro de las pantallas donde Charris y el PM naturalmente están.

## 2. Scope

### 2.1 — IN (MVP)

- Mapa embebido en `/programacion/viaje/[id]` cuando `trip.status = 'En Ruta'` (Charris primario).
- Mapa compacto en `/solicitudes/[id]` cuando alguna línea está `En Transito` (PM secundario).
- Pin del vehículo con lat/lon actualizada cada 30 segundos.
- Info contextual: velocidad, evento (moviéndose / parado / apagado), último reporte timestamp, dirección reverse-geocoded (`place` de SkyData).
- Polling server-side desde Next.js API route. Credenciales SkyData nunca expuestas al browser.
- Caché en memoria del server (10s TTL) para reducir llamadas a SkyData cuando hay múltiples usuarios viendo el mismo viaje.
- Columna `equipment.gps_vehicle_id` + SQL de bootstrap para mapear las 13 unidades (via `[bd-pending]` en CHANGELOG).
- Corrección del template `salidaRegistrada`: redirect de PM cambia de `/mis-viajes/[id]` a `/solicitudes/[id]`.

### 2.2 — OUT (diferido)

- Polígonos de proyecto en el mapa — requiere crear geocercas primero, no existen para los 5 proyectos activos.
- Historial de ruta dibujado (breadcrumb) — requiere persistencia de posiciones en Supabase.
- Dashboard multi-trip "fleet overview" — Fase 2 después de validar MVP.
- Webhooks (`/api/data-forwarding-rules`) — formato del payload no está documentado, se migra después del MVP estable.
- Analytics derivados (Carril 3): ghost trip detection, rate validation, time-on-site — requieren 30+ días de data acumulada.
- Fuel scorecard — ningún vehículo de ICONSA tiene sensor de combustible activo en SkyData.
- Notificaciones push sobre eventos del mapa (llegada a geocerca, velocidad excedida) — requiere geocercas de proyecto.
- Mapa en `/mis-viajes/[id]` (pantalla del conductor) — conductor no lo necesita, él es el vehículo.
- Mapa para viajes `is_self_pickup=true` — no hay vehículo que trackear.

## 3. Arquitectura

### 3.1 — Flujo de datos

```
Browser (usuario viendo /programacion/viaje/[id])
  │  polling cada 30s con useEffect + setInterval
  ▼
Next.js API route: GET /api/gps/trip/[tripId]/position
  │  server-side: obtiene trip.vehicle_id, equipment.gps_vehicle_id
  │  consulta caché en memoria (10s TTL)
  │  si miss: llama SkyData con Basic Auth
  ▼
SkyData: GET /api/fleet/status
  │  devuelve 13 vehículos con lat/lon/speed/event/place
  ▼
Filtra al vehículo del viaje → retorna JSON al browser
  ▼
<TripLiveMap> actualiza el pin en el mapa
```

### 3.2 — Decisiones clave con rationale

**Polling server-side, no desde el browser.** El API key + password nunca deben llegar al cliente. Next.js API routes ejecutan server-side. Los secrets viven en variables de entorno de Vercel.

**Polling, no webhooks, para MVP.** El rate limit de SkyData (240 req/2min por IP) se respeta cómodamente: con caché de 10s compartido entre usuarios, aunque 5 personas estén viendo viajes distintos, son máximo ~12 req/min al upstream. Webhooks requieren debugging del formato del payload no documentado; se difiere.

**Sin persistencia en Supabase para MVP.** El API route llama SkyData y devuelve directamente. Cuando llegue Carril 3 (analytics), ese mismo route ejecuta un `INSERT` paralelo a `gps_telemetry_raw`. El cambio será aditivo, no refactor.

**Cache in-memory del server con 10s TTL.** Reduce llamadas SkyData cuando múltiples usuarios o mismas tabs están abiertas. Mapa en memoria simple, key = `'fleet_status'`, value = {timestamp, data}. No necesita Redis para este scale.

**Un solo endpoint `/api/gps/trip/[tripId]/position`** sirve tanto `/programacion/viaje/[id]` como `/solicitudes/[id]`. El componente `<TripLiveMap>` es el mismo en ambos lugares, solo varía `className` para tamaño.

**Stack 100% open-source para el mapa.** Librería: MapLibre GL JS (BSD-3, fork community-driven de Mapbox GL JS 1.x antes de que Mapbox pasara a licencia propietaria en diciembre 2020). Hoy es mantenido por la Linux Foundation con ~500K downloads semanales. Wrapper React: `react-map-gl` v8+ (MIT) que soporta MapLibre como backend con la misma API que usa con Mapbox. Tiles: OpenFreeMap public instance (`https://tiles.openfreemap.org/styles/liberty` — estilo balanceado con colores naturales) — gratis, sin API key, sin registro, sin límite de requests. Data de OpenStreetMap. Producción desde junio 2024 como basemap de MapHub. Atribución automática cuando se usa desde MapLibre. **Costo de mapa: $0 permanente.** Si la instancia pública tuviera problemas, la migración a MapTiler Cloud free tier (100K loads/mes gratis) es un cambio de URL + agregar API key — 5 minutos de trabajo.

## 4. Schema Delta

### 4.1 — Columna nueva en `public.equipment` (via `[bd-pending]`)

**Convención del proyecto:** no se crean archivos en `supabase/migrations/`. El cambio se registra como `[bd-pending]` en `Docs/CHANGELOG.md` con el SQL exacto; James lo ejecuta manualmente en Supabase SQL Editor — primero en staging (`vonwkciosksqspyljzfy`), luego en prod (`bzeoszympkkicwlfdtcn`) — y Claude Code cambia el marker a `[bd]` cuando se confirma ejecución.

**SQL a incluir en el entry `[bd-pending]`:**

```sql
-- Columna
ALTER TABLE public.equipment
ADD COLUMN gps_vehicle_id text NULL;

COMMENT ON COLUMN public.equipment.gps_vehicle_id IS
'ID interno del vehículo en SkyData/SkyGlobal (campo `id`, no `unit_id`).
Solo los 13 vehículos con dispositivo GPS tienen valor. NULL para equipos sin GPS.';

-- Índice parcial (evita inflar el índice con filas NULL)
CREATE INDEX idx_equipment_gps_vehicle_id
ON public.equipment (gps_vehicle_id)
WHERE gps_vehicle_id IS NOT NULL;
```

### 4.2 — Bootstrap del mapeo inicial (mismo `[bd-pending]`)

Los `description` de SkyData coinciden exactamente con `spectrum_code` de MovimientOS. Se incluye en el mismo entry para que staging y prod queden sincronizados en una sola ejecución manual:

```sql
-- Datos verificados contra /api/vehicles el 2026-04-20
UPDATE public.equipment SET gps_vehicle_id = '118'  WHERE spectrum_code = 'CAB444';
UPDATE public.equipment SET gps_vehicle_id = '119'  WHERE spectrum_code = 'CAB930';
UPDATE public.equipment SET gps_vehicle_id = '120'  WHERE spectrum_code = 'CAM839';
UPDATE public.equipment SET gps_vehicle_id = '121'  WHERE spectrum_code = 'CAM837';
UPDATE public.equipment SET gps_vehicle_id = '123'  WHERE spectrum_code = 'BUS009';
UPDATE public.equipment SET gps_vehicle_id = '124'  WHERE spectrum_code = 'BUS010';
UPDATE public.equipment SET gps_vehicle_id = '126'  WHERE spectrum_code = 'CAM430';
UPDATE public.equipment SET gps_vehicle_id = '5061' WHERE spectrum_code = 'PUP467';
UPDATE public.equipment SET gps_vehicle_id = '5062' WHERE spectrum_code = 'PUP468';
UPDATE public.equipment SET gps_vehicle_id = '5063' WHERE spectrum_code = 'PUP245';
UPDATE public.equipment SET gps_vehicle_id = '5067' WHERE spectrum_code = 'ED8244';
UPDATE public.equipment SET gps_vehicle_id = '6218' WHERE spectrum_code = 'EM0539';
UPDATE public.equipment SET gps_vehicle_id = '6612' WHERE spectrum_code = 'ES3830';
```

Post-bootstrap: para vehículos nuevos que ICONSA agregue a SkyData, el mapeo se puede hacer manualmente por admin o con un endpoint "sync vehicles" en fase posterior.

### 4.3 — Regenerar types

Después de que James corra el SQL en staging, regenerar tipos localmente:

```bash
npx supabase gen types typescript --project-id vonwkciosksqspyljzfy > src/lib/types/database.ts
```

> **Ojo drift prod/staging:** CHANGELOG 2026-04-19 documenta que `trip_line_assignments.qty_dispatched` existe en staging pero no en prod. Al regenerar, revisar el diff y no dejar que el regenerate arrastre cambios no relacionados. Si aparece drift nuevo, edición quirúrgica de `database.ts` (añadir solo `gps_vehicle_id`) en lugar de regenerar.

### 4.4 — Sin tablas nuevas

Intencional: MVP no persiste posiciones. Cuando se active Carril 3 se agregará `gps_telemetry_raw` con particionamiento por mes, también via `[bd-pending]`.

## 5. API Integration

### 5.1 — Endpoint: `GET /api/gps/trip/[tripId]/position`

**Request:** browser autenticado vía cookie de sesión Supabase.

**Handler (pseudocódigo server-side):**
1. Obtener `trip` de Supabase donde `id = tripId`. Si no existe → 404.
2. Si `trip.status !== 'En Ruta'` → 200 con `{ status: 'not_in_route' }`.
3. Si `trip.is_self_pickup = true` → 200 con `{ status: 'pickup' }`.
4. Obtener `equipment.gps_vehicle_id` WHERE `id = trip.vehicle_id`. Si NULL → 200 con `{ status: 'no_gps' }`.
5. Llamar `getFleetStatus()` (ver 5.2).
6. Filtrar al objeto donde `vehId = gps_vehicle_id`.
7. Si no hay reporte o `epoch` es más viejo que 48h → 200 con `{ status: 'stale', lastReport: ... }`.
8. Retornar `{ status: 'live', position: { lat, lon, speed, heading, event, place, epoch, odometer } }`.

**Response shape:**
```typescript
type GpsTripPosition =
  | { status: 'live'; position: VehiclePosition }
  | { status: 'stale'; lastReport: VehiclePosition }
  | { status: 'not_in_route' }
  | { status: 'pickup' }
  | { status: 'no_gps' }

interface VehiclePosition {
  lat: number
  lon: number
  speed: number
  heading: number
  event: string
  place: string
  epoch: number
  odometer: number
}
```

### 5.2 — Función: `getFleetStatus()` con caché

Implementación singleton en `src/lib/gps/skydata-client.ts`:

```typescript
let cache: { data: VehiclePosition[]; timestamp: number } | null = null
const TTL_MS = 10_000

async function getFleetStatus(): Promise<VehiclePosition[]> {
  if (cache && Date.now() - cache.timestamp < TTL_MS) {
    return cache.data
  }
  const resp = await fetch('https://app.skydataglobal.com/api/fleet/status', {
    headers: { Authorization: `Basic ${btoa(`${KEY}:${PWD}`)}` },
  })
  if (!resp.ok) {
    if (cache) return cache.data
    throw new Error(`SkyData ${resp.status}`)
  }
  const raw = await resp.json()
  cache = { data: raw.map(normalize), timestamp: Date.now() }
  return cache.data
}
```

**Nota sobre instancias serverless en Vercel:** el caché en memoria es por-instancia, no global. Si Vercel tiene 5 instancias activas bajo carga, habrá 5 caches independientes y hasta 5× más llamadas a SkyData. A la escala de ICONSA (17 usuarios) Vercel normalmente corre 1-2 instancias y el efecto es marginal. Si se vuelve problema se migra a Upstash Redis.

### 5.3 — Secrets (Vercel env vars)

```
SKYDATA_API_KEY=1012_69e5a95385b2b
SKYDATA_API_PASSWORD=<password de mcalderon>
SKYDATA_BASE_URL=https://app.skydataglobal.com
```

**Nunca committear al repo.** Agregar al `.env.local` (gitignored) para desarrollo local y a Vercel env vars para staging/prod.

**Acción futura recomendada a Charris/Jorge:** crear un usuario dedicado en SkyData llamado `api-movimientos` con permisos read-only. El actual `mcalderon` es un usuario comercial — si cambia su password, se rompe la integración.

## 6. UI Components

### 6.1 — `<TripLiveMap tripId={} variant={} />`

**Props:**
- `tripId: string` — UUID del viaje
- `variant: 'full' | 'compact'` — full = altura 400px (programacion), compact = 250px (solicitudes)

**Comportamiento:**
- Mount: llama `/api/gps/trip/${tripId}/position`, renderiza según el `status`.
- Timer: `setInterval` cada 30s re-llama el mismo endpoint. Cleanup en unmount.
- Render por `status`:
  - `live`: mapa con pin animado en `[lat, lon]`, heading como rotación del pin, panel inferior con `place`, `speed`, `evento`, "Actualizado hace X seg"
  - `stale`: mapa con pin gris + banner "Último reporte hace X horas — dispositivo puede estar desconectado"
  - `pickup`: no renderiza el componente (el parent decide)
  - `no_gps`: mensaje discreto "Este vehículo no tiene GPS configurado"
  - `not_in_route`: no renderiza (parent decide)

**Stack del mapa:**
- **Librería renderer**: `maplibre-gl` (BSD-3 license, fork community de Mapbox GL JS 1.x)
- **Wrapper React**: `react-map-gl` v8+ con backend MapLibre (MIT)
- **Source de tiles**: OpenFreeMap public instance, URL de estilo `https://tiles.openfreemap.org/styles/liberty`
- **Sin API keys** — sin registro, sin credit card, sin límites de requests. Atribución (© OpenFreeMap © OpenStreetMap) se agrega automáticamente por MapLibre.

**Estilo**: `liberty` (balanceado, colores naturales). Probado visualmente por James, preferencia final. Alternativas triviales cambiando la URL: `positron` (limpio, minimalista, escala de grises), `bright` (saturado).

**Fallback plan documentado:** si el public instance de OpenFreeMap tiene outage prolongado, se sustituye por MapTiler Cloud (free tier 100K loads/mo). Cambio: URL de estilo + agregar `NEXT_PUBLIC_MAPTILER_KEY` en env vars. 5 minutos.

### 6.2 — Integración en `/programacion/viaje/[id]`

Insertar `<TripLiveMap tripId={trip.id} variant="full" />` entre la sección de info del viaje y la sección de líneas asignadas, solo cuando:

```tsx
{trip.status === 'En Ruta' &&
 !trip.is_self_pickup &&
 trip.vehicle?.gps_vehicle_id && (
  <TripLiveMap tripId={trip.id} variant="full" />
)}
```

**Nota de implementación:** el query de la página debe incluir `gps_vehicle_id` en el `select` del join con `equipment`. Verificar el hook/query correspondiente (probablemente `useTrip` o similar).

### 6.3 — Integración en `/solicitudes/[id]`

Para el PM: una tarjeta compacta en la sección "Viajes Programados", una por cada trip que tenga líneas En Transito. Solo cuando:

```tsx
{relatedTrips
  .filter(t => t.status === 'En Ruta' && !t.is_self_pickup && t.vehicle?.gps_vehicle_id)
  .map(t => (
    <TripLiveMap key={t.id} tripId={t.id} variant="compact" />
  ))
}
```

Si la solicitud tiene líneas en 2 trips distintos En Ruta simultáneamente, se renderizan 2 mapas apilados. Caso raro pero no excluido.

**Nota de implementación:** `useSolicitudes` u hook equivalente para cargar viajes relacionados debe incluir `vehicle:equipment(gps_vehicle_id)` en el select.

### 6.4 — Guards (cuándo NO mostrar el componente)

Diseño de defense-in-depth con dos capas. La capa parent (§6.2, §6.3) previene montar el componente en los casos "obvios" — ahorra una llamada innecesaria al API route y evita UI vacía. La capa componente (API route handler en §5.1) cubre los mismos casos por si el parent cambia o el estado vira entre mount y fetch.

**Layer 1 — Parent (`/programacion/viaje/[id]` y `/solicitudes/[id]`):**

| Condición | Acción del parent |
|-----------|-------------------|
| `trip.status !== 'En Ruta'` | No monta `<TripLiveMap>` |
| `trip.is_self_pickup === true` | No monta `<TripLiveMap>` |
| `trip.vehicle?.gps_vehicle_id` falsy | No monta `<TripLiveMap>` |

**Layer 2 — Componente ya montado (según `status` del API route):**

| `status` devuelto por API | Render del componente |
|---------------------------|----------------------|
| `not_in_route` | No renderiza nada (race condition — parent debería haber filtrado) |
| `pickup` | No renderiza nada (race condition — parent debería haber filtrado) |
| `no_gps` | Mensaje discreto "Este vehículo no tiene GPS configurado" (defensa race condition) |
| `live` | Mapa con pin activo + panel inferior |
| `stale` (>48h) | Mapa con pin gris + banner "Último reporte hace X horas" |
| Error de red / 5xx | Mensaje "No se pudo cargar ubicación" + botón Reintentar |

## 7. Email Template — Fix de `salidaRegistrada`

**Archivo:** `src/lib/notifications/templates/index.ts`

**Cambio:** en la función `salidaRegistrada`, cambiar el CTA de `Ver Viaje →` con URL `${APP_URL}/mis-viajes/${data.referenceId}` a `Ver ubicación en vivo →` con URL `${APP_URL}/solicitudes/${data.solicitudId}`.

Agregar `solicitudId: string` al shape del parámetro `data`. Actualizar el call site en `src/lib/notifications/actions.ts` para pasar el ID de la solicitud correspondiente.

**Subject line:** cambiar de `Viaje {tripId} En Ruta → {destination}` a `Viaje {tripId} en ruta — ver ubicación en vivo → {destination}`.

Las plantillas `viajeAsignadoConductor`, `incidenciaRuta`, `retornoRegistrado` siguen apuntando a `/mis-viajes/[id]` porque son dirigidas al conductor y Charris, que sí tienen acceso a esa pantalla.

## 8. Criterios de Éxito

**Funcional:**
- Charris abre un viaje En Ruta en `/programacion/viaje/[id]` y ve el vehículo en un mapa con posición actualizada dentro de 30 segundos.
- El PM hace click en el link del email "Viaje en ruta" y aterriza en `/solicitudes/[id]` con el mapa del viaje visible.
- Si el vehículo no tiene GPS, el mapa no aparece pero el resto de la pantalla funciona igual.
- Si el viaje es self-pickup, el mapa no aparece.
- Cambiar el status del viaje a Completado hace que el mapa desaparezca sin error.

**No-funcional:**
- Las credenciales SkyData nunca aparecen en el bundle del browser (verificar con DevTools Network tab).
- El caché del server reduce llamadas a SkyData: 5 usuarios viendo el mismo viaje = 1 llamada por TTL de 10s, no 5.
- La página carga en menos de 500ms adicionales vs sin el mapa (MapLibre initial load + API route).
- El mapa no bloquea el render del resto de la página (streaming/Suspense).
- No hay API keys de terceros en el bundle del browser (ni Mapbox token, ni MapTiler key) — OpenFreeMap no requiere auth.

**Regression-safe:**
- Todos los tests E2E existentes pasan sin modificación.
- Las pantallas `/mis-viajes/[id]`, `/dashboard`, timeline de eventos, RLS de conductor — sin cambios.
- Los otros emails (entrega, retorno, asignación) mantienen sus redirects actuales.

## 9. Riesgos y Mitigación

| Riesgo | Prob. | Impacto | Mitigación |
|--------|-------|---------|-----------|
| Password de mcalderon cambia y rompe integración | Alta | Medio | Crear usuario dedicado `api-movimientos` en SkyData. Documentar rotación. Tratar como post-MVP acción, no bloqueante. |
| OpenFreeMap public instance outage | Baja | Bajo | Fallback a MapTiler Cloud free tier (100K loads/mo): cambio de URL de estilo + agregar key en env vars. 5 min. Código aislado en `<TripLiveMap>`. Opción extrema: self-host OpenFreeMap (documentado en su repo). |
| Dispositivos GPS reportan data obsoleta (BUS010 hace 88 días) | Segura | Bajo | Guard `stale > 48h` muestra banner, no rompe la pantalla. Alerta operativa a Jorge/Charris para revisar dispositivos. |
| AD-5 (E2E tests rotos) oculta regresión en `/programacion/viaje/[id]` o `/solicitudes/[id]` | Alta | Alto | **Arreglar AD-5 antes de merge a main**, aunque se pueda shippear a staging sin E2E verdes. |
| Rate limit de SkyData excedido bajo carga picco | Baja | Medio | Caché de 10s + reintento con fallback a caché viejo. Monitorear 529s en Vercel logs. |
| Vercel instance scaling multiplica llamadas SkyData | Baja | Bajo | Aceptable hasta 3-4 instancias. Si pasa: migrar caché a Upstash Redis. |
| Atribución de OpenFreeMap / OpenStreetMap no visible | Baja | Bajo (legal) | MapLibre agrega atribución automática cuando se usa el style URL. Verificar que esté visible en el render inicial. |
| Drift `trip_line_assignments.qty_dispatched` prod vs staging enmascara regenerate | Media | Medio | En lugar de `gen types` full, edición quirúrgica de `database.ts` para añadir solo `gps_vehicle_id`. James decide aparte cómo resolver drift. |

## 10. Preguntas Abiertas

1. **¿Creamos usuario dedicado `api-movimientos` en SkyData antes del deploy?** Recomendación: sí, pero no bloquea MVP. Puede ser post-deploy.
2. ~~**¿Qué tile style usar de OpenFreeMap — liberty, positron, o bright?**~~ **CERRADO 2026-04-20:** `liberty`. Probado visualmente por James, preferencia final. Cambio de estilo posterior = 1 string en la URL de la source.
3. **¿El mapa respeta el modo mobile?** Sí, MapLibre GL es responsive por default. Sin customización especial para MVP.
4. **¿El mapa también en `/programacion/viaje/[id]` para status=Programado como preview?** No en MVP. Se ve sólo En Ruta. Consideramos en iteración 2.
5. **¿Qué hace el frontend si el API route retorna un 5xx persistente?** Banner "No se pudo cargar ubicación" + botón "Reintentar". No se reintenta auto más de 3 veces para no hacer hammering.
6. **¿Patrocinio a OpenFreeMap?** El mantenedor (Zsolt Ero) acepta donaciones en GitHub Sponsors. Si el proyecto se consolida y depende de su instancia, considerar una donación mensual pequeña (ej. $5-10). No bloqueante; decisión post-deploy.

## 11. Prompt para Claude Code

```
CONTEXTO:
MovimientOS necesita integración de GPS live tracking via SkyData/SkyGlobal API.
Scope: mostrar ubicación en vivo del vehículo asignado a un trip En Ruta,
en las pantallas /programacion/viaje/[id] (primaria, Charris) y /solicitudes/[id]
(secundaria, PM). El feature spec completo está en
Docs/superpowers/specs/2026-04-20-gps-live-tracking-design.md.

TU OBJETIVO:
Implementar el feature tal como está especificado en el spec. Cuando termines,
debe ser posible que un usuario con rol logistica abra un trip En Ruta y vea
el vehículo moviéndose en un mapa, y que el PM reciba el email "salida" con
link al mapa en su solicitud.

ARCHIVOS CLAVE A TOCAR:
- src/lib/gps/skydata-client.ts                        — NUEVO, client + caché
- src/app/api/gps/trip/[tripId]/position/route.ts      — NUEVO, API route
- src/components/gps/TripLiveMap.tsx                    — NUEVO, componente React
- src/app/(app)/programacion/viaje/[id]/page.tsx       — MODIFICAR, insertar componente + extender query
- src/app/(app)/solicitudes/[id]/page.tsx              — MODIFICAR, insertar componente + extender query
- src/lib/notifications/templates/index.ts              — MODIFICAR, fix salidaRegistrada (CTA + subject)
- src/lib/notifications/actions.ts                      — MODIFICAR, pasar solicitudId al template
- src/hooks/useTrips.ts (o equivalente)                 — MODIFICAR, incluir gps_vehicle_id en select
- src/lib/types/database.ts                             — MODIFICAR QUIRURGICAMENTE, añadir gps_vehicle_id a equipment Row/Insert/Update (NO regenerate full por drift qty_dispatched)
- Docs/CHANGELOG.md                                     — AGREGAR entry [bd-pending] con bloques SQL
- .env.local.example                                    — AGREGAR vars SKYDATA_*

NO crear archivos en supabase/migrations/. La convención del proyecto es
[bd-pending] → [bd] en CHANGELOG.md. James corre el SQL manualmente en
Supabase SQL Editor (staging primero, luego prod).

DEPENDENCIAS A INSTALAR:
- maplibre-gl (BSD-3, fork open-source de Mapbox GL JS 1.x)
- react-map-gl (v8+, MIT, con backend MapLibre)

STACK DEL MAPA:
- Renderer: maplibre-gl (NO mapbox-gl)
- Wrapper React: react-map-gl con import desde react-map-gl/maplibre
- Source de tiles: OpenFreeMap public instance
  URL de estilo: https://tiles.openfreemap.org/styles/liberty
  (alternativas triviales: .../positron o .../bright — cambio de un string)
- Sin API keys, sin registro, sin env vars para el mapa.

NO HAGAS:
- No uses mapbox-gl ni NEXT_PUBLIC_MAPBOX_TOKEN.
- No crees tablas de persistencia (ni gps_telemetry_raw) — MVP sin persistencia.
- No implementes webhooks ni data-forwarding-rules.
- No agregues mapa en /mis-viajes/[id] ni en /dashboard.
- No polígonos de proyecto, no breadcrumb de ruta histórica.
- No toques los otros email templates.
- No escribas a Supabase vía MCP — solo LEER.
- No crees archivos en supabase/migrations/.

SUCCESS CRITERIA:
1. Charris abre trip En Ruta → ve mapa con pin del vehículo, actualizado cada 30s.
2. PM con línea En Transito abre /solicitudes/[id] → ve mapa compacto.
3. DevTools Network: no aparece el API key de SkyData en requests del browser.
4. Con vehicle.gps_vehicle_id NULL → mensaje "sin GPS", sin error.
5. Con trip.is_self_pickup=true → mapa no se monta.
6. Con trip.status=Completado → mapa no se monta.
7. Email "Viaje en Ruta" al PM linkea a /solicitudes/[id], no a /mis-viajes/[id].
8. Tests E2E existentes pasan sin modificación.
9. Componente <TripLiveMap> es el mismo archivo en ambas pantallas.
10. Caché del server reduce llamadas SkyData: verificable con logs.

WORKFLOW SUGERIDO:
- TDD donde aplique (API route, lógica de skydata-client).
- Playwright smoke test al final.
- Testear con BOTH: vehículo fresco (ES3830, 10 min) y stale (BUS010, 88 días).
```

---

## Changelog

| Version | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | 2026-04-20 | Versión inicial. Scope MVP-only confirmado por James. |
| 1.1 | 2026-04-20 | Stack de mapa cambiado a open-source: MapLibre GL JS + OpenFreeMap public instance. Removidas referencias a Mapbox token. Confirmado: API de SkyData incluido en contrato. |
| 1.2 | 2026-04-20 | Brainstorming session. Schema delta reframed a `[bd-pending]` del proyecto (no archivos en supabase/migrations/). Añadido §4.3 regenerar types con guard anti-drift qty_dispatched. Notas de implementación en §6.2 y §6.3. Path `actions.ts` corregido. Spec movido a `Docs/superpowers/specs/`. §6.4 reescrito como defense-in-depth de 2 capas. §10.2 cerrado: default tile style = `positron`. |
| 1.3 | 2026-04-22 | Sync con código shippeado: tile style = `liberty`, no `positron`. El spec v1.2 había cerrado §10.2 en `positron`, pero el código shippeó con `liberty` (preferencia visual final de James tras probar ambos). Corregido §3, §6, §10.2, y el bloque "STACK DEL MAPA" para reflejar `liberty`. La entry v1.2 queda intacta como registro histórico de la decisión original (superseded por esta v1.3). |
