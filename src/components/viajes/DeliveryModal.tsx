'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import { Wrench, Package } from 'lucide-react'
import type { TripWithRelations } from '@/hooks/useTrips'
import { Select, type SelectOption } from '@/components/ui/Select'
import { SelectWithFallback, type SelectWithFallbackValue } from '@/components/ui/SelectWithFallback'
import { Button } from '@/components/ui/Button'
import FileUploader from '@/components/ui/FileUploader'
import { formatQty } from '@/lib/utils/format'
import type { Attachment } from '@/lib/supabase/storage'

// --- Types ---

export interface DeliveryLineData {
  request_line_id: string
  quantity: number
  line_status: 'ok' | 'with_observations' | 'rejected'
  observation_type?: string
  observation_notes?: string
}

export interface DeliveryData {
  event_id: string // UUID pre-generado para idempotencia (retry de red)
  received_by_id: string | null
  received_by_name: string
  confirmation_code?: string
  lines: DeliveryLineData[]
  notes: string
  attachments: Attachment[]
}

interface DeliveryModalProps {
  trip: TripWithRelations
  onConfirm: (data: DeliveryData) => Promise<void>
  onClose: () => void
  loading: boolean
  receiverOptions: { value: string; label: string }[]
  person: { id: string; name: string } | null
}

interface LineState {
  request_line_id: string
  description: string
  lineType: string
  unitCode: string
  maxQty: number
  qty: number
  status: 'ok' | 'with_observations' | 'rejected'
  observationType: string
  observationNotes: string
}

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'ok', label: 'OK' },
  { value: 'with_observations', label: 'Con observaciones' },
  { value: 'rejected', label: 'Rechazado' },
]

const OBSERVATION_TYPES: SelectOption[] = [
  { value: 'damaged', label: 'Material dañado' },
  { value: 'wrong_qty', label: 'Cantidad incorrecta' },
  { value: 'wrong_item', label: 'Item equivocado' },
  { value: 'other', label: 'Otro' },
]

