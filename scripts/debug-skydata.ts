/**
 * Debug probe for the SkyData / SkyGlobal GPS API.
 *
 * Correr cuando:
 *   (a) SkyData responde raro (errores intermitentes, shapes inesperados).
 *   (b) Un vehículo con `gps_vehicle_id` seteado no aparece en el mapa
 *       (típico: placeholder "sin coordenadas válidas" o canvas gris).
 *   (c) Después de un update mayor de la plataforma SkyData (field renames,
 *       cambios de auth, nuevos endpoints).
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/debug-skydata.ts
 *
 * Lee credenciales de process.env (`SKYDATA_API_KEY`, opcionalmente
 * `SKYDATA_BASE_URL`). El API nuevo (acceso.skydatalatam.com) autentica con
 * key como query param, sin password. Si falta la key, aborta. Nada hardcoded.
 *
 * NO se ejecuta en hooks, builds, ni pipelines. Tool manual de diagnóstico.
 *
 * Imprime:
 *   1. Ejemplo raw del primer vehículo (shape exacto de SkyData).
 *   2. Ese mismo vehículo normalizado via la misma función que usa el runtime.
 *   3. Breakdown fresh/stale usando el umbral de 48h.
 *   4. Field presence report — el canario: si SkyData renombra o deja de
 *      enviar un field, el conteo baja y el drift se ve de inmediato.
 *   5. Sanity check de coords normalizadas (0/0, NaN, fuera de rango).
 *
 * Historia: el normalizer original asumía fields `lat`/`lon` pero SkyData usa
 * `x`/`y` (convención geométrica, donde x=lon, y=lat). Todos los vehículos
 * salían en (0,0) y el mapa se veía gris. Un probe manual expuso el mismatch
 * en 10 segundos. Este script automatiza ese probe para la próxima vez.
 */

import { normalize } from '../src/lib/gps/skydata-client'
import type { VehiclePosition } from '../src/lib/gps/types'

const STALE_THRESHOLD_HOURS = 48

// Fields que la app (o su normalizer) consume del payload crudo del API nuevo
// (acceso.skydatalatam.com /unit/list.json). El canario: si SkyData renombra
// o deja de enviar un field, el conteo baja y el drift se ve de inmediato.
const EXPECTED_FIELDS = [
  'unit_id', 'number', 'vin',
  'lat', 'lng',
  'speed', 'direction',
  'state', 'movement_state',
  'last_update', 'mileage',
] as const

async function main() {
  const key = process.env.SKYDATA_API_KEY
  const baseUrl = process.env.SKYDATA_BASE_URL ?? 'https://acceso.skydatalatam.com/api/v1'
  if (!key) {
    console.error('[debug-skydata] missing SKYDATA_API_KEY in env')
    process.exit(1)
  }

  const resp = await fetch(`${baseUrl}/unit/list.json?key=${encodeURIComponent(key)}`, {
    cache: 'no-store',
  })
  if (!resp.ok) {
    console.error(`[debug-skydata] upstream ${resp.status}`)
    console.error((await resp.text()).slice(0, 500))
    process.exit(1)
  }

  const raw = (await resp.json()) as { data?: { units?: unknown } }
  const units = raw?.data?.units
  const list = Array.isArray(units) ? (units as Record<string, unknown>[]) : []

  console.log(`Fetched ${list.length} vehicle${list.length === 1 ? '' : 's'}`)
  if (list.length === 0) {
    console.warn('[debug-skydata] empty response — nothing more to report')
    return
  }

  console.log('\n=== Raw object example (first vehicle) ===')
  console.log(JSON.stringify(list[0], null, 2))

  const normalized: VehiclePosition[] = list.map((row) => normalize(row))

  console.log('\n=== Normalized (first vehicle) ===')
  console.log(JSON.stringify(normalized[0], null, 2))

  // Fresh / stale breakdown — misma lógica que isStale() del client.
  const nowSec = Math.floor(Date.now() / 1000)
  const thresholdSec = STALE_THRESHOLD_HOURS * 3600
  let fresh = 0
  let stale = 0
  let noEpoch = 0
  for (const v of normalized) {
    if (!v.epoch) noEpoch++
    else if (nowSec - v.epoch <= thresholdSec) fresh++
    else stale++
  }
  console.log(`\n=== Fresh / stale breakdown (umbral ${STALE_THRESHOLD_HOURS}h) ===`)
  console.log(`Fresh (<${STALE_THRESHOLD_HOURS}h):  ${fresh}`)
  console.log(`Stale (>${STALE_THRESHOLD_HOURS}h):  ${stale}`)
  console.log(`Sin epoch:       ${noEpoch}`)

  // Field presence report — el canario para drift de API.
  console.log('\n=== Field presence report ===')
  const total = list.length
  const maxLen = Math.max(...EXPECTED_FIELDS.map(f => f.length))
  for (const field of EXPECTED_FIELDS) {
    const present = list.filter(row => row[field] !== undefined && row[field] !== null).length
    const pad = ' '.repeat(maxLen - field.length)
    const warn = present === 0 ? '  ⚠ ningún vehículo tiene este field' : ''
    console.log(`  ${field}${pad}: ${present}/${total}${warn}`)
  }

  // Sanity check de coords normalizadas — espejea isValidPosition del componente.
  let invalidCoord = 0
  for (const v of normalized) {
    const valid = Number.isFinite(v.lat) && Number.isFinite(v.lon)
      && !(v.lat === 0 && v.lon === 0)
      && Math.abs(v.lat) <= 90 && Math.abs(v.lon) <= 180
    if (!valid) invalidCoord++
  }
  console.log('\n=== Normalized coord sanity ===')
  console.log(`Vehículos con coords inválidas (0/0, NaN, fuera de rango): ${invalidCoord}/${total}`)
}

main().catch(err => {
  console.error('[debug-skydata] THREW:', err)
  process.exit(1)
})
