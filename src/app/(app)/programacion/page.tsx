'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Truck, Lock, Siren, Search, Wrench, Package, ArrowRight, ChevronsDownUp, ChevronsUpDown, X } from 'lucide-react'
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
import { MiniCalendar, type CalendarItem } from '@/components/ui/MiniCalendar'

// Tipos de línea para el filtro del backlog
const LINE_TYPES = ['Todos', 'Equipo', 'Material'] as const
type LineTypeFilter = (typeof LINE_TYPES)[number]

// Filtro de fecha: single-day click del calendario O rango desde/hasta
type DateFilter =
  | { type: 'single'; date: string }
  | { type: 'range'; from: string | null; to: string | null }
  | null

export default function ProgramacionPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { role, loading: authLoading } = useAuth()
  const { allProjects, loading: projectsLoading } = useProjects()
  const {
    backlog,
    backlogLoading,
    trips,
    tripsTotalCount,
    listLoading,
    listError,
    filters: tripFilters,
    setFilters: setTripFilters,
  } = useTrips()

  // Filtro de proyecto se mantiene client-side (requiere filtrar por assignments anidados)
  const [tripProjectFilter, setTripProjectFilter] = useState<string | null>(null)
  // Estado local de fecha para el calendario (single-day click)
  const [dateFilter, setDateFilter] = useState<DateFilter>(null)

  // --- Filtros del backlog (independientes) ---
  const [typeFilter, setTypeFilter] = useState<LineTypeFilter>('Todos')
  const [backlogProjectFilter, setBacklogProjectFilter] = useState<string | null>(null)
  const [backlogSearch, setBacklogSearch] = useState('')

  // --- Control de expandir/colapsar viajes (controlled state) ---
  const [tripExpandedKeys, setTripExpandedKeys] = useState<Set<string>>(new Set())
  const [expandInitialized, setExpandInitialized] = useState(false)

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

  // --- Filtrado ---
  const filteredBacklog = useMemo(() => {
    return backlog.filter((line) => {
      if (backlogProjectFilter && line.request.project?.id !== backlogProjectFilter) return false
      if (typeFilter !== 'Todos' && line.line_type !== typeFilter) return false
      if (backlogSearch) {
        const q = backlogSearch.toLowerCase()
        const matchesId = line.request.request_id?.toLowerCase().includes(q) ?? false
        const matchesDesc = line.description?.toLowerCase().includes(q) ?? false
        const matchesEquip = line.equipment?.spectrum_code?.toLowerCase().includes(q) ?? false
        if (!matchesId && !matchesDesc && !matchesEquip) return false
      }
      return true
    })
  }, [backlog, backlogProjectFilter, typeFilter, backlogSearch])

  // Viajes filtrados por proyecto y fecha (client-side)
  // Status, conductor, search son server-side via el hook
  const filteredTrips = useMemo(() => {
    let result = trips
    if (tripProjectFilter) {
      result = result.filter((trip) =>
        trip.assignments.some((a) => a.line?.request?.project?.id === tripProjectFilter)
      )
    }
    if (dateFilter) {
      if (dateFilter.type === 'single') {
        result = result.filter((t) => t.scheduled_date === dateFilter.date)
      } else if (dateFilter.type === 'range') {
        if (dateFilter.from) result = result.filter((t) => t.scheduled_date >= dateFilter.from!)
        if (dateFilter.to) result = result.filter((t) => t.scheduled_date <= dateFilter.to!)
      }
    }
    return result
  }, [trips, tripProjectFilter, dateFilter])

  // Inicializar colapsado al cargar datos
  useEffect(() => {
    if (!expandInitialized && filteredTrips.length > 0) {
      setTripExpandedKeys(new Set()) // default collapsed
      setExpandInitialized(true)
    }
  }, [expandInitialized, filteredTrips])

  const allTripsExpanded = tripExpandedKeys.size > 0

  // --- MiniCalendar items — query separada sin paginación para TODAS las movilizaciones ---
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>([])

  useEffect(() => {
    const fetchCalendarTrips = async () => {
      let query = supabase
        .from('trips')
        .select('id, trip_id, scheduled_date, status, driver:people!driver_id(name)')
        .not('status', 'in', '("Cancelado")')
        .order('scheduled_date')

      const { data } = await query
      setCalendarItems((data ?? []).map((t: Record<string, unknown>) => {
        const driver = Array.isArray(t.driver) ? t.driver[0] : t.driver
        return {
          id: t.id as string,
          date: t.scheduled_date as string,
          label: (t.trip_id as string) ?? '—',
          status: t.status as string,
          badgeVariant: 'trip' as const,
          subtitle: `${(driver as { name: string } | null)?.name ?? 'Sin conductor'}`,
          href: `/programacion/viaje/${t.id}`,
        }
      }))
    }
    fetchCalendarTrips()
  }, [supabase, tripProjectFilter])

  // --- Handlers de filtro de fecha (client-side — no afecta server query ni calendario) ---
  const handleCalendarClick = useCallback((date: string | null) => {
    if (!date) { setDateFilter(null); return }
    setDateFilter((prev) => {
      if (prev?.type === 'single' && prev.date === date) return null
      return { type: 'single', date }
    })
  }, [])

  const handleDateFromChange = useCallback((from: string | null) => {
    setDateFilter((prev) => {
      const to = prev?.type === 'range' ? prev.to : null
      return { type: 'range', from, to }
    })
  }, [])

  const handleDateToChange = useCallback((to: string | null) => {
    setDateFilter((prev) => {
      const from = prev?.type === 'range' ? prev.from : null
      return { type: 'range', from, to }
    })
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
          <a
            href={`/programacion/viaje/${row.id}`}
            onClick={(e) => { e.stopPropagation(); router.push(`/programacion/viaje/${row.id}`) }}
            className="font-mono text-sm font-medium text-navy hover:underline"
          >
            {row.trip_id ?? '—'}
          </a>
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
        key: 'rate',
        header: 'Tarifa',
        render: (row) =>
          row.rate ? (
            <span
              className="text-sm text-gray-900"
              title={row.rate.code}
            >
              {formatCurrency(row.rate.rate)}
            </span>
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
        render: (row) => (
          <span className="flex items-center gap-1.5">
            <Badge label={row.status} variant="trip" />
            {row.status === 'En Ruta' && row.assignments?.some(a => a.line && (a.line.status === 'Entregada' || a.line.status === 'Parcial')) && (
              <span className="text-green-600 text-xs" title="Material entregado">✅</span>
            )}
          </span>
        ),
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
      {
        key: 'actions',
        header: '',
        className: 'w-[110px]',
        render: (row: TripWithRelations) => {
          const today = new Date().toISOString().split('T')[0]
          if (row.status === 'Programado' && row.scheduled_date === today) {
            return (
              <a href={`/mis-viajes/${row.id}?action=dispatch`}
                 className="text-xs font-medium text-navy hover:underline whitespace-nowrap">
                🚛 Despachar →
              </a>
            )
          }
          if (row.status === 'En Ruta') {
            return (
              <a href={`/mis-viajes/${row.id}`}
                 className="text-xs font-medium text-blue-600 hover:underline whitespace-nowrap">
                Ver Eventos →
              </a>
            )
          }
          return null
        },
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

  // Estilo compartido para selects nativos
  const selectClass = 'rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 bg-white focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue'
  const inputClass = 'w-full rounded-lg border border-gray-200 pl-8 pr-3 py-1.5 text-sm placeholder:text-gray-400 focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue'

  return (
    <div className="space-y-6">
      {/* Header — un solo botón contextual */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-navy">Programación de Movilizaciones</h1>
        {puedeCrearViaje && (
          <div className="flex items-center gap-2">
            {visibleSelectedCount > 0 && (
              <button type="button" title="Deseleccionar todo" onClick={() => setSelectedLineIds(new Set())} className="rounded-full p-1.5 text-iconsa-gray hover:bg-gray-100 transition-colors">
                <X className="h-4 w-4" />
              </button>
            )}
            <Button
              onClick={visibleSelectedCount > 0 ? handleCrearViajeConLineas : () => router.push('/programacion/viaje/nuevo')}
              className="shrink-0"
            >
              {visibleSelectedCount > 0 ? (
                <><Truck className="h-4 w-4" /> Crear Movilización ({visibleSelectedCount} {visibleSelectedCount === 1 ? 'línea' : 'líneas'})</>
              ) : (
                <><Plus className="h-4 w-4" /> Nueva Movilización</>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* ─── Sección 1: Sin Programar ─── */}
      <section className="rounded-xl border border-gray-200 bg-white">
        <div className="px-4 pt-4 pb-3 space-y-3">
          {/* Header: título + count + toggle tipo */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-gray-900">Sin Programar</h2>
              {!backlogLoading && (
                <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-medium">
                  {filteredBacklog.length}
                </span>
              )}
            </div>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
              {LINE_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1.5 font-medium transition-colors ${
                    typeFilter === t
                      ? 'bg-navy text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Filtros inline */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              title="Filtrar por proyecto"
              value={backlogProjectFilter ?? ''}
              onChange={(e) => setBacklogProjectFilter(e.target.value || null)}
              className={selectClass}
              disabled={projectsLoading}
            >
              <option value="">Proyecto</option>
              {allProjects.map((p) => (
                <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
              ))}
            </select>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar equipo, solicitud..."
                value={backlogSearch}
                onChange={(e) => setBacklogSearch(e.target.value)}
                className={inputClass}
              />
            </div>
            {(backlogProjectFilter || backlogSearch) && (
              <button
                type="button"
                onClick={() => { setBacklogProjectFilter(null); setBacklogSearch('') }}
                className="text-xs text-iconsa-blue hover:underline"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Tabla backlog */}
        <div className="px-1 pb-1">
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

      {/* ─── Sección 2: Movilizaciones ─── */}
      <section className="rounded-xl border border-gray-200 bg-white">
        <div className="px-4 pt-4 pb-3 space-y-3">
          {/* Header */}
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-gray-900">Movilizaciones</h2>
            {filteredTrips.length > 0 && (
              <button
                type="button"
                onClick={() => setTripExpandedKeys((prev) =>
                  prev.size > 0 ? new Set() : new Set(filteredTrips.map((t) => t.id))
                )}
                className="flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {allTripsExpanded ? <ChevronsDownUp className="h-3.5 w-3.5" /> : <ChevronsUpDown className="h-3.5 w-3.5" />}
                {allTripsExpanded ? 'Colapsar' : 'Expandir'}
              </button>
            )}
          </div>

          {/* Filtros inline */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              title="Filtrar por proyecto"
              value={tripProjectFilter ?? ''}
              onChange={(e) => setTripProjectFilter(e.target.value || null)}
              className={selectClass}
              disabled={projectsLoading}
            >
              <option value="">Proyecto</option>
              {allProjects.map((p) => (
                <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
              ))}
            </select>
            <select
              title="Filtrar por estado"
              value={tripFilters.status ?? ''}
              onChange={(e) => setTripFilters({ status: e.target.value || null, page: 0 })}
              className={selectClass}
            >
              <option value="">Estado</option>
              {TRIP_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              title="Filtrar por conductor"
              value={tripFilters.conductorId ?? ''}
              onChange={(e) => setTripFilters({ conductorId: e.target.value || null, page: 0 })}
              className={selectClass}
            >
              <option value="">Conductor</option>
              {conductors.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar movilización..."
                value={tripFilters.search ?? ''}
                onChange={(e) => setTripFilters({ search: e.target.value || null, page: 0 })}
                className={inputClass}
              />
            </div>
            {/* Rango de fechas */}
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-iconsa-gray whitespace-nowrap">Desde</label>
              <input
                type="date"
                title="Fecha desde"
                value={dateFilter?.type === 'range' ? (dateFilter.from ?? '') : ''}
                onChange={(e) => handleDateFromChange(e.target.value || null)}
                className={selectClass}
              />
              <label className="text-xs text-iconsa-gray whitespace-nowrap">Hasta</label>
              <input
                type="date"
                title="Fecha hasta"
                value={dateFilter?.type === 'range' ? (dateFilter.to ?? '') : ''}
                onChange={(e) => handleDateToChange(e.target.value || null)}
                className={selectClass}
              />
            </div>
            {(tripProjectFilter || tripFilters.status || tripFilters.conductorId || tripFilters.search || dateFilter) && (
              <button
                type="button"
                onClick={() => { setTripProjectFilter(null); setTripFilters({ status: null, conductorId: null, search: null, dateFrom: null, dateTo: null, page: 0 }); setDateFilter(null) }}
                className="text-xs text-iconsa-blue hover:underline"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Calendario */}
        <div className="px-4 pb-3">
          <MiniCalendar
            items={calendarItems}
            selectedDate={dateFilter?.type === 'single' ? dateFilter.date : null}
            onSelectDate={handleCalendarClick}
          />
        </div>

        {/* Tabla de viajes */}
        <div className="px-1 pb-1">
          {listError && (
            <div className="mx-3 mb-3 rounded-lg bg-red-50 p-3 text-sm text-iconsa-red">
              Error al cargar movilizaciones: {listError}
            </div>
          )}

          <DataTable<TripWithRelations>
            columns={columns}
            data={filteredTrips}
            keyExtractor={(row) => row.id}
            loading={listLoading}
            emptyMessage="No hay movilizaciones para mostrar"
            mobileRender={mobileRender}
            expandedKeys={tripExpandedKeys}
            onExpandedKeysChange={setTripExpandedKeys}
            pagination="server"
            pageSize={tripFilters.pageSize}
            totalCount={tripsTotalCount}
            currentPage={tripFilters.page}
            onPageChange={(page) => setTripFilters({ page })}
            onPageSizeChange={(size) => setTripFilters({ pageSize: size, page: 0 })}
            expandRender={(row) => {
              const assignments = row.assignments ?? []
              if (assignments.length === 0) return <p className="text-sm text-iconsa-gray">Sin líneas asignadas</p>
              return (
                <div className="space-y-1.5">
                  {assignments.map((a) => {
                    const line = a.line
                    if (!line) return null
                    const fromName = line.from_location?.name ?? line.from_text ?? '—'
                    const toName = line.to_location?.name ?? line.to_text ?? '—'
                    const unitName = line.unit?.code ?? line.unit_text ?? ''
                    const isEquipo = line.line_type === 'Equipo'
                    return (
                      <div key={a.id} className="flex items-center gap-2 text-sm py-1">
                        {isEquipo ? (
                          <Wrench className="h-3.5 w-3.5 shrink-0 text-iconsa-blue" />
                        ) : (
                          <Package className="h-3.5 w-3.5 shrink-0 text-gold" />
                        )}
                        <span className="font-medium text-gray-900 truncate max-w-[250px]" title={line.description}>
                          {line.description}
                        </span>
                        <span className="text-gray-300">·</span>
                        <span className="font-semibold text-gray-700 whitespace-nowrap bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                          {a.quantity_assigned} {unitName}
                        </span>
                        <span className="text-xs text-gray-400 whitespace-nowrap">{fromName} → {toName}</span>
                        {line.status !== 'Programada' && line.status !== 'En Transito' && (
                          <Badge label={line.status} variant="line" />
                        )}
                      </div>
                    )
                  })}
                  <a
                    href={`/programacion/viaje/${row.id}`}
                    onClick={(e) => { e.stopPropagation(); router.push(`/programacion/viaje/${row.id}`) }}
                    className="mt-1 inline-block text-xs font-medium text-iconsa-blue hover:underline"
                  >
                    Ver detalle de la movilización
                  </a>
                </div>
              )
            }}
          />
        </div>
      </section>

    </div>
  )
}
