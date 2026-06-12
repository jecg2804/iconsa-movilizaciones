'use client'

import { useState, useCallback, useMemo } from 'react'
import { MapPin, Wrench, Package } from 'lucide-react'
import type { TripWithRelations } from '@/hooks/useTrips'
import { Button } from '@/components/ui/Button'
import FileUploader from '@/components/ui/FileUploader'
import { formatQty } from '@/lib/utils/format'
import type { Attachment } from '@/lib/supabase/storage'

export interface ParadaData {
  location: string
  lines: { request_line_id: string; line_status: string; quantity: number; notes?: string }[]
  notes: string
  attachments: Attachment[]
}

interface ParadaModalProps {
  trip: TripWithRelations
  onConfirm: (data: ParadaData) => Promise<void>
  onClose: () => void
  loading: boolean
}

const LINE_STATUSES = [
  { value: 'completo', label: 'Completo' },
  { value: 'parcial', label: 'Parcial' },
  { value: 'no_disponible', label: 'No disponible' },
] as const

const OTHER_OPTION = '__OTHER__'

interface LocationOption {
  label: string
}

export function ParadaModal({ trip, onConfirm, onClose, loading }: ParadaModalProps) {
  // Selección del dropdown: '' (sin elegir), label de opción, o OTHER_OPTION
  const [selectedOption, setSelectedOption] = useState<string>('')
  // Free-text aplica solo cuando selectedOption === OTHER_OPTION
  const [freeText, setFreeText] = useState('')
  const [notes, setNotes] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [selectedLines, setSelectedLines] = useState<Record<string, { checked: boolean; status: string; notes: string }>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)

  // Construir opciones del dropdown desde las líneas del trip.
  // Filtro lowercase 'proyecto' / 'taller' per Decisión 24 (BD verificada).
  // Entradas con location_type=null o 'otro' pasan al dropdown.
  // Dedup por label (Q4 confirmado en brainstorming).
  const dropdownOptions = useMemo<LocationOption[]>(() => {
    const seen = new Set<string>()
    const opts: LocationOption[] = []
    for (const a of trip.assignments) {
      const line = a.line
      if (!line) continue
      const fromLabel = line.from_location?.name ?? line.from_text
      const fromType = line.from_location?.location_type ?? null
      if (fromLabel && fromType !== 'proyecto' && fromType !== 'taller') {
        if (!seen.has(fromLabel)) {
          seen.add(fromLabel)
          opts.push({ label: fromLabel })
        }
      }
      const toLabel = line.to_location?.name ?? line.to_text
      const toType = line.to_location?.location_type ?? null
      if (toLabel && toType !== 'proyecto' && toType !== 'taller') {
        if (!seen.has(toLabel)) {
          seen.add(toLabel)
          opts.push({ label: toLabel })
        }
      }
    }
    return opts
  }, [trip.assignments])

  const finalLocation =
    selectedOption === OTHER_OPTION ? freeText.trim() : selectedOption
  const checkedLineEntries = Object.entries(selectedLines).filter(([, v]) => v.checked)
  const linesValid = checkedLineEntries.length >= 1
  const attachmentsValid = attachments.length >= 1
  const locationValid = finalLocation.length > 0

  const canConfirm = locationValid && linesValid && attachmentsValid && !loading

  const handleSelectChange = useCallback((value: string) => {
    setSelectedOption(value)
    if (value !== OTHER_OPTION) {
      // Limpiar free-text al volver al dropdown (E2 confirmado)
      setFreeText('')
    }
  }, [])

  const handleLineToggle = useCallback((lineId: string, checked: boolean) => {
    setSelectedLines(prev => ({
      ...prev,
      [lineId]: {
        ...prev[lineId],
        checked,
        status: prev[lineId]?.status || 'completo',
        notes: prev[lineId]?.notes || '',
      },
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
    setSubmitAttempted(true)
    if (!canConfirm) return

    const checkedLines = checkedLineEntries.map(([id, v]) => {
      const assignment = trip.assignments.find(a => a.request_line_id === id)
      return {
        request_line_id: id,
        line_status: v.status,
        quantity: assignment?.quantity_assigned ?? 0,
        notes: v.notes.trim() || undefined,
      }
    })

    await onConfirm({
      location: finalLocation,
      lines: checkedLines,
      notes: notes.trim(),
      attachments,
    })
  }, [canConfirm, checkedLineEntries, finalLocation, notes, attachments, trip.assignments, onConfirm])

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
            <label htmlFor="parada-location-select" className="mb-1 block text-sm font-medium text-gray-700">
              Ubicación <span className="text-red-500">*</span>
            </label>
            <select
              id="parada-location-select"
              value={selectedOption}
              onChange={(e) => handleSelectChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="">Seleccionar...</option>
              {dropdownOptions.map((opt) => (
                <option key={opt.label} value={opt.label}>📍 {opt.label}</option>
              ))}
              <option value={OTHER_OPTION}>✏️ Otra ubicación (escribir libre)</option>
            </select>
            {selectedOption === OTHER_OPTION && (
              <input
                type="text"
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                placeholder="Escriba la ubicación"
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            )}
            {submitAttempted && !locationValid && (
              <p className="mt-1 text-xs text-red-600">La ubicación es requerida.</p>
            )}
          </div>

          {/* Líneas afectadas (siempre visible, requeridas ≥1) */}
          <div className="rounded-lg border border-gray-200">
            <div className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700">
              Líneas afectadas <span className="text-red-500">*</span>
              <span className="ml-1 text-xs font-normal text-gray-500">(marcar al menos una)</span>
            </div>
            <div className="space-y-2 p-3">
              {trip.assignments.length === 0 && (
                <p className="text-sm italic text-gray-500">El viaje no tiene líneas asignadas.</p>
              )}
              {trip.assignments.map((a) => {
                const lineState = selectedLines[a.request_line_id]
                return (
                  <div key={a.request_line_id} className="space-y-1">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        data-testid={`parada-line-${a.request_line_id}`}
                        checked={lineState?.checked ?? false}
                        onChange={(e) => handleLineToggle(a.request_line_id, e.target.checked)}
                        className="accent-cyan-600"
                      />
                      {a.line?.line_type === 'Equipo' ? (
                        <Wrench className="h-3.5 w-3.5 shrink-0 text-iconsa-blue" />
                      ) : (
                        <Package className="h-3.5 w-3.5 shrink-0 text-iconsa-gold" />
                      )}
                      <span className="flex-1 truncate text-sm text-gray-700">
                        {a.line?.po_reference && (
                          <span className="mr-2 font-mono text-xs text-iconsa-gray">
                            OC {a.line.po_reference}
                          </span>
                        )}
                        {a.line?.description ?? 'Línea'}
                      </span>
                      <span className="text-xs text-iconsa-gray">
                        {formatQty(a.quantity_assigned)} {a.line?.unit?.code ?? ''}
                      </span>
                    </label>
                    {lineState?.checked && (
                      <div className="ml-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                        <select
                          aria-label="Estado de la línea"
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
            {submitAttempted && !linesValid && (
              <p className="border-t border-gray-200 px-3 py-2 text-xs text-red-600">
                Marcar al menos una línea afectada.
              </p>
            )}
          </div>

          {/* Foto de factura (requerida ≥1) */}
          <div>
            <FileUploader
              attachments={attachments}
              folder={`events/${trip.id}`}
              onChange={setAttachments}
              label="Foto de factura *"
              hint="Foto / PDF (max 10MB). Al menos 1 archivo requerido."
            />
            {submitAttempted && !attachmentsValid && (
              <p className="mt-1 text-xs text-red-600">Subir al menos un archivo (foto de factura).</p>
            )}
          </div>

          {/* Notas generales (opcional) */}
          <div>
            <label htmlFor="parada-notes" className="mb-1 block text-sm font-medium text-gray-700">
              Notas generales (opcional)
            </label>
            <textarea
              id="parada-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Material parcial, restan 65 tubos PVC para el jueves"
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <Button variant="primary" onClick={handleConfirm} loading={loading} disabled={loading}>
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
