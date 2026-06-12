'use client'

import { Wrench, Package, Pencil, Trash2, Copy, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { formatQty } from '@/lib/utils/format'
import type { LineInput, FulfillmentInfo } from '@/hooks/useSolicitudes'

interface LineRowProps {
  line: LineInput & { status?: string; po_reference?: string | null; material_category?: string | null; qty_delivered?: number | null; qty_scheduled?: number | null }
  lineNumber: number
  editable: boolean
  canDelete: boolean
  isScheduled: boolean
  onEdit: () => void
  onDelete: () => void
  /** Opcional — si se provee, muestra botón Duplicar (J8b). Solo tiene sentido cuando se pueden agregar líneas (ej. Borrador). */
  onDuplicate?: () => void
  // Nombres resueltos por el componente padre
  fromDisplay?: string
  toDisplay?: string
  unitDisplay?: string
  // Cambio 5 — fulfillments per línea (0-N items)
  fulfillments?: FulfillmentInfo[]
}

/**
 * Fila de una linea de solicitud.
 * Desktop: layout horizontal con todos los datos.
 * Mobile: tarjeta compacta apilada.
 */
function LineRow({
  line,
  lineNumber,
  editable,
  canDelete,
  isScheduled,
  onEdit,
  onDelete,
  onDuplicate,
  fromDisplay,
  toDisplay,
  unitDisplay,
  fulfillments = [],
}: LineRowProps) {
  const isEquipo = line.line_type === 'Equipo'
  const status = line.status ?? 'Pendiente'

  // Resolver nombres para mostrar
  const fromName = fromDisplay ?? line.from_text ?? '—'
  const toName = toDisplay ?? line.to_text ?? '—'
  const unitName = unitDisplay ?? line.unit_text ?? '—'

  return (
    <>
      {/* Desktop: visible a partir de md */}
      <div className="hidden md:block rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm hover:bg-gray-50/50 transition-colors">
        <div className="flex items-center gap-3">
          {/* Numero de linea */}
          <span className="w-6 shrink-0 text-center text-xs font-medium text-iconsa-gray">
            {lineNumber}
          </span>

          {/* Icono de tipo */}
          <span className="shrink-0" title={line.line_type}>
            {isEquipo ? (
              <Wrench className="h-4 w-4 text-iconsa-blue" />
            ) : (
              <Package className="h-4 w-4 text-gold" />
            )}
          </span>

          {/* Descripcion */}
          <span className="min-w-0 font-medium text-gray-900" title={line.description}>
            {line.description}
          </span>

          {/* Ruta: desde → hasta */}
          <span className="flex min-w-0 items-center gap-1.5 text-iconsa-gray">
            <span title={fromName}>{fromName}</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <span title={toName}>{toName}</span>
          </span>

          {/* Cantidad + unidad + progreso entrega */}
          <span className="shrink-0 whitespace-nowrap text-gray-700">
            {formatQty(line.quantity)} {unitName}
            {(line.qty_delivered ?? 0) > 0 && (
              <span className={`ml-1 text-xs ${(line.qty_delivered ?? 0) >= line.quantity ? 'text-iconsa-green' : 'text-orange-600'}`}>
                ({formatQty(line.qty_delivered)}/{formatQty(line.quantity)} entregadas)
              </span>
            )}
          </span>

          {/* Cost code eliminado de líneas — ahora vive en header (Cambio 2) */}

          {/* Campos opcionales */}
          {line.po_reference && (
            <span className="shrink-0 text-xs text-iconsa-gray" title={`OC: ${line.po_reference}`}>
              OC: {line.po_reference}
            </span>
          )}
          {!isEquipo && line.material_category && (
            <span className="shrink-0 text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
              {line.material_category}
            </span>
          )}

          {/* Badge de estado + badges per fulfillment activo (Cambio 5, 0-N) */}
          <div className="ml-auto shrink-0 flex items-center gap-1.5 flex-wrap">
            <Badge variant="line" label={status} />
            {fulfillments.map((f) => {
              if (f.type === 'trip') {
                return (
                  <span
                    key={f.id}
                    className="inline-flex items-center rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs font-medium"
                    title={`Trip ${f.trip_id ?? f.id.slice(0, 8)}, ${f.quantity_assigned} unidades${f.status !== 'Programado' ? ` (${f.status})` : ''}`}
                  >
                    EN VIAJE {f.trip_id ?? f.id.slice(0, 8)}
                  </span>
                )
              }
              if (f.type === 'pickup') {
                return (
                  <span
                    key={f.id}
                    className="inline-flex items-center rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-xs font-medium"
                    title={`Pickup ${f.pickup_id}, ${f.quantity_assigned} unidades${f.status !== 'Aprobado' ? ` (${f.status})` : ''}`}
                  >
                    EN PICKUP {f.pickup_id}
                  </span>
                )
              }
              if (f.type === 'external') {
                return (
                  <span
                    key={f.id}
                    className="inline-flex items-center rounded-full bg-violet-100 text-violet-700 px-2 py-0.5 text-xs font-medium"
                    title={`Externo ${f.external_id}, B/. ${f.invoice_amount.toFixed(2)}, ${f.provider_name}, ${f.quantity_assigned} unidades${f.status !== 'Aprobado' ? ` (${f.status})` : ''}`}
                  >
                    EN EXTERNO {f.external_id}
                  </span>
                )
              }
              return null
            })}
          </div>

          {/* Acciones */}
          {(editable || canDelete || onDuplicate) && (
            <div className="flex shrink-0 items-center gap-1">
              {editable && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="rounded p-1.5 text-iconsa-gray hover:bg-gray-100 hover:text-iconsa-blue transition-colors"
                  title="Editar linea"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              )}
              {onDuplicate && (
                <button
                  type="button"
                  onClick={onDuplicate}
                  className="rounded p-1.5 text-iconsa-gray hover:bg-gray-100 hover:text-iconsa-blue transition-colors"
                  title="Duplicar linea"
                >
                  <Copy className="h-4 w-4" />
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="rounded p-1.5 text-iconsa-gray hover:bg-red-50 hover:text-iconsa-red transition-colors"
                  title={isScheduled ? 'Eliminar linea programada' : 'Eliminar linea'}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
        {/* Notas de linea — texto completo, sin truncar */}
        {line.notes && (
          <div className="mt-1.5 ml-6 text-xs italic text-amber-600">
            {line.notes}
          </div>
        )}
      </div>

      {/* Mobile: visible hasta md */}
      <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3 md:hidden">
        {/* Primera linea: tipo + descripcion + estado */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-medium text-iconsa-gray">#{lineNumber}</span>
            {isEquipo ? (
              <Wrench className="h-4 w-4 shrink-0 text-iconsa-blue" />
            ) : (
              <Package className="h-4 w-4 shrink-0 text-gold" />
            )}
            <span className="min-w-0 text-sm font-medium text-gray-900" title={line.description}>
              {line.description}
            </span>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <Badge variant="line" label={status} />
            {fulfillments.map((f) => {
              if (f.type === 'trip') {
                return (
                  <span key={f.id} className="inline-flex items-center rounded-full bg-green-100 text-green-700 px-1.5 py-0.5 text-[10px] font-medium" title={`Trip ${f.trip_id ?? f.id.slice(0, 8)}, ${f.quantity_assigned}`}>
                    VIAJE
                  </span>
                )
              }
              if (f.type === 'pickup') {
                return (
                  <span key={f.id} className="inline-flex items-center rounded-full bg-blue-100 text-blue-700 px-1.5 py-0.5 text-[10px] font-medium" title={`Pickup ${f.pickup_id}, ${f.quantity_assigned}`}>
                    PICKUP
                  </span>
                )
              }
              if (f.type === 'external') {
                return (
                  <span key={f.id} className="inline-flex items-center rounded-full bg-violet-100 text-violet-700 px-1.5 py-0.5 text-[10px] font-medium" title={`Externo ${f.external_id}, B/. ${f.invoice_amount.toFixed(2)}, ${f.provider_name}, ${f.quantity_assigned}`}>
                    EXTERNO
                  </span>
                )
              }
              return null
            })}
          </div>
        </div>

        {/* Segunda linea: ruta */}
        <div className="flex items-center gap-1.5 text-xs text-iconsa-gray">
          <span title={fromName}>{fromName}</span>
          <ArrowRight className="h-3 w-3 shrink-0 text-gray-400" />
          <span title={toName}>{toName}</span>
        </div>

        {/* Campos opcionales */}
        {(line.po_reference || (!isEquipo && line.material_category) || line.notes) && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {line.po_reference && (
              <span className="text-iconsa-gray">OC: {line.po_reference}</span>
            )}
            {!isEquipo && line.material_category && (
              <span className="text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{line.material_category}</span>
            )}
            {line.notes && (
              <span className="text-xs italic text-amber-600">{line.notes}</span>
            )}
          </div>
        )}

        {/* Tercera linea: cantidad, codigo costo, acciones */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs">
            <span className="text-gray-700">
              {line.quantity} {unitName}
              {(line.qty_delivered ?? 0) > 0 && (
                <span className={`ml-1 text-xs ${(line.qty_delivered ?? 0) >= line.quantity ? 'text-iconsa-green' : 'text-orange-600'}`}>
                  ({line.qty_delivered}/{line.quantity} entregadas)
                </span>
              )}
            </span>
          </div>

          {(editable || canDelete || onDuplicate) && (
            <div className="flex items-center gap-1">
              {editable && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="rounded p-1.5 text-iconsa-gray hover:bg-gray-100 hover:text-iconsa-blue transition-colors"
                  title="Editar linea"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
              {onDuplicate && (
                <button
                  type="button"
                  onClick={onDuplicate}
                  className="rounded p-1.5 text-iconsa-gray hover:bg-gray-100 hover:text-iconsa-blue transition-colors"
                  title="Duplicar linea"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="rounded p-1.5 text-iconsa-gray hover:bg-red-50 hover:text-iconsa-red transition-colors"
                  title={isScheduled ? 'Eliminar linea programada' : 'Eliminar linea'}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export { LineRow }
export type { LineRowProps }
