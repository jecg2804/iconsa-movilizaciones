'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useVehicles } from '@/hooks/useVehicles'
import { useTrips, type TripInput, type AssignmentInput } from '@/hooks/useTrips'
import { useSubmitGuard } from '@/hooks/useSubmitGuard'
import { formatCurrency } from '@/lib/utils/format'
import type { SelectOption } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { TripForm } from '@/components/programacion/TripForm'
import { LineSelector } from '@/components/programacion/LineSelector'

// --- Tipos internos ---

interface PersonRow {
  id: string
  name: string
}

interface RateRow {
  id: string
  code: string
  description: string
  rate: number
}

// --- Pagina ---

export default function NuevoViajePage() {
  const router = useRouter()
  const guard = useSubmitGuard()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])

  // Auth y permisos
  const { person, role, loading: authLoading } = useAuth()

  // Vehiculos y remolques
  const { vehicles, trailers, loading: vehiclesLoading } = useVehicles()

  // Backlog de lineas y mutaciones de viaje
  const {
    backlog,
    backlogLoading,
    saveTrip,
    saving,
    saveError,
  } = useTrips()

  // Datos adicionales (fetch inline)
  const [drivers, setDrivers] = useState<PersonRow[]>([])
  const [rates, setRates] = useState<RateRow[]>([])
  const [driversLoading, setDriversLoading] = useState(true)
  const [ratesLoading, setRatesLoading] = useState(true)

  // Estado del formulario
  const [isPickup, setIsPickup] = useState(false)
  const [tripData, setTripData] = useState<TripInput>({
    scheduled_date: '',
    scheduled_time: null,
    driver_id: null,
    vehicle_id: null,
    trailer_id: null,
    rate_id: null,
    cost: null,
    att_permit: false,
    escort: false,
    notes: null,
    is_external: false,
    is_self_pickup: false,
  })

  // Asignaciones de lineas seleccionadas
  const [assignments, setAssignments] = useState<AssignmentInput[]>([])

  // Errores de validacion
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  // --- Fetch conductores ---
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

  // --- Fetch tarifas ---
  useEffect(() => {
    async function fetchRates() {
      setRatesLoading(true)
      const { data } = await supabase
        .from('mobilization_rates')
        .select('id, code, description, rate')
        .eq('is_active', true)
        .order('code')
      setRates(data ?? [])
      setRatesLoading(false)
    }
    fetchRates()
  }, [supabase])

  // --- Pre-poblar asignaciones desde URL params (?lines=id1,id2) ---
  useEffect(() => {
    const linesParam = searchParams.get('lines')
    if (!linesParam || backlog.length === 0) return

    const lineIds = linesParam.split(',').filter(Boolean)
    if (lineIds.length === 0) return

    const preselected: AssignmentInput[] = lineIds
      .map((id) => {
        const line = backlog.find((l) => l.id === id)
        if (!line) return null
        const availableQty = Math.max(0, line.quantity - line.qty_scheduled - (line.qty_delivered ?? 0))
        return {
          request_line_id: line.id,
          quantity_assigned: availableQty > 0 ? availableQty : line.quantity,
        }
      })
      .filter((a): a is AssignmentInput => a !== null)

    if (preselected.length > 0) {
      setAssignments(preselected)
    }
    // Solo cuando backlog se carga por primera vez
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backlog.length, searchParams])

  // --- Auto-rellenar costo cuando cambia la tarifa ---
  const handleRateChange = useCallback(
    (rateId: string | null) => {
      if (!rateId) return
      const rate = rates.find((r) => r.id === rateId)
      if (rate) {
        setTripData((prev) => ({ ...prev, cost: rate.rate }))
      }
    },
    [rates],
  )

  // --- Transformar datos a SelectOption ---

  const driverOptions: SelectOption[] = useMemo(
    () => drivers.map((d) => ({ value: d.id, label: d.name })),
    [drivers],
  )

  const vehicleOptions: SelectOption[] = useMemo(
    () =>
      vehicles.map((v) => ({
        value: v.id,
        label: `${v.spectrum_code ?? ''} – ${v.description}`.trim(),
      })),
    [vehicles],
  )

  const trailerOptions: SelectOption[] = useMemo(
    () =>
      trailers.map((t) => ({
        value: t.id,
        label: `${t.spectrum_code ?? ''} – ${t.description}`.trim(),
      })),
    [trailers],
  )

  const rateOptions: SelectOption[] = useMemo(
    () =>
      rates.map((r) => ({
        value: r.id,
        label: `${r.code} — ${r.description}`,
        sublabel: formatCurrency(r.rate),
        amount: r.rate,
      })),
    [rates],
  )

  // --- Detectar si el vehículo es cabezal ---
  const isCabezal = useMemo(() => {
    const v = vehicles.find((v) => v.id === tripData.vehicle_id)
    if (!v) return false
    return (
      (v.spectrum_code?.toUpperCase().startsWith('CAB') ?? false) ||
      v.description.toUpperCase().includes('CABEZAL')
    )
  }, [vehicles, tripData.vehicle_id])

  // --- Validacion ---
  const validate = useCallback((): boolean => {
    const errors: string[] = []
    if (!tripData.scheduled_date) errors.push('Seleccione la fecha programada')
    if (!tripData.driver_id) errors.push('Seleccione un conductor')
    if (!tripData.vehicle_id) errors.push('Seleccione un vehiculo')
    // Remolque requerido para cabezal
    if (isCabezal && !tripData.trailer_id) {
      errors.push('Remolque requerido para vehículo cabezal')
    }
    // Tarifa es opcional — no toda movilización tiene tarifa formal
    if (assignments.length === 0) errors.push('Seleccione al menos una linea')
    setValidationErrors(errors)
    return errors.length === 0
  }, [tripData, assignments, isCabezal])

  // --- Guardar viaje ---
  const handleSave = guard(async () => {
    if (!validate()) return
    const result = await saveTrip(tripData, assignments, person?.id)
    if (result) {
      router.push('/programacion')
    }
  })

  // --- Estado de carga global ---
  const isLoading =
    authLoading || vehiclesLoading || driversLoading || ratesLoading

  // --- Guard de acceso ---
  // PM, campo y almacen no pueden crear viajes
  if (!authLoading && (role === 'pm' || role === 'campo' || role === 'almacen')) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4">
        <h1 className="text-xl font-bold text-gray-900">Acceso denegado</h1>
        <p className="text-sm text-iconsa-gray">
          No tiene permisos para crear movilizaciones.
        </p>
        <Button variant="secondary" onClick={() => router.push('/programacion')}>
          Volver a Programacion
        </Button>
      </div>
    )
  }

  // --- Loading ---
  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-navy" />
          <p className="text-sm text-iconsa-gray">Cargando formulario...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 pb-32 pt-4 sm:px-6 sm:pb-8 sm:pt-6">
      {/* Navegacion superior */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push('/programacion')}
          className="flex items-center gap-1.5 text-sm text-iconsa-gray hover:text-navy transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Programacion
        </button>
      </div>

      {/* Titulo */}
      <h1 className="text-2xl font-bold text-gray-900">Nueva Movilización</h1>

      {/* Error global de guardado */}
      {saveError && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {saveError}
        </div>
      )}

      {/* Errores de validacion */}
      {validationErrors.length > 0 && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3">
          <ul className="space-y-1 text-sm text-red-800">
            {validationErrors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Formulario de cabecera del viaje */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <TripForm
          mode="create"
          drivers={driverOptions}
          vehicles={vehicleOptions}
          trailers={trailerOptions}
          rates={rateOptions}
          onChange={setTripData}
          onRateChange={handleRateChange}
          isTrailerRequired={isCabezal}
          isPickup={isPickup}
          onPickupChange={(pickup) => {
            setIsPickup(pickup)
            if (pickup) {
              // Auto-seleccionar tarifa MVLPUP y limpiar conductor/vehículo
              const mvlpup = rates.find((r) => r.code === 'MVLPUP')
              setTripData((prev) => ({
                ...prev,
                driver_id: null,
                vehicle_id: null,
                trailer_id: null,
                is_self_pickup: true,
                rate_id: mvlpup?.id ?? prev.rate_id,
                cost: mvlpup?.rate ?? prev.cost,
              }))
            } else {
              setTripData((prev) => ({
                ...prev,
                is_self_pickup: false,
              }))
            }
          }}
        />
      </div>

      {/* Seccion de lineas del viaje */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900">
            Lineas de la Movilización
          </h2>
          {assignments.length > 0 && (
            <span className="rounded-full bg-navy/10 px-2.5 py-0.5 text-xs font-medium text-navy">
              {assignments.length}
            </span>
          )}
        </div>

        <LineSelector
          backlogLines={backlog}
          currentAssignments={assignments}
          onChange={setAssignments}
          loading={backlogLoading}
        />
      </div>

      {/* Barra de acciones — sticky en mobile */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white px-4 py-3 shadow-lg sm:static sm:inset-auto sm:z-auto sm:mt-6 sm:rounded-lg sm:border sm:shadow-sm sm:px-6 sm:py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 sm:justify-end">
          <Button
            variant="ghost"
            onClick={() => router.push('/programacion')}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            loading={saving}
            disabled={saving || assignments.length === 0}
          >
            Guardar Movilización
          </Button>
        </div>
      </div>
    </div>
  )
}
