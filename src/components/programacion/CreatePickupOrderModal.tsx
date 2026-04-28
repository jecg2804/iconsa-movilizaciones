'use client'

import { useState, useMemo } from 'react'
import { Wrench, Package } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatQty } from '@/lib/utils/format'
import { todayStrInPanama } from '@/lib/utils/datetime'
import type { BacklogLine } from '@/hooks/useTrips'
import type { PickupOrderLineInput } from '@/hooks/usePickupOrders'

interface LineQuantityState {
  request_line_id: string
  quantity_assigned: string
}

interface CreatePickupOrderModalProps {
  selectedLines: BacklogLine[]
  onConfirm: (lines: PickupOrderLineInput[], scheduledDate: string, notes: string | null) => Promise<void>
  onClose: () => void
  loading: boolean
  error: string | null
}

export function CreatePickupOrderModal({
  selectedLines,
  onConfirm,
  onClose,
  loading,
  error,
}: CreatePickupOrderModalProps) {
  const initialState: LineQuantityState[] = useMemo(
    () =>
      selectedLines.map((line) => {
        const available = Math.max(
          0,
          line.quantity - (line.qty_scheduled ?? 0) - (line.qty_delivered ?? 0),
        )
        return { request_line_id: line.id, quantity_assigned: String(available) }
      }),
    [selectedLines],
  )

  // Default scheduled_date = MIN(selectedLines.request.date_required) (la fecha
  // requerida más temprana). Si por algún motivo todas son null/inválidas,
  // fallback a hoy en zona horaria de Panamá.
  const defaultScheduledDate = useMemo(() => {
    const dates = selectedLines
      .map((l) => l.request.date_required)
      .filter((d): d is string => Boolean(d) && /^\d{4}-\d{2}-\d{2}$/.test(d as string))
    if (dates.length === 0) return todayStrInPanama()
    return [...dates].sort()[0]
  }, [selectedLines])

  const [quantities, setQuantities] = useState<LineQuantityState[]>(initialState)
  const [scheduledDate, setScheduledDate] = useState<string>(defaultScheduledDate)
  const [notes, setNotes] = useState('')
  const [dateError, setDateError] = useState<string | null>(null)

  const handleQtyChange = (lineId: string, value: string) => {
    setQuantities((prev) =>
      prev.map((q) => (q.request_line_id === lineId ? { ...q, quantity_assigned: value } : q)),
    )
  }

  const handleSubmit = async () => {
    if (!scheduledDate || !/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)) {
      setDateError('La fecha programada es requerida.')
      return
    }
    setDateError(null)

    const validLines: PickupOrderLineInput[] = quantities
      .map((q) => ({
        request_line_id: q.request_line_id,
        quantity_assigned: parseFloat(q.quantity_assigned) || 0,
      }))
      .filter((l) => l.quantity_assigned > 0)

    if (validLines.length === 0) return
    await onConfirm(validLines, scheduledDate, notes.trim() || null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl sm:p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Aprobar pickup ({selectedLines.length} {selectedLines.length === 1 ? 'línea' : 'líneas'})
        </h3>

        <div className="space-y-3">
          {selectedLines.map((line) => {
            const isEquipo = line.line_type === 'Equipo'
            const available = Math.max(
              0,
              line.quantity - (line.qty_scheduled ?? 0) - (line.qty_delivered ?? 0),
            )
            const fromName = line.from_location?.name ?? line.from_text ?? '—'
            const toName = line.to_location?.name ?? line.to_text ?? '—'
            const unitCode = line.unit?.code ?? line.unit_text ?? ''
            const qty = quantities.find((q) => q.request_line_id === line.id)
            const parsedQty = parseFloat(qty?.quantity_assigned ?? '0') || 0
            const willInclude = parsedQty > 0

            return (
              <div
                key={line.id}
                className={`rounded-lg border p-3 ${willInclude ? 'border-amber-200 bg-amber-50/50' : 'border-gray-200 bg-gray-50/50 opacity-60'}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {isEquipo ? (
                    <Wrench className="h-4 w-4 text-iconsa-blue" />
                  ) : (
                    <Package className="h-4 w-4 text-gold" />
                  )}
                  <span className="text-sm font-medium text-gray-900" title={line.description}>
                    {line.description}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-iconsa-gray mb-2">
                  <span>{fromName} → {toName}</span>
                  <span className="text-gray-300">·</span>
                  <span>Disponible: {formatQty(available)} {unitCode}</span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-700 whitespace-nowrap">
                    Cantidad a aprobar:
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={available}
                    step="1"
                    value={qty?.quantity_assigned ?? ''}
                    onChange={(e) => handleQtyChange(line.id, e.target.value)}
                    onFocus={(e) => e.target.select()}
                    disabled={loading}
                    className="w-24 rounded border border-gray-300 px-2 py-1 text-sm text-right focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue"
                  />
                  <span className="text-xs text-gray-500">{unitCode}</span>
                  {!willInclude && (
                    <span className="text-xs italic text-gray-500">No se incluirá</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-4">
          <label htmlFor="pickup-order-scheduled-date" className="mb-1 block text-sm font-medium text-gray-700">
            Fecha programada <span className="text-red-600">*</span>
          </label>
          <input
            id="pickup-order-scheduled-date"
            type="date"
            value={scheduledDate}
            onChange={(e) => {
              setScheduledDate(e.target.value)
              if (dateError) setDateError(null)
            }}
            disabled={loading}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue"
          />
          {dateError && <p className="mt-1 text-xs text-red-600">{dateError}</p>}
        </div>

        <div className="mt-4">
          <label htmlFor="pickup-order-notes" className="mb-1 block text-sm font-medium text-gray-700">
            Notas (opcional)
          </label>
          <textarea
            id="pickup-order-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observaciones del pickup..."
            rows={2}
            maxLength={500}
            disabled={loading}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue"
          />
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-4 flex items-center justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} loading={loading}>
            Aprobar pickup
          </Button>
        </div>
      </div>
    </div>
  )
}
