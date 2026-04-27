'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Wrench, Package, ArrowRight, X, KeyRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useVehicles } from '@/hooks/useVehicles'
import { useSubmitGuard } from '@/hooks/useSubmitGuard'
import {
  useTrips,
  type TripInput,
  type AssignmentInput,
  type TripWithRelations,
  type TripAssignment,
  type BacklogLine,
  type ModifiedAssignment,
} from '@/hooks/useTrips'
import { formatCurrency, formatDate, formatDateTime, formatQty } from '@/lib/utils/format'
import { notifyViajeEditado } from '@/lib/notifications/actions'
import type { SelectOption } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { TripForm } from '@/components/programacion/TripForm'
import TripLiveMap from '@/components/gps/TripLiveMap'
import { LineSelector, getDateColor } from '@/components/programacion/LineSelector'
import type { Attachment } from '@/lib/supabase/storage'
import FileDisplay from '@/components/ui/FileDisplay'

// --- Helpers ---

/** Unidades que deben usar enteros (min=1, step=1) */
const INTEGER_UNITS = new Set(['und', 'pzas', 'juegos', 'gal', 'ft', 'qq'])

function getQtyStep(unitCode: string | undefined): { min: number; step: number } {
  return INTEGER_UNITS.has(unitCode ?? '') ? { min: 1, step: 1 } : { min: 0.01, step: 0.01 }
}

