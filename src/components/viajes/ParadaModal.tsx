'use client'

import { useState, useCallback, useMemo } from 'react'
import { MapPin, Wrench, Package, ChevronDown, ChevronUp } from 'lucide-react'
import type { TripWithRelations } from '@/hooks/useTrips'
import { Button } from '@/components/ui/Button'
import FileUploader from '@/components/ui/FileUploader'
import { formatQty } from '@/lib/utils/format'
import type { Attachment } from '@/lib/supabase/storage'

export interface ParadaData {
  location: string
  stop_type: 'retiro' | 'entrega' | 'intercambio'
  lines?: { request_line_id: string; line_status: string; quantity: number; notes?: string }[]
  oc_reference?: string
  notes: string
  attachments: Attachment[]
}

interface ParadaModalProps {
  trip: TripWithRelations
  onConfirm: (data: ParadaData) => Promise<void>
  onClose: () => void
  loading: boolean
}

const STOP_TYPES = [
  { value: 'retiro', label: 'Retiro de material/equipo' },
  { value: 'entrega', label: 'Entrega de material/equipo' },
  { value: 'intercambio', label: 'Intercambio (deja y recoge)' },
] as const

const LINE_STATUSES = [
  { value: 'completo', label: 'Completo' },
  { value: 'parcial', label: 'Parcial' },
  { value: 'no_disponible', label: 'No disponible' },
] as const

export function ParadaModal({ trip, onConfirm, onClose, loading }: ParadaModalProps) {
  const [location, setLocation] = useState('')
  const [stopType, setStopType] = useState<'retiro' | 'entrega' | 'intercambio'>('retiro')
  const [ocReference, setOcReference] = useState('')
  const [notes, setNotes] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [showLines, setShowLines] = useState(false)
  const [selectedLines, setSelectedLines] = useState<Record<string, { checked: boolean; status: string; notes: string }>>({})

  // Auto-suggest locations from trip line origins/destinations (proveedores, etc.)
  const suggestedLocations = useMemo(() => {
    const locs = new Set<string>()
    for (const a of trip.assignments) {
      if (a.line?.from_text) locs.add(a.line.from_text)
      if (a.line?.to_text) locs.add(a.line.to_text)
      if (a.line?.from_location?.name) locs.add(a.line.from_location.name)
      if (a.line?.to_location?.name) locs.add(a.line.to_location.name)
    }
    return Array.from(locs).filter(Boolean)
  }, [trip.assignments])

  const canConfirm = location.trim().length > 0 && !loading

  const handleLineToggle = useCallback((lineId: string, checked: boolean) => {
    setSelectedLines(prev => ({
      ...prev,
      [lineId]: { ...prev[lineId], checked, status: prev[lineId]?.status || 'completo', notes: prev[lineId]?.notes || '' },
    }))
  }, [])

  const handleLineStatusChange = useCallback((lineId: string, status: string) => {
    setSelectedLines(prev => ({
      ...prev,
      [lineId]: { ...prev[lineId], status },
    }))
  }, [])

  const handleLineNotesChange = useCallback((lineId: string, lineNotes: string) => {
    setSelectedLines(prev => ({
      ...prev,
      [lineId]: { ...prev[lineId], notes: lineNotes },
    }))
  }, [])

  const handleConfirm = useCallback(async () => {
    const checkedLines = Object.entries(selectedLines)
      .filter(([, v]) => v.checked)
      .map(([id, v]) => {
        const assignment = trip.assignments.find(a => a.request_line_id === id)
        return {
          request_line_id: id,
          line_status: v.status,
          quantity: assignment?.quantity_assigned ?? 0,
          notes: v.notes.trim() || undefined,
        }
      })

    // Si hay OC reference, prepend a notes
    const fullNotes = ocReference.trim()
      ? `OC: ${ocReference.trim()}${notes.trim() ? ' — ' + notes.trim() : ''}`
      : notes.trim()

    await onConfirm({
      location: location.trim(),
      stop_type: stopType,
      lines: checkedLines.length > 0 ? checkedLines : undefined,
      oc_reference: ocReference.trim() || undefined,
      notes: fullNotes,
      attachments,
    })
  }, [location, stopType, selectedLines, ocReference, notes, attachments, trip.assignments, onConfirm])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-cyan-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Parada Intermedia — {trip.trip_id}
          </h3>
        </div>

        <div className="space-y-4">
          {/* Ubicación */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Ubicación <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ej: TUBOTEC SA - Milla 8"
              list="location-suggestions"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
            <datalist id="location-suggestions">
              {suggestedLocations.map((loc) => (
                <option key={loc} value={loc} />
              ))}
            </datalist>
          </div>

          {/* Tipo de parada */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Tipo de parada <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-3">
              {STOP_TYPES.map((st) => (
                <label key={st.value} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="stop_type"
                    value={st.value}
                    checked={stopType === st.value}
                    onChange={() => setStopType(st.value as typeof stopType)}
                    className="accent-cyan-600"
                  />
                  {st.label}
                </label>
              ))}
            </div>
          </div>

          {/* Líneas afectadas (colapsable) */}
          {trip.assignments.length > 0 && (
            <div className="rounded-lg border border-gray-200">
              <button
                type="button"
                onClick={() => setShowLines(!showLines)}
                className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <span>Líneas afectadas (opcional)</span>
                {showLines ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {showLines && (
                <div className="space-y-2 border-t border-gray-200 p-3">
                  {trip.assignments.map((a) => {
                    const lineState = selectedLines[a.request_line_id]
                    return (
                      <div key={a.request_line_id} className="space-y-1">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={lineState?.checked ?? false}
                            onChange={(e) => handleLineToggle(a.request_line_id, e.target.checked)}
                            className="accent-cyan-600"
                          />
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
                        </label>
                        {lineState?.checked && (
                          <div className="ml-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                            <select
                              value={lineState.status}
                              onChange={(e) => handleLineStatusChange(a.request_line_id, e.target.value)}
                              className="rounded border border-gray-300 px-2 py-1 text-xs focus:border-cyan-500 focus:outline-none"
                            >
                              {LINE_STATUSES.map((ls) => (
                                <option key={ls.value} value={ls.value}>{ls.label}</option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={lineState.notes}
                              onChange={(e) => handleLineNotesChange(a.request_line_id, e.target.value)}
                              placeholder="Notas (ej: faltan 65 tubos)"
                              className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs placeholder:text-gray-400 focus:border-cyan-500 focus:outline-none"
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Referencia OC */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Referencia OC (opcional)
            </label>
            <input
              type="text"
              value={ocReference}
              onChange={(e) => setOcReference(e.target.value)}
              placeholder="Ej: 29902"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          {/* Adjuntos */}
          <FileUploader
            attachments={attachments}
            folder={`events/${trip.id}`}
            onChange={setAttachments}
            label="Documentos"
            hint="Factura, nota de entrega, foto (max 10MB)"
          />

          {/* Notas */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Notas (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Material parcial, restan 65 tubos PVC para el jueves"
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <Button variant="primary" onClick={handleConfirm} loading={loading} disabled={!canConfirm}>
            Registrar Parada
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  )
}
