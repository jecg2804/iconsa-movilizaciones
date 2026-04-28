'use client'

import { useState, useMemo } from 'react'
import { Wrench, Package } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import FileUploader from '@/components/ui/FileUploader'
import { formatQty } from '@/lib/utils/format'
import type { Attachment } from '@/lib/supabase/storage'
import type { BacklogLine } from '@/hooks/useTrips'
import type { ExternalOrderLineInput } from '@/hooks/useExternalOrders'

interface LineQuantityState {
  request_line_id: string
  quantity_assigned: string
}

interface CreateExternalOrderModalProps {
  selectedLines: BacklogLine[]
  onConfirm: (
    lines: ExternalOrderLineInput[],
    providerName: string,
    invoiceAmount: number,
    invoiceAttachments: Attachment[],
    notes: string | null,
  ) => Promise<void>
  onClose: () => void
  loading: boolean
  error: string | null
}

export function CreateExternalOrderModal({
  selectedLines,
  onConfirm,
  onClose,
  loading,
  error,
}: CreateExternalOrderModalProps) {
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

  const [quantities, setQuantities] = useState<LineQuantityState[]>(initialState)
  const [providerName, setProviderName] = useState('')
  const [invoiceAmount, setInvoiceAmount] = useState('')
  const [invoiceAttachments, setInvoiceAttachments] = useState<Attachment[]>([])
  const [notes, setNotes] = useState('')

  const tempFolderId = useMemo(() => `external/temp-${Date.now()}`, [])

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const handleQtyChange = (lineId: string, value: string) => {
    setQuantities((prev) =>
      prev.map((q) => (q.request_line_id === lineId ? { ...q, quantity_assigned: value } : q)),
    )
  }

  const validate = (): { valid: boolean; errors: Record<string, string> } => {
    const errs: Record<string, string> = {}
    if (providerName.trim() === '') errs.providerName = 'El nombre del proveedor es requerido'
    else if (providerName.length > 100) errs.providerName = 'Máximo 100 caracteres'
    const amount = parseFloat(invoiceAmount)
    if (!Number.isFinite(amount) || amount <= 0) errs.invoiceAmount = 'El costo debe ser mayor a cero'
    if (invoiceAttachments.length === 0) errs.invoiceAttachments = 'Adjunta al menos una cotización o factura'
    if (notes.length > 500) errs.notes = 'Máximo 500 caracteres'
    return { valid: Object.keys(errs).length === 0, errors: errs }
  }

  const handleSubmit = async () => {
    const { valid, errors } = validate()
    if (!valid) {
      setFormErrors(errors)
      return
    }
    setFormErrors({})

    const validLines: ExternalOrderLineInput[] = quantities
      .map((q) => ({
        request_line_id: q.request_line_id,
        quantity_assigned: parseFloat(q.quantity_assigned) || 0,
      }))
      .filter((l) => l.quantity_assigned > 0)

    if (validLines.length === 0) return
    await onConfirm(validLines, providerName, parseFloat(invoiceAmount), invoiceAttachments, notes.trim() || null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl sm:p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Aprobar viaje externo ({selectedLines.length} {selectedLines.length === 1 ? 'línea' : 'líneas'})
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
                className={`rounded-lg border p-3 ${willInclude ? 'border-blue-200 bg-blue-50/50' : 'border-gray-200 bg-gray-50/50 opacity-60'}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {isEquipo ? <Wrench className="h-4 w-4 text-iconsa-blue" /> : <Package className="h-4 w-4 text-gold" />}
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
                  <label className="text-xs text-gray-700 whitespace-nowrap">Cantidad a aprobar:</label>
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
                  {!willInclude && <span className="text-xs italic text-gray-500">No se incluirá</span>}
                </div>
              </div>
            )
          })}
        </div>

        {/* Sección Datos del proveedor */}
        <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
          <h4 className="text-sm font-semibold text-gray-900">Datos del proveedor</h4>

          <div>
            <label htmlFor="ext-provider" className="mb-1 block text-sm font-medium text-gray-700">
              Proveedor / Empresa transportista <span className="text-red-600">*</span>
            </label>
            <input
              id="ext-provider"
              type="text"
              maxLength={100}
              value={providerName}
              onChange={(e) => setProviderName(e.target.value)}
              disabled={loading}
              placeholder="Nombre del proveedor"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue"
            />
            {formErrors.providerName && (
              <p className="mt-1 text-xs text-red-600">{formErrors.providerName}</p>
            )}
          </div>

          <div>
            <label htmlFor="ext-cost" className="mb-1 block text-sm font-medium text-gray-700">
              Costo del servicio (B/.) <span className="text-red-600">*</span>
            </label>
            <input
              id="ext-cost"
              type="number"
              step="0.01"
              min="0.01"
              value={invoiceAmount}
              onChange={(e) => setInvoiceAmount(e.target.value)}
              disabled={loading}
              placeholder="0.00"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue"
            />
            {formErrors.invoiceAmount && (
              <p className="mt-1 text-xs text-red-600">{formErrors.invoiceAmount}</p>
            )}
          </div>

          <div>
            <FileUploader
              attachments={invoiceAttachments}
              folder={tempFolderId}
              onChange={setInvoiceAttachments}
              label="Cotización / Factura"
              hint="PDF, JPG, PNG o WEBP (max 10MB) — al menos 1 archivo requerido"
              disabled={loading}
            />
            {formErrors.invoiceAttachments && (
              <p className="mt-1 text-xs text-red-600">{formErrors.invoiceAttachments}</p>
            )}
          </div>

          <div>
            <label htmlFor="ext-notes" className="mb-1 block text-sm font-medium text-gray-700">
              Notas (opcional)
            </label>
            <textarea
              id="ext-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones del servicio externo..."
              rows={2}
              maxLength={500}
              disabled={loading}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue"
            />
            {formErrors.notes && (
              <p className="mt-1 text-xs text-red-600">{formErrors.notes}</p>
            )}
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-4 flex items-center justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} loading={loading}>
            Aprobar viaje externo
          </Button>
        </div>
      </div>
    </div>
  )
}
