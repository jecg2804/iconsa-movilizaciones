'use client'

import { useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Attachment } from '@/lib/supabase/storage'

export interface ConvertLineResult {
  ok: boolean
  tripCancelled?: boolean
  error?: string
}

export interface ApprovePickupResult {
  ok: boolean
  error?: string
}

export interface CompletePickupResult {
  ok: boolean
  error?: string
}

/**
 * Hook de operaciones pickup (Cambio 3).
 * Pickup es una bandera a nivel de línea (sm_request_lines.pickup_by_project),
 * no un trip especial. Tres operaciones:
 *
 * - approvePickupFromBacklog: línea Pendiente → Pickup Aprobado
 * - convertLineToPickup: línea Programada → Pickup Aprobado (DELETE assignment +
 *   UPDATE atómico; auto-cancela trip si era la última línea)
 * - completePickup: Pickup Aprobado → Entregada (con receptor, notas, attachments
 *   persistidos en sm_request_lines.attachments)
 */
export function usePickup() {
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Aprueba pickup desde el backlog (línea Pendiente).
   * NO toca qty_scheduled — la línea Pendiente típicamente tiene qty_scheduled=0.
   * cascade_request_status trigger en BD updatea sm_requests.status automáticamente.
   */
  const approvePickupFromBacklog = useCallback(
    async (lineId: string, charrisId: string): Promise<ApprovePickupResult> => {
      setLoading(true)
      setError(null)

      try {
        const { error: updateError } = await supabase
          .from('sm_request_lines')
          .update({
            status: 'Pickup Aprobado',
            pickup_by_project: true,
            pickup_approved_at: new Date().toISOString(),
            pickup_approved_by: charrisId,
          })
          .eq('id', lineId)

        if (updateError) {
          setError(updateError.message)
          return { ok: false, error: updateError.message }
        }

        return { ok: true }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al aprobar pickup'
        setError(message)
        return { ok: false, error: message }
      } finally {
        setLoading(false)
      }
    },
    [supabase],
  )

  /**
   * Convierte una línea Programada a Pickup Aprobado.
   * - Bloquea si qty_delivered > 0 (E2/Q7).
   * - DELETE assignment, UPDATE línea atómico (status + flags + qty_scheduled).
   * - Si trip queda con 0 assignments → cancela trip.
   *
   * NOTA deuda técnica: DELETE + UPDATE NO es atómico server-side.
   * Riesgo bajo v1 (1 Charris operando, sin concurrencia). Polish post-merge:
   * convertir a RPC SQL con SECURITY DEFINER y transacción.
   *
   * NO usa releaseLineFromAssignment para evitar round-trip Pendiente→Pickup
   * Aprobado que dispararía cascade dos veces.
   */
  const convertLineToPickup = useCallback(
    async (
      lineId: string,
      assignmentId: string,
      quantityAssigned: number,
      tripId: string,
      charrisId: string,
    ): Promise<ConvertLineResult> => {
      setLoading(true)
      setError(null)

      try {
        // 1. Validar: qty_delivered debe ser 0
        const { data: line, error: fetchError } = await supabase
          .from('sm_request_lines')
          .select('qty_delivered, qty_scheduled, quantity')
          .eq('id', lineId)
          .single()

        if (fetchError || !line) {
          const msg = fetchError?.message ?? 'Línea no encontrada'
          setError(msg)
          return { ok: false, error: msg }
        }

        const qtyDelivered = line.qty_delivered ?? 0
        if (qtyDelivered > 0) {
          const msg = `No se puede convertir a pickup una línea con entregas previas registradas (${qtyDelivered} de ${line.quantity} entregado). Cancelá la línea o terminá el flow actual.`
          setError(msg)
          return { ok: false, error: msg }
        }

        // 2. DELETE assignment
        const { error: deleteError } = await supabase
          .from('trip_line_assignments')
          .delete()
          .eq('id', assignmentId)

        if (deleteError) {
          setError(deleteError.message)
          return { ok: false, error: deleteError.message }
        }

        // 3. UPDATE línea atómico: status + flags + qty_scheduled
        const newQtyScheduled = Math.max(0, (line.qty_scheduled ?? 0) - quantityAssigned)

        const { error: updateError } = await supabase
          .from('sm_request_lines')
          .update({
            status: 'Pickup Aprobado',
            pickup_by_project: true,
            pickup_approved_at: new Date().toISOString(),
            pickup_approved_by: charrisId,
            qty_scheduled: newQtyScheduled,
          })
          .eq('id', lineId)

        if (updateError) {
          setError(updateError.message)
          return { ok: false, error: updateError.message }
        }

        // 4. Verificar si el trip quedó sin assignments
        const { count: remainingCount, error: countError } = await supabase
          .from('trip_line_assignments')
          .select('id', { count: 'exact', head: true })
          .eq('trip_id', tripId)

        if (countError) {
          // Trip cancel best-effort. La conversión ya pasó.
          console.warn('[usePickup] No se pudo verificar count de assignments:', countError.message)
          return { ok: true, tripCancelled: false }
        }

        if ((remainingCount ?? 0) === 0) {
          // Cancelar trip
          const { error: cancelError } = await supabase
            .from('trips')
            .update({
              status: 'Cancelado',
            })
            .eq('id', tripId)

          if (cancelError) {
            console.warn('[usePickup] No se pudo cancelar trip vacío:', cancelError.message)
            return { ok: true, tripCancelled: false }
          }

          return { ok: true, tripCancelled: true }
        }

        return { ok: true, tripCancelled: false }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al convertir línea a pickup'
        setError(message)
        return { ok: false, error: message }
      } finally {
        setLoading(false)
      }
    },
    [supabase],
  )

  /**
   * Registra entrega de pickup. Setea status='Entregada', qty_delivered=quantity
   * (todo-o-nada Q4), pickup_completed_at, receptor (id O nombre — XOR validation),
   * y persiste attachments en sm_request_lines.attachments (columna JSONB agregada
   * por Chat en migración cambio3_pickup_add_attachments_to_lines).
   *
   * Notas: si la línea ya tiene `notes` no-null, se appendea (preserva info
   * original del solicitante).
   *
   * cascade_request_status updatea solicitud padre automáticamente.
   */
  const completePickup = useCallback(
    async (
      lineId: string,
      receivedById: string | null,
      receivedByName: string,
      notes: string,
      attachments: Attachment[],
    ): Promise<CompletePickupResult> => {
      setLoading(true)
      setError(null)

      try {
        // Validación XOR: al menos uno de id o nombre
        if (!receivedById && receivedByName.trim() === '') {
          const msg = 'Receptor requerido (selecciona persona o escribe nombre)'
          setError(msg)
          return { ok: false, error: msg }
        }

        // SELECT línea: quantity (auto-fill qty_delivered, Q4) + notes existentes (append)
        const { data: line, error: fetchError } = await supabase
          .from('sm_request_lines')
          .select('quantity, notes')
          .eq('id', lineId)
          .single()

        if (fetchError || !line) {
          const msg = fetchError?.message ?? 'Línea no encontrada'
          setError(msg)
          return { ok: false, error: msg }
        }

        const now = new Date().toISOString()

        // Append notes preservando info original del solicitante
        const trimmedNotes = notes.trim()
        const finalNotes = trimmedNotes
          ? (line.notes ? `${line.notes}\n\n[Pickup ${now}] ${trimmedNotes}` : trimmedNotes)
          : line.notes ?? null

        const { error: updateError } = await supabase
          .from('sm_request_lines')
          .update({
            status: 'Entregada',
            qty_delivered: line.quantity, // Q4: pickup todo-o-nada
            pickup_completed_at: now,
            pickup_received_by_id: receivedById,
            pickup_received_by_name: receivedByName.trim() || null,
            delivered_at: now,
            attachments: JSON.parse(JSON.stringify(attachments)), // persistir evidencias en JSONB
            notes: finalNotes,
          })
          .eq('id', lineId)

        if (updateError) {
          setError(updateError.message)
          return { ok: false, error: updateError.message }
        }

        return { ok: true }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al registrar entrega de pickup'
        setError(message)
        return { ok: false, error: message }
      } finally {
        setLoading(false)
      }
    },
    [supabase],
  )

  return {
    loading,
    error,
    approvePickupFromBacklog,
    convertLineToPickup,
    completePickup,
  }
}
