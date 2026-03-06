'use client'

import { Truck, MapPin, CheckCircle, Home, AlertTriangle } from 'lucide-react'

interface EventItem {
  id: string
  event_type: string
  event_timestamp: string
  registered_by: { name: string } | null
  notes: string | null
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
    default:
      return <MapPin className="h-4 w-4" />
  }
}

function getEventColor(type: string): string {
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
    default:
      return 'bg-gray-400 text-white'
  }
}

function formatEventTimestamp(ts: string): string {
  const date = new Date(ts)
  return date.toLocaleString('es-PA', {
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

  return (
    <ol className="relative border-l border-gray-200 space-y-6 pl-4">
      {events.map((event) => (
        <li key={event.id} className="ml-3">
          {/* Ícono del tipo de evento */}
          <span
            className={`absolute -left-3.5 flex h-7 w-7 items-center justify-center rounded-full ring-2 ring-white ${getEventColor(event.event_type)}`}
          >
            {getEventIcon(event.event_type)}
          </span>

          {/* Contenido */}
          <div>
            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
              <span className="text-sm font-semibold text-gray-900">
                {event.event_type}
              </span>
              <time className="text-xs text-iconsa-gray">
                {formatEventTimestamp(event.event_timestamp)}
              </time>
            </div>

            {event.registered_by && (
              <p className="mt-0.5 text-xs text-iconsa-gray">
                Registrado por {event.registered_by.name}
              </p>
            )}

            {event.notes && (
              <p className="mt-1 text-sm text-gray-700">{event.notes}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}
