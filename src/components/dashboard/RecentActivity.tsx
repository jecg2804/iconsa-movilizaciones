import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils/format'

interface RecentSolicitud {
  id: string
  request_id: string | null
  project: { code: string; name: string } | null
  status: string
  priority: string | null
  date_required: string
  requester: { name: string } | null
}

interface RecentTrip {
  id: string
  trip_id: string | null
  scheduled_date: string
  status: string
  driver: { name: string } | null
  vehicle: { description: string } | null
}

interface RecentActivityProps {
  solicitudes: RecentSolicitud[]
  trips: RecentTrip[]
}

function RecentActivity({ solicitudes, trips }: RecentActivityProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Solicitudes Recientes */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Solicitudes Recientes</h2>
        </div>

        {solicitudes.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-iconsa-gray">No hay solicitudes activas</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {solicitudes.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/solicitudes/${s.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-semibold text-navy">
                        {s.request_id ?? '—'}
                      </span>
                      {s.project && (
                        <span className="text-xs text-iconsa-gray">{s.project.code}</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-400">
                      Req. {formatDate(s.date_required)}
                      {s.requester && ` · ${s.requester.name}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge variant="status" label={s.status} />
                    {s.priority && <Badge variant="priority" label={s.priority} />}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Movilizaciones del Día */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Movilizaciones Hoy</h2>
        </div>

        {trips.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-iconsa-gray">No hay movilizaciones programadas para hoy</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {trips.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/programacion/viaje/${t.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-mono text-xs font-semibold text-navy">
                      {t.trip_id ?? '—'}
                    </span>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {t.driver?.name ?? 'Sin conductor'}
                      {t.vehicle && ` · ${t.vehicle.description}`}
                    </p>
                  </div>
                  <Badge variant="trip" label={t.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export { RecentActivity }
export type { RecentActivityProps, RecentSolicitud, RecentTrip }
