'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Loader2, Wrench, Package } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useVehicles } from '@/hooks/useVehicles'
import type { TripWithRelations } from '@/hooks/useTrips'
import { Select, type SelectOption } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { formatQty } from '@/lib/utils/format'

export interface DispatchData {
  event_id: string // UUID pre-generado para idempotencia (retry de red)
  driver_id: string | null
  vehicle_id: string | null
  trailer_id: string | null
  lines: { request_line_id: string; qty_dispatched: number }[]
  notes: string
}

interface DispatchModalProps {
  trip: TripWithRelations
  onConfirm: (data: DispatchData) => Promise<void>
  onClose: () => void
  loading: boolean
  role: string | null
}

interface LineState {
  request_line_id: string
  checked: boolean
  qty: number
  maxQty: number
  description: string
  unitCode: string
  lineType: string
}

export function DispatchModal({ trip, onConfirm, onClose, loading, role }: DispatchModalProps) {
  // --- ALL hooks at top, before any conditionals ---
  // Solo logística/admin editan vehículo, conductor, líneas y cantidades al despachar.
  // Conductores (campo) solo confirman lo pre-programado.
  const canEdit = role === 'logistica' || role === 'admin'
  const supabase = useMemo(() => createClient(), [])
  const { vehicles: rawVehicles, trailers: rawTrailers, loading: vehiclesLoading } = useVehicles()

  // UUID estable del evento — mismo valor para retries del mismo modal (idempotencia)
  const eventIdRef = useRef<string>(crypto.randomUUID())

  const [driverId, setDriverId] = useState<string | null>(trip.driver?.id ?? null)
  const [vehicleId, setVehicleId] = useState<string | null>(trip.vehicle?.id ?? null)
  const [trailerId, setTrailerId] = useState<string | null>(trip.trailer?.id ?? null)
  const [notes, setNotes] = useState('')
  const [drivers, setDrivers] = useState<Array<{ id: string; name: string }>>([])
  const [driversLoading, setDriversLoading] = useState(true)
  const [lines, setLines] = useState<LineState[]>([])

  // Inicializar líneas desde assignments del viaje
  useEffect(() => {
    const initial: LineState[] = trip.assignments.map((a) => ({
      request_line_id: a.request_line_id,
      checked: true,
      qty: a.quantity_assigned,
      maxQty: a.quantity_assigned,
      description: a.line?.description ?? 'Línea',
      unitCode: a.line?.unit?.code ?? '',
      lineType: a.line?.line_type ?? 'Equipo',
    }))
    setLines(initial)
  }, [trip.assignments])

  // Fetch conductores (campo + logistica)
  useEffect(() => {
    async function fetchDrivers() {
      setDriversLoading(true)
      const { data } = await supabase
        .from('people')
        .select('id, name')
        .eq('status', 'Activo')
        .eq('app_role', 'campo')
        .order('name')
      setDrivers(data ?? [])
      setDriversLoading(false)
    }
    fetchDrivers()
  }, [supabase])

  // Opciones para dropdowns
  const driverOptions: SelectOption[] = useMemo(
    () => drivers.map((d) => ({ value: d.id, label: d.name })),
    [drivers],
  )

  const vehicleOptions: SelectOption[] = useMemo(
    () =>
      rawVehicles.map((v) => ({
        value: v.id,
        label: `${v.spectrum_code ?? ''} — ${v.description ?? ''}`.trim(),
      })),
    [rawVehicles],
  )

  const trailerOptions: SelectOption[] = useMemo(
    () =>
      rawTrailers.map((t) => ({
        value: t.id,
        label: `${t.spectrum_code ?? ''} — ${t.description ?? ''}`.trim(),
      })),
    [rawTrailers],
  )

  const handleToggleLine = useCallback((idx: number) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, checked: !l.checked } : l)))
  }, [])

  const handleQtyChange = useCallback((idx: number, value: number) => {
    setLines((prev) =>
      prev.map((l, i) =>
        i === idx ? { ...l, qty: Math.max(0, Math.min(value, l.maxQty)) } : l,
      ),
    )
  }, [])

  const handleConfirm = useCallback(async () => {
    const checkedLines = lines.filter((l) => l.checked && l.qty > 0)
    if (checkedLines.length === 0) return

    try {
      await onConfirm({
        event_id: eventIdRef.current,
        driver_id: driverId,
        vehicle_id: vehicleId,
        trailer_id: trailerId,
        lines: checkedLines.map((l) => ({
          request_line_id: l.request_line_id,
          qty_dispatched: l.qty,
        })),
        notes: notes.trim(),
      })
    } catch (err) {
      eventIdRef.current = crypto.randomUUID()
      throw err
    }
  }, [lines, driverId, vehicleId, trailerId, notes, onConfirm])

  const checkedCount = lines.filter((l) => l.checked && l.qty > 0).length
  const isLoading = driversLoading || vehiclesLoading

  // --- Render ---
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl sm:p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          {canEdit ? 'Despacho' : 'Confirmar Salida'} — {trip.trip_id}
        </h3>

        {!canEdit && (
          <div className="mb-4 rounded-lg border border-iconsa-blue/30 bg-iconsa-blue/5 p-3 text-xs text-iconsa-blue">
            Registro de salida con lo pre-programado por Logística. Para cambios, contactar a Charris.
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-navy" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Conductor */}
            <Select
              label="Conductor"
              placeholder="Seleccionar conductor..."
              options={driverOptions}
              value={driverId}
              onChange={setDriverId}
              searchable
              disabled={!canEdit}
            />

            {/* Vehículo */}
            <Select
              label="Vehículo"
              placeholder="Seleccionar vehículo..."
              options={vehicleOptions}
              value={vehicleId}
              onChange={setVehicleId}
              searchable
              disabled={!canEdit}
            />

            {/* Remolque (opcional) */}
            <Select
              label="Remolque (opcional)"
              placeholder="Seleccionar remolque..."
              options={trailerOptions}
              value={trailerId}
              onChange={setTrailerId}
              searchable
              disabled={!canEdit}
            />

            {/* Líneas / Carga */}
            <div>
              <p className="mb-2 text-sm font-medium text-gray-700">
                Carga ({checkedCount} de {lines.length} ítems)
              </p>
              <div className="space-y-2">
                {lines.map((line, idx) => (
                  <div
                    key={line.request_line_id}
                    className={`flex items-center gap-2 rounded-lg border p-2 transition-colors ${
                      line.checked
                        ? 'border-gray-200 bg-gray-50'
                        : 'border-gray-100 bg-gray-50/50 opacity-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={line.checked}
                      onChange={() => handleToggleLine(idx)}
                      disabled={!canEdit}
                      className="h-4 w-4 rounded border-gray-300 text-navy focus:ring-navy disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    {line.lineType === 'Equipo' ? (
                      <Wrench className="h-3.5 w-3.5 flex-shrink-0 text-iconsa-blue" />
                    ) : (
                      <Package className="h-3.5 w-3.5 flex-shrink-0 text-iconsa-gold" />
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
                      disabled={!line.checked || !canEdit}
                      onChange={(e) =>
                        handleQtyChange(idx, parseFloat(e.target.value) || 0)
                      }
                      className="w-16 rounded border border-gray-300 px-2 py-1 text-sm text-right disabled:bg-gray-100 disabled:text-gray-400 focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue"
                    />
                    <span className="text-xs text-iconsa-gray whitespace-nowrap">
                      / {formatQty(line.maxQty)} {line.unitCode}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Notas */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Notas (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observaciones del despacho"
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
                disabled={loading || checkedCount === 0}
              >
                {canEdit ? 'Confirmar Despacho' : 'Confirmar Salida'}
              </Button>
              <Button variant="ghost" onClick={onClose} disabled={loading}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
