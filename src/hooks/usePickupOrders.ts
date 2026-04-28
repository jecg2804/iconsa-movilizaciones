'use client'

import { useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface PickupOrderLineInput {
  request_line_id: string
  quantity_assigned: number
}

export interface CreatePickupOrderResult {
  ok: boolean
  orderId?: string
  pickupId?: string  // PKP-2026-NNN auto-generado por trigger BD
  error?: string
}

export interface CompletePickupResult {
  ok: boolean
  error?: string
}

export interface CancelPickupResult {
  ok: boolean
  deliveredCount?: number  // # líneas con qty_delivered > 0 (para UI confirmation modal)
  deliveredQty?: number    // SUM qty_delivered total
  error?: string
}

export interface RemoveLineResult {
  ok: boolean
  orderCancelled?: boolean   // true si era última línea (auto_cancel_empty trigger se disparó)
  orderId?: string           // PKP-... para toast UI
  error?: string
}

/**
 * Traduce errores BD a mensajes user-friendly. CHECK constraint qty_invariant
 * se triggerea en race condition (2 sesiones de Charris asignando la misma
 * línea a fulfillments diferentes simultáneamente). Error PostgreSQL críptico
 * se convierte a mensaje accionable.
 */
function translateBdError(message: string): string {
  if (message.includes('qty_invariant') || message.includes('sm_request_lines_qty_invariant')) {
    return 'Esta línea ya fue asignada en otro fulfillment. Refrescá la página.'
  }
  return message
}

/**
 * Hook de operaciones pickup_orders (Cambio 5 — modelo bulk).
 * Reemplaza el modelo flag-en-línea de Cambio 3 (usePickup eliminado en T1).
 *
 * 4 funciones:
 * - createPickupOrder: crea pickup_order + N pickup_order_lines en una transacción.
 *   Trigger BD recalcula sm_request_lines.qty_scheduled automáticamente.
 * - completePickupOrder: marca order como Entregado, setea qty_delivered=quantity_assigned
 *   per línea (todo-o-nada v1). Trigger recalcula qty_delivered + status de las líneas.
 * - cancelPickupOrder: UPDATE pickup_orders.status='Cancelado'. Trigger recalcula:
 *   qty_scheduled de no-entregadas vuelve a 0, qty_delivered HISTÓRICA preservada.
 *   PERMITIDO con qty_delivered>0 — pre-flight stats para UI confirmation modal.
 * - removeLineFromPickupOrder: DELETE de pickup_order_lines. Si era la última línea,
 *   auto_cancel_empty_pickup_order trigger cancela el order automáticamente.
 *   Hook detecta count post-DELETE y devuelve { orderCancelled, orderId } para toast.
 */
export function usePickupOrders() {
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Crea pickup_order con N líneas. Validaciones:
   * - lines.length > 0
   * - cada quantity_assigned > 0
   * - cada quantity_assigned <= available (quantity - qty_scheduled - qty_delivered)
   *
   * Trigger BD recalc_qty_for_line se dispara automáticamente desde el INSERT
   * en pickup_order_lines y actualiza sm_request_lines.qty_scheduled.
   */
  const createPickupOrder = useCallback(
    async (
      charrisId: string,
      lines: PickupOrderLineInput[],
      scheduledDate: string,
      notes?: string | null,
    ): Promise<CreatePickupOrderResult> => {
      setLoading(true)
      setError(null)

      try {
        if (lines.length === 0) {
          const msg = 'Debe seleccionar al menos una línea para aprobar pickup.'
          setError(msg)
          return { ok: false, error: msg }
        }

        // Cambio 5 polish-#5b: scheduled_date NOT NULL, validación strict
        if (!scheduledDate || !/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)) {
          const msg = 'La fecha programada es requerida (formato YYYY-MM-DD).'
          setError(msg)
          return { ok: false, error: msg }
        }

        // 1. Validar quantities pre-INSERT con SELECT fresh
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

        // 2. INSERT pickup_orders header
        const { data: orderRow, error: insertError } = await supabase
          .from('pickup_orders')
          .insert({
            status: 'Aprobado',
            approved_by: charrisId,
            approved_at: new Date().toISOString(),
            scheduled_date: scheduledDate,
            notes: notes?.trim() || null,
            created_by: charrisId,
          })
          .select('id, pickup_id')
          .single()

        if (insertError || !orderRow) {
          const friendly = translateBdError(insertError?.message ?? 'Error al crear pickup order')
          setError(friendly)
          return { ok: false, error: friendly }
        }

        // 3. INSERT pickup_order_lines (bulk)
        const linesPayload = lines.map((l) => ({
          pickup_order_id: orderRow.id,
          request_line_id: l.request_line_id,
          quantity_assigned: l.quantity_assigned,
          qty_delivered: 0,
        }))

        const { error: linesError } = await supabase
          .from('pickup_order_lines')
          .insert(linesPayload)

        if (linesError) {
          // Rollback: DELETE el order para no dejar huérfano
          await supabase.from('pickup_orders').delete().eq('id', orderRow.id)
          const friendly = translateBdError(linesError.message)
          setError(friendly)
          return { ok: false, error: friendly }
        }

        // Trigger BD recalc_qty_for_line ya actualizó sm_request_lines.qty_scheduled
        return { ok: true, orderId: orderRow.id, pickupId: orderRow.pickup_id ?? undefined }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error inesperado al crear pickup order'
        setError(message)
        return { ok: false, error: message }
      } finally {
        setLoading(false)
      }
    },
    [supabase],
  )

  /**
   * Completa pickup_order: setea qty_delivered = quantity_assigned per línea
   * (todo-o-nada v1) y status='Entregado'. Trigger BD recalcula qty_delivered
   * + status de las sm_request_lines automáticamente.
   *
   * receivedById/receivedByName son OPCIONALES (no XOR). Ambos pueden ser NULL.
   */
  const completePickupOrder = useCallback(
    async (
      orderId: string,
      completedById: string,
      receivedById: string | null,
      receivedByName: string,
      notes: string,
      additionalAttachments: unknown[],
    ): Promise<CompletePickupResult> => {
      setLoading(true)
      setError(null)

      try {
        const now = new Date().toISOString()

        // 1. SELECT existing attachments + notes para append
        const { data: existing, error: fetchError } = await supabase
          .from('pickup_orders')
          .select('attachments, notes')
          .eq('id', orderId)
          .single()

        if (fetchError || !existing) {
          const msg = fetchError?.message ?? 'Pickup order no encontrado'
          setError(msg)
          return { ok: false, error: msg }
        }

        const existingAttachments = Array.isArray(existing.attachments)
          ? (existing.attachments as unknown[])
          : []
        const finalAttachments = [...existingAttachments, ...additionalAttachments]

        const trimmedNotes = notes.trim()
        const finalNotes = trimmedNotes
          ? (existing.notes ? `${existing.notes}\n\n[Entrega ${now}] ${trimmedNotes}` : trimmedNotes)
          : existing.notes ?? null

        // 2. UPDATE pickup_order_lines: qty_delivered = quantity_assigned (todo-o-nada)
        const { data: orderLines, error: linesError } = await supabase
          .from('pickup_order_lines')
          .select('id, quantity_assigned')
          .eq('pickup_order_id', orderId)

        if (linesError || !orderLines) {
          setError(linesError?.message ?? 'Error al obtener líneas del order')
          return { ok: false, error: linesError?.message ?? 'Líneas no encontradas' }
        }

        for (const line of orderLines) {
          const { error: updateLineError } = await supabase
            .from('pickup_order_lines')
            .update({ qty_delivered: line.quantity_assigned })
            .eq('id', line.id)
          if (updateLineError) {
            setError(updateLineError.message)
            return { ok: false, error: updateLineError.message }
          }
        }

        // 3. UPDATE pickup_orders: status='Entregado' + completed_at + receptor + notas + attachments
        const { error: orderUpdateError } = await supabase
          .from('pickup_orders')
          .update({
            status: 'Entregado',
            completed_at: now,
            completed_by: completedById,
            received_by_id: receivedById,
            received_by_name: receivedByName.trim() || null,
            notes: finalNotes,
            attachments: JSON.parse(JSON.stringify(finalAttachments)),
          })
          .eq('id', orderId)
          .eq('status', 'Aprobado')  // WHERE defensive
          .select('id')

        if (orderUpdateError) {
          setError(orderUpdateError.message)
          return { ok: false, error: orderUpdateError.message }
        }

        return { ok: true }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error inesperado al completar pickup order'
        setError(message)
        return { ok: false, error: message }
      } finally {
        setLoading(false)
      }
    },
    [supabase],
  )

  /**
   * Cancela pickup_order. PERMITIDO con qty_delivered > 0.
   * Trigger BD preserva qty_delivered HISTÓRICA — entregas son hechos físicos
   * que sobreviven al cancel.
   *
   * Pre-flight SELECT devuelve stats para que UI muestre confirmation modal
   * con copy contextual: "Las {N} líneas ya entregadas ({Q} unidades) quedan
   * registradas como entregadas. ¿Confirmar?"
   */
  const cancelPickupOrder = useCallback(
    async (
      orderId: string,
      cancelledById: string,
    ): Promise<CancelPickupResult> => {
      setLoading(true)
      setError(null)

      try {
        // Pre-flight stats
        const { data: lines, error: fetchError } = await supabase
          .from('pickup_order_lines')
          .select('id, qty_delivered')
          .eq('pickup_order_id', orderId)

        if (fetchError || !lines) {
          const msg = fetchError?.message ?? 'Pickup order no encontrado'
          setError(msg)
          return { ok: false, error: msg }
        }

        const deliveredLines = lines.filter((l) => (l.qty_delivered ?? 0) > 0)
        const deliveredCount = deliveredLines.length
        const deliveredQty = deliveredLines.reduce((sum, l) => sum + (l.qty_delivered ?? 0), 0)

        // UPDATE pickup_orders SET status='Cancelado'
        const { error: updateError } = await supabase
          .from('pickup_orders')
          .update({
            status: 'Cancelado',
            cancelled_at: new Date().toISOString(),
            cancelled_by: cancelledById,
          })
          .eq('id', orderId)
          .eq('status', 'Aprobado')  // WHERE defensive
          .select('id')

        if (updateError) {
          setError(updateError.message)
          return { ok: false, error: updateError.message }
        }

        // Trigger BD ya recalculó: qty_scheduled de no-entregadas → 0,
        // qty_delivered HISTÓRICA preservada.
        return { ok: true, deliveredCount, deliveredQty }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error inesperado al cancelar pickup order'
        setError(message)
        return { ok: false, error: message }
      } finally {
        setLoading(false)
      }
    },
    [supabase],
  )

  /**
   * Elimina una línea de pickup_order. Si era la última línea, el trigger BD
   * auto_cancel_empty_pickup_order cancela el order automáticamente.
   *
   * Hook detecta count post-DELETE y devuelve { orderCancelled, orderId }
   * para que UI muestre toast: "Pickup PKP-2026-X cancelado al eliminar
   * última línea".
   */
  const removeLineFromPickupOrder = useCallback(
    async (
      orderId: string,
      pickupOrderLineId: string,
    ): Promise<RemoveLineResult> => {
      setLoading(true)
      setError(null)

      try {
        // 1. DELETE de pickup_order_lines
        const { error: deleteError } = await supabase
          .from('pickup_order_lines')
          .delete()
          .eq('id', pickupOrderLineId)

        if (deleteError) {
          setError(deleteError.message)
          return { ok: false, error: deleteError.message }
        }

        // 2. SELECT count remaining + status del order (post-trigger)
        const { data: orderRow, error: fetchError } = await supabase
          .from('pickup_orders')
          .select('id, pickup_id, status')
          .eq('id', orderId)
          .single()

        if (fetchError || !orderRow) {
          // Order ya fue eliminado o no existe — asumir cancelled
          return { ok: true, orderCancelled: true }
        }

        const orderCancelled = orderRow.status === 'Cancelado'
        return {
          ok: true,
          orderCancelled,
          orderId: orderCancelled ? (orderRow.pickup_id ?? undefined) : undefined,
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
    createPickupOrder,
    completePickupOrder,
    cancelPickupOrder,
    removeLineFromPickupOrder,
  }
}
