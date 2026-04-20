import type { VehiclePosition } from './types'

const TTL_MS = 10_000
const STALE_THRESHOLD_HOURS = 48

let cache: { data: VehiclePosition[]; timestamp: number } | null = null
let inflight: Promise<VehiclePosition[]> | null = null

function readCredentials(): { key: string; password: string; baseUrl: string } {
  const key = process.env.SKYDATA_API_KEY
  const password = process.env.SKYDATA_API_PASSWORD
  const baseUrl = process.env.SKYDATA_BASE_URL ?? 'https://app.skydataglobal.com'
  if (!key || !password) {
    throw new Error(
      '[skydata] SKYDATA_API_KEY or SKYDATA_API_PASSWORD missing in env',
    )
  }
  return { key, password, baseUrl }
}

/**
 * Normaliza una fila cruda del array que devuelve `/api/fleet/status` al
 * shape interno VehiclePosition. SkyData usa nomenclatura geográfica:
 *   y = latitud, x = longitud (ambos strings de número).
 *   vehId es number, hay que stringificar.
 *   event es number (código); eventDescription es el string human-readable.
 * Probado contra el payload real el 2026-04-20 con 13 vehículos de ICONSA.
 *
 * Exportado para `scripts/debug-skydata.ts` — consumirlo desde ahí mantiene
 * el debug en sync con el runtime (un solo sitio donde los nombres viven).
 * No usarlo desde runtime externo a este módulo.
 */
export function normalize(row: Record<string, unknown>): VehiclePosition {
  return {
    vehId: String(row.vehId ?? row.id ?? ''),
    lat: Number(row.y ?? row.lat ?? 0),
    lon: Number(row.x ?? row.lon ?? row.lng ?? 0),
    speed: Number(row.speed ?? 0),
    heading: Number(row.heading ?? row.course ?? 0),
    event: String(row.eventDescription ?? row.event ?? ''),
    place: String(row.place ?? ''),
    epoch: Number(row.epoch ?? 0),
    odometer: Number(row.odometer ?? 0),
  }
}

/**
 * Devuelve la lista completa de vehículos desde SkyData con caché compartido
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
  const { key, password, baseUrl } = readCredentials()
  const auth = Buffer.from(`${key}:${password}`).toString('base64')
  inflight = fetch(`${baseUrl}/api/fleet/status`, {
    headers: { Authorization: `Basic ${auth}` },
    cache: 'no-store',
  })
    .then(async (resp) => {
      if (!resp.ok) {
        if (cache) return cache.data
        throw new Error(`[skydata] upstream ${resp.status}`)
      }
      const raw = (await resp.json()) as unknown
      const list = Array.isArray(raw) ? raw : []
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
 * Filtra fleet status al vehículo específico. Devuelve null si no aparece.
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
