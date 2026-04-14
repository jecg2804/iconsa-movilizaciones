'use client'

import { useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'

// --- Tipos exportados ---

export type TripEventType = 'Salida' | 'Llegada' | 'Entrega' | 'Retorno' | 'Incidencia' | 'Preparacion' | 'Retiro' | 'Parada'

export interface TripEventInput {
  id?: string // UUID pre-generado para folder de storage
  event_type: TripEventType
  event_timestamp: string
  location?: string | null
  notes?: string | null
  confirmation_code_used?: string | null
  received_by_id?: string | null
  received_by_name?: string | null
  attachments?: unknown[] | null
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
        // Guard: Salida/Entrega ahora se manejan desde DispatchModal/DeliveryModal
        if (input.event_type === 'Salida') {
          setRegisterError('Salida debe registrarse desde el modal de Despacho')
          return false
        }
        if (input.event_type === 'Entrega') {
          setRegisterError('Entrega debe registrarse desde el modal de Entrega')
          return false
        }

        // 1. INSERT trip_events (INMUTABLE — sin UPDATE/DELETE)
        const { error: eventError } = await supabase.from('trip_events').insert({
          ...(input.id ? { id: input.id } : {}),
          trip_id: tripId,
          event_type: input.event_type,
          event_timestamp: input.event_timestamp,
          location: input.location ?? null,
          registered_by: person?.id ?? null,
          confirmation_code_used: input.confirmation_code_used ?? null,
          received_by_id: input.received_by_id ?? null,
          received_by_name: input.received_by_name ?? null,
          notes: input.notes ?? null,
          attachments: JSON.parse(JSON.stringify(input.attachments ?? [])),
        })

        if (eventError) {
          // Si el insert ya existía (respuesta perdida en intento anterior), tratar como éxito
          if (eventError.code === '23505') {
            console.warn('[TripEvents] Duplicate key detected — treating as idempotent success')
          } else {
            setRegisterError(eventError.message)
            return false
          }
        }

        // 2. Transiciones de estado según tipo de evento
        // NOTA: Salida y Entrega redirigidos a DispatchModal y DeliveryModal respectivamente.
        // Los guards arriba retornan error si se intenta registrarlos por esta vía.

        if (input.event_type === 'Llegada') {
          // trips → actual_arrival
          const { error: tripError } = await supabase
            .from('trips')
            .update({ actual_arrival: input.event_timestamp })
            .eq('id', tripId)

          if (tripError) {
            setRegisterError(tripError.message)
            return false
          }
        } else if (input.event_type === 'Retorno') {
          // Retorno es NO-OP para cantidades: solo marca el viaje Completado.
          // Si hay líneas En Transito sin entregar, el guard en UI avisa — y quedan visibles
          // en el dashboard "Entregas pendientes en viajes cerrados" para resolver después.
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
