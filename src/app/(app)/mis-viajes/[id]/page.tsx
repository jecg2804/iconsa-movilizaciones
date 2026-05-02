'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Wrench, Package, ArrowRight, KeyRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useTrips, type TripWithRelations } from '@/hooks/useTrips'
import { useTripEvents, type TripEventType, type TripEventInput } from '@/hooks/useTripEvents'
import {
  notifySalidaRegistrada,
  notifyEntregaConfirmada,
  notifySolicitudCompletada,
  notifyIncidenciaRuta,
  notifyRetornoRegistrado,
  notifyReversionRegistrada,
} from '@/lib/notifications/actions'
import { formatDate, formatQty } from '@/lib/utils/format'
import { canRegisterEvent } from '@/lib/utils/roles'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Input } from '@/components/ui/Input'
import { DispatchModal, type DispatchData } from '@/components/viajes/DispatchModal'
import { DeliveryModal, type DeliveryData } from '@/components/viajes/DeliveryModal'
import { RevertModal } from '@/components/viajes/RevertModal'
import { ParadaModal, type ParadaData } from '@/components/viajes/ParadaModal'
import { EventTimeline } from '@/components/viajes/EventTimeline'
import { EventButton } from '@/components/viajes/EventButton'
import { CodeConfirmation } from '@/components/viajes/CodeConfirmation'
import FileUploader from '@/components/ui/FileUploader'
import FileDisplay from '@/components/ui/FileDisplay'
import type { Attachment } from '@/lib/supabase/storage'

// --- Tipos ---

interface TripEvent {
  id: string
  event_type: string
  event_timestamp: string
  registered_by: { id: string; name: string } | null
  received_by_name: string | null
  notes: string | null
  attachments: Attachment[]
  reverts_event_id: string | null
  location: string | null
}

// --- Componente de fila de asignacion (solo lectura) ---

function AssignmentRow({ assignment }: { assignment: TripWithRelations['assignments'][number] }) {
  const router = useRouter()
  const line = assignment.line
  const isEquipo = line?.line_type === 'Equipo'
  const fromName = line?.from_location?.name ?? line?.from_text ?? '—'
  const toName = line?.to_location?.name ?? line?.to_text ?? '—'
  const unitCode = line?.unit?.code ?? line?.unit_text ?? ''
  const requestDisplayId = line?.request.request_id ?? assignment.request_line_id.slice(0, 8)

  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3">
      <span className="shrink-0 text-xs font-medium text-iconsa-gray">
        #{line?.line_number ?? '—'}
      </span>

      <span className="shrink-0" title={line?.line_type}>
        {isEquipo ? (
          <Wrench className="h-4 w-4 text-iconsa-blue" />
        ) : (
          <Package className="h-4 w-4 text-gold" />
        )}
      </span>

      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-900" title={line?.description ?? undefined}>
            {line?.description ?? '—'}
          </span>
          <button
            type="button"
            onClick={() => router.push(`/solicitudes/${line?.request?.id}`)}
            className="font-mono text-xs text-iconsa-gray shrink-0 hover:text-iconsa-blue hover:underline cursor-pointer"
          >
            {requestDisplayId}
          </button>
        </div>

        {line && (
          <div className="flex items-center gap-1 text-xs text-iconsa-gray">
            <span title={fromName}>{fromName}</span>
            <ArrowRight className="h-3 w-3 shrink-0 text-gray-400" />
            <span title={toName}>{toName}</span>
          </div>
        )}

        {line?.request.date_required && (
          <span className="text-xs text-iconsa-gray">
            Requerida: {formatDate(line.request.date_required)}
          </span>
        )}
      </div>

      <div className="shrink-0 flex items-center gap-2">
        <span className="text-sm text-gray-700 whitespace-nowrap">
          {formatQty(assignment.qty_dispatched && assignment.qty_dispatched !== assignment.quantity_assigned ? assignment.qty_dispatched : assignment.quantity_assigned)} {unitCode}
          {assignment.qty_dispatched > 0 && assignment.qty_dispatched !== assignment.quantity_assigned && (
            <span className="text-xs text-orange-600 ml-1">
              (prog: {formatQty(assignment.quantity_assigned)})
            </span>
          )}
        </span>
        {line?.status && <Badge variant="line" label={line.status} />}
      </div>
    </div>
  )
}

// --- Modal overlay de registro de evento ---

interface EventModalProps {
  eventType: TripEventType
  confirmationCode: string | null
  receiverOptions: Array<{ value: string; label: string }>
  assignments?: Array<{
    request_line_id: string
    quantity_assigned: number
    line: { description: string; quantity: number; unit?: { code: string } | null } | null
  }>
  onConfirm: (input: TripEventInput) => void
  onClose: () => void
  loading: boolean
}

