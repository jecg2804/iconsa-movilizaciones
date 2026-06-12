'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight, Wrench, Package, CalendarDays } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { formatDate, formatDateTime, formatQty } from '@/lib/utils/format'
import type { Attachment } from '@/lib/supabase/storage'

export interface PickupOrderLineWithRelations {
  id: string
  request_line_id: string
  quantity_assigned: number
  qty_delivered: number
  line: {
    description: string
    line_type: string
    quantity: number
    unit: { code: string } | null
    unit_text: string | null
    from_location: { name: string } | null
    from_text: string | null
    to_location: { id: string; name: string; project_id: string | null; location_type: string | null } | null
    to_text: string | null
    request: { id: string; request_id: string | null; project: { code: string; name: string } | null }
  } | null
}

export interface PickupOrderWithLines {
  id: string
  pickup_id: string
  status: 'Aprobado' | 'Entregado' | 'Cancelado'
  /** Columna real BD (NOT NULL) — fecha en que Logística decide ejecutar el pickup. */
  scheduled_date: string
  approved_at: string
  approved_by_name: string | null
  completed_at: string | null
  completed_by_name: string | null
  cancelled_at: string | null
  cancelled_by_name: string | null
  received_by_id: string | null
  received_by_name: string | null
  notes: string | null
  attachments: Attachment[]
  lines: PickupOrderLineWithRelations[]
}

interface PickupOrderCardProps {
  order: PickupOrderWithLines
  canConfirmDelivery: boolean
  canCancelOrder: boolean
  onConfirmDelivery?: () => void
  onCancelOrder?: () => void
  showLinesInitially?: boolean
}

export function PickupOrderCard({
  order,
  canConfirmDelivery,
  canCancelOrder,
  onConfirmDelivery,
  onCancelOrder,
  showLinesInitially = false,
}: PickupOrderCardProps) {
  const [expanded, setExpanded] = useState(showLinesInitially)
  const isActive = order.status === 'Aprobado'

  return (
    <div className="rounded-lg border border-amber-200 bg-white">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-amber-100">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-sm font-mono font-bold text-navy hover:text-iconsa-blue"
            title={expanded ? 'Colapsar líneas' : 'Expandir líneas'}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            {order.pickup_id}
          </button>
          <Badge label={order.status} variant="custom" bg={
            order.status === 'Aprobado' ? 'bg-amber-100' :
            order.status === 'Entregado' ? 'bg-emerald-100' : 'bg-gray-100'
          } text={
            order.status === 'Aprobado' ? 'text-amber-800' :
            order.status === 'Entregado' ? 'text-emerald-800' : 'text-gray-600'
          } />
          <span
            className="inline-flex items-center gap-1 text-xs font-medium text-navy whitespace-nowrap"
            title={`Fecha programada: ${formatDate(order.scheduled_date)}`}
          >
            <CalendarDays className="h-3 w-3" />
            {formatDate(order.scheduled_date)}
          </span>
          <span className="text-xs text-iconsa-gray" title={`Aprobado ${formatDateTime(order.approved_at)}`}>
            {formatDate(order.approved_at)}
            {order.approved_by_name && <span> · {order.approved_by_name}</span>}
          </span>
          <span className="text-xs text-iconsa-gray">
            {order.lines.length} {order.lines.length === 1 ? 'línea' : 'líneas'}
          </span>
        </div>

        {isActive && (canConfirmDelivery || canCancelOrder) && (
          <div className="flex items-center gap-2 shrink-0">
            {canCancelOrder && onCancelOrder && (
              <button
                type="button"
                onClick={onCancelOrder}
                className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors"
              >
                Cancelar pickup
              </button>
            )}
            {canConfirmDelivery && onConfirmDelivery && (
              <button
                type="button"
                onClick={onConfirmDelivery}
                className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 transition-colors"
              >
                Confirmar entrega
              </button>
            )}
          </div>
        )}

        {!isActive && (
          <div className="text-xs text-iconsa-gray shrink-0">
            {order.status === 'Entregado' && order.completed_at && (
              <span title={`Recibido por ${order.received_by_name ?? '(no captado)'}`}>
                Entregado {formatDate(order.completed_at)}
              </span>
            )}
            {order.status === 'Cancelado' && order.cancelled_at && (
              <span>Cancelado {formatDate(order.cancelled_at)}</span>
            )}
          </div>
        )}
      </div>

      {expanded && (
        <div className="px-4 py-3 space-y-2">
          {order.lines.map((ol) => {
            if (!ol.line) return null
            const fromName = ol.line.from_location?.name ?? ol.line.from_text ?? '—'
            const toName = ol.line.to_location?.name ?? ol.line.to_text ?? '—'
            const unitCode = ol.line.unit?.code ?? ol.line.unit_text ?? ''
            const isEquipo = ol.line.line_type === 'Equipo'
            const requestDisplayId = ol.line.request.request_id ?? ol.line.request.id.slice(0, 8)
            return (
              <div key={ol.id} className="flex items-center gap-2 text-sm py-1 flex-wrap">
                {isEquipo ? (
                  <Wrench className="h-3.5 w-3.5 shrink-0 text-iconsa-blue" />
                ) : (
                  <Package className="h-3.5 w-3.5 shrink-0 text-gold" />
                )}
                <span className="font-medium text-gray-900" title={ol.line.description}>
                  {ol.line.description}
                </span>
                <Link
                  href={`/solicitudes/${ol.line.request.id}`}
                  className="font-mono text-xs text-iconsa-gray hover:text-iconsa-blue hover:underline whitespace-nowrap"
                  title={`Ir a solicitud ${requestDisplayId}`}
                >
                  {requestDisplayId}
                </Link>
                <span className="text-gray-300">·</span>
                <span className="font-semibold text-gray-700 whitespace-nowrap bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                  {formatQty(ol.quantity_assigned)} {unitCode}
                </span>
                <span className="text-xs text-gray-400 whitespace-nowrap">{fromName} → {toName}</span>
                {ol.qty_delivered > 0 && (
                  <span className="text-xs text-emerald-600 whitespace-nowrap" title={`Entregado: ${formatQty(ol.qty_delivered)}`}>
                    ✓ {formatQty(ol.qty_delivered)}
                  </span>
                )}
              </div>
            )
          })}

          {order.notes && (
            <div className="mt-2 pt-2 border-t border-amber-100">
              <p className="text-xs italic text-gray-500">{order.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