/** Convierte un TripWithRelations al TripInput editable */
function tripToInput(trip: TripWithRelations): TripInput {
  return {
    scheduled_date: trip.scheduled_date,
    scheduled_time: (trip as unknown as Record<string, unknown>).scheduled_time as string | null ?? null,
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

interface TripEventRow {
  event_type: string
  event_timestamp: string
  registered_by: { name: string } | null
  received_by_name: string | null
  notes: string | null
  attachments: unknown[] | null
}

// --- Componente de fila de asignacion existente (modo lectura o edicion) ---

interface AssignmentRowProps {
  assignment: TripAssignment
  originalQty: number
  canRemove: boolean
  canEdit: boolean
  onRemove: (assignmentId: string) => void
  onQtyChange?: (assignmentId: string, newQty: number) => void
}

function AssignmentRow({ assignment, originalQty, canRemove, canEdit, onRemove, onQtyChange }: AssignmentRowProps) {
  const router = useRouter()
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
          <button
            type="button"
            onClick={() => line?.request?.id && router.push(`/solicitudes/${line.request.id}`)}
            className="font-mono text-xs text-iconsa-blue hover:underline cursor-pointer shrink-0"
          >
            {requestDisplayId}
          </button>
          {line?.request?.project?.name && (
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600"
              title={line.request.project.code ?? undefined}>
              {line.request.project.name}
            </span>
          )}
        </div>

        {/* Ruta + fecha requerida + solicitante */}
        {line && (
          <div className="flex items-center gap-1 text-xs text-iconsa-gray flex-wrap">
            <span className="truncate max-w-25 sm:max-w-37.5">{fromName}</span>
            <ArrowRight className="h-3 w-3 shrink-0 text-gray-400" />
            <span className="truncate max-w-25 sm:max-w-37.5">{toName}</span>
            {line.request.date_required && (
              <>
                <span className="text-gray-300 mx-0.5">·</span>
                <span className={`font-medium ${getDateColor(line.request.date_required)}`}>
                  {formatDate(line.request.date_required)}
                </span>
              </>
            )}
            {line.request.requester?.name && (
              <>
                <span className="text-gray-300 mx-0.5">·</span>
                <span className="truncate max-w-24">{line.request.requester.name.split(' ').slice(0, 2).join(' ')}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Cantidad + estado */}
      <div className="shrink-0 flex items-center gap-3">
        {canEdit ? (
          (() => {
            const { min: qtyMin, step: qtyStep } = getQtyStep(unitCode || undefined)
            // max = total - entregado - programado_otros_viajes
            // qty_scheduled incluye ESTE viaje → sumamos originalQty (congelado al cargar)
            const maxQty = line?.quantity
              ? Math.max(qtyMin, line.quantity - (line.qty_delivered ?? 0) - (line.qty_scheduled ?? 0) + originalQty)
              : undefined
            return (
              <div className="flex items-center gap-1 whitespace-nowrap">
                <input
                  type="number"
                  value={assignment.quantity_assigned}
                  min={qtyMin}
                  max={maxQty}
                  step={qtyStep}
                  onChange={(e) => {
                    const raw = e.target.value
                    if (raw === '' || raw === '-') return
                    const parsed = parseFloat(raw)
                    if (!Number.isFinite(parsed)) return
                    onQtyChange?.(assignment.id, parsed)
                  }}
                  onFocus={(e) => e.target.select()}
                  onBlur={(e) => {
                    const parsed = parseFloat(e.target.value)
                    if (!Number.isFinite(parsed) || parsed < qtyMin) {
                      onQtyChange?.(assignment.id, qtyMin)
                    }
                  }}
                  title="Cantidad asignada"
                  className="w-20 rounded border border-gray-300 px-2 py-1 text-sm text-right focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue"
                />
                <span className="text-xs text-iconsa-gray">{unitCode}</span>
                {maxQty !== undefined && (
                  <span className="text-xs text-gray-400 whitespace-nowrap">/ {maxQty}</span>
                )}
              </div>
            )
          })()
        ) : (
          <span className="text-sm text-gray-700 whitespace-nowrap">
            {formatQty(assignment.quantity_assigned)} {unitCode}
            {(assignment.qty_delivered ?? 0) > 0 && (
              <span className="text-xs text-orange-600 ml-1">
                ({formatQty(assignment.qty_delivered)} entregadas)
              </span>
            )}
          </span>
        )}
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
          title="Quitar linea de la movilización"
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
  const guard = useSubmitGuard()

  // Auth y permisos
  const { person, role, loading: authLoading } = useAuth()

  // Vehiculos y remolques
  const { vehicles, trailers, loading: vehiclesLoading } = useVehicles()

  // Hook de viajes
  const {
    backlog,
    backlogLoading,
    refetchBacklog,
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
  })

  // Asignaciones: las originales del viaje + las nuevas seleccionadas
  const [existingAssignments, setExistingAssignments] = useState<TripAssignment[]>([])
  const [originalAssignments, setOriginalAssignments] = useState<Map<string, number>>(new Map())
  const [newAssignments, setNewAssignments] = useState<AssignmentInput[]>([])
  const [removedAssignmentIds, setRemovedAssignmentIds] = useState<string[]>([])
  const [removedLines, setRemovedLines] = useState<BacklogLine[]>([])

  // Eventos de ejecución
  const [tripEvents, setTripEvents] = useState<TripEventRow[]>([])

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
        setOriginalAssignments(new Map(data.assignments.map((a: TripAssignment) => [a.id, a.quantity_assigned])))
        setNewAssignments([])
        setRemovedAssignmentIds([])
        setRemovedLines([])
        setIsDirty(false)

        // Fetch eventos de ejecución
        const { data: events } = await supabase
          .from('trip_events')
          .select('event_type, event_timestamp, registered_by:registered_by(name), received_by_name, notes, attachments')
          .eq('trip_id', id)
          .order('event_timestamp', { ascending: true })
        setTripEvents((events as unknown as TripEventRow[]) ?? [])
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
    const removed = existingAssignments.find((a) => a.id === assignmentId)
    setExistingAssignments((prev) => prev.filter((a) => a.id !== assignmentId))
    setRemovedAssignmentIds((prev) => [...prev, assignmentId])

    // Reconstruir como BacklogLine para que aparezca inmediatamente en disponibles
    if (removed?.line) {
      const l = removed.line
      // qty_scheduled real MENOS lo que este viaje tenía asignado
      const adjustedQtyScheduled = Math.max(0, (l.qty_scheduled ?? 0) - removed.quantity_assigned)
      const bl: BacklogLine = {
        id: removed.request_line_id,
        request_id: l.request?.id ?? '',
        line_number: l.line_number,
        line_type: l.line_type,
        equipment_id: l.equipment?.id ?? null,
        description: l.description,
        from_location_id: l.from_location?.id ?? null,
        from_text: l.from_text ?? null,
        to_location_id: l.to_location?.id ?? null,
        to_text: l.to_text ?? null,
        quantity: l.quantity,
        unit_id: l.unit?.id ?? null,
        unit_text: l.unit_text ?? null,
        category: null,
        status: adjustedQtyScheduled > 0 ? 'Programada' : 'Pendiente',
        notes: l.notes ?? null,
        qty_scheduled: adjustedQtyScheduled,
        qty_delivered: l.qty_delivered ?? 0,
        equipment: l.equipment ?? null,
        from_location: l.from_location ?? null,
        to_location: l.to_location ?? null,
        unit: l.unit ?? null,
        request: {
          id: l.request?.id ?? '',
          request_id: l.request?.request_id ?? '',
          project: l.request?.project ?? { id: '', code: '', name: '' },
          requester: l.request?.requester ?? { id: '', name: '' },
          priority: null,
          date_required: l.request?.date_required ?? '',
          status: 'Enviada',
          notes: null,
          attachments: null,
        },
      }
      setRemovedLines((prev) => {
        // Si ya existe en removedLines, reemplazar (evitar duplicados)
        const idx = prev.findIndex((rl) => rl.id === bl.id)
        if (idx >= 0) {
          const copy = [...prev]
          copy[idx] = bl
          return copy
        }
        return [...prev, bl]
      })
    }

    setIsDirty(true)
  }, [existingAssignments])

  // --- Cambiar cantidad de asignacion existente ---
  const handleExistingQtyChange = useCallback((assignmentId: string, newQty: number) => {
    setExistingAssignments((prev) =>
      prev.map((a) => {
        if (a.id !== assignmentId) return a
        // originalQty congelado al cargar — no se mueve mientras el usuario teclea
        const origQty = originalAssignments.get(a.id) ?? a.quantity_assigned
        const maxQty = a.line?.quantity
          ? a.line.quantity - (a.line.qty_delivered ?? 0) - (a.line.qty_scheduled ?? 0) + origQty
          : newQty
        const unitCode = a.line?.unit?.code ?? a.line?.unit_text
        const qtyMin = INTEGER_UNITS.has(unitCode ?? '') ? 1 : 0.01
        const safeMax = Math.max(qtyMin, maxQty)
        const clamped = Math.min(Math.max(qtyMin, newQty), safeMax)
        return { ...a, quantity_assigned: clamped }
      }),
    )
    setIsDirty(true)
  }, [originalAssignments])

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

  // Backlog disponible = lineas no asignadas al viaje + lineas recién removidas del viaje
  const availableBacklog = useMemo(() => {
    const fromBacklog = backlog.filter((l) => !existingLineIds.has(l.id))
    // removedLines tiene prioridad (qty_scheduled ajustada por la cantidad liberada)
    const removedIds = new Set(removedLines.map((l) => l.id))
    const deduped = fromBacklog.filter((l) => !removedIds.has(l.id))
    return [...deduped, ...removedLines.filter((l) => !existingLineIds.has(l.id))]
  }, [backlog, existingLineIds, removedLines])

  // --- Guardar cambios ---
  const handleSave = guard(async () => {
    if (!trip) return
    // Validar remolque para cabezal
    if (isCabezal && !tripData.trailer_id) {
      return // El TripForm ya muestra el warning visual; no avanzar
    }
    // Validar que ninguna cantidad exceda su max (safety net)
    for (const a of existingAssignments) {
      if (!a.line?.quantity) continue
      const origQty = originalAssignments.get(a.id) ?? a.quantity_assigned
      const maxQty = a.line.quantity - (a.line.qty_delivered ?? 0) - (a.line.qty_scheduled ?? 0) + origQty
      const unitCode = a.line?.unit?.code ?? a.line?.unit_text
      const qtyMin = INTEGER_UNITS.has(unitCode ?? '') ? 1 : 0.01
      if (a.quantity_assigned > maxQty || a.quantity_assigned < qtyMin) return
    }
    // Calcular asignaciones existentes con cantidad modificada
    const modified: ModifiedAssignment[] = existingAssignments
      .filter((a) => {
        const orig = originalAssignments.get(a.id)
        return orig !== undefined && orig !== a.quantity_assigned
      })
      .map((a) => ({
        id: a.id,
        request_line_id: a.request_line_id,
        quantity_assigned: a.quantity_assigned,
        original_quantity: originalAssignments.get(a.id) ?? a.quantity_assigned,
      }))

    const originalDate = trip.scheduled_date
    const success = await updateTrip(trip.id, tripData, newAssignments, removedAssignmentIds, person?.id, modified)
    if (success) {
      // Detectar cambios significativos para notificación
      const changes: string[] = []
      if (originalDate !== tripData.scheduled_date)
        changes.push(`Fecha: ${originalDate} → ${tripData.scheduled_date}`)
      if (removedAssignmentIds.length > 0)
        changes.push(`${removedAssignmentIds.length} línea(s) removida(s)`)
      if (newAssignments.length > 0)
        changes.push(`${newAssignments.length} línea(s) agregada(s)`)
      if (modified.length > 0)
        changes.push('Cantidades ajustadas')
      if (trip.vehicle_id !== tripData.vehicle_id)
        changes.push('Vehículo cambiado')
      if (trip.trailer_id !== tripData.trailer_id)
        changes.push('Remolque cambiado')
      if (changes.length > 0) {
        notifyViajeEditado(trip.id, changes).catch(console.error)
      }
      // Refrescar backlog y datos del viaje
      refetchBacklog()
      const updated = await fetchTrip(id)
      if (updated) {
        setTrip(updated)
        setTripData(tripToInput(updated))
        setExistingAssignments(updated.assignments)
        setOriginalAssignments(new Map(updated.assignments.map((a: TripAssignment) => [a.id, a.quantity_assigned])))
        setNewAssignments([])
        setRemovedAssignmentIds([])
        setRemovedLines([])
        setIsDirty(false)
      }
    }
  })

  // --- Cancelar viaje ---
  const handleCancelTrip = guard(async () => {
    if (!trip) return
    const success = await cancelTrip(trip.id)
    if (success) {
      router.push('/programacion')
    }
  })

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
          <p className="text-iconsa-gray">Movilización no encontrada.</p>
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
            'Detalle de Movilización'
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
          tripId={trip.id}
          initialAttachments={(trip.attachments as unknown[])?.map(a => a as Attachment) ?? []}
        />
      </div>

      {/* Mapa en vivo del vehículo (GPS) — solo trips En Ruta no-pickup con GPS */}
      {trip.status === 'En Ruta' &&
        !trip.is_self_pickup &&
        trip.vehicle?.gps_vehicle_id && (
          <div className="mt-6">
            <TripLiveMap tripId={trip.id} variant="full" />
          </div>
        )}

      {/* Banner material entregado pendiente retorno */}
      {trip.status === 'En Ruta' && tripEvents.some(e => e.event_type === 'Entrega') && (
        <div className="mt-4 rounded-lg bg-green-50 border border-green-200 px-4 py-2.5">
          <p className="text-sm text-green-700 font-medium">
            Material entregado — pendiente registro de retorno
          </p>
        </div>
      )}

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
              No hay lineas asignadas a esta movilización.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {existingAssignments.map((assignment) => (
              <AssignmentRow
                key={assignment.id}
                assignment={assignment}
                originalQty={originalAssignments.get(assignment.id) ?? assignment.quantity_assigned}
                canRemove={canRemoveAssignments}
                canEdit={canEditFullTrip}
                onRemove={handleRemoveExisting}
                onQtyChange={handleExistingQtyChange}
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

      {/* Eventos de ejecución — visible siempre que haya eventos o viaje no esté Programado */}
      {(tripEvents.length > 0 || trip.status !== 'Programado') && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">
              Eventos de Ejecucion
            </h2>
            {tripEvents.length > 0 && (
              <span className="rounded-full bg-navy/10 px-2.5 py-0.5 text-xs font-medium text-navy">
                {tripEvents.length}
              </span>
            )}
          </div>
          {tripEvents.length === 0 ? (
            <p className="text-sm text-iconsa-gray">Sin eventos registrados.</p>
          ) : (
            <div className="space-y-3">
              {tripEvents.map((ev, idx) => {
                const icon = ev.event_type === 'Salida' ? '🚛'
                  : ev.event_type === 'Llegada' ? '📍'
                  : ev.event_type === 'Entrega' ? '✅'
                  : ev.event_type === 'Retorno' ? '🏠'
                  : '⚠️'
                return (
                  <div key={idx} className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                    <span className="text-lg shrink-0">{icon}</span>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900">{ev.event_type}</span>
                        <span className="text-xs text-iconsa-gray">{formatDateTime(ev.event_timestamp)}</span>
                      </div>
                      {ev.registered_by?.name && (
                        <p className="text-xs text-iconsa-gray">Registrado por: {ev.registered_by.name}</p>
                      )}
                      {ev.event_type === 'Entrega' && ev.received_by_name && (
                        <p className="text-xs text-iconsa-gray">Recibido por: {ev.received_by_name}</p>
                      )}
                      {ev.notes && (
                        <p className="text-xs text-gray-600">{ev.notes}</p>
                      )}
                      {ev.attachments && Array.isArray(ev.attachments) && ev.attachments.length > 0 && (
                        <div className="mt-1">
                          <FileDisplay
                            attachments={(ev.attachments as unknown[]).map(a => a as Attachment)}
                            collapsible={false}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
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
                Cancelar Movilización
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
                disabled={!isDirty || saving || (existingAssignments.length + newAssignments.length) === 0}
              >
                Guardar Cambios
              </Button>
            </div>
            {(existingAssignments.length + newAssignments.length) === 0 && (
              <p className="text-sm text-amber-600 mt-2">
                La movilización debe tener al menos una línea asignada.
              </p>
            )}
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
              Cancelar Movilización
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              ¿Esta seguro de que desea cancelar esta movilización? Todas las lineas
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
                Si, cancelar movilización
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
