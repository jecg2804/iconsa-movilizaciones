'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Truck, Lock, Siren } from 'lucide-react'
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
    filters,
    setFilters,
  } = useTrips()

  // Estado local: filtros del backlog (cliente)
  const [projectFilter, setProjectFilter] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<LineTypeFilter>('Todos')

  // Estado local: conductores para filtro de viajes
  const [conductors, setConductors] = useState<{ id: string; name: string }[]>([])

  // Fetch conductores (campo) para filtro
  useEffect(() => {
    supabase
      .from('people')
      .select('id, name')
      .eq('status', 'Activo')
      .eq('app_role', 'campo')
      .order('name')
      .then(({ data }) => setConductors(data ?? []))
  }, [supabase])

  // Estado local: líneas seleccionadas para crear viaje
  const [selectedLineIds, setSelectedLineIds] = useState<Set<string>>(new Set())

  // Opciones de proyectos para el dropdown del backlog
  const projectOptions: SelectOption[] = useMemo(
    () =>
      allProjects.map((p) => ({
        value: p.id,
        label: `${p.code} — ${p.name}`,
      })),
    [allProjects],
  )

  // Opciones de conductores para filtro de viajes
  const conductorOptions: SelectOption[] = useMemo(
    () => conductors.map((c) => ({ value: c.id, label: c.name })),
    [conductors],
  )

  // Filtrar backlog en cliente por proyecto y tipo
  const filteredBacklog = useMemo(() => {
    return backlog.filter((line) => {
      const matchesProject =
        projectFilter === null || line.request.project?.id === projectFilter
      const matchesType =
        typeFilter === 'Todos' || line.line_type === typeFilter
      return matchesProject && matchesType
    })
  }, [backlog, projectFilter, typeFilter])

  // Líneas que están actualmente visibles y seleccionadas
  const visibleSelectedCount = useMemo(() => {
    return filteredBacklog.filter((l) => selectedLineIds.has(l.id)).length
  }, [filteredBacklog, selectedLineIds])

  // Toggle de una línea individual
  const handleToggleSelect = useCallback((lineId: string) => {
    setSelectedLineIds((prev) => {
      const next = new Set(prev)
      if (next.has(lineId)) {
        next.delete(lineId)
      } else {
        next.add(lineId)
      }
      return next
    })
  }, [])

  // Seleccionar / deseleccionar todas las líneas visibles
  const handleSelectAll = useCallback(
    (selected: boolean) => {
      setSelectedLineIds((prev) => {
        const next = new Set(prev)
        for (const line of filteredBacklog) {
          if (selected) {
            next.add(line.id)
          } else {
            next.delete(line.id)
          }
        }
        return next
      })
    },
    [filteredBacklog],
  )

  // Navegar a crear viaje con líneas seleccionadas pre-cargadas
  const handleCrearViajeConLineas = useCallback(() => {
    const ids = Array.from(selectedLineIds).join(',')
    router.push(`/programacion/viaje/nuevo?lines=${ids}`)
  }, [selectedLineIds, router])

  // Navegar al detalle de un viaje
  const handleTripRowClick = useCallback(
    (row: TripWithRelations) => {
      router.push(`/programacion/viaje/${row.id}`)
    },
    [router],
  )

  // Navegar al ID de solicitud desde el backlog
  const handleRequestClick = useCallback(
    (requestId: string) => {
      router.push(`/solicitudes/${requestId}`)
    },
    [router],
  )

  // Determinar si el usuario puede crear viajes
  const puedeCrearViaje = canCreateTrip(role)

  // Columnas de la tabla de viajes
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
          <span className="text-sm text-gray-900">
            {row.assignments.length}
          </span>
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
              <span
                title="Requiere permiso ATT"
                className="inline-flex items-center rounded-full bg-orange-100 px-1.5 py-0.5 text-xs font-medium text-orange-700"
              >
                <Lock className="h-3 w-3" />
              </span>
            )}
            {row.escort && (
              <span
                title="Requiere escolta"
                className="inline-flex items-center rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700"
              >
                <Siren className="h-3 w-3" />
              </span>
            )}
          </span>
        ),
      },
    ],
    [],
  )

  // Render mobile para cada viaje
  const mobileRender = useCallback(
    (row: TripWithRelations) => (
      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2 active:bg-gray-50">
        {/* Fila 1: ID + Estado */}
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-sm font-bold text-navy">
            {row.trip_id ?? '—'}
          </span>
          <Badge label={row.status} variant="trip" />
        </div>

        {/* Fila 2: Fecha + Conductor */}
        <div className="flex items-center justify-between gap-2 text-sm text-gray-900">
          <span>{formatDate(row.scheduled_date)}</span>
          <span className="text-iconsa-gray">{row.driver?.name ?? '—'}</span>
        </div>

        {/* Fila 3: Vehículo */}
        <div className="text-sm text-iconsa-gray truncate">
          {row.vehicle?.description ?? '—'}
        </div>

        {/* Fila 4: Líneas + Badges de permiso/escolta */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-iconsa-gray">
            {row.assignments.length}{' '}
            {row.assignments.length === 1 ? 'línea' : 'líneas'}
          </span>
          <span className="flex items-center gap-1">
            {row.att_permit && (
              <span
                title="Permiso ATT"
                className="inline-flex items-center rounded-full bg-orange-100 px-1.5 py-0.5 text-xs font-medium text-orange-700"
              >
                <Lock className="h-3 w-3" />
              </span>
            )}
            {row.escort && (
              <span
                title="Escolta"
                className="inline-flex items-center rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700"
              >
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-navy">Programación de Viajes</h1>

        {puedeCrearViaje && (
          <Button
            onClick={() => router.push('/programacion/viaje/nuevo')}
            className="shrink-0"
          >
            <Plus className="h-4 w-4" />
            Crear Viaje
          </Button>
        )}
      </div>

      {/* ─── Sección 1: Backlog ─── */}
      <section className="space-y-3">
        {/* Encabezado de sección */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            Sin Programar
            {!backlogLoading && (
              <span className="ml-2 inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                {filteredBacklog.length}
              </span>
            )}
          </h2>
        </div>

        {/* Filtros del backlog */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Dropdown de proyecto */}
          <div className="w-full sm:w-64">
            <Select
              placeholder="Todos los proyectos"
              options={projectOptions}
              value={projectFilter}
              onChange={setProjectFilter}
              disabled={projectsLoading || isLoading}
            />
          </div>

          {/* Filtro de tipo (botones) */}
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

        {/* Tabla del backlog */}
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
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            Viajes Recientes
          </h2>

          {/* Filtro de estado de viajes */}
          <div className="flex flex-wrap items-center gap-1">
            {TRIP_STATUSES.map((status) => {
              const isActive = filters.status === status
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() =>
                    setFilters({ status: isActive ? null : status })
                  }
                  className={`transition-all ${
                    isActive
                      ? 'ring-2 ring-navy ring-offset-1'
                      : 'opacity-50 hover:opacity-80'
                  }`}
                >
                  <Badge label={status} variant="trip" />
                </button>
              )
            })}
          </div>
        </div>

        {/* Filtros adicionales: fecha y conductor */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={filters.dateFrom ?? ''}
            onChange={(e) => setFilters({ dateFrom: e.target.value || null })}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
            placeholder="Desde"
            title="Fecha desde"
          />
          <input
            type="date"
            value={filters.dateTo ?? ''}
            onChange={(e) => setFilters({ dateTo: e.target.value || null })}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
            placeholder="Hasta"
            title="Fecha hasta"
          />
          <div className="w-48">
            <Select
              placeholder="Todos los conductores"
              options={conductorOptions}
              value={filters.conductorId ?? null}
              onChange={(val) => setFilters({ conductorId: val })}
            />
          </div>
        </div>

        {/* Error */}
        {listError && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-iconsa-red">
            Error al cargar viajes: {listError}
          </div>
        )}

        <DataTable<TripWithRelations>
          columns={columns}
          data={trips}
          keyExtractor={(row) => row.id}
          onRowClick={handleTripRowClick}
          loading={listLoading}
          emptyMessage="No hay viajes para mostrar"
          mobileRender={mobileRender}
        />
      </section>

      {/* ─── Barra flotante: crear viaje con líneas seleccionadas ─── */}
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
