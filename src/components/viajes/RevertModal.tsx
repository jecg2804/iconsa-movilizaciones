'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/Button'

interface RevertEvent {
  id: string
  event_type: string
  event_timestamp: string
  registered_by: { name: string } | null
}

interface RevertModalProps {
  event: RevertEvent
  onConfirm: (reason: string) => Promise<void>
  onClose: () => void
  loading: boolean
}

export function RevertModal({ event, onConfirm, onClose, loading }: RevertModalProps) {
  const [reason, setReason] = useState('')

  const handleConfirm = useCallback(async () => {
    if (!reason.trim()) return
    await onConfirm(reason.trim())
  }, [reason, onConfirm])

  const ts = new Date(event.event_timestamp).toLocaleString('es-PA', {
    timeZone: 'America/Panama',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl sm:p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Revertir {event.event_type}
        </h3>

        <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 p-3">
          <p className="text-sm text-orange-800">
            Esto deshará el último evento registrado y revertirá los cambios de estado asociados.
          </p>
        </div>

        <div className="mb-4 space-y-1 text-sm text-gray-600">
          <p>
            <span className="font-medium text-gray-700">Evento:</span> {event.event_type} — {ts}
          </p>
          {event.registered_by && (
            <p>
              <span className="font-medium text-gray-700">Registrado por:</span>{' '}
              {event.registered_by.name}
            </p>
          )}
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Razón de la reversión <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej: Se registró en el viaje equivocado"
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant="primary"
            onClick={handleConfirm}
            loading={loading}
            disabled={loading || !reason.trim()}
            className="!bg-red-600 hover:!bg-red-700"
          >
            Confirmar Reversión
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  )
}
