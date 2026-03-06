'use client'

import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useMyTrips } from '@/hooks/useMyTrips'
import { TripCard } from '@/components/viajes/TripCard'

export default function MisViajesPage() {
  const router = useRouter()
  const { role, loading: authLoading } = useAuth()
  const { trips, loading: tripsLoading, error } = useMyTrips()

  // Guard de acceso: pm no tiene acceso a esta pantalla
  if (!authLoading && role === 'pm') {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4">
        <h1 className="text-xl font-bold text-gray-900">Acceso denegado</h1>
        <p className="text-sm text-iconsa-gray">
          Los ingenieros de proyecto no tienen acceso a esta pantalla.
        </p>
      </div>
    )
  }

  if (authLoading || tripsLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-navy" />
          <p className="text-sm text-iconsa-gray">Cargando viajes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 pb-8 pt-4 sm:px-6 sm:pt-6">
      <h1 className="text-2xl font-bold text-gray-900">Mis Viajes</h1>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {trips.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-base font-medium text-gray-900">No hay viajes activos</p>
          <p className="mt-1 text-sm text-iconsa-gray">
            Los viajes en estado Programado o En Ruta aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {trips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              onClick={() => router.push(`/mis-viajes/${trip.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
