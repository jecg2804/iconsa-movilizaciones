'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { KeyRound, Wrench, Package } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import TripLiveMap from '@/components/gps/TripLiveMap'
import { formatDate, formatTimePanama, formatQty } from '@/lib/utils/format'
import type { AssociatedTrip } from '@/components/solicitudes/types'

interface ActiveTripPanelProps {
  trip: AssociatedTrip
  role: string | null
}

export default function ActiveTripPanel({ trip, role }: ActiveTripPanelProps) {
  const router = useRouter()

  const salidaEvent = trip.events.find((e) => e.event_type === 'Salida')
  const activeLines = trip.lines.filter(
    (l) => l.status === 'En Transito' || l.status === 'Parcial',
  )
  const canSeeCode =
    (role === 'pm' || role === 'logistica' || role === 'admin') &&
    !!trip.confirmation_code

  return (
    <div className="rounded-lg border border-navy/20 bg-white p-4 shadow-sm sm:p-6 space-y-4">
      {/* 1. Header — código MOV + badge status + hora de salida */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push(`/programacion/viaje/${trip.id}`)}
            className="font-mono text-base font-bold text-navy hover:underline cursor-pointer"
          >
            {trip.trip_id ?? trip.id.slice(0, 8)}
          </button>
          <Badge variant="trip" label={trip.status} />
        </div>
        <div className="flex items-center gap-3 text-sm text-iconsa-gray">
          <span>{formatDate(trip.scheduled_date)}</span>
          {salidaEvent && (
            <span>Salió {formatTimePanama(salidaEvent.event_timestamp)}</span>
          )}
        </div>
      </div>

      {/* 2. Metadata — conductor, vehículo, remolque */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700">
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
            <span className="text-iconsa-gray">Remolque:</span>{' '}
            {trip.trailer.spectrum_code ? `${trip.trailer.spectrum_code} — ` : ''}
            {trip.trailer.description}
          </span>
        )}
      </div>

      {/* 3. Líneas filtradas (En Transito o Parcial) */}
      {activeLines.length > 0 && (
        <ul className="space-y-1">
          {activeLines.map((line, idx) => (
            <li
              key={idx}
              className="flex items-center gap-2 text-sm text-gray-700"
            >
              <span className="shrink-0" title={line.line_type}>
                {line.line_type === 'Equipo' ? (
                  <Wrench className="h-4 w-4 text-iconsa-blue" />
                ) : (
                  <Package className="h-4 w-4 text-gold" />
                )}
              </span>
              <span title={line.description}>{line.description}</span>
              <span className="shrink-0 text-xs text-iconsa-gray">
                ×{formatQty(line.quantity_assigned)}
              </span>
              <Badge variant="line" label={line.status} />
            </li>
          ))}
        </ul>
      )}

      {/* 4. Mapa en vivo — hereda visibility-aware polling, auto-follow, stale banner,
             Reactivar button, Seguir vehículo button, placeholder coords inválidas. */}
      <TripLiveMap tripId={trip.id} variant="compact" />

      {/* 5. Código de verificación — gated por rol (pm/logistica/admin) */}
      {canSeeCode && (
        <div className="flex items-center gap-2 rounded-lg bg-navy/5 border border-navy/20 px-3 py-2">
          <KeyRound className="h-4 w-4 text-navy shrink-0" />
          <span className="text-sm text-iconsa-gray">Código:</span>
          <span className="font-mono text-lg font-bold text-navy tracking-[0.25em]">
            {trip.confirmation_code}
          </span>
        </div>
      )}

      {/* 6. Botón Confirmar Recepción — Link a /mis-viajes con action=deliver */}
      <div className="flex justify-end">
        <Link
          href={`/mis-viajes/${trip.id}?action=deliver`}
          className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy/90 transition-colors"
        >
          Confirmar Recepción →
        </Link>
      </div>
    </div>
  )
}
