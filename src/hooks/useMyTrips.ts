'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

// --- Tipos exportados ---

export interface MyTripEvent {
  id: string
  event_type: string
  event_timestamp: string
  registered_by: { name: string } | null
  notes: string | null
}

export interface MyTripAssignment {
  id: string
  quantity_assigned: number
  line: {
    id: string
    description: string
    line_type: string
    status: string
    from_location: { name: string } | null
    to_location: { name: string } | null
    from_text: string | null
    to_text: string | null
    request: { request_id: string | null; date_required: string } | null
  } | null
}

export interface MyTripSummary {
  id: string
  trip_id: string | null
  scheduled_date: string
  status: string
  confirmation_code: string | null
  att_permit: boolean | null
  escort: boolean | null
  driver: { id: string; name: string } | null
  vehicle: { id: string; description: string; spectrum_code: string | null } | null
  trailer: { id: string; description: string } | null
  assignments: MyTripAssignment[]
  events: MyTripEvent[]
}

// --- Helper: extrae objeto de un campo que Supabase puede devolver como array o como objeto ---
function unwrap<T>(value: T | T[] | null | undefined): T | null {
  if (value === null || value === undefined) return null
  if (Array.isArray(value)) return value[0] ?? null
  return value
}

// --- Hook ---

export function useMyTrips() {
  const supabase = useMemo(() => createClient(), [])
  const [trips, setTrips] = useState<MyTripSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTrips = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('trips')
        .select(`
          id,
          trip_id,
          scheduled_date,
          status,
          confirmation_code,
          att_permit,
          escort,
          driver:driver_id(id, name),
          vehicle:vehicle_id(id, description, spectrum_code),
          trailer:trailer_id(id, description),
          assignments:trip_line_assignments(
            id,
            quantity_assigned,
            line:request_line_id(
              id,
              description,
              line_type,
              status,
              from_location:from_location_id(name),
              to_location:to_location_id(name),
              from_text,
              to_text,
              request:request_id(request_id, date_required)
            )
          ),
          events:trip_events(
            id,
            event_type,
            event_timestamp,
            registered_by:registered_by(name),
            notes
          )
        `)
        .order('scheduled_date', { ascending: false })

      if (fetchError) {
        setError(fetchError.message)
        return
      }

      const mapped: MyTripSummary[] = (data ?? []).map((row) => {
        const r = row as unknown as Record<string, unknown>

        const driver = unwrap(r.driver as { id: string; name: string } | null)
        const vehicle = unwrap(
          r.vehicle as { id: string; description: string; spectrum_code: string | null } | null,
        )
        const trailer = unwrap(r.trailer as { id: string; description: string } | null)

        const rawAssignments = Array.isArray(r.assignments) ? r.assignments : []
        const assignments: MyTripAssignment[] = (rawAssignments as Record<string, unknown>[]).map((a) => {
          const rawLine = a.line as Record<string, unknown> | null
          if (!rawLine) return { id: a.id as string, quantity_assigned: a.quantity_assigned as number, line: null }

          const fromLoc = unwrap(rawLine.from_location as { name: string } | null)
          const toLoc = unwrap(rawLine.to_location as { name: string } | null)
          const rawReq = unwrap(rawLine.request as { request_id: string | null; date_required: string } | null)

          return {
            id: a.id as string,
            quantity_assigned: a.quantity_assigned as number,
            line: {
              id: rawLine.id as string,
              description: rawLine.description as string,
              line_type: rawLine.line_type as string,
              status: rawLine.status as string,
              from_location: fromLoc,
              to_location: toLoc,
              from_text: (rawLine.from_text as string | null) ?? null,
              to_text: (rawLine.to_text as string | null) ?? null,
              request: rawReq ?? null,
            },
          }
        })

        const rawEvents = Array.isArray(r.events) ? r.events : []
        const events: MyTripEvent[] = (rawEvents as Record<string, unknown>[]).map((e) => ({
          id: e.id as string,
          event_type: e.event_type as string,
          event_timestamp: e.event_timestamp as string,
          registered_by: unwrap(e.registered_by as { name: string } | null),
          notes: (e.notes as string | null) ?? null,
        }))

        // Ordenar eventos por timestamp ascendente
        events.sort((a, b) =>
          new Date(a.event_timestamp).getTime() - new Date(b.event_timestamp).getTime(),
        )

        return {
          id: r.id as string,
          trip_id: (r.trip_id as string | null) ?? null,
          scheduled_date: r.scheduled_date as string,
          status: r.status as string,
          confirmation_code: (r.confirmation_code as string | null) ?? null,
          att_permit: (r.att_permit as boolean | null) ?? null,
          escort: (r.escort as boolean | null) ?? null,
          driver,
          vehicle,
          trailer,
          assignments,
          events,
        }
      })

      setTrips(mapped)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar viajes'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    void fetchTrips()
  }, [fetchTrips])

  return { trips, loading, error, refetch: fetchTrips }
}