function EventModal({ eventType, confirmationCode, receiverOptions, assignments, onConfirm, onClose, loading }: EventModalProps) {
  const [notes, setNotes] = useState('')
  const [location, setLocation] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [validationError, setValidationError] = useState<string | null>(null)
  const eventIdRef = useRef(crypto.randomUUID())
  const deliveredQtys = useRef<Record<string, number>>({})

  useEffect(() => {
    if (assignments) {
      const defaults: Record<string, number> = {}
      for (const a of assignments) {
        defaults[a.request_line_id] = a.quantity_assigned
      }
      deliveredQtys.current = defaults
    }
  }, [assignments])

  const handleConfirmCode = useCallback(
    (codeUsed: string, receivedById: string | null, receivedByName: string) => {
      onConfirm({
        id: eventIdRef.current,
        event_type: eventType,
        event_timestamp: new Date().toISOString(),
        location: location.trim() || null,
        notes: notes.trim() || null,
        confirmation_code_used: codeUsed || null,
        received_by_id: receivedById ?? null,
        received_by_name: receivedByName || null,
        attachments,
      })
      eventIdRef.current = crypto.randomUUID()
    },
    [eventType, location, notes, attachments, onConfirm],
  )

  const handleDirectConfirm = useCallback(() => {
    // G10: Incidencia requiere notas descriptivas (mínimo 10 caracteres)
    if (eventType === 'Incidencia' && notes.trim().length < 10) {
      setValidationError('La descripción de la incidencia debe tener al menos 10 caracteres.')
      return
    }
    setValidationError(null)
    onConfirm({
      id: eventIdRef.current,
      event_type: eventType,
      event_timestamp: new Date().toISOString(),
      location: location.trim() || null,
      notes: notes.trim() || null,
      attachments,
    })
    eventIdRef.current = crypto.randomUUID()
  }, [eventType, location, notes, attachments, onConfirm])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Registrar {eventType}
        </h3>

        <div className="space-y-3">
          {/* Ubicacion */}
          <Input
            label="Ubicación (opcional)"
            type="text"
            placeholder="Ej: Muelle 14, Taller Chilibre"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />

          {/* Notas */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Notas (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones del evento"
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue"
            />
          </div>

          {/* Fotos / Adjuntos */}
          <FileUploader
            attachments={attachments}
            folder={`events/${eventIdRef.current}`}
            onChange={setAttachments}
            label="Fotos"
            hint="PDF, JPG, PNG o WEBP (max 10MB)"
          />
        </div>

        {/* Cantidades a entregar (solo Entrega) */}
        {eventType === 'Entrega' && assignments && assignments.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-gray-700">Cantidades a entregar</p>
            {assignments.map((a) => {
              const desc = a.line?.description ?? 'Línea'
              const unitCode = a.line?.unit?.code ?? ''
              return (
                <div key={a.request_line_id} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2">
                  <span className="flex-1 text-sm text-gray-700 truncate">{desc}</span>
                  <input
                    type="number"
                    min={0}
                    max={Math.round(a.quantity_assigned)}
                    step="1"
                    defaultValue={Math.round(a.quantity_assigned)}
                    title={`Cantidad a entregar de ${desc}`}
                    onChange={(e) => {
                      deliveredQtys.current[a.request_line_id] = parseFloat(e.target.value) || 0
                    }}
                    className="w-20 rounded border border-gray-300 px-2 py-1 text-sm text-right focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue"
                  />
                  <span className="text-xs text-iconsa-gray whitespace-nowrap">/ {formatQty(a.quantity_assigned)} {unitCode}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Confirmacion de entrega con codigo */}
        {eventType === 'Entrega' ? (
          <div className="mt-4">
            <hr className="mb-4 border-gray-200" />
            <p className="mb-3 text-sm font-medium text-gray-900">Verificar entrega</p>
            <CodeConfirmation
              expectedCode={confirmationCode}
              receiverOptions={receiverOptions}
              onConfirm={handleConfirmCode}
              onCancel={onClose}
              loading={loading}
            />
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {validationError && (
              <p className="text-sm text-iconsa-red">{validationError}</p>
            )}
            <div className="flex gap-2">
              <Button variant="primary" onClick={handleDirectConfirm} loading={loading}>
                Confirmar
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

// --- Pagina principal ---

export default function Page() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const { person, role, loading: authLoading } = useAuth()
  const { fetchTrip } = useTrips()
  const { registerEvent, registering, registerError } = useTripEvents(id)

  // Estado del viaje y eventos
  const [trip, setTrip] = useState<TripWithRelations | null>(null)
  const [events, setEvents] = useState<TripEvent[]>([])
  const [pageLoading, setPageLoading] = useState(true)

  // Estado del modal de registro de evento
  const [activeEvent, setActiveEvent] = useState<TripEventType | null>(null)
  const [actionHandled, setActionHandled] = useState(false)
  const [eventBusy, setEventBusy] = useState(false)
  const [eventError, setEventError] = useState<string | null>(null)
  const [revertEvent, setRevertEvent] = useState<TripEvent | null>(null)
  const [reverting, setReverting] = useState(false)
  const [pendingRetornoWarning, setPendingRetornoWarning] = useState(false)

  // Opciones de receptor para entrega
  const [receiverOptions, setReceiverOptions] = useState<Array<{ value: string; label: string }>>([])

  // --- Fetch receptores del proyecto destino ---
  const loadReceivers = useCallback(async (tripData: TripWithRelations) => {
    // Recopilar to_location_id de las líneas del viaje
    const toLocationIds = new Set<string>()
    for (const a of tripData.assignments) {
      if (a.line?.to_location?.id) {
        toLocationIds.add(a.line.to_location.id)
      }
    }

    if (toLocationIds.size === 0) {
      // Sin ubicaciones de destino — mostrar logistica/admin/almacen
      const { data: fallbackPeople } = await supabase
        .from('people')
        .select('id, name')
        .in('app_role', ['almacen', 'logistica', 'admin'])
        .eq('status', 'Activo')
        .order('name')
      setReceiverOptions((fallbackPeople ?? []).map((p) => ({ value: p.id, label: p.name })))
      return
    }

    // Buscar project_id de las ubicaciones destino
    const { data: locations } = await supabase
      .from('locations')
      .select('id, project_id')
      .in('id', Array.from(toLocationIds))

    const projectIds = new Set<string>()
    let hasNonProjectDest = false
    for (const loc of locations ?? []) {
      if (loc.project_id) {
        projectIds.add(loc.project_id)
      } else {
        hasNonProjectDest = true
      }
    }

    const people: Array<{ value: string; label: string }> = []

    // Personas asignadas a proyectos destino
    if (projectIds.size > 0) {
      const { data: personProjects } = await supabase
        .from('person_projects')
        .select('person_id, people(id, name)')
        .in('project_id', Array.from(projectIds))
        .eq('is_active', true)

      const seen = new Set<string>()
      for (const pp of personProjects ?? []) {
        const person = Array.isArray(pp.people) ? pp.people[0] : pp.people
        if (person && !seen.has(person.id)) {
          seen.add(person.id)
          people.push({ value: person.id, label: person.name })
        }
      }
    }

    // Si destino no tiene proyecto (Chilibre, externo) agregar almacen/logistica/admin
    if (hasNonProjectDest || projectIds.size === 0) {
      const { data: fallbackPeople } = await supabase
        .from('people')
        .select('id, name')
        .in('app_role', ['almacen', 'logistica', 'admin'])
        .eq('status', 'Activo')

      const seen = new Set(people.map((p) => p.value))
      for (const p of fallbackPeople ?? []) {
        if (!seen.has(p.id)) {
          people.push({ value: p.id, label: p.name })
        }
      }
    }

    // Incluir personal operativo (pm, logistica, almacen, admin) que no esté ya en la lista
    const { data: operationalPeople } = await supabase
      .from('people')
      .select('id, name')
      .in('app_role', ['pm', 'logistica', 'almacen', 'admin'])
      .eq('status', 'Activo')
      .order('name')

    const seenAll = new Set(people.map((p) => p.value))
    for (const p of operationalPeople ?? []) {
      if (!seenAll.has(p.id)) {
        seenAll.add(p.id)
        people.push({ value: p.id, label: p.name })
      }
    }

    people.sort((a, b) => a.label.localeCompare(b.label))
    setReceiverOptions(people)
  }, [supabase])

  // --- Carga de eventos ---
  const loadEvents = useCallback(async () => {
    const { data } = await supabase
      .from('trip_events')
      .select(`
        id,
        event_type,
        event_timestamp,
        registered_by:registered_by(id, name),
        received_by_name,
        notes,
        attachments,
        reverts_event_id,
        location
      `)
      .eq('trip_id', id)
      .order('event_timestamp', { ascending: true })

    if (data) {
      const mapped: TripEvent[] = (data as unknown as Record<string, unknown>[]).map((row) => {
        const rb = row.registered_by
        const registeredBy = Array.isArray(rb) ? (rb[0] ?? null) : rb as { id: string; name: string } | null
        const rawAtt = row.attachments
        const att: Attachment[] = Array.isArray(rawAtt)
          ? (rawAtt as unknown[]).map(a => a as Attachment)
          : []
        return {
          id: row.id as string,
          event_type: row.event_type as string,
          event_timestamp: row.event_timestamp as string,
          registered_by: registeredBy as { id: string; name: string } | null,
          received_by_name: (row.received_by_name as string | null) ?? null,
          notes: (row.notes as string | null) ?? null,
          attachments: att,
          reverts_event_id: (row.reverts_event_id as string | null) ?? null,
          location: (row.location as string | null) ?? null,
        }
      })
      setEvents(mapped)
    }
  }, [id, supabase])

  useEffect(() => {
    async function init() {
      setPageLoading(true)
      const tripData = await fetchTrip(id)
      setTrip(tripData)
      await loadEvents()
      if (tripData) {
        await loadReceivers(tripData)
      }
      setPageLoading(false)
    }
    void init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Seguridad: conductor (campo) solo puede ver SUS viajes asignados.
  // Si intentó entrar por URL directa a uno ajeno, redirigir.
  useEffect(() => {
    if (authLoading || pageLoading) return
    if (!trip || !person) return
    if (role === 'campo' && trip.driver?.id !== person.id) {
      router.replace('/mis-viajes')
    }
  }, [authLoading, pageLoading, trip, person, role, router])

  // --- Logica de secuencia de eventos ---
  // Eventos revertidos no cuentan (inmutables pero anulados por Reversion)
  const revertedIds = new Set(
    events.filter((e) => e.event_type === 'Reversion' && e.reverts_event_id).map((e) => e.reverts_event_id!),
  )
  const hasSalida = events.some((e) => e.event_type === 'Salida' && !revertedIds.has(e.id))
  const hasLlegada = events.some((e) => e.event_type === 'Llegada' && !revertedIds.has(e.id))
  const hasEntrega = events.some((e) => e.event_type === 'Entrega' && !revertedIds.has(e.id))
  const hasRetorno = events.some((e) => e.event_type === 'Retorno' && !revertedIds.has(e.id))

  const tripDone = trip?.status === 'Completado' || trip?.status === 'Cancelado'

  // Siguiente evento principal
  const nextMainEvent: TripEventType | null = tripDone
    ? null
    : (!hasSalida ? 'Salida' : !hasEntrega ? 'Entrega' : !hasRetorno ? 'Retorno' : null)

  // Llegada es opcional
  const showLlegadaButton = hasSalida && !hasLlegada && !hasEntrega && !tripDone

  // IDs de las líneas asignadas (para transitions de estado)
  const assignedLineIds = useMemo(
    () => trip?.assignments.map((a) => a.request_line_id) ?? [],
    [trip],
  )

  // --- Registrar evento ---
  const handleRegisterEvent = useCallback(
    async (input: TripEventInput) => {
      const needsLineUpdate =
        input.event_type === 'Salida' || input.event_type === 'Entrega' || input.event_type === 'Retorno'
      const lineIds = needsLineUpdate ? assignedLineIds : []

      const success = await registerEvent(input, lineIds)
      if (success) {
        // Notificaciones por tipo de evento
        if (input.event_type === 'Salida' && trip) {
          notifySalidaRegistrada(trip.id).catch(console.error)
        }
        if (input.event_type === 'Entrega' && trip) {
          // Notificar por cada línea entregada
          for (const lineId of assignedLineIds) {
            notifyEntregaConfirmada(lineId).catch(console.error)
          }
          // Verificar si alguna solicitud padre quedó Completada
          const reqIds = [...new Set(
            trip.assignments.map(a => a.line?.request?.id).filter(Boolean)
          )] as string[]
          for (const reqId of reqIds) {
            notifySolicitudCompletada(reqId).catch(console.error)
          }
        }
        if (input.event_type === 'Incidencia' && trip) {
          notifyIncidenciaRuta(trip.id, input.notes ?? '').catch(console.error)
        }
        if (input.event_type === 'Retorno' && trip) {
          notifyRetornoRegistrado(trip.id).catch(console.error)
        }

        setActiveEvent(null)
        // Recargar viaje y eventos
        const tripData = await fetchTrip(id)
        setTrip(tripData)
        await loadEvents()
      }
    },
    [registerEvent, assignedLineIds, fetchTrip, id, loadEvents, trip],
  )

  // --- Despacho editable (reemplaza Salida simple) ---
  const handleDispatch = useCallback(
    async (data: DispatchData) => {
      if (!trip) return
      setEventBusy(true)
      setEventError(null)

      // Defensiva: conductor (campo) no puede editar — usar lo programado.
      // Protege contra manipulación del cliente (DevTools) cuando el modal viene read-only.
      const isReadOnly = role === 'campo'
      const effectiveData: DispatchData = isReadOnly
        ? {
            event_id: data.event_id,
            driver_id: trip.driver_id ?? null,
            vehicle_id: trip.vehicle_id ?? null,
            trailer_id: trip.trailer_id ?? null,
            lines: trip.assignments.map((a) => ({
              request_line_id: a.request_line_id,
              qty_dispatched: a.quantity_assigned,
            })),
            notes: data.notes,
          }
        : data

      try {
        // 1. INSERT evento de Salida PRIMERO — checkpoint de idempotencia.
        // Si el retry encuentra 23505, todo el handler ya corrió → early success.
        // Protege los UPDATE read-modify-write de qty_scheduled contra double-decrement.
        const { error: insertEvtErr } = await supabase
          .from('trip_events')
          .insert({
            id: effectiveData.event_id,
            trip_id: trip.id,
            event_type: 'Salida',
            event_timestamp: new Date().toISOString(),
            registered_by: person?.id ?? null,
            notes: effectiveData.notes || null,
          })

        if (insertEvtErr) {
          if (insertEvtErr.code === '23505') {
            console.warn('[Dispatch] Duplicate key — idempotent success, skipping all writes')
            setActiveEvent(null)
            const tripData = await fetchTrip(id)
            setTrip(tripData)
            await loadEvents()
            return
          }
          throw insertEvtErr
        }

        // 2. UPDATE trip: conductor, vehículo, remolque, status, salida
        const { error: tripError } = await supabase
          .from('trips')
          .update({
            driver_id: effectiveData.driver_id,
            vehicle_id: effectiveData.vehicle_id,
            trailer_id: effectiveData.trailer_id,
            status: 'En Ruta',
            actual_departure: new Date().toISOString(),
          })
          .eq('id', trip.id)

        if (tripError) throw tripError

        // 3. UPDATE líneas a 'En Transito' (SIN acento — CRÍTICO para cascade).
        //    Status no es trigger-managed durante dispatch — solo el trigger
        //    recalcula qty_scheduled. La transición a 'En Transito' se hace aquí.
        const lineIds = effectiveData.lines.map((l) => l.request_line_id)
        if (lineIds.length > 0) {
          const { error: linesError } = await supabase
            .from('sm_request_lines')
            .update({ status: 'En Transito' })
            .in('id', lineIds)

          if (linesError) throw linesError
        }

        // 4. UPDATE trip_line_assignments: qty_dispatched.
        //    Si el conductor despacha menos de lo programado, el trigger BD
        //    recalc_qty_for_line se dispara al UPDATE y reconcilia qty_scheduled
        //    en sm_request_lines (la diferencia vuelve al pool automáticamente).
        for (const line of effectiveData.lines) {
          await supabase
            .from('trip_line_assignments')
            .update({ qty_dispatched: line.qty_dispatched })
            .eq('trip_id', trip.id)
            .eq('request_line_id', line.request_line_id)
        }

        // 5. Notificación
        notifySalidaRegistrada(trip.id).catch(console.error)

        // 6. Reload
        setActiveEvent(null)
        const tripData = await fetchTrip(id)
        setTrip(tripData)
        await loadEvents()
      } catch (err) {
        setEventError(
          err instanceof Error ? err.message : 'Error al registrar despacho',
        )
      } finally {
        setEventBusy(false)
      }
    },
    [supabase, trip, person, role, fetchTrip, id, loadEvents],
  )

  // --- Entrega con per-line status, trip_event_lines, delivery_observations ---
  const [delivering, setDelivering] = useState(false)

  const handleDelivery = useCallback(
    async (data: DeliveryData) => {
      if (!trip) return
      setDelivering(true)
      setEventError(null)

      try {
        const accepted = data.lines.filter((l) => l.line_status !== 'rejected' && l.quantity > 0)

        // 1. INSERT trip_events PRIMERO — sirve de checkpoint de idempotencia.
        // Si el retry encuentra 23505, significa que TODO el handler ya corrió antes → early success.
        // Protege los UPDATE += qty de abajo contra double-count bajo retry de red.
        const { error: eventError } = await supabase
          .from('trip_events')
          .insert({
            id: data.event_id,
            trip_id: trip.id,
            event_type: 'Entrega',
            event_timestamp: new Date().toISOString(),
            registered_by: person?.id ?? null,
            received_by_name: data.received_by_name,
            received_by_id: data.received_by_id,
            notes: data.notes || null,
            attachments: data.attachments.length > 0 ? JSON.parse(JSON.stringify(data.attachments)) : null,
            confirmation_code_used: data.confirmation_code || null,
          })

        if (eventError) {
          if (eventError.code === '23505') {
            console.warn('[Delivery] Duplicate key — idempotent success, skipping all writes')
            setActiveEvent(null)
            const tripData = await fetchTrip(id)
            setTrip(tripData)
            await loadEvents()
            return
          }
          throw eventError
        }

        // 2. INSERT trip_event_lines (solo en primera pasada — el return de arriba protege retries)
        const eventLines = data.lines.map((l) => ({
          trip_event_id: data.event_id,
          request_line_id: l.request_line_id,
          quantity: l.quantity,
          line_status: l.line_status,
        }))
        await supabase.from('trip_event_lines').insert(eventLines)

        // 3. INSERT delivery_observations
        const observations = data.lines
          .filter((l) => l.line_status === 'with_observations' && l.observation_type)
          .map((l) => ({
            trip_event_id: data.event_id,
            request_line_id: l.request_line_id,
            observation_type: l.observation_type!,
            notes: l.observation_notes || null,
            reported_by: person?.id ?? null,
          }))
        if (observations.length > 0) {
          await supabase.from('delivery_observations').insert(observations)
        }

        // 4. qty_delivered y qty_rejected en trip_line_assignments se sincronizan
        // automáticamente vía trigger BD-5 sync_assignment_on_delivery_event al
        // INSERT del paso 2 (FOR EACH ROW). El recalc_qty_for_line se dispara
        // en cascada y reconcilia qty_scheduled/qty_delivered/status de
        // sm_request_lines. Race entre dispositivos concurrentes resuelta por el
        // CHECK qty_delivered+qty_rejected<=qty_dispatched (BD-2/BD-3) — la
        // segunda concurrent transaction falla con CHECK violation si excede.

        // 5. UPDATE sm_request_lines.delivered_at (no calculado por trigger).
        //    Setear timestamp solo cuando la línea quedó completamente Entregada.
        //    Re-leer post-trigger para saber el status actualizado.
        for (const line of accepted) {
          const { data: postTrigger } = await supabase
            .from('sm_request_lines')
            .select('status')
            .eq('id', line.request_line_id)
            .single()

          if (postTrigger?.status === 'Entregada') {
            await supabase
              .from('sm_request_lines')
              .update({ delivered_at: new Date().toISOString() })
              .eq('id', line.request_line_id)
          }
        }

        // 6. Notifications (loop all accepted, fix M6)
        for (const line of accepted) {
          notifyEntregaConfirmada(line.request_line_id, data.received_by_name).catch(console.error)
        }
        // Check if solicitudes completed
        const reqIds = [...new Set(
          trip.assignments.map((a) => a.line?.request?.id).filter(Boolean),
        )] as string[]
        for (const reqId of reqIds) {
          notifySolicitudCompletada(reqId).catch(console.error)
        }

        // 7. Reload
        setActiveEvent(null)
        const tripData = await fetchTrip(id)
        setTrip(tripData)
        await loadEvents()
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Error al registrar entrega'
        // Cambio 6 Bug #4: trigger BD enforce_one_active_delivery_trg rechaza
        // segundo INSERT en trip_event_lines si ya hay Entrega no-revertida.
        if (errMsg.includes('ya tiene una Entrega activa')) {
          setEventError('Esta línea ya fue entregada en este viaje. Reversá la Entrega anterior primero si necesitás corregir.')
        } else {
          setEventError(errMsg)
        }
      } finally {
        setDelivering(false)
      }
    },
    [supabase, trip, person, fetchTrip, id, loadEvents],
  )

  // --- Reversión de eventos ---
  const handleRevert = useCallback(
    async (reason: string) => {
      if (!revertEvent || !trip) return

      // G1: solo admin puede revertir eventos de OTRO usuario. Logistica
      // solo puede revertir eventos que ella misma registró.
      if (role !== 'admin' && revertEvent.registered_by?.id !== person?.id) {
        setEventError('Solo puedes revertir eventos que tú registraste. Contacta a un administrador.')
        return
      }

      setReverting(true)
      setEventError(null)

      try {
        const eventType = revertEvent.event_type

        // Guard: no permitir revertir Llegada si hay Entrega/Parada
        // no-reverted registrada después de esta Llegada. Revertir Llegada
        // en ese caso dejaría el trip inconsistente (sin actual_arrival pero
        // con líneas ya marcadas Entregada).
        if (eventType === 'Llegada') {
          const llegadaTime = new Date(revertEvent.event_timestamp).getTime()
          const laterBlocking = events.some(
            (e) =>
              !revertedIds.has(e.id) &&
              ['Entrega', 'Parada'].includes(e.event_type) &&
              new Date(e.event_timestamp).getTime() > llegadaTime,
          )
          if (laterBlocking) {
            setEventError('No se puede revertir Llegada porque existen eventos posteriores (Entrega/Parada). Revierta esos primero.')
            setReverting(false)
            return
          }
        }

        // 1. INSERT Reversion event (eventos INMUTABLES — no DELETE/UPDATE)
        await supabase.from('trip_events').insert({
          trip_id: trip.id,
          event_type: 'Reversion',
          event_timestamp: new Date().toISOString(),
          registered_by: person?.id ?? null,
          notes: reason,
          reverts_event_id: revertEvent.id,
        })

        // Notificar reversión
        notifyReversionRegistrada(trip.id, reason, eventType, person?.id ?? null).catch(console.error)

        // 2. Revert state changes
        if (eventType === 'Salida') {
          // Cambio 6 D8 pre-flight: H8 constraint (qty_delivered ≤ qty_dispatched)
          // rechazaría UPDATE qty_dispatched=0 si hay qty_delivered>0. Damos
          // mensaje claro al usuario ANTES de que la BD falle con error genérico.
          // Flow correcto: reversar Entregas primero, luego Salida.
          const linesWithDeliveries = trip.assignments.filter((a) => (a.qty_delivered ?? 0) > 0)
          if (linesWithDeliveries.length > 0) {
            setEventError(
              `Para revertir Salida, reversá primero las Entregas registradas. Hay ${linesWithDeliveries.length} línea${linesWithDeliveries.length === 1 ? '' : 's'} con entregas activas en este viaje.`,
            )
            setReverting(false)
            return
          }

          // Trip → Programado
          await supabase
            .from('trips')
            .update({ status: 'Programado', actual_departure: null })
            .eq('id', trip.id)

          // Reset qty_dispatched en assignments. El trigger BD recalc_qty_for_line
          // se dispara al UPDATE y reconcilia qty_scheduled + status='Programada'
          // en sm_request_lines.
          for (const a of trip.assignments) {
            await supabase
              .from('trip_line_assignments')
              .update({ qty_dispatched: 0 })
              .eq('trip_id', trip.id)
              .eq('request_line_id', a.request_line_id)
          }
        }

        if (eventType === 'Llegada') {
          // Clear actual_arrival
          await supabase
            .from('trips')
            .update({ actual_arrival: null })
            .eq('id', trip.id)
        }

        if (eventType === 'Entrega') {
          // qty_delivered y qty_rejected en trip_line_assignments se revierten
          // automáticamente vía trigger BD-6 sync_assignment_on_delivery_revert
          // al INSERT del Reversion event del paso 1 (filtra por line_status:
          // ok/with_observations decrementa qty_delivered, rejected decrementa
          // qty_rejected, ambos con GREATEST(0, ...) anti-negativo).
          // Las filas de delivery_observations sobreviven intactas — son
          // evidencia histórica inmutable del reporte original del conductor.
          //
          // Limpieza de delivered_at en sm_request_lines: NO es trigger-managed
          // (recalc_qty_for_line solo SETEA delivered_at cuando status=Entregada,
          // nunca lo CLEAREA). El FE debe limpiarlo cuando un revert hace que
          // la línea ya no esté Entregada.
          const { data: eventLines } = await supabase
            .from('trip_event_lines')
            .select('request_line_id')
            .eq('trip_event_id', revertEvent.id)

          for (const el of eventLines ?? []) {
            const { data: postTrigger } = await supabase
              .from('sm_request_lines')
              .select('status')
              .eq('id', el.request_line_id)
              .single()

            if (postTrigger?.status !== 'Entregada') {
              await supabase
                .from('sm_request_lines')
                .update({ delivered_at: null })
                .eq('id', el.request_line_id)
            }
          }
          // NO revertir ubicación de equipo — refleja realidad física
        }

        if (eventType === 'Retorno') {
          // Trip → En Ruta. NO tocar actual_arrival (pertenece a Llegada, no a Retorno).
          await supabase
            .from('trips')
            .update({ status: 'En Ruta' })
            .eq('id', trip.id)
        }

        // 3. Reload
        setRevertEvent(null)
        const tripData = await fetchTrip(id)
        setTrip(tripData)
        await loadEvents()
      } catch (err) {
        setEventError(
          err instanceof Error ? err.message : 'Error al revertir evento',
        )
      } finally {
        setReverting(false)
      }
    },
    [supabase, trip, person, revertEvent, fetchTrip, id, loadEvents],
  )

  // --- Parada intermedia (informacional — no cambia estados) ---
  const handleParada = useCallback(
    async (data: ParadaData) => {
      if (!trip) return
      setEventBusy(true)
      setEventError(null)
      try {
        // 1. INSERT trip_events con event_type='Parada'
        const { data: event, error } = await supabase.from('trip_events').insert({
          trip_id: trip.id,
          event_type: 'Parada',
          event_timestamp: new Date().toISOString(),
          registered_by: person?.id ?? null,
          location: data.location,
          notes: data.notes || null,
          attachments: data.attachments.length > 0 ? JSON.parse(JSON.stringify(data.attachments)) : null,
        }).select('id').single()

        if (error) throw error
        if (!event?.id) throw new Error('Event ID missing after insert')

        // 2. INSERT trip_event_lines — data.lines siempre tiene ≥1 (validado en modal)
        const { error: lineError } = await supabase.from('trip_event_lines').insert(
          data.lines.map((l) => ({
            trip_event_id: event.id,
            request_line_id: l.request_line_id,
            quantity: l.quantity,
            line_status: l.line_status,
          }))
        )
        if (lineError) throw lineError

        // NO cambiar status de trip ni líneas — Parada es informacional
        // NO notificaciones (se agregan después)

        setActiveEvent(null)
        const tripData = await fetchTrip(id)
        setTrip(tripData)
        await loadEvents()
      } catch (err) {
        setEventError(err instanceof Error ? err.message : 'Error al registrar parada')
      } finally {
        setEventBusy(false)
      }
    },
    [supabase, trip, person, fetchTrip, id, loadEvents],
  )

  // Auto-abrir modal desde URL params (?action=deliver|dispatch|Entrega)
  useEffect(() => {
    if (actionHandled || !trip || pageLoading) return
    const urlParams = new URLSearchParams(window.location.search)
    const action = urlParams.get('action')
    // Entrega tardía: permitido también en viajes Completados si hay líneas En Transito
    // (caso: viaje cerró con Retorno pero la entrega real se registra después)
    const hasEnTransito = trip.assignments.some((a) => a.line?.status === 'En Transito')
    if (action === 'deliver' && hasSalida && !tripDone) {
      setActiveEvent('Entrega')
      setActionHandled(true)
    } else if (action === 'Entrega' && hasEnTransito) {
      setActiveEvent('Entrega')
      setActionHandled(true)
    } else if (action === 'dispatch' && !hasSalida && !tripDone) {
      setActiveEvent('Salida')
      setActionHandled(true)
    }
  }, [trip, pageLoading, hasSalida, tripDone, actionHandled])

  // --- Guards ---
  if (authLoading || pageLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-navy" />
      </div>
    )
  }

  if (!trip) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <button
          onClick={() => router.push('/mis-viajes')}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-iconsa-gray hover:text-navy transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Mis Movilizaciones
        </button>
        <p className="text-sm text-iconsa-gray">Movilización no encontrada.</p>
      </div>
    )
  }

  // Código de confirmación visible para logistica/admin siempre, PM solo en fleet (no pickup)
  const canSeeConfirmationCode = role === 'logistica' || role === 'admin' || role === 'pm'
  // Todos los roles con acceso a mis-viajes pueden registrar eventos (incluye PM para entregas)
  const canRegisterEvents = canRegisterEvent(role)
  // PM solo ve Entrega + Incidencia (no puede UPDATE trips → no Salida/Retorno)
  const isPM = role === 'pm'
  // Retorno secundario: disponible después de Salida sin requerir Entrega
  const showRetornoSecondary = hasSalida && !hasRetorno && !tripDone && nextMainEvent !== 'Retorno' && !isPM

  // Líneas aún En Transito al momento del click de Retorno — alimentan el guard dialog
  const enTransitoLines = trip.assignments
    .filter((a) => a.line?.status === 'En Transito')
    .map((a) => a.line?.description ?? 'Línea sin descripción')

  // Entrega tardía: trip Completado pero líneas siguen En Transito (caso del widget del dashboard)
  const showLateDelivery = tripDone && canRegisterEvents && !isPM && enTransitoLines.length > 0

  const handleRetornoClick = () => {
    if (enTransitoLines.length > 0) {
      setPendingRetornoWarning(true)
    } else {
      setActiveEvent('Retorno')
    }
  }

  // Último evento revertible (solo Salida/Entrega/Retorno, no ya revertido)
  const canRevert = role === 'logistica' || role === 'admin'
  const revertibleTypes = ['Salida', 'Llegada', 'Entrega', 'Retorno', 'Parada']
  // revertedIds already computed above (line ~454)
  const lastRevertible = canRevert && !tripDone
    ? [...events].reverse().find((e) => revertibleTypes.includes(e.event_type) && !revertedIds.has(e.id)) ?? null
    : null

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 pb-32 pt-4 sm:px-6 sm:pb-8 sm:pt-6">
      {/* Navegacion */}
      <button
        onClick={() => router.push('/mis-viajes')}
        className="inline-flex items-center gap-1.5 text-sm text-iconsa-gray hover:text-navy transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Mis Movilizaciones
      </button>

      {/* Cabecera del viaje */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            {trip.trip_id ? (
              <span className="font-mono text-xl font-bold text-navy">{trip.trip_id}</span>
            ) : (
              <span className="font-mono text-sm text-iconsa-gray">{trip.id.slice(0, 8)}</span>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge variant="trip" label={trip.status} />
              {trip.att_permit && (
                <Badge variant="custom" label="ATTT" bg="bg-purple-100" text="text-purple-800" />
              )}
              {trip.escort && (
                <Badge variant="custom" label="Escolta" bg="bg-orange-100" text="text-orange-800" />
              )}
            </div>
          </div>
          <span className="text-sm text-iconsa-gray">{formatDate(trip.scheduled_date)}</span>
        </div>

        {/* Banner material entregado pendiente retorno */}
        {trip.status === 'En Ruta' && hasEntrega && (
          <div className="mt-3 rounded-lg bg-green-50 border border-green-200 px-4 py-2.5">
            <p className="text-sm text-green-700 font-medium">
              Material entregado — pendiente registro de retorno
            </p>
          </div>
        )}

        {/* Detalles conductor/vehiculo */}
        <dl className="mt-3 grid grid-cols-1 gap-y-1 text-sm sm:grid-cols-2">
          {trip.driver && (
            <div className="flex gap-1.5">
              <dt className="text-iconsa-gray">Conductor:</dt>
              <dd className="font-medium text-gray-900">{trip.driver.name}</dd>
            </div>
          )}
          {trip.vehicle && (
            <div className="flex gap-1.5">
              <dt className="text-iconsa-gray">Vehículo:</dt>
              <dd className="font-medium text-gray-900">
                {trip.vehicle.spectrum_code ? `${trip.vehicle.spectrum_code} — ` : ''}
                {trip.vehicle.description}
              </dd>
            </div>
          )}
          {trip.trailer && (
            <div className="flex gap-1.5">
              <dt className="text-iconsa-gray">Remolque:</dt>
              <dd className="font-medium text-gray-900">{trip.trailer.description}</dd>
            </div>
          )}
        </dl>

        {/* Codigo de confirmacion — SOLO pm, logistica y admin */}
        {canSeeConfirmationCode && trip.confirmation_code && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-navy/5 border border-navy/20 px-3 py-2">
            <KeyRound className="h-4 w-4 text-navy shrink-0" />
            <span className="text-sm text-iconsa-gray">Código de confirmación:</span>
            <span className="font-mono text-base font-bold text-navy tracking-[0.25em]">
              {trip.confirmation_code}
            </span>
          </div>
        )}

        {trip.notes && (
          <p className="mt-3 text-sm text-gray-700 italic">{trip.notes}</p>
        )}
      </div>

      {/* Líneas asignadas */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="mb-3 text-base font-semibold text-gray-900">
          Líneas Asignadas
          <span className="ml-2 text-sm font-normal text-iconsa-gray">
            ({trip.assignments.length})
          </span>
        </h2>

        {trip.assignments.length === 0 ? (
          <p className="text-sm text-iconsa-gray italic">Sin líneas asignadas.</p>
        ) : (
          <div className="space-y-2">
            {trip.assignments.map((a) => (
              <AssignmentRow key={a.id} assignment={a} />
            ))}
          </div>
        )}
      </div>

      {/* Timeline de eventos */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Eventos</h2>
        <EventTimeline events={events} />
      </div>

      {/* Panel de entrega tardía — trip Completado con líneas En Transito */}
      {showLateDelivery && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-900 mb-2">
            Este viaje está Completado pero tiene {enTransitoLines.length} línea
            {enTransitoLines.length !== 1 ? 's' : ''} sin entregar
          </p>
          <p className="text-xs text-red-800 mb-3">
            Registra la entrega tardía ahora o cancela las líneas desde el dashboard.
          </p>
          <Button variant="primary" onClick={() => setActiveEvent('Entrega')}>
            Registrar Entrega Tardía
          </Button>
        </div>
      )}

      {/* Panel de acciones — sticky en mobile (PMs solo ven, no registran) */}
      {!tripDone && canRegisterEvents && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white px-4 py-3 shadow-lg sm:static sm:inset-auto sm:z-auto sm:rounded-lg sm:border sm:shadow-sm sm:px-6 sm:py-4">
          <div className="mx-auto max-w-2xl space-y-2">
            {/* Error de registro */}
            {(registerError || eventError) && (
              <p className="text-sm text-red-700">{registerError || eventError}</p>
            )}

            {/* Siguiente evento principal (PM solo ve Entrega) */}
            {nextMainEvent && (!isPM || nextMainEvent === 'Entrega') && (
              <EventButton
                eventType={nextMainEvent}
                loading={registering && activeEvent === nextMainEvent}
                disabled={registering}
                onClick={() =>
                  nextMainEvent === 'Retorno'
                    ? handleRetornoClick()
                    : setActiveEvent(nextMainEvent)
                }
              />
            )}

            {/* Llegada (opcional, solo si aplica — no visible para PM) */}
            {showLlegadaButton && !isPM && (
              <EventButton
                eventType="Llegada"
                loading={registering && activeEvent === 'Llegada'}
                disabled={registering}
                onClick={() => setActiveEvent('Llegada')}
              />
            )}

            {/* Parada intermedia — disponible después de Salida, múltiples veces, no PM */}
            {hasSalida && !tripDone && !isPM && (
              <EventButton
                eventType="Parada"
                loading={eventBusy && activeEvent === 'Parada'}
                disabled={eventBusy}
                onClick={() => setActiveEvent('Parada')}
              />
            )}

            {/* Retorno secundario — disponible después de Salida sin necesitar Entrega */}
            {showRetornoSecondary && (
              <EventButton
                eventType="Retorno"
                loading={registering && activeEvent === 'Retorno'}
                disabled={registering}
                onClick={handleRetornoClick}
              />
            )}

            {/* Incidencia siempre disponible */}
            <EventButton
              eventType="Incidencia"
              loading={registering && activeEvent === 'Incidencia'}
              disabled={registering}
              onClick={() => setActiveEvent('Incidencia')}
            />
          </div>

          {/* Botón reversión — solo logistica/admin, solo último evento revertible */}
          {lastRevertible && (
            <button
              type="button"
              onClick={() => setRevertEvent(lastRevertible)}
              className="text-xs text-red-600 hover:text-red-800 hover:underline mt-1"
            >
              ⟲ Revertir {lastRevertible.event_type}
            </button>
          )}
        </div>
      )}

      {/* Overlay de despacho editable */}
      {activeEvent === 'Salida' && trip && (
        <DispatchModal
          trip={trip}
          onConfirm={handleDispatch}
          onClose={() => setActiveEvent(null)}
          loading={eventBusy}
          role={role}
        />
      )}

      {/* Overlay de entrega con per-line status */}
      {activeEvent === 'Entrega' && trip && (
        <DeliveryModal
          trip={trip}
          onConfirm={handleDelivery}
          onClose={() => setActiveEvent(null)}
          loading={delivering}
          receiverOptions={receiverOptions}
          person={person}
        />
      )}

      {/* Overlay de parada intermedia */}
      {activeEvent === 'Parada' && trip && (
        <ParadaModal
          trip={trip}
          onConfirm={handleParada}
          onClose={() => setActiveEvent(null)}
          loading={eventBusy}
        />
      )}

      {/* Overlay de registro de evento (Llegada, Retorno, Incidencia) */}
      {activeEvent && !['Salida', 'Entrega', 'Parada'].includes(activeEvent) && (
        <EventModal
          eventType={activeEvent}
          confirmationCode={trip.confirmation_code}
          receiverOptions={receiverOptions}
          assignments={trip.assignments}
          onConfirm={handleRegisterEvent}
          onClose={() => setActiveEvent(null)}
          loading={registering}
        />
      )}

      {/* Overlay de reversión */}
      {revertEvent && (
        <RevertModal
          event={revertEvent}
          onConfirm={handleRevert}
          onClose={() => setRevertEvent(null)}
          loading={reverting}
        />
      )}

      {/* Guard: Retorno con líneas En Transito */}
      <ConfirmDialog
        open={pendingRetornoWarning}
        title="Líneas sin entregar en este viaje"
        description="Si registras Retorno ahora, estas líneas quedarán En Transito con el viaje Completado. Podrás registrar su Entrega tardía o cancelarlas desde el dashboard."
        items={enTransitoLines}
        confirmLabel="Sí, registrar Retorno"
        variant="warning"
        onCancel={() => setPendingRetornoWarning(false)}
        onConfirm={() => {
          setPendingRetornoWarning(false)
          setActiveEvent('Retorno')
        }}
      />
    </div>
  )
}
