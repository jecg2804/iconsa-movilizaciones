'use client'

import { useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Attachment } from '@/lib/supabase/storage'

export interface ApproveExternalResult {
  ok: boolean
  error?: string
}

export interface ConvertLineExternalResult {
  ok: boolean
  tripCancelled?: boolean
  error?: string
}

export interface CompleteExternalResult {
  ok: boolean
  error?: string
}

export interface RevertExternalResult {
  ok: boolean
  error?: string
}

/**
 * Traduce errores BD a mensajes user-friendly. CHECK constraint
 * sm_request_lines_pickup_external_exclusive se triggerea en concurrencia
 * (2 sesiones de Charris en misma línea) — error PostgreSQL críptico se
 * convierte a mensaje accionable.
 */
function translateBdError(message: string): string {
  if (message.includes('sm_request_lines_pickup_external_exclusive')) {
    return 'La línea ya tiene un fulfillment asignado. Refresca la página.'
  }
  return message
}

/**
 * Hook de operaciones externo (Cambio 4) — gemelo de usePickup.
 * Externo es bandera a nivel de línea (sm_request_lines.external_by_provider),
 * mutuamente excluyente con pickup_by_project (CHECK constraint BD).
 *
 * 4 funciones:
 * - approveExternal: línea Pendiente → Externo Aprobado (sin trip)
 * - convertLineToExternal: línea Programada → Externo Aprobado (DELETE
 *   assignment + UPDATE atómico; auto-cancela trip si era última línea)
 * - completeExternal: Externo Aprobado → Entregada (con receptor opcional,
 *   notas opcionales, attachments opcionales appended)
 * - revertExternalToBacklog: Externo Aprobado → Pendiente (preserva
 *   external_invoice_attachments)
 */
