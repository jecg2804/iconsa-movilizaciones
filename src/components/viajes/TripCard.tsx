'use client'

import { formatDate } from '@/lib/utils/format'
import { Badge } from '@/components/ui/Badge'
import type { MyTripSummary, MyTripEvent } from '@/hooks/useMyTrips'

interface TripCardProps {
  trip: MyTripSummary
  onClick: () => void
}

// Pasos en orden de la barra de progreso
const FLEET_STEPS: MyTripEvent['event_type'][] = ['Salida', 'Llegada', 'Entrega', 'Retorno']

function ProgressBar({ events }: { events: MyTripEvent[] }) {
  const PROGRESS_STEPS = FLEET_STEPS
  const completedTypes = new Set(events.map((e) => e.event_type))

  return (
    <div className="flex items-center gap-1 mt-2">
      {PROGRESS_STEPS.map((step, idx) => {
        const done = completedTypes.has(step)
        const isFirst = idx === 0
        return (
          <div key={step} className="flex items-center gap-1 flex-1">
            {!isFirst && (
              <div
                className={`h-0.5 flex-1 rounded-full ${
                  done ? 'bg-navy' : 'bg-gray-200'
                }`}
              />
            )}
            <div
              className={`flex items-center gap-1 text-xs font-medium whitespace-nowrap ${
                done ? 'text-navy' : 'text-gray-400'
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                  done
                    ? 'bg-navy text-white'
                    : 'border border-gray-300 bg-white text-gray-400'
                }`}
              >
                {idx + 1}
              </span>
              <span className="hidden sm:inline">{step}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function TripCard({ trip, onClick }: TripCardProps) {
  // Resumen de líneas
  const totalLines = trip.assignments.length
  const requestIds = new Set(
    trip.assignments
      .map((a) => a.line?.request?.request_id)
      .filter(Boolean),
  )
  const totalRequests = requestIds.size

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:border-navy hover:shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-navy/30"
    >
      {/* Cabecera: ID + estado */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {trip.trip_id ? (
            <span className="font-mono text-base font-bold text-navy">
              {trip.trip_id}
            </span>
          ) : (
            <span className="font-mono text-sm text-iconsa-gray">{trip.id.slice(0, 8)}</span>
          )}
          <Badge variant="trip" label={trip.status} />
          {trip.att_permit && (
            <Badge variant="custom" label="ATTT" bg="bg-purple-100" text="text-purple-800" />
          )}
          {trip.escort && (
            <Badge variant="custom" label="Escolta" bg="bg-orange-100" text="text-orange-800" />
          )}
        </div>
        <span className="shrink-0 text-sm text-iconsa-gray">
          {formatDate(trip.scheduled_date)}
        </span>
      </div>

      {/* Conductor + Vehículo */}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700">
        {trip.driver && (
          <span>
            <span className="text-iconsa-gray">Conductor:</span> {trip.driver.name}
          </span>
        )}
        {trip.vehicle && (
          <span>
            <span className="text-iconsa-gray">Vehículo:</span>{' '}
            {trip.vehicle.spectrum_code ? `${trip.vehicle.spectrum_code} — ` : ''}
            {trip.vehicle.description}
          </span>
        )}
        {trip.trailer && (
          <span>
            <span className="text-iconsa-gray">Remolque:</span> {trip.trailer.description}
          </span>
        )}
      </div>

      {/* Resumen de líneas */}
      <div className="mt-2 text-xs text-iconsa-gray">
        {totalLines === 0
          ? 'Sin líneas asignadas'
          : `${totalLines} línea${totalLines !== 1 ? 's' : ''} de ${totalRequests} solicitud${totalRequests !== 1 ? 'es' : ''}`}
      </div>

      {/* Barra de progreso */}
      <ProgressBar events={trip.events} />
    </button>
  )
}
