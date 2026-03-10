'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Truck, Lock, Siren, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useProjects } from '@/hooks/useProjects'
import { useTrips, type TripWithRelations } from '@/hooks/useTrips'
import { canCreateTrip } from '@/lib/utils/roles'
import { TRIP_STATUSES } from '@/lib/utils/constants'
import { formatDate, formatCurrency } from '@/lib/utils/format'
import { BacklogTable } from '@/components/programacion/BacklogTable'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select, type SelectOption } from '@/components/ui/Select'
import { MiniCalendar, type CalendarItem } from '@/components/ui/MiniCalendar'
import { FilterBar, type FilterChip } from '@/components/ui/FilterBar'

// Tipos de línea para el filtro del backlog
const LINE_TYPES = ['Todos', 'Equipo', 'Material'] as const
type LineTypeFilter = (typeof LINE_TYPES)[number]

export default function ProgramacionPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { role, loading: authLoading } = useAuth()
  const { allProjects, loading: projectsLoading } = useProjects()
  const {
    backlog,
    backlogLoading,
    trips,
    listLoading,
    listError,
  } = useTrips()

  // --- Filtros unificados ---
  const [projectFilter, setProjectFilter] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [driverFilter, setDriverFilter] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<string | null>(null)
  const [searchFilter, setSearchFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<LineTypeFilter>('Todos')

  // Conductores para filtro
  const [conductors, setConductors] = useState<{ id: string; name: string }[]>([])
  useEffect(() => {
    supabase
      .from('people')
      .select('id, name')
      .eq('status', 'Activo')
      .eq('app_role', 'campo')
      .order('name')
      .then(({ data }) => setConductors(data ?? []))
  }, [supabase])

  // Selección de líneas
  const [selectedLineIds, setSelectedLineIds] = useState<Set<string>>(new Set())

  // Opciones de dropdowns
  const projectOptions: SelectOption[] = useMemo(
    () => allProjects.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` })),
    [allProjects],
  )
  const conductorOptions: SelectOption[] = useMemo(
    () => conductors.map((c) => ({ value: c.id, label: c.name })),
    [conductors],
  )

  // Nombre helpers para chips
  const projectName = useMemo(
    () => allProjects.find((p) => p.id === projectFilter),
    [allProjects, projectFilter],
  )
  const driverName = useMemo(
    () => conductors.find((c) => c.id === driverFilter),
    [conductors, driverFilter],
  )

  // --- Filtrado ---
  const filteredBacklog = useMemo(() => {
    return backlog.filter((line) => {
      if (projectFilter && line.request.project?.id !== projectFilter) return false
      if (typeFilter !== 'Todos' && line.line_type !== typeFilter) return false
      if (dateFilter && line.request.date_required !== dateFilter) return false
      if (searchFilter) {
        const q = searchFilter.toLowerCase()
        const matchesId = line.request.request_id?.toLowerCase().includes(q) ?? false
        const matchesDesc = line.description?.toLowerCase().includes(q) ?? false
        const matchesEquip = line.equipment?.spectrum_code?.toLowerCase().includes(q) ?? false
        if (!matchesId && !matchesDesc && !matchesEquip) return false
      }
      return true
    })
  }, [backlog, projectFilter, typeFilter, dateFilter, searchFilter])

  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => {
      if (projectFilter) {
        const matchesProject = trip.assignments.some(
          (a) => a.line?.request?.project?.id === projectFilter,
        )
        if (!matchesProject) return false
      }
      if (statusFilter && trip.status !== statusFilter) return false
      if (driverFilter && trip.driver_id !== driverFilter) return false
      if (dateFilter && trip.scheduled_date !== dateFilter) return false
      if (searchFilter) {
        const q = searchFilter.toLowerCase()
        const matchesId = trip.trip_id?.toLowerCase().includes(q) ?? false
        const matchesDriver = trip.driver?.name?.toLowerCase().includes(q) ?? false
        const matchesVehicle = trip.vehicle?.description?.toLowerCase().includes(q) ?? false
        if (!matchesId && !matchesDriver && !matchesVehicle) return false
      }
      return true
    })
  }, [trips, projectFilter, statusFilter, driverFilter, dateFilter, searchFilter])

  // --- MiniCalendar items (viajes como mini-cards, sin filtro de fecha) ---
  const calendarItems = useMemo<CalendarItem[]>(() => {
    return trips
      .filter((trip) => {
        if (projectFilter) {
          const match = trip.assignments.some(
            (a) => a.line?.request?.project?.id === projectFilter,
          )
          if (!match) return false
        }
        if (statusFilter && trip.status !== statusFilter) return false
        if (driverFilter && trip.driver_id !== driverFilter) return false
        return true
      })
      .map((t) => {
        // Ruta abreviada
        const a = t.assignments?.[0]?.line
        let route: string | undefined
        if (a) {
          const from = a.from_location?.name ?? a.from_text ?? ''
          const to = a.to_location?.name ?? a.to_text ?? ''
          if (from && to) route = `${from} → ${to}`
        }
        return {
          id: t.id,
          date: t.scheduled_date,
          label: t.trip_id ?? '—',
          status: t.status,
          badgeVariant: 'trip' as const,
          subtitle: t.driver?.name ?? 'Sin conductor',
          route,
          href: `/programacion/viaje/${t.id}`,
        }
      })
  }, [trips, projectFilter, statusFilter, driverFilter])

  // --- Chips de filtros activos ---
  const filterChips = useMemo<FilterChip[]>(() => {
    const chips: FilterChip[] = []
    if (projectFilter && projectName) {
      chips.push({
        key: 'project',
        label: projectName.code,
        onRemove: () => setProjectFilter(null),
      })
    }
    if (statusFilter) {
      chips.push({
        key: 'status',
        label: statusFilter,
        onRemove: () => setStatusFilter(null),
      })
    }
    if (driverFilter && driverName) {
      chips.push({
        key: 'driver',
        label: driverName.name,
        onRemove: () => setDriverFilter(null),
      })
    }
    if (dateFilter) {
      const d = new Date(dateFilter + 'T00:00:00')
      chips.push({
        key: 'date',
        label: d.toLocaleDateString('es-PA', { day: 'numeric', month: 'short' }),
        onRemove: () => setDateFilter(null),
      })
    }
    if (searchFilter) {
      chips.push({
        key: 'search',
        label: `"${searchFilter}"`,
        onRemove: () => setSearchFilter(''),
      })
    }
    return chips
  }, [projectFilter, projectName, statusFilter, driverFilter, driverName, dateFilter, searchFilter])

  const clearAllFilters = useCallback(() => {
    setProjectFilter(null)
    setStatusFilter(null)
    setDriverFilter(null)
    setDateFilter(null)
    setSearchFilter('')
  }, [])

  // --- Selección de líneas ---
  const visibleSelectedCount = useMemo(() => {
    return filteredBacklog.filter((l) => selectedLineIds.has(l.id)).length
  }, [filteredBacklog, selectedLineIds])

  const handleToggleSelect = useCallback((lineId: string) => {
    setSelectedLineIds((prev) => {
      const next = new Set(prev)
      if (next.has(lineId)) next.delete(lineId)
      else next.add(lineId)
      return next
    })
  }, [])

  const handleSelectAll = useCallback(
    (selected: boolean) => {
      setSelectedLineIds((prev) => {
        const next = new Set(prev)
        for (const line of filteredBacklog) {
          if (selected) next.add(line.id)
          else next.delete(line.id)
        }
        return next
      })
    },
    [filteredBacklog],
  )

  const handleCrearViajeConLineas = useCallback(() => {
    const ids = Array.from(selectedLineIds).join(',')
    router.push(`/programacion/viaje/nuevo?lines=${ids}`)
  }, [selectedLineIds, router])

  const handleTripRowClick = useCallback(
    (row: TripWithRelations) => {
      router.push(`/programacion/viaje/${row.id}`)
    },
    [router],
  )

  const handleRequestClick = useCallback(
    (requestId: string) => {
      router.push(`/solicitudes/${requestId}`)
    },
    [router],
  )

  const puedeCrearViaje = canCreateTrip(role)

  // --- Columnas de tabla de viajes ---
  const columns: Column<TripWithRelations>[] = useMemo(
    () => [
      {
        key: 'trip_id',
        header: 'ID',
        sortable: true,
        className: 'w-[150px]',
        render: (row) => (
          <span className="font-mono text-sm font-medium text-navy">
            {row.trip_id ?? '—'}
          </span>
        ),
        sortValue: (row) => row.trip_id ?? '',
      },
      {
        key: 'scheduled_date',
        header: 'Fecha',
        sortable: true,
        className: 'w-[120px]',
        render: (row) => (
          <span className="text-sm text-gray-900">
            {formatDate(row.scheduled_date)}
          </span>
        ),
        sortValue: (row) => row.scheduled_date,
      },
      {
        key: 'driver',
        header: 'Conductor',
        sortable: true,
        render: (row) => (
          <span className="text-sm text-gray-900">
            {row.driver?.name ?? '—'}
          </span>
        ),
        sortValue: (row) => row.driver?.name ?? '',
      },
      {
        key: 'vehicle',
        header: 'Vehículo',
        render: (row) => (
          <span
            className="max-w-[160px] truncate block text-sm text-gray-900"
            title={row.vehicle?.description ?? '—'}
          >
            {row.vehicle?.description ?? '—'}
          </span>
        ),
      },
      {
        key: 'trailer',
        header: 'Remolque',
        render: (row) => (
          <span
            className="max-w-[140px] truncate block text-sm text-gray-900"
            title={row.trailer?.description ?? '—'}
          >
            {row.trailer?.description ?? '—'}
          </span>
        ),
      },
      {
        key: 'rate',
        header: 'Tarifa',
        render: (row) =>
          row.rate ? (
            <div>
              <div className="text-sm text-gray-900">{row.rate.code}</div>
              <div className="text-xs text-iconsa-gray">
                {formatCurrency(row.rate.rate)}
              </div>
            </div>
          ) : (
            <span className="text-sm text-iconsa-gray">—</span>
          ),
      },
      {
        key: 'route',
        header: 'Ruta',
        render: (row) => {
          const origins = new Set<string>()
          const destinations = new Set<string>()
          for (const a of row.assignments) {
            const from = a.line?.from_location?.name ?? a.line?.from_text ?? null
            const to = a.line?.to_location?.name ?? a.line?.to_text ?? null
            if (from) origins.add(from)
            if (to) destinations.add(to)
          }
          if (origins.size === 0 && destinations.size === 0) {
            return <span className="text-sm text-iconsa-gray">—</span>
          }
          if (origins.size > 1 || destinations.size > 1) {
            return <span className="text-sm text-gray-900">Multi-ruta</span>
          }
          const from = Array.from(origins)[0] ?? ''
          const to = Array.from(destinations)[0] ?? ''
          return (
            <span
              className="max-w-[200px] truncate block text-sm text-gray-900"
              title={`${from} → ${to}`}
            >
              {from} → {to}
            </span>
          )
        },
      },
      {
        key: 'lines',
        header: 'Líneas',
        className: 'w-[80px] text-center',
        render: (row) => (
          <span className="text-sm text-gray-900">{row.assignments.length}</span>
        ),
      },
      {
        key: 'status',
        header: 'Estado',
        sortable: true,
        className: 'w-[130px]',
        render: (row) => <Badge label={row.status} variant="trip" />,
        sortValue: (row) => row.status,
      },
      {
        key: 'badges',
        header: '',
        className: 'w-[72px]',
        render: (row) => (
          <span className="flex items-center gap-1">
            {row.att_permit && (
              <span title="Requiere permiso ATT" className="inline-flex items-center rounded-full bg-orange-100 px-1.5 py-0.5 text-xs font-medium text-orange-700">
                <Lock className="h-3 w-3" />
              </span>
            )}
            {row.escort && (
              <span title="Requiere escolta" className="inline-flex items-center rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">
                <Siren className="h-3 w-3" />
              </span>
            )}
          </span>
        ),
      },
    ],
    [],
  )

  const mobileRender = useCallback(
    (row: TripWithRelations) => (
      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2 active:bg-gray-50">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-sm font-bold text-navy">{row.trip_id ?? '—'}</span>
          <Badge label={row.status} variant="trip" />
        </div>
        <div className="flex items-center justify-between gap-2 text-sm text-gray-900">
          <span>{formatDate(row.scheduled_date)}</span>
          <span className="text-iconsa-gray">{row.driver?.name ?? '—'}</span>
        </div>
        <div className="text-sm text-iconsa-gray truncate">{row.vehicle?.description ?? '—'}</div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-iconsa-gray">
            {row.assignments.length} {row.assignments.length === 1 ? 'línea' : 'líneas'}
          </span>
          <span className="flex items-center gap-1">
            {row.att_permit && (
              <span title="Permiso ATT" className="inline-flex items-center rounded-full bg-orange-100 px-1.5 py-0.5 text-xs font-medium text-orange-700">
                <Lock className="h-3 w-3" />
              </span>
            )}
            {row.escort && (
              <span title="Escolta" className="inline-flex items-center rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">
                <Siren className="h-3 w-3" />
              </span>
            )}
          </span>
        </div>
      </div>
    ),
    [],
  )

  const isLoading = authLoading

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-navy">Programación de Viajes</h1>
        {puedeCrearViaje && (
          <Button onClick={() => router.push('/programacion/viaje/nuevo')} className="shrink-0">
            <Plus className="h-4 w-4" />
            Crear Viaje
          </Button>
        )}
      </div>

      {/* FilterBar unificado */}
      <FilterBar chips={filterChips} onClearAll={clearAllFilters}>
        <div className="w-full sm:w-52">
          <Select
            placeholder="Proyecto"
            options={projectOptions}
            value={projectFilter}
            onChange={setProjectFilter}
            disabled={projectsLoading || isLoading}
          />
        </div>
        <div className="w-full sm:w-40">
          <Select
            placeholder="Estado"
            options={TRIP_STATUSES.map((s) => ({ value: s, label: s }))}
            value={statusFilter}
            onChange={setStatusFilter}
          />
        </div>
        <div className="w-full sm:w-44">
          <Select
            placeholder="Conductor"
            options={conductorOptions}
            value={driverFilter}
            onChange={setDriverFilter}
          />
        </div>
        <div className="relative w-full sm:w-44">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-8 pr-3 text-sm placeholder:text-gray-400 focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue"
          />
        </div>
      </FilterBar>

      {/* MiniCalendar */}
      <MiniCalendar
        items={calendarItems}
        selectedDate={dateFilter}
        onSelectDate={setDateFilter}
      />

      {/* ─── Sección 1: Backlog ─── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            Sin Programar
            {!backlogLoading && (
              <span className="ml-2 inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                {filteredBacklog.length}
              </span>
            )}
          </h2>
          {/* Filtro tipo (específico del backlog) */}
          <div className="flex items-center gap-1">
            {LINE_TYPES.map((tipo) => (
              <button
                key={tipo}
                type="button"
                onClick={() => setTypeFilter(tipo)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  typeFilter === tipo
                    ? 'bg-navy text-white'
                    : 'bg-gray-100 text-iconsa-gray hover:bg-gray-200'
                }`}
              >
                {tipo}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl ring-1 ring-gray-200 bg-white p-1">
          <BacklogTable
            lines={filteredBacklog}
            loading={backlogLoading}
            selectable={puedeCrearViaje}
            selectedLineIds={selectedLineIds}
            onToggleSelect={handleToggleSelect}
            onSelectAll={handleSelectAll}
            onRequestClick={handleRequestClick}
          />
        </div>
      </section>

      {/* ─── Sección 2: Viajes Recientes ─── */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-gray-900">Viajes Recientes</h2>

        {listError && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-iconsa-red">
            Error al cargar viajes: {listError}
          </div>
        )}

        <DataTable<TripWithRelations>
          columns={columns}
          data={filteredTrips}
          keyExtractor={(row) => row.id}
          onRowClick={handleTripRowClick}
          loading={listLoading}
          emptyMessage="No hay viajes para mostrar"
          mobileRender={mobileRender}
        />
      </section>

      {/* Barra flotante: crear viaje con líneas seleccionadas */}
      {puedeCrearViaje && visibleSelectedCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white px-4 py-3 shadow-lg sm:bottom-4 sm:left-auto sm:right-6 sm:w-auto sm:rounded-xl sm:border sm:shadow-xl">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-700">
              <span className="font-semibold text-navy">{visibleSelectedCount}</span>{' '}
              {visibleSelectedCount === 1 ? 'línea seleccionada' : 'líneas seleccionadas'}
            </span>
            <Button size="sm" onClick={handleCrearViajeConLineas}>
              <Truck className="h-4 w-4" />
              Crear Viaje
            </Button>
            <button
              type="button"
              onClick={() => setSelectedLineIds(new Set())}
              className="text-xs text-iconsa-gray hover:text-gray-900 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
