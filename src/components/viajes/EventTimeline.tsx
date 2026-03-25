'use client'

import { Truck, MapPin, CheckCircle, Home, AlertTriangle, RotateCcw, ClipboardCheck, Car } from 'lucide-react'
import FileDisplay from '@/components/ui/FileDisplay'
import type { Attachment } from '@/lib/supabase/storage'

interface EventItem {
  id: string
  event_type: string
  event_timestamp: string
  registered_by: { name: string } | null
  received_by_name: string | null
  notes: string | null
  attachments?: Attachment[]
  reverts_event_id?: string | null
}

interface EventTimelineProps {
  events: EventItem[]
}

function getEventIcon(type: string) {
  switch (type) {
    case 'Salida':
      return <Truck className="h-4 w-4" />
    case 'Llegada':
      return <MapPin className="h-4 w-4" />
    case 'Entrega':
      return <CheckCircle className="h-4 w-4" />
    case 'Retorno':
      return <Home className="h-4 w-4" />
    case 'Incidencia':
      return <AlertTriangle className="h-4 w-4" />
    case 'Reversion':
      return <RotateCcw className="h-4 w-4" />
    case 'Preparacion':
      return <ClipboardCheck className="h-4 w-4" />
    case 'Retiro':
      return <Car className="h-4 w-4" />
    default:
      return <MapPin className="h-4 w-4" />
  }
}

function getEventColor(type: string, isReverted: boolean): string {
  if (isReverted) return 'bg-gray-300 text-gray-500'
  switch (type) {
    case 'Salida':
      return 'bg-navy text-white'
    case 'Llegada':
      return 'bg-iconsa-blue text-white'
    case 'Entrega':
      return 'bg-iconsa-green text-white'
    case 'Retorno':
      return 'bg-gray-500 text-white'
    case 'Incidencia':
      return 'bg-iconsa-orange text-white'
    case 'Reversion':
      return 'bg-red-100 text-red-600'
    case 'Preparacion':
      return 'bg-amber-500 text-white'
    case 'Retiro':
      return 'bg-iconsa-green text-white'
    default:
      return 'bg-gray-400 text-white'
  }
}

function formatEventTimestamp(ts: string): string {
  const date = new Date(ts)
  return date.toLocaleString('es-PA', {
    timeZone: 'America/Panama',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function EventTimeline({ events }: EventTimelineProps) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-iconsa-gray italic">Sin eventos registrados.</p>
    )
  }

  // Build set of reverted event IDs
  const revertedIds = new Set(
    events
      .filter((e) => e.event_type === 'Reversion' && e.reverts_event_id)
      .map((e) => e.reverts_event_id!),
  )

  return (
    <ol className="relative border-l border-gray-200 space-y-6 pl-4">
      {events.map((event) => {
        const isReverted = revertedIds.has(event.id)
        const isReversion = event.event_type === 'Reversion'

        return (
          <li key={event.id} className={`ml-3 ${isReverted ? 'opacity-50' : ''}`}>
            {/* Ícono del tipo de evento */}
            <span
              className={`absolute -left-3.5 flex h-7 w-7 items-center justify-center rounded-full ring-2 ring-white ${getEventColor(event.event_type, isReverted)}`}
            >
              {getEventIcon(event.event_type)}
            </span>

            {/* Contenido */}
            <div>
              <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
                <span
                  className={`text-sm font-semibold ${
                    isReverted
                      ? 'text-gray-400 line-through'
                      : isReversion
                        ? 'text-red-600'
                        : 'text-gray-900'
                  }`}
                >
                  {isReversion
                    ? `⟲ Revirtió: ${events.find((e) => e.id === event.reverts_event_id)?.event_type ?? 'evento'}`
                    : event.event_type}
                </span>
                {isReverted && (
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                    ⟲ Revertido
                  </span>
                )}
                <time className="text-xs text-iconsa-gray">
                  {formatEventTimestamp(event.event_timestamp)}
                </time>
              </div>

              {event.registered_by && (
                <p className="mt-0.5 text-xs text-iconsa-gray">
                  {isReversion ? 'Revertido por' : 'Registrado por'}{' '}
                  {event.registered_by.name}
                </p>
              )}

              {event.event_type === 'Entrega' && event.received_by_name && !isReverted && (
                <p className="mt-0.5 text-xs font-medium text-iconsa-green">
                  Recibido por: {event.received_by_name}
                </p>
              )}

              {event.notes && (
                <p className={`mt-1 text-sm ${isReversion ? 'text-red-600 italic' : 'text-gray-700'}`}>
                  {isReversion ? `Razón: ${event.notes}` : event.notes}
                </p>
              )}

              {event.attachments && event.attachments.length > 0 && (
                <div className="mt-2">
                  <FileDisplay attachments={event.attachments} collapsible={false} />
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
