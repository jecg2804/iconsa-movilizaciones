'use client'

import { useState, useCallback, useMemo } from 'react'
import { Wrench, Package } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SelectWithFallback, type SelectWithFallbackValue } from '@/components/ui/SelectWithFallback'
import FileUploader from '@/components/ui/FileUploader'
import { formatQty } from '@/lib/utils/format'
import type { Attachment } from '@/lib/supabase/storage'

export interface PendingPickupLine {
  id: string
  description: string
  line_type: string
  quantity: number
  unitCode: string
  request_id: string
  request_uuid: string
  project_code: string | null
  project_name: string | null
  pickup_approved_at: string
}

interface PickupDeliveryModalProps {
  line: PendingPickupLine
  receiverOptions: { value: string; label: string }[]
  onConfirm: (data: {
    receivedById: string | null
    receivedByName: string
    notes: string
    attachments: Attachment[]
  }) => Promise<void>
  onClose: () => void
  loading: boolean
  error: string | null
}

export function PickupDeliveryModal({
  line,
  receiverOptions,
  onConfirm,
  onClose,
  loading,
  error,
}: PickupDeliveryModalProps) {
  const [receiver, setReceiver] = useState<SelectWithFallbackValue>({ id: null, text: null })
  const [notes, setNotes] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])

  // Validación XOR (Q6): id O texto, al menos uno
  const canConfirm = useMemo(() => {
    const hasId = receiver.id !== null
    const hasText = (receiver.text ?? '').trim() !== ''
    return (hasId || hasText) && !loading
  }, [receiver, loading])

  const folderId = useMemo(() => `pickup/${line.id}`, [line.id])

  const handleSubmit = useCallback(async () => {
    await onConfirm({
      receivedById: receiver.id,
      receivedByName: (receiver.text ?? '').trim(),
      notes: notes.trim(),
      attachments,
    })
  }, [receiver, notes, attachments, onConfirm])

  const isEquipo = line.line_type === 'Equipo'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl sm:p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Registrar entrega de pickup
        </h3>

        {/* Info de la línea */}
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-1">
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
            Cantidad a entregar: <span className="font-medium">{formatQty(line.quantity)} {line.unitCode}</span>
          </p>
        </div>

        <div className="space-y-4">
          {/* Receptor (XOR — id o texto) */}
          <SelectWithFallback
            label="Receptor"
            placeholder="Seleccionar persona..."
            options={receiverOptions}
            value={receiver}
            onChange={setReceiver}
            fallbackPlaceholder="Escribir nombre del receptor"
          />
          <p className="-mt-2 text-xs text-iconsa-gray">
            Selecciona una persona O escribe el nombre si no está en la lista.
          </p>

          {/* Notas (opcional) */}
          <div>
            <label htmlFor="pickup-notes" className="mb-1 block text-sm font-medium text-gray-700">
              Notas (opcional)
            </label>
            <textarea
              id="pickup-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones de la entrega..."
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue"
            />
          </div>

          {/* Attachments (opcional) — persistidos en sm_request_lines.attachments JSONB */}
          <FileUploader
            attachments={attachments}
            folder={folderId}
            onChange={setAttachments}
            label="Fotos / PDF (opcional)"
            hint="PDF, JPG, PNG o WEBP (max 10MB)"
          />

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          {/* Acciones */}
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
