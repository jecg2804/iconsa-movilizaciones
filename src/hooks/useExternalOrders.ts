'use client'

import { useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Attachment } from '@/lib/supabase/storage'

export interface ExternalOrderLineInput {
  request_line_id: string
  quantity_assigned: number
}

export interface CreateExternalOrderResult {
  ok: boolean
  orderId?: string
  externalId?: string  // EXT-2026-NNN auto-gen por trigger BD
  error?: string
}

export interface CompleteExternalResult {
  ok: boolean
  error?: string
}

export interface CancelExternalResult {
  ok: boolean
  deliveredCount?: number
  deliveredQty?: number
  error?: string
}

export interface RemoveLineExternalResult {
  ok: boolean
  orderCancelled?: boolean
  orderId?: string
  error?: string
}

function translateBdError(message: string): string {
  if (message.includes('qty_invariant') || message.includes('sm_request_lines_qty_invariant')) {
    return 'Esta línea ya fue asignada en otro fulfillment. Refrescá la página.'
  }
  return message
}

/**
 * Hook de operaciones external_orders (Cambio 5 — modelo bulk).
 * Reemplaza el modelo flag-en-línea de Cambio 4 (useExternal eliminado en T1).
 *
 * 4 funciones paralelas a usePickupOrders + provider/invoice/cost:
 * - createExternalOrder: validaciones strict (provider trim, amount > 0,
 *   attachments.length >= 1) + crea order con metadata + N order_lines.
 * - completeExternalOrder: paralelo a completePickupOrder.
 * - cancelExternalOrder: paralelo + PRESERVA invoice_attachments (Q4
 *   cerrado en Cambio 4 — Storage cleanup async no vale la pena v1).
 * - removeLineFromExternalOrder: paralelo + auto_cancel_empty.
 */
