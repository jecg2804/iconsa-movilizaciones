'use client'

import { useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'

// --- Tipos exportados ---

export type TripEventType = 'Salida' | 'Llegada' | 'Entrega' | 'Retorno' | 'Incidencia'

export interface TripEventInput {
  event_type: TripEventType
  event_timestamp: string
  location?: string | null
  notes?: string | null
  confirmation_code_used?: string | null
  received_by_id?: string | null
  received_by_name?: string | null
}

// --- Hook ---

export function useTripEvents(tripId: string) {
  const supabase = useMemo(() => createClient(), [])
  const { person } = useAuth()

  const [registering, setRegistering] = useState(false)
  const [registerError, setRegisterError] = useState<string | null>(null)

  /**
   * Registra un evento en el viaje y aplica transiciones de estado.
   * @param input Datos del evento
   * @param assignedLineIds IDs de sm_request_lines asignados al viaje (requerido para Salida y Entrega)
   */
  const registerEvent = useCallback(
    async (input: TripEventInput, assignedLineIds: string[]): Promise<boolean> => {
      setRegistering(true)
      setRegisterError(null)

      try {
        // 1. INSERT trip_events (INMUTABLE — sin UPDATE/DELETE)
        const { error: eventError } = await supabase.from('trip_events').insert({
          trip_id: tripId,
          event_type: input.event_type,
          event_timestamp: input.event_timestamp,
          location: input.location ?? null,
          registered_by: person?.id ?? null,
          confirmation_code_used: input.confirmation_code_used ?? null,
          received_by_id: input.received_by_id ?? null,
          received_by_name: input.received_by_name ?? null,
          notes: input.notes ?? null,
        })

        if (eventError) {
          setRegisterError(eventError.message)
          return false
        }

        // 2. Transiciones de estado según tipo de evento

        if (input.event_type === 'Salida') {
          // trips → En Ruta + actual_departure
          const { error: tripError } = await supabase
            .from('trips')
            .update({
              status: 'En Ruta',
              actual_departure: input.event_timestamp,
            })
            .eq('id', tripId)

          if (tripError) {
            setRegisterError(tripError.message)
            return false
          }

          // líneas → En Tránsito
          if (assignedLineIds.length > 0) {
            const { error: linesError } = await supabase
              .from('sm_request_lines')
              .update({ status: 'En Tránsito', updated_by: person?.id ?? null })
              .in('id', assignedLineIds)

            if (linesError) {
              setRegisterError(linesError.message)
              return false
            }
          }
        } else if (input.event_type === 'Llegada') {
          // trips → actual_arrival
          const { error: tripError } = await supabase
            .from('trips')
            .update({ actual_arrival: input.event_timestamp })
            .eq('id', tripId)

          if (tripError) {
            setRegisterError(tripError.message)
            return false
          }
        } else if (input.event_type === 'Entrega') {
          // líneas → Entregada + qty_delivered + delivered_at
          if (assignedLineIds.length > 0) {
            // Obtener quantity_assigned de trip_line_assignments para cada línea
            const { data: assignments } = await supabase
              .from('trip_line_assignments')
              .select('request_line_id, quantity_assigned')
              .eq('trip_id', tripId)
              .in('request_line_id', assignedLineIds)

            const now = new Date().toISOString()

            // Actualizar cada línea con su qty_delivered correspondiente
            for (const lineId of assignedLineIds) {
              const assignment = assignments?.find((a) => a.request_line_id === lineId)
              const qtyDelivered = assignment?.quantity_assigned ?? 0

              const { error: lineError } = await supabase
                .from('sm_request_lines')
                .update({
                  status: 'Entregada',
                  qty_delivered: qtyDelivered,
                  delivered_at: now,
                  updated_by: person?.id ?? null,
                })
                .eq('id', lineId)

              if (lineError) {
                setRegisterError(lineError.message)
                return false
              }
            }
          }
        } else if (input.event_type === 'Retorno') {
          // trips → Completado
          const { error: tripError } = await supabase
            .from('trips')
            .update({ status: 'Completado' })
            .eq('id', tripId)

          if (tripError) {
            setRegisterError(tripError.message)
            return false
          }
        }
        // 'Incidencia' — sin cambios de estado

        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al registrar evento'
        setRegisterError(message)
        return false
      } finally {
        setRegistering(false)
      }
    },
    [supabase, tripId, person],
  )

  return { registering, registerError, registerEvent }
}
