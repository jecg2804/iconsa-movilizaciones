// Shared types between the API route, the SkyData client, and the React component.

export interface VehiclePosition {
  /** SkyData `unit_id` stringificado (matchea `equipment.gps_vehicle_id`). */
  vehId: string
  /** Decimal degrees. */
  lat: number
  /** Decimal degrees. */
  lon: number
  /** km/h as reported by the device. */
  speed: number
  /** Degrees, 0 = north, clockwise. May be 0 when stationary. */
  heading: number
  /** Estado de movimiento traducido (p. ej. "En movimiento", "Detenido"). */
  event: string
  /** Dirección reverse-geocoded. Vacío con el API nuevo (unit/list no la trae). */
  place: string
  /** Unix epoch seconds del último reporte (derivado de `last_update` ISO). */
  epoch: number
  /** Odómetro en km (cumulativo, campo `mileage`). */
  odometer: number
}

export type GpsTripPosition =
  | { status: 'live'; position: VehiclePosition }
  | { status: 'stale'; lastReport: VehiclePosition }
  | { status: 'not_in_route' }
  | { status: 'pickup' }
  | { status: 'no_gps' }
