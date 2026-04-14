'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Select, type SelectOption } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import FileUploader from '@/components/ui/FileUploader'
import FileDisplay from '@/components/ui/FileDisplay'
import type { TripInput } from '@/hooks/useTrips'
import type { Attachment } from '@/lib/supabase/storage'
import { todayStrInPanama } from '@/lib/utils/datetime'

/** Genera opciones de hora de 4:00 AM a 8:00 PM cada 5 min */
function generateTimeOptions(): SelectOption[] {
  const options: SelectOption[] = []
  for (let h = 4; h <= 20; h++) {
    for (let m = 0; m < 60; m += 5) {
      if (h === 20 && m > 0) break
      const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
      const ampm = h >= 12 ? 'PM' : 'AM'
      const label = `${h12}:${String(m).padStart(2, '0')} ${ampm}`
      options.push({ value, label })
    }
  }
  return options
}

const TIME_OPTIONS = generateTimeOptions()

type TripFormMode = 'create' | 'edit' | 'readonly'

interface TripFormProps {
  mode: TripFormMode
  initialData?: {
    tripId?: string | null
    scheduledDate: string
    scheduledTime?: string | null
    driverId: string | null
    vehicleId: string | null
    trailerId: string | null
    rateId: string | null
    cost: number | null
    attPermit: boolean
    escort: boolean
    notes: string | null
    isExternal: boolean
    status?: string
    confirmationCode?: string | null
  }
  /** Conductores disponibles para el dropdown */
  drivers: SelectOption[]
  /** Vehiculos (cabezales) disponibles para el dropdown */
  vehicles: SelectOption[]
  /** Remolques disponibles para el dropdown */
  trailers: SelectOption[]
  /**
   * Tarifas disponibles para el dropdown.
   * sublabel debe contener el monto formateado, ej: "B/. 2,000.00"
   */
  rates: SelectOption[]
  /** Callback cada vez que cambian los datos del formulario */
  onChange: (data: TripInput) => void
  /**
   * Callback opcional para cuando cambia la tarifa seleccionada.
   * El padre puede usar esto para auto-rellenar el costo.
   */
  onRateChange?: (rateId: string | null) => void
  /** Si true, el remolque es obligatorio (vehículo es cabezal) */
  isTrailerRequired?: boolean
  /** Si es retiro en Chilibre (self-pickup) */
  isPickup?: boolean
  /** Callback cuando cambia el toggle de retiro */
  onPickupChange?: (isPickup: boolean) => void
  /** UUID del viaje (para folder de storage). En modo crear se genera uno temporal. */
  tripId?: string
  /** Adjuntos iniciales del viaje */
  initialAttachments?: Attachment[]
}

