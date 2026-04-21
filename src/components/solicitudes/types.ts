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