export function useExternalOrders() {
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createExternalOrder = useCallback(
    async (
      charrisId: string,
      lines: ExternalOrderLineInput[],
      providerName: string,
      invoiceAmount: number,
      invoiceAttachments: Attachment[],
      notes?: string | null,
    ): Promise<CreateExternalOrderResult> => {
      setLoading(true)
      setError(null)

      try {
        if (lines.length === 0) {
          const msg = 'Debe seleccionar al menos una línea para aprobar viaje externo.'
          setError(msg)
          return { ok: false, error: msg }
        }
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
          const msg = 'Adjunta al menos una cotización o factura.'
          setError(msg)
          return { ok: false, error: msg }
        }

        // Validar quantities pre-INSERT (mismo patrón que usePickupOrders)
        const lineIds = lines.map((l) => l.request_line_id)
        const { data: dbLines, error: fetchError } = await supabase
          .from('sm_request_lines')
          .select('id, quantity, qty_scheduled, qty_delivered, description')
          .in('id', lineIds)

        if (fetchError || !dbLines) {
          const msg = fetchError?.message ?? 'Error al validar líneas'
          setError(msg)
          return { ok: false, error: msg }
        }

        for (const input of lines) {
          if (input.quantity_assigned <= 0) {
            const msg = `Cantidad inválida (${input.quantity_assigned}). Debe ser mayor a cero.`
            setError(msg)
            return { ok: false, error: msg }
          }
          const dbLine = dbLines.find((dl) => dl.id === input.request_line_id)
          if (!dbLine) {
            const msg = `Línea ${input.request_line_id.slice(0, 8)} no encontrada.`
            setError(msg)
            return { ok: false, error: msg }
          }
          const available = dbLine.quantity - (dbLine.qty_scheduled ?? 0) - (dbLine.qty_delivered ?? 0)
          if (input.quantity_assigned > available) {
            const msg = `"${dbLine.description}": cantidad ${input.quantity_assigned} excede disponible (${available}).`
            setError(msg)
            return { ok: false, error: msg }
          }
        }

        // INSERT external_orders header con provider/invoice/cost
        const { data: orderRow, error: insertError } = await supabase
          .from('external_orders')
          .insert({
            status: 'Aprobado',
            approved_by: charrisId,
            approved_at: new Date().toISOString(),
            provider_name: providerName.trim(),
            invoice_amount: invoiceAmount,
            invoice_attachments: JSON.parse(JSON.stringify(invoiceAttachments)),
            notes: notes?.trim() || null,
            created_by: charrisId,
          })
          .select('id, external_id')
          .single()

        if (insertError || !orderRow) {
          const friendly = translateBdError(insertError?.message ?? 'Error al crear external order')
          setError(friendly)
          return { ok: false, error: friendly }
        }

        // INSERT external_order_lines (bulk)
        const linesPayload = lines.map((l) => ({
          external_order_id: orderRow.id,
          request_line_id: l.request_line_id,
          quantity_assigned: l.quantity_assigned,
          qty_delivered: 0,
        }))

        const { error: linesError } = await supabase
          .from('external_order_lines')
          .insert(linesPayload)

        if (linesError) {
          await supabase.from('external_orders').delete().eq('id', orderRow.id)
          const friendly = translateBdError(linesError.message)
          setError(friendly)
          return { ok: false, error: friendly }
        }

        return { ok: true, orderId: orderRow.id, externalId: orderRow.external_id ?? undefined }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error inesperado al crear external order'
        setError(message)
        return { ok: false, error: message }
      } finally {
        setLoading(false)
      }
    },
    [supabase],
  )

  const completeExternalOrder = useCallback(
    async (
      orderId: string,
      completedById: string,
      receivedById: string | null,
      receivedByName: string,
      notes: string,
      additionalAttachments: Attachment[],
    ): Promise<CompleteExternalResult> => {
      setLoading(true)
      setError(null)

      try {
        const now = new Date().toISOString()

        // SELECT existing notes + invoice_attachments
        const { data: existing, error: fetchError } = await supabase
          .from('external_orders')
          .select('notes, invoice_attachments')
          .eq('id', orderId)
          .single()

        if (fetchError || !existing) {
          const msg = fetchError?.message ?? 'External order no encontrado'
          setError(msg)
          return { ok: false, error: msg }
        }

        // Append additionalAttachments al invoice_attachments existente
        const existingAttachments = Array.isArray(existing.invoice_attachments)
          ? (existing.invoice_attachments as unknown as Attachment[])
          : []
        const finalAttachments = [...existingAttachments, ...additionalAttachments]

        const trimmedNotes = notes.trim()
        const finalNotes = trimmedNotes
          ? (existing.notes ? `${existing.notes}\n\n[Entrega ${now}] ${trimmedNotes}` : trimmedNotes)
          : existing.notes ?? null

        // UPDATE external_order_lines (todo-o-nada)
        const { data: orderLines, error: linesError } = await supabase
          .from('external_order_lines')
          .select('id, quantity_assigned')
          .eq('external_order_id', orderId)

        if (linesError || !orderLines) {
          setError(linesError?.message ?? 'Error al obtener líneas')
          return { ok: false, error: linesError?.message ?? 'Líneas no encontradas' }
        }

        for (const line of orderLines) {
          const { error: updateLineError } = await supabase
            .from('external_order_lines')
            .update({ qty_delivered: line.quantity_assigned })
            .eq('id', line.id)
          if (updateLineError) {
            setError(updateLineError.message)
            return { ok: false, error: updateLineError.message }
          }
        }

        const { error: orderUpdateError } = await supabase
          .from('external_orders')
          .update({
            status: 'Entregado',
            completed_at: now,
            completed_by: completedById,
            received_by_id: receivedById,
            received_by_name: receivedByName.trim() || null,
            notes: finalNotes,
            invoice_attachments: JSON.parse(JSON.stringify(finalAttachments)),
          })
          .eq('id', orderId)
          .eq('status', 'Aprobado')
          .select('id')

        if (orderUpdateError) {
          setError(orderUpdateError.message)
          return { ok: false, error: orderUpdateError.message }
        }

        return { ok: true }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error inesperado al completar external order'
        setError(message)
        return { ok: false, error: message }
      } finally {
        setLoading(false)
      }
    },
    [supabase],
  )

  /**
   * Cancela external_order. PERMITIDO con qty_delivered > 0.
   * PRESERVA invoice_attachments (NO se setea a NULL — Q4 cerrado en Cambio 4).
   * Storage cleanup async no vale la pena v1.
   */
  const cancelExternalOrder = useCallback(
    async (
      orderId: string,
      cancelledById: string,
    ): Promise<CancelExternalResult> => {
      setLoading(true)
      setError(null)

      try {
        const { data: lines, error: fetchError } = await supabase
          .from('external_order_lines')
          .select('id, qty_delivered')
          .eq('external_order_id', orderId)

        if (fetchError || !lines) {
          const msg = fetchError?.message ?? 'External order no encontrado'
          setError(msg)
          return { ok: false, error: msg }
        }

        const deliveredLines = lines.filter((l) => (l.qty_delivered ?? 0) > 0)
        const deliveredCount = deliveredLines.length
        const deliveredQty = deliveredLines.reduce((sum, l) => sum + (l.qty_delivered ?? 0), 0)

        // UPDATE external_orders SET status='Cancelado'
        // NOTA: NO setear invoice_attachments a NULL — preservar (Q4)
        const { error: updateError } = await supabase
          .from('external_orders')
          .update({
            status: 'Cancelado',
            cancelled_at: new Date().toISOString(),
            cancelled_by: cancelledById,
          })
          .eq('id', orderId)
          .eq('status', 'Aprobado')
          .select('id')

        if (updateError) {
          setError(updateError.message)
          return { ok: false, error: updateError.message }
        }

        return { ok: true, deliveredCount, deliveredQty }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error inesperado al cancelar external order'
        setError(message)
        return { ok: false, error: message }
      } finally {
        setLoading(false)
      }
    },
    [supabase],
  )

  const removeLineFromExternalOrder = useCallback(
    async (
      orderId: string,
      externalOrderLineId: string,
    ): Promise<RemoveLineExternalResult> => {
      setLoading(true)
      setError(null)

      try {
        const { error: deleteError } = await supabase
          .from('external_order_lines')
          .delete()
          .eq('id', externalOrderLineId)

        if (deleteError) {
          setError(deleteError.message)
          return { ok: false, error: deleteError.message }
        }

        const { data: orderRow, error: fetchError } = await supabase
          .from('external_orders')
          .select('id, external_id, status')
          .eq('id', orderId)
          .single()

        if (fetchError || !orderRow) {
          return { ok: true, orderCancelled: true }
        }

        const orderCancelled = orderRow.status === 'Cancelado'
        return {
          ok: true,
          orderCancelled,
          orderId: orderCancelled ? (orderRow.external_id ?? undefined) : undefined,
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error inesperado al eliminar línea'
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
    createExternalOrder,
    completeExternalOrder,
    cancelExternalOrder,
    removeLineFromExternalOrder,
  }
}