function TripForm({
  mode,
  initialData,
  drivers,
  vehicles,
  trailers,
  rates,
  onChange,
  onRateChange,
  isTrailerRequired = false,
  isPickup = false,
  onPickupChange,
  tripId: tripIdProp,
  initialAttachments,
}: TripFormProps) {
  // En modo edicion con viaje En Ruta, solo las notas son editables
  const isEnRuta = mode === 'edit' && initialData?.status === 'En Ruta'
  const isReadonly = mode === 'readonly'
  const fieldsDisabled = isReadonly || isEnRuta

  // --- Estado interno del formulario ---
  const [scheduledDate, setScheduledDate] = useState<string>(
    initialData?.scheduledDate ?? '',
  )
  const [scheduledTime, setScheduledTime] = useState<string>(
    initialData?.scheduledTime ?? '',
  )
  const [driverId, setDriverId] = useState<string | null>(
    initialData?.driverId ?? null,
  )
  const [vehicleId, setVehicleId] = useState<string | null>(
    initialData?.vehicleId ?? null,
  )
  const [trailerId, setTrailerId] = useState<string | null>(
    initialData?.trailerId ?? null,
  )
  const [rateId, setRateId] = useState<string | null>(
    initialData?.rateId ?? null,
  )
  const [cost, setCost] = useState<string>(
    initialData?.cost != null ? String(initialData.cost) : '',
  )
  const [attPermit, setAttPermit] = useState<boolean>(
    initialData?.attPermit ?? false,
  )
  const [escort, setEscort] = useState<boolean>(
    initialData?.escort ?? false,
  )
  const [notes, setNotes] = useState<string>(initialData?.notes ?? '')
  const [isExternal, setIsExternal] = useState<boolean>(
    initialData?.isExternal ?? false,
  )
  const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments ?? [])
  // UUID estable para folder de storage (en modo crear, genera uno temporal)
  const folderIdRef = useRef(tripIdProp ?? crypto.randomUUID())

  // --- Propagar cambios al padre ---
  const propagate = useCallback(
    (overrides?: Partial<TripInput>) => {
      const data: TripInput = {
        scheduled_date: overrides?.scheduled_date ?? scheduledDate,
        scheduled_time: overrides?.scheduled_time !== undefined ? overrides.scheduled_time : (scheduledTime || null),
        driver_id: overrides?.driver_id !== undefined ? overrides.driver_id : driverId,
        vehicle_id: overrides?.vehicle_id !== undefined ? overrides.vehicle_id : vehicleId,
        trailer_id: overrides?.trailer_id !== undefined ? overrides.trailer_id : trailerId,
        rate_id: overrides?.rate_id !== undefined ? overrides.rate_id : rateId,
        cost: overrides?.cost !== undefined ? overrides.cost : (parseFloat(cost) || null),
        att_permit: overrides?.att_permit !== undefined ? overrides.att_permit : attPermit,
        escort: overrides?.escort !== undefined ? overrides.escort : escort,
        notes: overrides?.notes !== undefined ? overrides.notes : (notes.trim() || null),
        is_external: overrides?.is_external !== undefined ? overrides.is_external : isExternal,
        is_self_pickup: overrides?.is_self_pickup !== undefined ? overrides.is_self_pickup : isPickup,
        attachments: overrides?.attachments !== undefined ? overrides.attachments : attachments,
      }
      onChange(data)
    },
    [scheduledDate, scheduledTime, driverId, vehicleId, trailerId, rateId, cost, attPermit, escort, notes, isExternal, isPickup, attachments, onChange],
  )

  // Propagar el estado inicial al montar
  useEffect(() => {
    propagate()
    // Solo en el montaje inicial
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- Handlers de cambio ---
  const handleDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value
      setScheduledDate(val)
      propagate({ scheduled_date: val })
    },
    [propagate],
  )

  const handleTimeChange = useCallback(
    (val: string | null) => {
      setScheduledTime(val ?? '')
      propagate({ scheduled_time: val })
    },
    [propagate],
  )

  const handleDriverChange = useCallback(
    (val: string | null) => {
      setDriverId(val)
      propagate({ driver_id: val })
    },
    [propagate],
  )

  const handleVehicleChange = useCallback(
    (val: string | null) => {
      setVehicleId(val)
      propagate({ vehicle_id: val })
    },
    [propagate],
  )

  const handleTrailerChange = useCallback(
    (val: string | null) => {
      setTrailerId(val)
      propagate({ trailer_id: val })
    },
    [propagate],
  )

  const handleRateChange = useCallback(
    (val: string | null) => {
      // Auto-rellenar costo desde el amount de la opción seleccionada.
      // Si el usuario ya ingresó un costo distinto, pedir confirmación
      // antes de sobreescribirlo.
      if (val) {
        const selectedRate = rates.find((r) => r.value === val)
        if (selectedRate?.amount != null) {
          const newCost = String(selectedRate.amount)
          const currentCostNum = parseFloat(cost)
          const hasManualCost =
            cost.trim() !== '' && !Number.isNaN(currentCostNum) && currentCostNum !== selectedRate.amount
          if (hasManualCost) {
            const ok = typeof window !== 'undefined' &&
              window.confirm(
                `Ya ingresaste un costo de B/. ${currentCostNum.toFixed(2)}. ` +
                `¿Reemplazar con la tarifa seleccionada (B/. ${selectedRate.amount.toFixed(2)})?`,
              )
            if (!ok) {
              setRateId(val)
              onRateChange?.(val)
              propagate({ rate_id: val })
              return
            }
          }
          setRateId(val)
          setCost(newCost)
          onRateChange?.(val)
          propagate({ rate_id: val, cost: selectedRate.amount })
          return
        }
      }
      setRateId(val)
      onRateChange?.(val)
      propagate({ rate_id: val })
    },
    [propagate, onRateChange, rates, cost],
  )

  const handleCostChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value
      setCost(val)
      propagate({ cost: parseFloat(val) || null })
    },
    [propagate],
  )

  const handleAttPermitChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.checked
      setAttPermit(val)
      propagate({ att_permit: val })
    },
    [propagate],
  )

  const handleEscortChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.checked
      setEscort(val)
      propagate({ escort: val })
    },
    [propagate],
  )

  const handleNotesChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value
      setNotes(val)
      propagate({ notes: val.trim() || null })
    },
    [propagate],
  )

  const handleExternalChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.checked
      setIsExternal(val)
      propagate({ is_external: val })
    },
    [propagate],
  )

  // Datos de visualizacion de la barra de identificacion
  const tripId = initialData?.tripId
  const status = initialData?.status
  const confirmationCode = initialData?.confirmationCode

  return (
    <div className="space-y-4">
      {/* Barra de identificacion */}
      <div className="flex flex-col gap-2 rounded-lg bg-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        {/* ID del viaje */}
        <div className="flex items-center gap-3 flex-wrap">
          {tripId ? (
            <span className="text-lg font-bold font-mono text-navy">
              {tripId}
            </span>
          ) : (
            <span className="text-sm italic text-iconsa-gray">
              Se generara al guardar
            </span>
          )}

          {/* Badges de estado y permisos especiales */}
          {status && (
            <div className="flex items-center gap-2">
              <Badge variant="trip" label={status} />
              {attPermit && (
                <Badge
                  variant="custom"
                  label="ATT"
                  bg="bg-purple-100"
                  text="text-purple-800"
                />
              )}
              {escort && (
                <Badge
                  variant="custom"
                  label="Escolta"
                  bg="bg-orange-100"
                  text="text-orange-800"
                />
              )}
            </div>
          )}
        </div>

        {/* Codigo de confirmacion (solo en modo edicion o lectura si ya existe) */}
        {confirmationCode && (mode === 'edit' || mode === 'readonly') && (
          <div className="flex items-center gap-1.5 text-sm text-iconsa-gray">
            <span>Codigo:</span>
            <span className="font-mono font-bold text-gray-900 tracking-widest">
              {confirmationCode}
            </span>
          </div>
        )}
      </div>

      {/* Campos del formulario */}
      {/* Toggle retiro en Chilibre */}
      {mode === 'create' && onPickupChange && (
        <label className="mb-2 flex items-center gap-1.5 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={isPickup}
            onChange={(e) => {
              const next = e.target.checked
              // Si al activar pickup hay driver/vehicle/trailer ingresados,
              // pedir confirmación — el toggle los limpia arriba.
              const willLoseData = next && (driverId || vehicleId || trailerId)
              if (willLoseData && typeof window !== 'undefined') {
                const ok = window.confirm(
                  'Activar retiro en Chilibre quitará el conductor, vehículo y remolque seleccionados. ¿Continuar?',
                )
                if (!ok) return
              }
              onPickupChange(next)
            }}
            className="accent-navy"
          />
          Retiro en Chilibre (sin conductor/vehículo)
        </label>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Fecha Programada — min = hoy Panamá (solo creación) */}
        <Input
          label="Fecha Programada"
          type="date"
          value={scheduledDate}
          onChange={handleDateChange}
          disabled={fieldsDisabled}
          min={mode === 'create' ? todayStrInPanama() : undefined}
        />

        {/* Hora de Salida (opcional) — dropdown filtrable 12h */}
        <Select
          label="Hora de Salida (opcional)"
          placeholder="Seleccionar hora..."
          options={TIME_OPTIONS}
          value={scheduledTime || null}
          onChange={handleTimeChange}
          disabled={fieldsDisabled}
          searchable
        />

        {/* Conductor, vehículo, remolque — ocultos en pickup */}
        {!isPickup && (
          <>
            {/* Conductor */}
            <Select
              label="Conductor"
              placeholder="Seleccionar conductor..."
              options={drivers}
              value={driverId}
              onChange={handleDriverChange}
              disabled={fieldsDisabled}
              searchable
            />

            {/* Vehiculo */}
            <Select
              label="Vehiculo (Cabezal)"
              placeholder="Seleccionar vehiculo..."
              options={vehicles}
              value={vehicleId}
              onChange={handleVehicleChange}
              disabled={fieldsDisabled}
              searchable
            />

            {/* Remolque — requerido si el vehículo es cabezal */}
            <div>
              <Select
                label={isTrailerRequired ? 'Remolque (requerido)' : 'Remolque (opcional)'}
                placeholder="Seleccionar remolque..."
                options={trailers}
                value={trailerId}
                onChange={handleTrailerChange}
                disabled={fieldsDisabled}
                searchable
              />
              {isTrailerRequired && !trailerId && !fieldsDisabled && (
                <p className="mt-1 text-xs text-red-600">
                  El remolque es obligatorio para vehículos cabezal.
                </p>
              )}
            </div>
          </>
        )}

        {/* Tarifa */}
        <Select
          label="Tarifa de Movilizacion"
          placeholder="Seleccionar tarifa..."
          options={rates}
          value={rateId}
          onChange={handleRateChange}
          disabled={fieldsDisabled}
          searchable
        />

        {/* Costo */}
        <Input
          label="Costo (B/.)"
          type="number"
          step="0.01"
          min="0"
          value={cost}
          onChange={handleCostChange}
          disabled={fieldsDisabled}
          placeholder="0.00"
        />

        {/* Toggles: ATT Permit + Escolta + Externo — fila completa en mobile, columna par en desktop */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6 md:col-span-2">
          {/* Requiere Permiso ATT */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={attPermit}
              onChange={handleAttPermitChange}
              disabled={fieldsDisabled}
              className="rounded border-gray-300 text-navy focus:ring-navy disabled:cursor-not-allowed"
            />
            <span className="text-sm font-medium text-gray-700">
              Requiere Permiso ATT
            </span>
          </label>

          {/* Requiere Escolta */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={escort}
              onChange={handleEscortChange}
              disabled={fieldsDisabled}
              className="rounded border-gray-300 text-navy focus:ring-navy disabled:cursor-not-allowed"
            />
            <span className="text-sm font-medium text-gray-700">
              Requiere Escolta
            </span>
          </label>

          {/* Viaje externo (conductor/empresa externa) */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isExternal}
              onChange={handleExternalChange}
              disabled={fieldsDisabled}
              className="rounded border-gray-300 text-navy focus:ring-navy disabled:cursor-not-allowed"
            />
            <span className="text-sm font-medium text-gray-700">
              Viaje externo
            </span>
          </label>
        </div>

        {/* Adjuntos */}
        <div className="md:col-span-2">
          {isReadonly ? (
            <FileDisplay attachments={attachments} />
          ) : (
            <FileUploader
              attachments={attachments}
              folder={`trips/${folderIdRef.current}`}
              onChange={(files) => {
                setAttachments(files)
                propagate({ attachments: files })
              }}
              disabled={fieldsDisabled}
            />
          )}
          {attPermit && attachments.length === 0 && !isReadonly && (
            <p className="mt-1 text-xs text-blue-600">
              ℹ️ Este viaje requiere permiso ATT. Puede adjuntarlo cuando esté disponible.
            </p>
          )}
        </div>

        {/* Notas — ancho completo. En modo En Ruta, este campo SI es editable */}
        <div className="md:col-span-2">
          <label
            htmlFor="trip-notes"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Notas
          </label>
          <textarea
            id="trip-notes"
            value={notes}
            onChange={handleNotesChange}
            // Las notas son editables incluso en modo En Ruta
            disabled={isReadonly}
            placeholder="Observaciones operativas de la movilización (opcional)"
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>
      </div>
    </div>
  )
}

export { TripForm }
export type { TripFormProps, TripFormMode }
