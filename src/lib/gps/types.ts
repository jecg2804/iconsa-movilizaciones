// Shared types between the API route, the SkyData client, and the React component.

export interface VehiclePosition {
  /** SkyData internal vehicle id (text — they sometimes use numeric strings). */
  vehId: string
  /** Decimal degrees. */
  lat: number
  /** Decimal degrees. */
  lon: number
  /** km/h as reported by the device. */
  speed: number
  /** Degrees, 0 = north, clockwise. May be 0 when stationary. */
  heading: number
  /** Free-text status from SkyData (e.g. "Moving", "Stopped", "Idle"). */
  event: string
  /** Reverse-geocoded address string from SkyData. */
  place: string
  /** Unix epoch seconds of the last report. */
  epoch: number
  /** Odometer in km (cumulative). */
  odometer: number
}

export type GpsTripPosition =
  | { status: 'live'; position: VehiclePosition }
  | { status: 'stale'; lastReport: VehiclePosition }
  | { status: 'not_in_route' }
  | { status: 'pickup' }
  | { status: 'no_gps' }
