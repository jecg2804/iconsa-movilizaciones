'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useMyTrips } from '@/hooks/useMyTrips'
import { TripCard } from '@/components/viajes/TripCard'
import { Select, type SelectOption } from '@/components/ui/Select'

export default function MisViajesPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { role, loading: authLoading } = useAuth()
  const { trips, loading: tripsLoading, error } = useMyTrips()

  // Filtros client-side
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState<string | null>(null)
  const [dateTo, setDateTo] = useState<string | null>(null)
  const [driverFilter, setDriverFilter] = useState<string | null>(null)
  const [drivers, setDrivers] = useState<{ id: string; name: string }[]>([])

  // Fetch conductores (campo) para filtro
  useEffect(() => {
    supabase
      .from('people')
      .select('id, name')
      .eq('status', 'Activo')
      .eq('app_role', 'campo')
      .order('name')
      .then(({ data }) => setDrivers(data ?? []))
  }, [supabase])

  const statusOptions: SelectOption[] = [
    { value: 'Programado', label: 'Programado' },
    { value: 'En Ruta', label: 'En Ruta' },
  ]

  const driverOptions: SelectOption[] = useMemo(
    () => drivers.map((d) => ({ value: d.id, label: d.name })),
    [drivers],
  )

  const filteredTrips = useMemo(() => {
    return trips.filter((t) => {
      if (statusFilter && t.status !== statusFilter) return false
      if (dateFrom && t.scheduled_date < dateFrom) return false
      if (dateTo && t.scheduled_date > dateTo) return false
      if (driverFilter && t.driver?.id !== driverFilter) return false
      return true
    })
  }, [trips, statusFilter, dateFrom, dateTo, driverFilter])

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

      {/* Filtros */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Select
          placeholder="Todos los estados"
          options={statusOptions}
          value={statusFilter}
          onChange={setStatusFilter}
        />
        <input
          type="date"
          value={dateFrom ?? ''}
          onChange={(e) => setDateFrom(e.target.value || null)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue"
          title="Fecha desde"
        />
        <input
          type="date"
          value={dateTo ?? ''}
          onChange={(e) => setDateTo(e.target.value || null)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue"
          title="Fecha hasta"
        />
        <Select
          placeholder="Todos los conductores"
          options={driverOptions}
          value={driverFilter}
          onChange={setDriverFilter}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {filteredTrips.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-base font-medium text-gray-900">No hay viajes activos</p>
          <p className="mt-1 text-sm text-iconsa-gray">
            {trips.length > 0
              ? 'Ningún viaje coincide con los filtros seleccionados.'
              : 'Los viajes en estado Programado o En Ruta aparecerán aquí.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTrips.map((trip) => (
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
