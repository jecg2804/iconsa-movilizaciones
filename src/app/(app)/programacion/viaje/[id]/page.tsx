'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Wrench, Package, ArrowRight, X, KeyRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useVehicles } from '@/hooks/useVehicles'
import {
  useTrips,
  type TripInput,
  type AssignmentInput,
  type TripWithRelations,
  type TripAssignment,
} from '@/hooks/useTrips'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import type { SelectOption } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { TripForm } from '@/components/programacion/TripForm'
import { LineSelector } from '@/components/programacion/LineSelector'

// --- Helpers ---

/** Convierte un TripWithRelations al TripInput editable */
function tripToInput(trip: TripWithRelations): TripInput {
  return {
    scheduled_date: trip.scheduled_date,
    driver_id: trip.driver_id,
    vehicle_id: trip.vehicle_id,
    trailer_id: trip.trailer_id,
    rate_id: trip.rate_id,
    cost: trip.cost,
    att_permit: trip.att_permit ?? false,
    escort: trip.escort ?? false,
    notes: trip.notes,
    is_external: trip.is_external ?? false,
  }
}

/** Convierte asignaciones existentes del viaje al formato AssignmentInput */
function assignmentsToInput(assignments: TripAssignment[]): AssignmentInput[] {
  return assignments.map((a) => ({
    request_line_id: a.request_line_id,
    quantity_assigned: a.quantity_assigned,
  }))
}

/** Determina el modo de edicion del formulario segun estado y rol */
function determineTripMode(
  status: string,
  role: string | null,
): 'create' | 'edit' | 'readonly' {
  if (status === 'Completado' || status === 'Cancelado') return 'readonly'
  if (role === 'pm' || role === 'campo' || role === 'almacen') return 'readonly'
  if (role === 'logistica' || role === 'admin') return 'edit'
  return 'readonly'
}

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

// --- Componente de fila de asignacion existente (modo lectura o edicion) ---

interface AssignmentRowProps {
  assignment: TripAssignment
  canRemove: boolean
  onRemove: (assignmentId: string) => void
}

