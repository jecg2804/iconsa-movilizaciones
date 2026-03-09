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
              .update({ status: 'En Tránsito' })
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
          // líneas → Entregada (trigger BD cascade_request_status actualiza solicitudes)
          if (assignedLineIds.length > 0) {
            const { error: linesError } = await supabase
              .from('sm_request_lines')
              .update({ status: 'Entregada' })
              .in('id', assignedLineIds)

            if (linesError) {
              setRegisterError(linesError.message)
              return false
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
