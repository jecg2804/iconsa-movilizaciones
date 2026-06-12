'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { startOfWeek, addDays, format, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'
import { CalendarDays, ChevronLeft, ChevronRight, Info } from 'lucide-react'
import { todayStrInPanama, parseDateStrInPanama } from '@/lib/utils/datetime'

interface CalendarTrip {
  id: string
  trip_id: string | null
  scheduled_date: string
  status: string
  att_permit: boolean | null
  escort: boolean | null
  driver: { id: string; name: string } | null
  vehicle: { id: string; spectrum_code: string | null; description: string } | null
  assignments: Array<{
    line: {
      from_location: { name: string } | null
      to_location: { name: string } | null
      from_text: string | null
      to_text: string | null
    } | null
  }>
}

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export default function CalendarioPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  // weekStart = lunes de la semana actual (en Panamá, no en timezone del runtime)
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(parseDateStrInPanama(todayStrInPanama()), { weekStartsOn: 1 }),
  )
  const [trips, setTrips] = useState<CalendarTrip[]>([])
  const [loading, setLoading] = useState(true)

  // Rango: 2 semanas (14 días)
  const dateFrom = format(weekStart, 'yyyy-MM-dd')
  const dateTo = format(addDays(weekStart, 13), 'yyyy-MM-dd')

  const fetchTrips = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('trips')
      .select(`
        id, trip_id, scheduled_date, status, att_permit, escort,
        driver:driver_id(id, name),
        vehicle:vehicle_id(id, spectrum_code, description),
        assignments:trip_line_assignments(
          line:request_line_id(
            from_location:from_location_id(name),
            to_location:to_location_id(name),
            from_text, to_text
          )
        )
      `)
      .gte('scheduled_date', dateFrom)
      .lte('scheduled_date', dateTo)
      .order('scheduled_date')

    setTrips((data as unknown as CalendarTrip[] | null) ?? [])
    setLoading(false)
  }, [supabase, dateFrom, dateTo])

  useEffect(() => {
    void fetchTrips()
  }, [fetchTrips])

  // Agrupar viajes por fecha
  const tripsByDate = useMemo(() => {
    const map = new Map<string, CalendarTrip[]>()
    for (const trip of trips) {
      const key = trip.scheduled_date
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(trip)
    }
    return map
  }, [trips])

  // Generar los 14 días
  const days = useMemo(() => {
    const result: Date[] = []
    for (let i = 0; i < 14; i++) {
      result.push(addDays(weekStart, i))
    }
    return result
  }, [weekStart])

  const today = useMemo(() => parseDateStrInPanama(todayStrInPanama()), [])

  const goBack = () => setWeekStart((prev) => addDays(prev, -7))
  const goForward = () => setWeekStart((prev) => addDays(prev, 7))
  const goToday = () => setWeekStart(startOfWeek(parseDateStrInPanama(todayStrInPanama()), { weekStartsOn: 1 }))

  // Ruta principal del viaje (primera asignación)
  function getRoute(trip: CalendarTrip): string {
    const a = trip.assignments?.[0]?.line
    if (!a) return ''
    const from = a.from_location?.name ?? a.from_text ?? ''
    const to = a.to_location?.name ?? a.to_text ?? ''
    if (!from && !to) return ''
    return `${from} → ${to}`
  }

  // Label del rango visible
  const rangeLabel = `${format(weekStart, "d 'de' MMMM", { locale: es })} — ${format(addDays(weekStart, 13), "d 'de' MMMM yyyy", { locale: es })}`

  return (
    <div className="space-y-4">
      {/* Banner */}
      <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2.5 text-sm text-iconsa-blue">
        <Info className="h-4 w-4 shrink-0" />
        <span>
          Vista integrada disponible en{' '}
          <Link href="/programacion" className="font-medium underline hover:text-blue-800">
            Programación
          </Link>
        </span>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-iconsa-navy" />
          <h1 className="text-lg font-semibold text-iconsa-navy">
            Calendario de Viajes
          </h1>
        </div>
        <p className="text-sm text-iconsa-gray capitalize">{rangeLabel}</p>
      </div>

      {/* Navegación */}
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={goBack}>
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline ml-1">Anterior</span>
        </Button>
        <Button variant="secondary" size="sm" onClick={goToday}>
          Hoy
        </Button>
        <Button variant="secondary" size="sm" onClick={goForward}>
          <span className="hidden sm:inline mr-1">Siguiente</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-iconsa-blue" />
        </div>
      ) : (
        <>
          {/* Desktop: grid 7 columnas */}
          <div className="hidden md:block">
            {/* Cabecera días */}
            <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-t-lg overflow-hidden">
              {DAY_NAMES.map((name) => (
                <div
                  key={name}
                  className="bg-iconsa-navy px-2 py-1.5 text-center text-xs font-semibold text-white"
                >
                  {name}
                </div>
              ))}
            </div>

            {/* 2 filas de 7 días */}
            {[0, 1].map((row) => (
              <div
                key={row}
                className="grid grid-cols-7 gap-px bg-gray-200"
              >
                {days.slice(row * 7, row * 7 + 7).map((day) => {
                  const key = format(day, 'yyyy-MM-dd')
                  const dayTrips = tripsByDate.get(key) ?? []
                  const isToday = isSameDay(day, today)

                  return (
                    <div
                      key={key}
                      className={`min-h-[120px] bg-white p-2 ${
                        isToday ? 'ring-2 ring-inset ring-iconsa-blue' : ''
                      }`}
                    >
                      {/* Número del día */}
                      <div className="flex items-center gap-1 mb-1">
                        <span
                          className={`text-sm font-medium ${
                            isToday
                              ? 'bg-iconsa-blue text-white rounded-full w-6 h-6 flex items-center justify-center'
                              : 'text-gray-700'
                          }`}
                        >
                          {format(day, 'd')}
                        </span>
                        {isToday && (
                          <span className="text-[10px] text-iconsa-blue font-medium">
                            Hoy
                          </span>
                        )}
                      </div>

                      {/* Viajes del día */}
                      <div className="space-y-1">
                        {dayTrips.map((trip) => (
                          <button
                            key={trip.id}
                            onClick={() =>
                              router.push(`/programacion/viaje/${trip.id}`)
                            }
                            className="w-full rounded border p-1.5 text-left text-[11px] leading-tight hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <span className="font-mono font-medium text-iconsa-navy truncate">
                                {trip.trip_id ?? '—'}
                              </span>
                              <Badge
                                label={trip.status}
                                variant="trip"
                                className="text-[9px] px-1.5 py-0"
                              />
                            </div>
                            {trip.driver && (
                              <p className="text-gray-600 truncate">
                                {trip.driver.name}
                              </p>
                            )}
                            {trip.vehicle && (
                              <p className="text-gray-500 truncate">
                                {trip.vehicle.spectrum_code ?? trip.vehicle.description}
                              </p>
                            )}
                            {getRoute(trip) && (
                              <p className="text-gray-400 truncate">
                                {getRoute(trip)}
                              </p>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
            <div className="h-px bg-gray-200 rounded-b-lg" />
          </div>

          {/* Mobile: lista vertical, solo días con viajes */}
          <div className="md:hidden space-y-3">
            {days.map((day) => {
              const key = format(day, 'yyyy-MM-dd')
              const dayTrips = tripsByDate.get(key) ?? []
              const isToday = isSameDay(day, today)

              if (dayTrips.length === 0 && !isToday) return null

              return (
                <div
                  key={key}
                  className={`rounded-lg border bg-white ${
                    isToday ? 'border-iconsa-blue' : 'border-gray-200'
                  }`}
                >
                  {/* Cabecera del día */}
                  <div
                    className={`px-3 py-2 border-b text-sm font-medium ${
                      isToday
                        ? 'bg-blue-50 text-iconsa-blue border-blue-100'
                        : 'bg-gray-50 text-gray-700 border-gray-100'
                    }`}
                  >
                    {format(day, "EEEE d 'de' MMMM", { locale: es })}
                    {isToday && (
                      <span className="ml-2 text-xs font-semibold bg-iconsa-blue text-white rounded-full px-2 py-0.5">
                        Hoy
                      </span>
                    )}
                  </div>

                  {/* Viajes */}
                  <div className="divide-y divide-gray-100">
                    {dayTrips.length === 0 ? (
                      <p className="px-3 py-3 text-sm text-gray-400 italic">
                        Sin viajes programados
                      </p>
                    ) : (
                      dayTrips.map((trip) => (
                        <button
                          key={trip.id}
                          onClick={() =>
                            router.push(`/programacion/viaje/${trip.id}`)
                          }
                          className="w-full px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-sm font-medium text-iconsa-navy">
                              {trip.trip_id ?? '—'}
                            </span>
                            <Badge label={trip.status} variant="trip" />
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-600">
                            {trip.driver && <span>{trip.driver.name}</span>}
                            {trip.vehicle && (
                              <span className="text-gray-500">
                                {trip.vehicle.spectrum_code ?? trip.vehicle.description}
                              </span>
                            )}
                          </div>
                          {getRoute(trip) && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {getRoute(trip)}
                            </p>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )
            })}

            {/* Si no hay viajes en ningún día */}
            {trips.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CalendarDays className="h-10 w-10 text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">
                  No hay viajes programados en este período
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