function AssignmentRow({ assignment, canRemove, onRemove }: AssignmentRowProps) {
  const line = assignment.line
  const isEquipo = line?.line_type === 'Equipo'
  const fromName = line?.from_location?.name ?? line?.from_text ?? '—'
  const toName = line?.to_location?.name ?? line?.to_text ?? '—'
  const unitCode = line?.unit?.code ?? line?.unit_text ?? ''
  const requestDisplayId = line?.request.request_id ?? assignment.request_line_id.slice(0, 8)

  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3">
      {/* Numero de linea */}
      <span className="shrink-0 text-xs font-medium text-iconsa-gray">
        #{line?.line_number ?? '—'}
      </span>

      {/* Icono de tipo */}
      <span className="shrink-0 hidden sm:block" title={line?.line_type}>
        {isEquipo ? (
          <Wrench className="h-4 w-4 text-iconsa-blue" />
        ) : (
          <Package className="h-4 w-4 text-gold" />
        )}
      </span>

      {/* Info de la linea */}
      <div className="min-w-0 flex-1 space-y-0.5">
        {/* Descripcion + ID solicitud */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="sm:hidden shrink-0" title={line?.line_type}>
            {isEquipo ? (
              <Wrench className="h-4 w-4 text-iconsa-blue" />
            ) : (
              <Package className="h-4 w-4 text-gold" />
            )}
          </span>
          <span className="truncate text-sm font-medium text-gray-900">
            {line?.description ?? 'Cargando...'}
          </span>
          <span className="font-mono text-xs text-iconsa-gray shrink-0">
            {requestDisplayId}
          </span>
        </div>

        {/* Ruta */}
        {line && (
          <div className="flex items-center gap-1 text-xs text-iconsa-gray">
            <span className="truncate max-w-[100px] sm:max-w-[150px]">{fromName}</span>
            <ArrowRight className="h-3 w-3 shrink-0 text-gray-400" />
            <span className="truncate max-w-[100px] sm:max-w-[150px]">{toName}</span>
          </div>
        )}

        {/* Fecha requerida de la solicitud */}
        {line?.request.date_required && (
          <span className="text-xs text-iconsa-gray">
            Requerida: {formatDate(line.request.date_required)}
          </span>
        )}
      </div>

      {/* Cantidad + estado */}
      <div className="shrink-0 flex items-center gap-3">
        <span className="text-sm text-gray-700 whitespace-nowrap">
          {assignment.quantity_assigned} {unitCode}
        </span>
        {line?.status && (
          <Badge variant="line" label={line.status} />
        )}
      </div>

      {/* Boton quitar (solo en modo edicion para viajes Programados) */}
      {canRemove && (
        <button
          type="button"
          onClick={() => onRemove(assignment.id)}
          className="shrink-0 rounded p-1.5 text-iconsa-gray hover:bg-red-50 hover:text-iconsa-red transition-colors"
          title="Quitar linea del viaje"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

// --- Pagina principal ---

export default function ViajeDetailPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  // Auth y permisos
  const { role, loading: authLoading } = useAuth()

  // Vehiculos y remolques
  const { vehicles, trailers, loading: vehiclesLoading } = useVehicles()

  // Hook de viajes
  const {
    backlog,
    backlogLoading,
    fetchTrip,
    updateTrip,
    cancelTrip,
    saving,
    saveError,
  } = useTrips()

  // Estado del viaje cargado
  const [trip, setTrip] = useState<TripWithRelations | null>(null)
  const [pageLoading, setPageLoading] = useState(true)

  // Estado editable
  const [tripData, setTripData] = useState<TripInput>({
    scheduled_date: '',
    driver_id: null,
    vehicle_id: null,
    trailer_id: null,
    rate_id: null,
    cost: null,
    att_permit: false,
    escort: false,
    notes: null,
    is_external: false,
  })

  // Asignaciones: las originales del viaje + las nuevas seleccionadas
  const [existingAssignments, setExistingAssignments] = useState<TripAssignment[]>([])
  const [newAssignments, setNewAssignments] = useState<AssignmentInput[]>([])
  const [removedAssignmentIds, setRemovedAssignmentIds] = useState<string[]>([])

  // Estado de UI
  const [isDirty, setIsDirty] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  // Datos adicionales (fetch inline)
  const [drivers, setDrivers] = useState<PersonRow[]>([])
  const [rates, setRates] = useState<RateRow[]>([])
  const [driversLoading, setDriversLoading] = useState(true)
  const [ratesLoading, setRatesLoading] = useState(true)

  // --- Cargar viaje ---
  useEffect(() => {
    async function load() {
      setPageLoading(true)
      const data = await fetchTrip(id)
      if (data) {
        setTrip(data)
        setTripData(tripToInput(data))
        setExistingAssignments(data.assignments)
        setNewAssignments([])
        setRemovedAssignmentIds([])
        setIsDirty(false)
      }
      setPageLoading(false)
    }
    load()
    // Solo al montar o cuando cambia el ID
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

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

  // --- Detectar si el vehículo seleccionado es cabezal ---
  const isCabezal = useMemo(() => {
    const v = vehicles.find((v) => v.id === tripData.vehicle_id)
    if (!v) return false
    return (
      (v.spectrum_code?.toUpperCase().startsWith('CAB') ?? false) ||
      v.description.toUpperCase().includes('CABEZAL')
    )
  }, [vehicles, tripData.vehicle_id])

  // --- Modo del formulario ---
  const mode = useMemo(() => {
    if (!trip) return 'readonly' as const
    return determineTripMode(trip.status, role)
  }, [trip, role])

  // Si el viaje esta En Ruta, solo se pueden editar notas (TripForm lo maneja internamente)
  const canEditFullTrip = mode === 'edit' && trip?.status === 'Programado'
  const canEditNotes = mode === 'edit' && trip?.status === 'En Ruta'
  const canRemoveAssignments = canEditFullTrip

  // --- Auto-rellenar costo cuando cambia la tarifa ---
  const handleRateChange = useCallback(
    (rateId: string | null) => {
      if (!rateId) return
      const rate = rates.find((r) => r.id === rateId)
      if (rate) {
        setTripData((prev) => ({ ...prev, cost: rate.rate }))
        setIsDirty(true)
      }
    },
    [rates],
  )

  // --- Handler de cambio en TripForm ---
  const handleTripDataChange = useCallback((data: TripInput) => {
    setTripData(data)
    setIsDirty(true)
  }, [])

  // --- Quitar asignacion existente ---
  const handleRemoveExisting = useCallback((assignmentId: string) => {
    setExistingAssignments((prev) => prev.filter((a) => a.id !== assignmentId))
    setRemovedAssignmentIds((prev) => [...prev, assignmentId])
    setIsDirty(true)
  }, [])

  // --- Cambiar nuevas asignaciones (desde LineSelector) ---
  const handleNewAssignmentsChange = useCallback((updated: AssignmentInput[]) => {
    setNewAssignments(updated)
    setIsDirty(true)
  }, [])

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

  // IDs de las lineas ya asignadas (para filtrar del LineSelector)
  const existingLineIds = useMemo(
    () => new Set(existingAssignments.map((a) => a.request_line_id)),
    [existingAssignments],
  )

  // Backlog disponible = solo las lineas que no estan ya asignadas al viaje actual
  const availableBacklog = useMemo(
    () => backlog.filter((l) => !existingLineIds.has(l.id)),
    [backlog, existingLineIds],
  )

  // --- Guardar cambios ---
  const handleSave = useCallback(async () => {
    if (!trip) return
    // Validar remolque para cabezal
    if (isCabezal && !tripData.trailer_id) {
      return // El TripForm ya muestra el warning visual; no avanzar
    }
    const success = await updateTrip(trip.id, tripData, newAssignments, removedAssignmentIds)
    if (success) {
      // Refrescar datos del viaje
      const updated = await fetchTrip(id)
      if (updated) {
        setTrip(updated)
        setTripData(tripToInput(updated))
        setExistingAssignments(updated.assignments)
        setNewAssignments([])
        setRemovedAssignmentIds([])
        setIsDirty(false)
      }
    }
  }, [trip, tripData, newAssignments, removedAssignmentIds, updateTrip, fetchTrip, id])

  // --- Cancelar viaje ---
  const handleCancelTrip = useCallback(async () => {
    if (!trip) return
    const success = await cancelTrip(trip.id)
    if (success) {
      router.push('/programacion')
    }
  }, [trip, cancelTrip, router])

  // --- Estado de carga global ---
  const isLoading =
    pageLoading || authLoading || vehiclesLoading || driversLoading || ratesLoading

  // --- Render: Loading ---
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-navy" />
      </div>
    )
  }

  // --- Render: Not found ---
  if (!trip) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <button
          onClick={() => router.push('/programacion')}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-iconsa-gray hover:text-navy transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Programacion
        </button>
        <div className="rounded-lg border border-gray-200 bg-white px-6 py-12 text-center">
          <p className="text-iconsa-gray">Viaje no encontrado.</p>
        </div>
      </div>
    )
  }

  const canCancelTrip =
    mode === 'edit' && (trip.status === 'Programado' || trip.status === 'En Ruta')

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 pb-32 sm:pb-8">
      {/* Navegacion */}
      <button
        onClick={() => router.push('/programacion')}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-iconsa-gray hover:text-navy transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Programacion
      </button>

      {/* Titulo */}
      <div className="mb-6 flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900">
          {trip.trip_id ? (
            <span className="font-mono">{trip.trip_id}</span>
          ) : (
            'Detalle de Viaje'
          )}
        </h1>
        {/* Codigo de confirmacion prominente si existe */}
        {trip.confirmation_code && (
          <div className="flex items-center gap-1.5 rounded-lg bg-navy/5 px-3 py-1.5 text-sm border border-navy/20">
            <KeyRound className="h-4 w-4 text-navy shrink-0" />
            <span className="text-iconsa-gray">Codigo:</span>
            <span className="font-mono font-bold text-gray-900 tracking-[0.25em]">
              {trip.confirmation_code}
            </span>
          </div>
        )}
      </div>

      {/* Error banner */}
      {saveError && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {saveError}
        </div>
      )}

      {/* Formulario principal del viaje */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <TripForm
          mode={mode}
          initialData={{
            tripId: trip.trip_id,
            scheduledDate: trip.scheduled_date,
            driverId: trip.driver_id,
            vehicleId: trip.vehicle_id,
            trailerId: trip.trailer_id,
            rateId: trip.rate_id,
            cost: trip.cost,
            attPermit: trip.att_permit ?? false,
            escort: trip.escort ?? false,
            notes: trip.notes,
            isExternal: trip.is_external ?? false,
            status: trip.status,
            confirmationCode: trip.confirmation_code,
          }}
          drivers={driverOptions}
          vehicles={vehicleOptions}
          trailers={trailerOptions}
          rates={rateOptions}
          onChange={handleTripDataChange}
          onRateChange={handleRateChange}
          isTrailerRequired={isCabezal}
        />
      </div>

      {/* Seccion de lineas asignadas */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900">
            Lineas Asignadas
          </h2>
          <span className="rounded-full bg-navy/10 px-2.5 py-0.5 text-xs font-medium text-navy">
            {existingAssignments.length + newAssignments.length}
          </span>
        </div>

        {/* Asignaciones existentes del viaje */}
        {existingAssignments.length === 0 && newAssignments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-8 text-center">
            <p className="text-sm text-iconsa-gray">
              No hay lineas asignadas a este viaje.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {existingAssignments.map((assignment) => (
              <AssignmentRow
                key={assignment.id}
                assignment={assignment}
                canRemove={canRemoveAssignments}
                onRemove={handleRemoveExisting}
              />
            ))}
          </div>
        )}

        {/* LineSelector para agregar nuevas lineas — solo en modo edicion de viaje Programado */}
        {canEditFullTrip && (
          <div className="mt-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">
              Agregar lineas del backlog
            </h3>
            <LineSelector
              backlogLines={availableBacklog}
              currentAssignments={newAssignments}
              onChange={handleNewAssignmentsChange}
              loading={backlogLoading}
            />
          </div>
        )}
      </div>

      {/* Informacion adicional en modo lectura */}
      {mode === 'readonly' && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
          <h2 className="mb-1 text-base font-semibold text-gray-900">
            Eventos de Ejecucion
          </h2>
          <p className="text-sm text-iconsa-gray">
            Registro de eventos de ejecucion disponible en la seccion Mis Viajes.
          </p>
          {trip.actual_departure && (
            <p className="mt-2 text-xs text-gray-500">
              Salida: {formatDate(trip.actual_departure)}
            </p>
          )}
          {trip.actual_arrival && (
            <p className="text-xs text-gray-500">
              Llegada: {formatDate(trip.actual_arrival)}
            </p>
          )}
        </div>
      )}

      {/* Barra de acciones en modo edicion */}
      {(mode === 'edit') && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white px-4 py-3 shadow-lg sm:static sm:inset-auto sm:z-auto sm:mt-6 sm:rounded-lg sm:border sm:shadow-sm sm:px-6 sm:py-4">
          <div className="mx-auto flex max-w-4xl items-center gap-3 sm:justify-end flex-wrap">
            {/* Cancelar viaje (destructivo) */}
            {canCancelTrip && (
              <Button
                variant="danger"
                onClick={() => setShowCancelConfirm(true)}
                disabled={saving}
              >
                Cancelar Viaje
              </Button>
            )}

            <div className="ml-auto flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => router.push('/programacion')}
                disabled={saving}
              >
                Volver
              </Button>
              {/* Guardar disponible para ambos modos edit (Programado y En Ruta) */}
              <Button
                variant="primary"
                onClick={handleSave}
                loading={saving}
                disabled={!isDirty || saving}
              >
                Guardar Cambios
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Volver en modo lectura */}
      {mode === 'readonly' && (
        <div className="mt-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/programacion')}
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a Programacion
          </Button>
        </div>
      )}

      {/* Modal de confirmacion de cancelacion de viaje */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">
              Cancelar Viaje
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              ¿Esta seguro de que desea cancelar este viaje? Todas las lineas
              asignadas regresaran al backlog como pendientes. Esta accion no se
              puede deshacer.
            </p>
            <div className="mt-4 flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCancelConfirm(false)}
                disabled={saving}
              >
                No, volver
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleCancelTrip}
                loading={saving}
              >
                Si, cancelar viaje
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
