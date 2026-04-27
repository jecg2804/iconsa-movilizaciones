'use client'

import { useState, useCallback, useMemo } from 'react'
import { Wrench, Package } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SelectWithFallback, type SelectWithFallbackValue } from '@/components/ui/SelectWithFallback'
import FileUploader from '@/components/ui/FileUploader'
import { formatCurrency, formatQty } from '@/lib/utils/format'
import type { Attachment } from '@/lib/supabase/storage'

export interface PendingExternalLine {
  id: string
  description: string
  line_type: string
  quantity: number
  unitCode: string
  request_id: string
  request_uuid: string
  project_code: string | null
  project_name: string | null
  external_approved_at: string
  external_provider_name: string
  external_invoice_amount: number
  external_invoice_attachments: Attachment[]
  external_notes: string | null
}

interface ExternalDeliveryModalProps {
  line: PendingExternalLine
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

export function ExternalDeliveryModal({
  line,
  receiverOptions,
  onConfirm,
  onClose,
  loading,
  error,
}: ExternalDeliveryModalProps) {
  const [confirmed, setConfirmed] = useState(false)
  const [receiver, setReceiver] = useState<SelectWithFallbackValue>({ id: null, text: null })
  const [notes, setNotes] = useState('')
  const [additionalAttachments, setAdditionalAttachments] = useState<Attachment[]>([])

  const canConfirm = confirmed && !loading

  const folderId = useMemo(() => `external/${line.id}`, [line.id])

  const handleSubmit = useCallback(async () => {
    if (!confirmed) return
    await onConfirm({
      receivedById: receiver.id,
      receivedByName: (receiver.text ?? '').trim(),
      notes: notes.trim(),
      additionalAttachments,
    })
  }, [confirmed, receiver, notes, additionalAttachments, onConfirm])

  const isEquipo = line.line_type === 'Equipo'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl sm:p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Confirmar entrega externo
        </h3>

        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-1">
          <div className="flex items-center gap-2">
            {isEquipo ? (
              <Wrench className="h-4 w-4 text-iconsa-blue" />
            ) : (
              <Package className="h-4 w-4 text-gold" />
            )}
            <span className="text-sm font-medium text-gray-900">{line.description}</span>
          </div>
          <p className="text-xs text-iconsa-gray">
            <span className="font-mono">{line.request_id}</span>
            {line.project_code && <span> · {line.project_code}</span>}
          </p>
          <p className="text-xs text-iconsa-gray">
            Cantidad: <span className="font-medium">{formatQty(line.quantity)} {line.unitCode}</span>
            {' · '}
            Proveedor: <span className="font-medium">{line.external_provider_name}</span>
            {' · '}
            Costo: <span className="font-medium">{formatCurrency(line.external_invoice_amount)}</span>
          </p>
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
            <label htmlFor="external-delivery-notes" className="mb-1 block text-sm font-medium text-gray-700">
              Notas adicionales (opcional)
            </label>
            <textarea
              id="external-delivery-notes"
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
            hint="Se agrega a las facturas existentes (max 10MB)"
          />

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

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
