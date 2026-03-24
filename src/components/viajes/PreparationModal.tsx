'use client'

import { useState, useCallback } from 'react'
import { Wrench, Package } from 'lucide-react'
import type { TripWithRelations } from '@/hooks/useTrips'
import { Button } from '@/components/ui/Button'
import FileUploader from '@/components/ui/FileUploader'
import { formatQty } from '@/lib/utils/format'
import type { Attachment } from '@/lib/supabase/storage'

interface PreparationModalProps {
  trip: TripWithRelations
  onConfirm: (data: { notes: string; attachments: Attachment[] }) => Promise<void>
  onClose: () => void
  loading: boolean
}

export function PreparationModal({ trip, onConfirm, onClose, loading }: PreparationModalProps) {
  const [notes, setNotes] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])

  const handleConfirm = useCallback(async () => {
    await onConfirm({ notes: notes.trim(), attachments })
  }, [notes, attachments, onConfirm])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Preparación — {trip.trip_id}
        </h3>

        <p className="mb-3 text-sm text-gray-600">
          Confirme que el material está listo para retiro.
        </p>

        {/* Líneas del viaje */}
        <div className="mb-4 space-y-2">
          {trip.assignments.map((a) => (
            <div
              key={a.request_line_id}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2"
            >
              {a.line?.line_type === 'Equipo' ? (
                <Wrench className="h-3.5 w-3.5 shrink-0 text-iconsa-blue" />
              ) : (
                <Package className="h-3.5 w-3.5 shrink-0 text-iconsa-gold" />
              )}
              <span className="flex-1 text-sm text-gray-700 truncate">
                {a.line?.description ?? 'Línea'}
              </span>
              <span className="text-xs text-iconsa-gray">
                {formatQty(a.quantity_assigned)} {a.line?.unit?.code ?? ''}
              </span>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {/* Fotos */}
          <FileUploader
            attachments={attachments}
            folder={`events/${trip.id}`}
            onChange={setAttachments}
            label="Fotos"
            hint="PDF, JPG, PNG o WEBP (max 10MB)"
          />

          {/* Notas */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Notas (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Ubicado en estante B3"
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue"
            />
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="primary" onClick={handleConfirm} loading={loading}>
            Material Listo
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  )
}
