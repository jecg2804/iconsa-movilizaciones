'use client'

import { useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'

// --- Tipos exportados ---

export type TripEventType = 'Salida' | 'Llegada' | 'Entrega' | 'Retorno' | 'Incidencia' | 'Preparacion' | 'Retiro'

export interface TripEventInput {
  id?: string // UUID pre-generado para folder de storage
  event_type: TripEventType
  event_timestamp: string
  location?: string | null
  notes?: string | null
  confirmation_code_used?: string | null
  received_by_id?: string | null
  received_by_name?: string | null
  deliveredQuantities?: Record<string, number> // lineId → qty entregada en ESTE viaje
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
          // Revertir líneas no entregadas: truck came back without delivering them
          if (assignedLineIds.length > 0) {
            const { data: undelivered } = await supabase
              .from('sm_request_lines')
              .select('id, qty_scheduled, quantity, qty_delivered')
              .in('id', assignedLineIds)
              .in('status', ['En Transito', 'Programada'])

            for (const line of undelivered ?? []) {
              const { data: assignment } = await supabase
                .from('trip_line_assignments')
                .select('quantity_assigned')
                .eq('trip_id', tripId)
                .eq('request_line_id', line.id)
                .single()

              const qtyAssigned = assignment?.quantity_assigned ?? 0
              const newQtyScheduled = Math.max(0, (line.qty_scheduled ?? 0) - qtyAssigned)
              const newStatus = (line.qty_delivered ?? 0) > 0 ? 'Parcial' : 'Pendiente'

              await supabase
                .from('sm_request_lines')
                .update({
                  status: newStatus,
                  qty_scheduled: newQtyScheduled,
                  updated_by: person?.id ?? null,
                })
                .eq('id', line.id)

              // Resetear qty_dispatched en la asignación (el camión regresó sin entregar)
              await supabase
                .from('trip_line_assignments')
                .update({ qty_dispatched: 0 })
                .eq('trip_id', tripId)
                .eq('request_line_id', line.id)
            }
          }

          // trips → Completado (truck came back regardless)
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