export function DeliveryModal({
  trip,
  onConfirm,
  onClose,
  loading,
  receiverOptions,
  person,
}: DeliveryModalProps) {
  // --- ALL hooks at top ---

  // UUID estable del evento — mismo valor para retries del mismo modal (idempotencia)
  const eventIdRef = useRef<string>(crypto.randomUUID())

  // Cambio 6 D5: separar líneas operables (entregables ahora) de las ya entregadas
  // en este trip (qty_delivered>0 en el assignment). Las ya entregadas se renderizan
  // greyed disabled para visibilidad operativa — Charris ve progreso del trip
  // ("voy 2 de 3 líneas"). Bug #4 BD trigger es la fuente de verdad; este UI es
  // defense-in-depth.
  const deliverableAssignments = useMemo(
    () => trip.assignments.filter(
      (a) => a.line?.status === 'En Transito' && (a.qty_delivered ?? 0) === 0,
    ),
    [trip.assignments],
  )

  // Líneas ya entregadas en este trip (qty_delivered>0). Render disabled con badge.
  const alreadyDeliveredAssignments = useMemo(
    () => trip.assignments.filter((a) => (a.qty_delivered ?? 0) > 0),
    [trip.assignments],
  )

  // Initialize line states (solo entregables — las ya entregadas no van al state
  // porque no son editables)
  const [lines, setLines] = useState<LineState[]>(() =>
    deliverableAssignments.map((a) => ({
      request_line_id: a.request_line_id,
      description: a.line?.description ?? 'Línea',
      lineType: a.line?.line_type ?? 'Equipo',
      unitCode: a.line?.unit?.code ?? '',
      maxQty: a.qty_dispatched || a.quantity_assigned,
      qty: a.qty_dispatched || a.quantity_assigned,
      status: 'ok' as const,
      observationType: '',
      observationNotes: '',
    })),
  )

  // Código siempre obligatorio (decisión 2026-04-16)

  // Auto-select receiver if person matches designated_receiver
  const initialReceiver = useMemo((): SelectWithFallbackValue => {
    if (person) {
      // Check if current user is a designated receiver for any line
      const match = deliverableAssignments.find(
        (a) => a.line?.designated_receiver_id === person.id,
      )
      if (match) {
        return { id: person.id, text: null }
      }
    }
    return { id: null, text: null }
  }, [person, deliverableAssignments])

  const [receiver, setReceiver] = useState<SelectWithFallbackValue>(initialReceiver)
  const [code, setCode] = useState('')
  const [notes, setNotes] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])

  // Validation
  const receiverFilled = (receiver.id !== null && receiver.id !== '') || (receiver.text !== null && receiver.text.trim() !== '')
  const codeValid = code.length === 4 && code === trip.confirmation_code
  const codeIncorrect = code.length === 4 && code !== trip.confirmation_code
  const hasDeliverableLines = lines.some((l) => l.status !== 'rejected' && l.qty > 0)
  const canConfirm = receiverFilled && codeValid && hasDeliverableLines && !loading

  const handleLineStatusChange = useCallback((idx: number, newStatus: string) => {
    setLines((prev) =>
      prev.map((l, i) => {
        if (i !== idx) return l
        const updated = { ...l, status: newStatus as LineState['status'] }
        if (newStatus === 'rejected') {
          updated.qty = 0
          updated.observationType = ''
          updated.observationNotes = ''
        }
        if (newStatus === 'ok') {
          updated.observationType = ''
          updated.observationNotes = ''
        }
        return updated
      }),
    )
  }, [])

  const handleQtyChange = useCallback((idx: number, value: number) => {
    setLines((prev) =>
      prev.map((l, i) =>
        i === idx ? { ...l, qty: Math.max(0, Math.min(value, l.maxQty)) } : l,
      ),
    )
  }, [])

  const handleObservationTypeChange = useCallback((idx: number, value: string | null) => {
    setLines((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, observationType: value ?? '' } : l)),
    )
  }, [])

  const handleObservationNotesChange = useCallback((idx: number, value: string) => {
    setLines((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, observationNotes: value } : l)),
    )
  }, [])

  const handleConfirm = useCallback(async () => {
    const receiverName = receiver.id
      ? receiverOptions.find((r) => r.value === receiver.id)?.label ?? ''
      : receiver.text?.trim() ?? ''

    try {
      await onConfirm({
        event_id: eventIdRef.current,
        received_by_id: receiver.id,
        received_by_name: receiverName,
        confirmation_code: code,
        lines: lines.map((l) => ({
          request_line_id: l.request_line_id,
          quantity: l.qty,
          line_status: l.status,
          observation_type: l.status === 'with_observations' ? l.observationType || undefined : undefined,
          observation_notes: l.status === 'with_observations' ? l.observationNotes || undefined : undefined,
        })),
        notes: notes.trim(),
        attachments,
      })
    } catch (err) {
      eventIdRef.current = crypto.randomUUID()
      throw err
    }
  }, [receiver, receiverOptions, code, lines, notes, attachments, onConfirm])

  // --- Render ---
  if (deliverableAssignments.length === 0 && alreadyDeliveredAssignments.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
        <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl sm:p-6">
          <p className="text-sm text-iconsa-gray">No hay líneas pendientes de entrega.</p>
          <Button variant="ghost" onClick={onClose} className="mt-4">
            Cerrar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl sm:p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Confirmar Entrega — {trip.trip_id}
        </h3>

        <div className="space-y-4">
          {/* Receptor */}
          <SelectWithFallback
            label="Recibido por"
            placeholder="Seleccionar receptor..."
            options={receiverOptions}
            value={receiver}
            onChange={setReceiver}
            fallbackLabel="No está en la lista"
            fallbackPlaceholder="Nombre del receptor"
          />

          {/* Líneas */}
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">
              Líneas por recibir ({lines.filter((l) => l.status !== 'rejected').length} de{' '}
              {lines.length})
              {alreadyDeliveredAssignments.length > 0 && (
                <span className="ml-1 text-xs text-iconsa-gray font-normal">
                  · {alreadyDeliveredAssignments.length} ya entregada{alreadyDeliveredAssignments.length === 1 ? '' : 's'}
                </span>
              )}
            </p>

            {/* Cambio 6 D5: líneas ya entregadas en este trip (greyed disabled) */}
            {alreadyDeliveredAssignments.length > 0 && (
              <div className="mb-3 space-y-2">
                {alreadyDeliveredAssignments.map((a) => {
                  const isEquipo = a.line?.line_type === 'Equipo'
                  const unitCode = a.line?.unit?.code ?? a.line?.unit_text ?? ''
                  return (
                    <div
                      key={a.request_line_id}
                      className="rounded-lg border border-emerald-200 bg-emerald-50/30 p-3 opacity-70"
                      title="Esta línea ya fue entregada en este viaje. Para corregir, reversá la Entrega anterior primero."
                    >
                      <div className="flex items-center gap-2">
                        {isEquipo ? (
                          <Wrench className="h-3.5 w-3.5 shrink-0 text-iconsa-blue" />
                        ) : (
                          <Package className="h-3.5 w-3.5 shrink-0 text-iconsa-gold" />
                        )}
                        <span className="flex-1 text-sm text-gray-700 truncate">
                          {a.line?.description ?? '—'}
                        </span>
                        <span className="text-xs font-medium text-emerald-700 whitespace-nowrap">
                          ✓ Entregada — {formatQty(a.qty_delivered ?? 0)} {unitCode}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="space-y-3">
              {lines.map((line, idx) => (
                <div
                  key={line.request_line_id}
                  className={`rounded-lg border p-3 transition-colors ${
                    line.status === 'rejected'
                      ? 'border-red-200 bg-red-50/50 opacity-60'
                      : line.status === 'with_observations'
                        ? 'border-orange-200 bg-orange-50/50'
                        : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  {/* Line header */}
                  <div className="flex items-center gap-2">
                    {line.lineType === 'Equipo' ? (
                      <Wrench className="h-3.5 w-3.5 shrink-0 text-iconsa-blue" />
                    ) : (
                      <Package className="h-3.5 w-3.5 shrink-0 text-iconsa-gold" />
                    )}
                    <span className="flex-1 text-sm text-gray-700 truncate">
                      {line.description}
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={line.maxQty}
                      step="1"
                      value={line.qty}
                      disabled={line.status === 'rejected'}
                      onChange={(e) => handleQtyChange(idx, parseFloat(e.target.value) || 0)}
                      title={`Cantidad a entregar de ${line.description}`}
                      className="w-16 rounded border border-gray-300 px-2 py-1 text-sm text-right disabled:bg-gray-100 disabled:text-gray-400 focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue"
                    />
                    <span className="text-xs text-iconsa-gray whitespace-nowrap">
                      / {formatQty(line.maxQty)} {line.unitCode}
                    </span>
                  </div>

                  {/* Status selector */}
                  <div className="mt-2">
                    <Select
                      placeholder="Estado"
                      options={STATUS_OPTIONS}
                      value={line.status}
                      onChange={(val) => handleLineStatusChange(idx, val ?? 'ok')}
                    />
                  </div>

                  {/* Observation fields (only for with_observations) */}
                  {line.status === 'with_observations' && (
                    <div className="mt-2 space-y-2 pl-2 border-l-2 border-orange-300">
                      <Select
                        label="Tipo de observación"
                        placeholder="Seleccionar..."
                        options={OBSERVATION_TYPES}
                        value={line.observationType || null}
                        onChange={(val) => handleObservationTypeChange(idx, val)}
                      />
                      <textarea
                        value={line.observationNotes}
                        onChange={(e) => handleObservationNotesChange(idx, e.target.value)}
                        placeholder="Detalle de la observación"
                        rows={2}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Código de confirmación (siempre obligatorio) */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Código de confirmación
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="4 dígitos"
              className={`w-32 rounded-lg border px-3 py-2 text-center font-mono text-lg tracking-widest focus:outline-none focus:ring-1 ${
                codeIncorrect
                  ? 'border-red-500 bg-red-50 text-red-700 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-iconsa-blue focus:ring-iconsa-blue'
              }`}
            />
            {codeIncorrect && (
              <p className="mt-1 text-xs text-red-600">
                Código incorrecto. Verifique con el solicitante.
              </p>
            )}
          </div>

          {/* Fotos */}
          <FileUploader
            attachments={attachments}
            folder={`events/${trip.id}`}
            onChange={setAttachments}
            label="Fotos de entrega"
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
              placeholder="Observaciones de la entrega"
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue"
            />
          </div>

          {/* Acciones */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="primary"
              onClick={handleConfirm}
              loading={loading}
              disabled={!canConfirm}
            >
              Confirmar Entrega
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
