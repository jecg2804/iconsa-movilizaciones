'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Wrench, Package, ArrowRight, KeyRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useTrips, type TripWithRelations } from '@/hooks/useTrips'
import { useTripEvents, type TripEventType, type TripEventInput } from '@/hooks/useTripEvents'
import { formatDate } from '@/lib/utils/format'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { EventTimeline } from '@/components/viajes/EventTimeline'
import { EventButton } from '@/components/viajes/EventButton'
import { CodeConfirmation } from '@/components/viajes/CodeConfirmation'

// --- Tipos ---

interface TripEvent {
  id: string
  event_type: string
  event_timestamp: string
  registered_by: { name: string } | null
  notes: string | null
}

// --- Componente de fila de asignacion (solo lectura) ---

function AssignmentRow({ assignment }: { assignment: TripWithRelations['assignments'][number] }) {
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
          <span className="truncate text-sm font-medium text-gray-900">
            {line?.description ?? '—'}
          </span>
          <span className="font-mono text-xs text-iconsa-gray shrink-0">
            {requestDisplayId}
          </span>
        </div>

        {line && (
          <div className="flex items-center gap-1 text-xs text-iconsa-gray">
            <span className="truncate max-w-[100px] sm:max-w-[150px]">{fromName}</span>
            <ArrowRight className="h-3 w-3 shrink-0 text-gray-400" />
            <span className="truncate max-w-[100px] sm:max-w-[150px]">{toName}</span>
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
          {assignment.quantity_assigned} {unitCode}
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
  onConfirm: (input: TripEventInput) => void
  onClose: () => void
  loading: boolean
}

function EventModal({ eventType, confirmationCode, onConfirm, onClose, loading }: EventModalProps) {
  const [notes, setNotes] = useState('')
  const [location, setLocation] = useState('')

  const handleConfirmCode = useCallback(
    (codeUsed: string, receivedByName: string) => {
      onConfirm({
        event_type: eventType,
        event_timestamp: new Date().toISOString(),
        location: location.trim() || null,
        notes: notes.trim() || null,
        confirmation_code_used: codeUsed || null,
        received_by_name: receivedByName || null,
      })
    },
    [eventType, location, notes, onConfirm],
  )

  const handleDirectConfirm = useCallback(() => {
    onConfirm({
      event_type: eventType,
      event_timestamp: new Date().toISOString(),
      location: location.trim() || null,
      notes: notes.trim() || null,
    })
  }, [eventType, location, notes, onConfirm])

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
        </div>

        {/* Confirmacion de entrega con codigo */}
        {eventType === 'Entrega' ? (
          <div className="mt-4">
            <hr className="mb-4 border-gray-200" />
            <p className="mb-3 text-sm font-medium text-gray-900">Verificar entrega</p>
            <CodeConfirmation
              expectedCode={confirmationCode}
              onConfirm={handleConfirmCode}
              onCancel={onClose}
            />
          </div>
        ) : (
          <div className="mt-4 flex gap-2">
            <Button variant="primary" onClick={handleDirectConfirm} loading={loading}>
              Confirmar
            </Button>
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// --- Pagina principal ---

export default function MisViajesDetailPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const { role, loading: authLoading } = useAuth()
  const { fetchTrip } = useTrips()
  const { registerEvent, registering, registerError } = useTripEvents(id)

  // Estado del viaje y eventos
  const [trip, setTrip] = useState<TripWithRelations | null>(null)
  const [events, setEvents] = useState<TripEvent[]>([])
  const [pageLoading, setPageLoading] = useState(true)

  // Estado del modal de registro de evento
  const [activeEvent, setActiveEvent] = useState<TripEventType | null>(null)

  // --- Carga inicial del viaje ---
  const loadTrip = useCallback(async () => {
    const data = await fetchTrip(id)
    setTrip(data)
  }, [id, fetchTrip])

  // --- Carga de eventos ---
  const loadEvents = useCallback(async () => {
    const { data } = await supabase
      .from('trip_events')
      .select(`
        id,
        event_type,
        event_timestamp,
        registered_by:registered_by(name),
        notes
      `)
      .eq('trip_id', id)
      .order('event_timestamp', { ascending: true })

    if (data) {
      const mapped: TripEvent[] = (data as unknown as Record<string, unknown>[]).map((row) => {
        const rb = row.registered_by
        const registeredBy = Array.isArray(rb) ? (rb[0] ?? null) : rb
        return {
          id: row.id as string,
          event_type: row.event_type as string,
          event_timestamp: row.event_timestamp as string,
          registered_by: registeredBy as { name: string } | null,
          notes: (row.notes as string | null) ?? null,
        }
      })
      setEvents(mapped)
    }
  }, [id, supabase])

  useEffect(() => {
    async function init() {
      setPageLoading(true)
      await Promise.all([loadTrip(), loadEvents()])
      setPageLoading(false)
    }
    void init()
  }, [loadTrip, loadEvents])

  // --- Logica de secuencia de eventos ---
  const hasSalida = events.some((e) => e.event_type === 'Salida')
  const hasLlegada = events.some((e) => e.event_type === 'Llegada')
  const hasEntrega = events.some((e) => e.event_type === 'Entrega')
  const hasRetorno = events.some((e) => e.event_type === 'Retorno')

  const tripDone = trip?.status === 'Completado' || trip?.status === 'Cancelado'

  // Siguiente evento principal
  const nextMainEvent: TripEventType | null = tripDone
    ? null
    : !hasSalida
    ? 'Salida'
    : !hasEntrega
    ? 'Entrega'
    : !hasRetorno
    ? 'Retorno'
    : null

  // Llegada es opcional pero mostrar si salida hecha, llegada no hecha y entrega no hecha
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
        input.event_type === 'Salida' || input.event_type === 'Entrega'
      const lineIds = needsLineUpdate ? assignedLineIds : []

      const success = await registerEvent(input, lineIds)
      if (success) {
        setActiveEvent(null)
        await Promise.all([loadTrip(), loadEvents()])
      }
    },
    [registerEvent, assignedLineIds, loadTrip, loadEvents],
  )

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
          Mis Viajes
        </button>
        <p className="text-sm text-iconsa-gray">Viaje no encontrado.</p>
      </div>
    )
  }

  // Código de confirmación solo visible para logistica y admin
  const canSeeConfirmationCode = role === 'logistica' || role === 'admin'

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 pb-32 pt-4 sm:px-6 sm:pb-8 sm:pt-6">
      {/* Navegacion */}
      <button
        onClick={() => router.push('/mis-viajes')}
        className="inline-flex items-center gap-1.5 text-sm text-iconsa-gray hover:text-navy transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Mis Viajes
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
                <Badge variant="custom" label="ATT" bg="bg-purple-100" text="text-purple-800" />
              )}
              {trip.escort && (
                <Badge variant="custom" label="Escolta" bg="bg-orange-100" text="text-orange-800" />
              )}
            </div>
          </div>
          <span className="text-sm text-iconsa-gray">{formatDate(trip.scheduled_date)}</span>
        </div>

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

        {/* Codigo de confirmacion — SOLO logistica y admin */}
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

      {/* Panel de acciones — sticky en mobile */}
      {!tripDone && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white px-4 py-3 shadow-lg sm:static sm:inset-auto sm:z-auto sm:rounded-lg sm:border sm:shadow-sm sm:px-6 sm:py-4">
          <div className="mx-auto max-w-2xl space-y-2">
            {/* Error de registro */}
            {registerError && (
              <p className="text-sm text-red-700">{registerError}</p>
            )}

            {/* Siguiente evento principal */}
            {nextMainEvent && (
              <EventButton
                eventType={nextMainEvent}
                loading={registering && activeEvent === nextMainEvent}
                disabled={registering}
                onClick={() => setActiveEvent(nextMainEvent)}
              />
            )}

            {/* Llegada (opcional, solo si aplica) */}
            {showLlegadaButton && (
              <EventButton
                eventType="Llegada"
                loading={registering && activeEvent === 'Llegada'}
                disabled={registering}
                onClick={() => setActiveEvent('Llegada')}
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
        </div>
      )}

      {/* Overlay de registro de evento */}
      {activeEvent && (
        <EventModal
          eventType={activeEvent}
          confirmationCode={trip.confirmation_code}
          onConfirm={handleRegisterEvent}
          onClose={() => setActiveEvent(null)}
          loading={registering}
        />
      )}
    </div>
  )
}