export function useExternal() {
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Aprueba viaje externo desde el backlog (línea Pendiente).
   * Validación: línea status='Pendiente', precondición pickup_by_project=false.
   * UPDATE atómico con WHERE defensivo. cascade_request_status actualiza
   * sm_requests.status a 'En Proceso' automáticamente.
   */
  const approveExternal = useCallback(
    async (
      lineId: string,
      charrisId: string,
      providerName: string,
      invoiceAmount: number,
      invoiceAttachments: Attachment[],
      notes: string | null,
    ): Promise<ApproveExternalResult> => {
      setLoading(true)
      setError(null)

      try {
        // Validación campos obligatorios
        if (providerName.trim() === '') {
          const msg = 'El nombre del proveedor es requerido.'
          setError(msg)
          return { ok: false, error: msg }
        }
        if (invoiceAmount <= 0) {
          const msg = 'El costo del servicio debe ser mayor a cero.'
          setError(msg)
          return { ok: false, error: msg }
        }
        if (invoiceAttachments.length === 0) {
          const msg = 'Adjuntá al menos una cotización o factura.'
          setError(msg)
          return { ok: false, error: msg }
        }

        const now = new Date().toISOString()

        const { data, error: updateError } = await supabase
          .from('sm_request_lines')
          .update({
            status: 'Externo Aprobado',
            external_by_provider: true,
            external_approved_at: now,
            external_approved_by: charrisId,
            external_provider_name: providerName.trim(),
            external_invoice_amount: invoiceAmount,
            external_invoice_attachments: JSON.parse(JSON.stringify(invoiceAttachments)),
            external_notes: notes?.trim() || null,
          })
          .eq('id', lineId)
          .eq('status', 'Pendiente')
          .eq('pickup_by_project', false)
          .select('id')

        if (updateError) {
          const friendly = translateBdError(updateError.message)
          setError(friendly)
          return { ok: false, error: friendly }
        }

        if (!data || data.length === 0) {
          const msg = 'La línea ya no está disponible para aprobar como externo (puede haber cambiado de estado).'
          setError(msg)
          return { ok: false, error: msg }
        }

        return { ok: true }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al aprobar viaje externo'
        setError(message)
        return { ok: false, error: message }
      } finally {
        setLoading(false)
      }
    },
    [supabase],
  )

  /**
   * Convierte una línea Programada a Externo Aprobado.
   * - Bloquea si qty_delivered > 0 (E2).
   * - DELETE assignment, UPDATE línea atómico (status + flags + qty_scheduled).
   * - Si trip queda con 0 assignments → cancela trip.
   *
   * NOTA deuda técnica: DELETE + UPDATE NO es atómico server-side.
   * Riesgo bajo v1 (1 Charris operando, sin concurrencia). Polish post-merge:
   * convertir a RPC SQL con SECURITY DEFINER y transacción.
   */
  const convertLineToExternal = useCallback(
    async (
      lineId: string,
      assignmentId: string,
      quantityAssigned: number,
      tripId: string,
      charrisId: string,
      providerName: string,
      invoiceAmount: number,
      invoiceAttachments: Attachment[],
      notes: string | null,
    ): Promise<ConvertLineExternalResult> => {
      setLoading(true)
      setError(null)

      try {
        // Validación campos obligatorios
        if (providerName.trim() === '') {
          const msg = 'El nombre del proveedor es requerido.'
          setError(msg)
          return { ok: false, error: msg }
        }
        if (invoiceAmount <= 0) {
          const msg = 'El costo del servicio debe ser mayor a cero.'
          setError(msg)
          return { ok: false, error: msg }
        }
        if (invoiceAttachments.length === 0) {
          const msg = 'Adjuntá al menos una cotización o factura.'
          setError(msg)
          return { ok: false, error: msg }
        }

        // 1. Validar: qty_delivered debe ser 0 + pickup_by_project debe ser false
        const { data: line, error: fetchError } = await supabase
          .from('sm_request_lines')
          .select('qty_delivered, qty_scheduled, quantity, pickup_by_project')
          .eq('id', lineId)
          .single()

        if (fetchError || !line) {
          const msg = fetchError?.message ?? 'Línea no encontrada'
          setError(msg)
          return { ok: false, error: msg }
        }

        const qtyDelivered = line.qty_delivered ?? 0
        if (qtyDelivered > 0) {
          const msg = `No se puede convertir a externo una línea con entregas previas registradas (${qtyDelivered} de ${line.quantity} entregado). Cancelá la línea o terminá el flow actual.`
          setError(msg)
          return { ok: false, error: msg }
        }

        if (line.pickup_by_project) {
          const msg = 'La línea ya está aprobada como pickup. No se puede convertir a externo.'
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

        // 3. UPDATE línea atómico
        const newQtyScheduled = Math.max(0, (line.qty_scheduled ?? 0) - quantityAssigned)
        const now = new Date().toISOString()

        const { error: updateError } = await supabase
          .from('sm_request_lines')
          .update({
            status: 'Externo Aprobado',
            external_by_provider: true,
            external_approved_at: now,
            external_approved_by: charrisId,
            external_provider_name: providerName.trim(),
            external_invoice_amount: invoiceAmount,
            external_invoice_attachments: JSON.parse(JSON.stringify(invoiceAttachments)),
            external_notes: notes?.trim() || null,
            qty_scheduled: newQtyScheduled,
          })
          .eq('id', lineId)

        if (updateError) {
          const friendly = translateBdError(updateError.message)
          setError(friendly)
          return { ok: false, error: friendly }
        }

        // 4. Verificar si el trip quedó sin assignments
        const { count: remainingCount, error: countError } = await supabase
          .from('trip_line_assignments')
          .select('id', { count: 'exact', head: true })
          .eq('trip_id', tripId)

        if (countError) {
          console.warn('[useExternal] No se pudo verificar count de assignments:', countError.message)
          return { ok: true, tripCancelled: false }
        }

        if ((remainingCount ?? 0) === 0) {
          const { error: cancelError } = await supabase
            .from('trips')
            .update({ status: 'Cancelado' })
            .eq('id', tripId)

          if (cancelError) {
            console.warn('[useExternal] No se pudo cancelar trip vacío:', cancelError.message)
            return { ok: true, tripCancelled: false }
          }

          return { ok: true, tripCancelled: true }
        }

        return { ok: true, tripCancelled: false }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al convertir línea a externo'
        setError(message)
        return { ok: false, error: message }
      } finally {
        setLoading(false)
      }
    },
    [supabase],
  )

  /**
   * Registra entrega externa. Setea status='Entregada', qty_delivered=quantity
   * (todo-o-nada paralelo a pickup), external_completed_at, receptor OPCIONAL
   * (no XOR — ambos campos pueden ser NULL), append attachments y notes.
   *
   * cascade_request_status updatea solicitud padre automáticamente.
   */
  const completeExternal = useCallback(
    async (
      lineId: string,
      receivedById: string | null,
      receivedByName: string | null,
      notes: string | null,
      additionalAttachments: Attachment[],
    ): Promise<CompleteExternalResult> => {
      setLoading(true)
      setError(null)

      try {
        // SELECT línea: quantity (auto-fill qty_delivered) + external_notes existentes (append) + external_invoice_attachments (concat)
        const { data: line, error: fetchError } = await supabase
          .from('sm_request_lines')
          .select('quantity, external_notes, external_invoice_attachments')
          .eq('id', lineId)
          .single()

        if (fetchError || !line) {
          const msg = fetchError?.message ?? 'Línea no encontrada'
          setError(msg)
          return { ok: false, error: msg }
        }

        const now = new Date().toISOString()

        // Append notes preservando approve original
        const trimmedNotes = (notes ?? '').trim()
        const finalNotes = trimmedNotes
          ? (line.external_notes ? `${line.external_notes}\n\n[Entrega ${now}] ${trimmedNotes}` : trimmedNotes)
          : line.external_notes ?? null

        // Concat attachments (approve + delivery). Cast via unknown porque
        // Supabase tipa la columna JSONB como Json (que no overlapa con Attachment).
        const existingAttachments = Array.isArray(line.external_invoice_attachments)
          ? (line.external_invoice_attachments as unknown as Attachment[])
          : []
        const finalAttachments = [...existingAttachments, ...additionalAttachments]

        const { error: updateError } = await supabase
          .from('sm_request_lines')
          .update({
            status: 'Entregada',
            qty_delivered: line.quantity,
            external_completed_at: now,
            external_received_by_id: receivedById,
            external_received_by_name: receivedByName?.trim() || null,
            delivered_at: now,
            external_invoice_attachments: JSON.parse(JSON.stringify(finalAttachments)),
            external_notes: finalNotes,
          })
          .eq('id', lineId)

        if (updateError) {
          setError(updateError.message)
          return { ok: false, error: updateError.message }
        }

        return { ok: true }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al registrar entrega externa'
        setError(message)
        return { ok: false, error: message }
      } finally {
        setLoading(false)
      }
    },
    [supabase],
  )

  /**
   * Reverso de externo: línea Externo Aprobado → Pendiente.
   * Disponible solo desde la sección "Viajes Externos Pendientes" (UI ya
   * filtra por status='Externo Aprobado' AND external_completed_at IS NULL).
   *
   * UPDATE con WHERE clauses defensivas (atomic): si la línea cambió de
   * estado entre el render del UI y el confirm del modal, UPDATE no matchea
   * y retornamos error claro.
   *
   * NO toca: external_completed_at, external_received_by_*, qty_scheduled,
   * qty_delivered, trip_line_assignments. PRESERVA external_invoice_attachments
   * (Q4 cerrado — Storage cleanup async no vale la pena v1).
   *
   * cascade_request_status trigger se dispara solo y reevalúa solicitud padre.
   */
  const revertExternalToBacklog = useCallback(
    async (lineId: string): Promise<RevertExternalResult> => {
      setLoading(true)
      setError(null)

      try {
        const { data, error: updateError } = await supabase
          .from('sm_request_lines')
          .update({
            status: 'Pendiente',
            external_by_provider: false,
            external_approved_at: null,
            external_approved_by: null,
            external_provider_name: null,
            external_invoice_amount: null,
            external_notes: null,
            // PRESERVA: external_invoice_attachments (Q4)
          })
          .eq('id', lineId)
          .eq('status', 'Externo Aprobado')
          .is('external_completed_at', null)
          .select('id')

        if (updateError) {
          setError(updateError.message)
          return { ok: false, error: updateError.message }
        }

        if (!data || data.length === 0) {
          const msg = 'La línea ya no está disponible para devolver al backlog (puede haber cambiado de estado).'
          setError(msg)
          return { ok: false, error: msg }
        }

        return { ok: true }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al devolver línea al backlog'
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
    approveExternal,
    convertLineToExternal,
    completeExternal,
    revertExternalToBacklog,
  }
}
