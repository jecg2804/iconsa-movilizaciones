import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getVehiclePosition, isStale } from '@/lib/gps/skydata-client'
import type { GpsTripPosition } from '@/lib/gps/types'

interface RouteContext {
  params: Promise<{ tripId: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  const { tripId } = await context.params

  const supabase = await createClient()

  // Auth gate — RLS también bloquea, pero queremos un 401 limpio en vez de 404.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Lookup del viaje. RLS aplica; si el usuario no puede verlo, retorna null.
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id, status, vehicle_id')
    .eq('id', tripId)
    .maybeSingle()

  if (tripError) {
    return NextResponse.json({ error: tripError.message }, { status: 500 })
  }
  if (!trip) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (trip.status !== 'En Ruta') {
    const body: GpsTripPosition = { status: 'not_in_route' }
    return NextResponse.json(body)
  }
  if (!trip.vehicle_id) {
    const body: GpsTripPosition = { status: 'no_gps' }
    return NextResponse.json(body)
  }

  const { data: equipment, error: equipError } = await supabase
    .from('equipment')
    .select('gps_vehicle_id')
    .eq('id', trip.vehicle_id)
    .maybeSingle()

  if (equipError) {
    return NextResponse.json({ error: equipError.message }, { status: 500 })
  }
  if (!equipment?.gps_vehicle_id) {
    const body: GpsTripPosition = { status: 'no_gps' }
    return NextResponse.json(body)
  }

  try {
    const position = await getVehiclePosition(equipment.gps_vehicle_id)
    if (!position) {
      const body: GpsTripPosition = { status: 'no_gps' }
      return NextResponse.json(body)
    }
    if (isStale(position)) {
      const body: GpsTripPosition = { status: 'stale', lastReport: position }
      return NextResponse.json(body)
    }
    const body: GpsTripPosition = { status: 'live', position }
    return NextResponse.json(body)
  } catch (err) {
    console.error('[gps] upstream failure', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'GPS provider unavailable' }, { status: 502 })
  }
}
