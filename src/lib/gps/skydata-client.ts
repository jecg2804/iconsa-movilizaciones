import type { VehiclePosition } from './types'

const TTL_MS = 10_000
const STALE_THRESHOLD_HOURS = 48
const DEFAULT_BASE_URL = 'https://acceso.skydatalatam.com/api/v1'

let cache: { data: VehiclePosition[]; timestamp: number } | null = null
let inflight: Promise<VehiclePosition[]> | null = null

/**
 * API nueva (SkyData Latam, acceso.skydatalatam.com). Migración 2026-06-12
 * desde la vieja (app.skydataglobal.com, Basic auth + /api/fleet/status).
 * La nueva autentica con la API key como query param `?key=` (sin password)
 * y el endpoint `unit/list.json` devuelve `{ data: { units: [...] } }` con la
 * última posición de cada unidad incluida.
 */
function readCredentials(): { key: string; baseUrl: string } {
  const key = process.env.SKYDATA_API_KEY
  const baseUrl = process.env.SKYDATA_BASE_URL ?? DEFAULT_BASE_URL
  if (!key) {
    throw new Error('[skydata] SKYDATA_API_KEY missing in env')
  }
  return { key, baseUrl }
}

/** Mapea el estado de movimiento del API a un texto corto para la UI. */
function translateState(name: string): string {
  switch (name) {
    case 'driving':
      return 'En movimiento'
    case 'standing':
    case 'stopped':
      return 'Detenido'
    case 'parked':
      return 'Estacionado'
    case 'idle':
    case 'idling':
      return 'Ralentí'
    default:
      return name
  }
}

/**
 * Normaliza una fila de `unit/list.json` al shape interno VehiclePosition.
 * El API nuevo usa: `unit_id` (number), `lat`/`lng` (decimal degrees),
 * `direction` (heading), `speed` (puede ser null), `mileage` (km acumulados),
 * `last_update` (ISO 8601 UTC, p. ej. "2026-06-12T15:19:50Z"), y `state`/
 * `movement_state` como objeto `{ name, start, duration }`. El endpoint NO
 * incluye dirección reverse-geocoded, así que `place` queda vacío (la UI
 * muestra "—"). Probado contra el payload real el 2026-06-12 (15 unidades).
 *
 * Exportado para `scripts/debug-skydata.ts` — un solo sitio donde los nombres
 * de campo del API viven. No usar desde runtime externo a este módulo.
 */
export function normalize(row: Record<string, unknown>): VehiclePosition {
  const stateName =
    (row.state as { name?: unknown } | undefined)?.name ??
    (row.movement_state as { name?: unknown } | undefined)?.name
  const lastUpdate = row.last_update
  const epoch =
    typeof lastUpdate === 'string'
      ? Math.floor(Date.parse(lastUpdate) / 1000)
      : Number(lastUpdate ?? 0)
  return {
    vehId: String(row.unit_id ?? ''),
    lat: Number(row.lat ?? 0),
    lon: Number(row.lng ?? row.lon ?? 0),
    speed: Number(row.speed ?? 0),
    heading: Number(row.direction ?? row.heading ?? 0),
    event: translateState(typeof stateName === 'string' ? stateName : ''),
    place: '',
    epoch: Number.isFinite(epoch) ? epoch : 0,
    odometer: Number(row.mileage ?? 0),
  }
}

/**
 * Devuelve la lista completa de unidades desde SkyData con caché compartido
 * de 10s. Concurrent callers comparten una sola promise inflight para evitar
 * stampede al expirar el TTL bajo carga.
 */
export async function getFleetStatus(): Promise<VehiclePosition[]> {
  if (cache && Date.now() - cache.timestamp < TTL_MS) {
    return cache.data
  }
  if (inflight) {
    return inflight
  }
  const { key, baseUrl } = readCredentials()
  const url = `${baseUrl}/unit/list.json?key=${encodeURIComponent(key)}`
  inflight = fetch(url, { cache: 'no-store' })
    .then(async (resp) => {
      if (!resp.ok) {
        if (cache) return cache.data
        throw new Error(`[skydata] upstream ${resp.status}`)
      }
      const raw = (await resp.json()) as { data?: { units?: unknown } }
      const units = raw?.data?.units
      const list = Array.isArray(units) ? units : []
      const data = list.map((row) => normalize(row as Record<string, unknown>))
      cache = { data, timestamp: Date.now() }
      return data
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}

/**
 * Filtra fleet status al vehículo específico (match por unit_id stringificado).
 * Devuelve null si no aparece.
 */
export async function getVehiclePosition(
  gpsVehicleId: string,
): Promise<VehiclePosition | null> {
  const fleet = await getFleetStatus()
  return fleet.find((v) => v.vehId === gpsVehicleId) ?? null
}

/** True si el último reporte es más viejo que el threshold de stale (48h). */
export function isStale(position: VehiclePosition, nowMs = Date.now()): boolean {
  if (!position.epoch) return true
  const ageMs = nowMs - position.epoch * 1000
  return ageMs > STALE_THRESHOLD_HOURS * 60 * 60 * 1000
}
