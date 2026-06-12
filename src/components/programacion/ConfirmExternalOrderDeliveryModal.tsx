'use client'

import { useState, useMemo, useCallback } from 'react'
import { Wrench, Package } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SelectWithFallback, type SelectWithFallbackValue } from '@/components/ui/SelectWithFallback'
import FileUploader from '@/components/ui/FileUploader'
import { formatCurrency, formatQty } from '@/lib/utils/format'
import { getFileUrl } from '@/lib/supabase/storage'
import type { Attachment } from '@/lib/supabase/storage'
import type { ExternalOrderWithLines } from './ExternalOrderCard'

interface ConfirmExternalOrderDeliveryModalProps {
  order: ExternalOrderWithLines
  receiverOptions: { value: string; label: string }[]
  onConfirm: (data: {
    receivedById: string | null
    receivedByName: string
    notes: string
    additionalAttachments: Attachment[]
  }) => Promise<void>
  onClose: () => void
  loading: boolean
  error: string | null
}

export function ConfirmExternalOrderDeliveryModal({
  order,
  receiverOptions,
  onConfirm,
  onClose,
  loading,
  error,
}: ConfirmExternalOrderDeliveryModalProps) {
  const [confirmed, setConfirmed] = useState(false)
  const [receiver, setReceiver] = useState<SelectWithFallbackValue>({ id: null, text: null })
  const [notes, setNotes] = useState('')
  const [additionalAttachments, setAdditionalAttachments] = useState<Attachment[]>([])

  const folderId = useMemo(() => `external/${order.id}`, [order.id])
  const canConfirm = confirmed && !loading

  const handleViewInvoice = useCallback(async () => {
    if (order.invoice_attachments.length === 0) return
    const url = await getFileUrl(order.invoice_attachments[0].path)
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
  }, [order.invoice_attachments])

  const handleSubmit = useCallback(async () => {
    if (!confirmed) return
    await onConfirm({
      receivedById: receiver.id,
      receivedByName: (receiver.text ?? '').trim(),
      notes: notes.trim(),
      additionalAttachments,
    })
  }, [confirmed, receiver, notes, additionalAttachments, onConfirm])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl sm:p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Confirmar entrega externo {order.external_id}
        </h3>

        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-1">
          <p className="text-xs font-semibold text-blue-900">
            {order.lines.length} {order.lines.length === 1 ? 'línea' : 'líneas'} a entregar
          </p>
          <p className="text-xs text-iconsa-gray">
            Proveedor: <span className="font-medium">{order.provider_name}</span>
            {' · '}
            Costo: <span className="font-medium">{formatCurrency(order.invoice_amount)}</span>
            {order.invoice_attachments.length > 0 && (
              <>
                {' · '}
                <button
                  type="button"
                  onClick={handleViewInvoice}
                  className="text-blue-600 hover:underline"
                >
                  Ver factura
                </button>
              </>
            )}
          </p>
          <div className="mt-2 space-y-0.5">
            {order.lines.map((ol) => {
              if (!ol.line) return null
              const isEquipo = ol.line.line_type === 'Equipo'
              const unitCode = ol.line.unit?.code ?? ol.line.unit_text ?? ''
              return (
                <div key={ol.id} className="flex items-center gap-2 text-sm">
                  {isEquipo ? <Wrench className="h-3.5 w-3.5 text-iconsa-blue" /> : <Package className="h-3.5 w-3.5 text-gold" />}
                  <span className="font-medium text-gray-900">{ol.line.description}</span>
                  <span className="text-gray-300">·</span>
                  <span className="font-semibold text-gray-700 whitespace-nowrap">
                    {formatQty(ol.quantity_assigned)} {unitCode}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="space-y-4">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              disabled={loading}
              className="mt-0.5 rounded border-gray-300 text-navy focus:ring-navy"
            />
            <span className="text-sm text-gray-700">
              Confirmo que el material llegó al proyecto destino. <span className="text-red-600">*</span>
            </span>
          </label>

          <SelectWithFallback
            label="Receptor en proyecto (opcional)"
            placeholder="Seleccionar persona..."
            options={receiverOptions}
            value={receiver}
            onChange={setReceiver}
            fallbackPlaceholder="Escribir nombre del receptor"
          />
          <p className="-mt-2 text-xs text-iconsa-gray">
            La factura ya subida es la prueba primaria. Receptor opcional.
          </p>

          <div>
            <label htmlFor="confirm-ext-notes" className="mb-1 block text-sm font-medium text-gray-700">
              Notas adicionales (opcional)
            </label>
            <textarea
              id="confirm-ext-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones de la entrega..."
              rows={2}
              maxLength={500}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue"
            />
          </div>

          <FileUploader
            attachments={additionalAttachments}
            folder={folderId}
            onChange={setAdditionalAttachments}
            label="Foto adicional (opcional)"
            hint="Se agrega a las facturas existentes del order (max 10MB)"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 pt-2">
            <Button variant="primary" onClick={handleSubmit} loading={loading} disabled={!canConfirm}>
              Confirmar entrega
            </Button>
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
