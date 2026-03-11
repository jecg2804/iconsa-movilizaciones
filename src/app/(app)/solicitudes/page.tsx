'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Wrench, Package, ArrowRight } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useProjects } from '@/hooks/useProjects'
import { useSolicitudes, type SolicitudWithRelations } from '@/hooks/useSolicitudes'
import { canCreateSolicitud } from '@/lib/utils/roles'
import { formatDate, calculatePriority, daysUntilDue, formatDaysUntilDue, daysUntilDueColor } from '@/lib/utils/format'
import { REQUEST_STATUSES, PRIORITIES } from '@/lib/utils/constants'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select, type SelectOption } from '@/components/ui/Select'
import { MiniCalendar, type CalendarItem } from '@/components/ui/MiniCalendar'
import { FilterBar, type FilterChip } from '@/components/ui/FilterBar'

// Orden de prioridad para sort (menor = más urgente)
const PRIORITY_ORDER: Record<string, number> = {
  Vencida: 0,
  Urgente: 1,
  'Próxima': 2,
  Normal: 3,
}

export default function SolicitudesPage() {
  const router = useRouter()
  const { role, userProjects, loading: authLoading } = useAuth()
  const { allProjects, loading: projectsLoading } = useProjects()

  // PM default filter
  const [initialFilterApplied, setInitialFilterApplied] = useState(false)
  const defaultProjectId = useMemo(() => {
    if (role === 'pm' && userProjects.length > 0) return userProjects[0].id
    return null
  }, [role, userProjects])

  const {
    solicitudes,
    filters,
    setFilters,
    listLoading,
    listError,
  } = useSolicitudes(
    defaultProjectId ? { projectId: defaultProjectId } : undefined,
  )

  useEffect(() => {
    if (!authLoading && !initialFilterApplied && role === 'pm' && defaultProjectId) {
      setFilters({ projectId: defaultProjectId })
      setInitialFilterApplied(true)
    } else if (!authLoading && !initialFilterApplied) {
      setInitialFilterApplied(true)
    }
  }, [authLoading, role, defaultProjectId, initialFilterApplied, setFilters])

  // Búsqueda local (debounced)
  const [searchInput, setSearchInput] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ search: searchInput })
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput, setFilters])

  // Fecha seleccionada en MiniCalendar (filtro client-side)
  const [dateFilter, setDateFilter] = useState<string | null>(null)

  // Opciones de proyectos
  const projectOptions: SelectOption[] = useMemo(
    () => allProjects.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` })),
    [allProjects],
  )

  // Nombre del proyecto filtrado (para chip)
  const projectName = useMemo(
    () => allProjects.find((p) => p.id === filters.projectId),
    [allProjects, filters.projectId],
  )

  // Solicitudes filtradas por prioridad viva (client-side, sin dateFilter)
  const priorityFilteredSolicitudes = useMemo(() => {
    if (filters.priorities.length === 0) return solicitudes
    return solicitudes.filter((s) =>
      filters.priorities.includes(calculatePriority(s.date_required))
    )
  }, [solicitudes, filters.priorities])

  // Para la tabla: prioridad + fecha calendario
  const displayedSolicitudes = useMemo(() => {
    if (!dateFilter) return priorityFilteredSolicitudes
    return priorityFilteredSolicitudes.filter((s) => s.date_required === dateFilter)
  }, [priorityFilteredSolicitudes, dateFilter])

  // calendarItems para MiniCalendar (respeta filtro de prioridad)
  const calendarItems = useMemo<CalendarItem[]>(() => {
    return priorityFilteredSolicitudes.map((s) => ({
      id: s.id,
      date: s.date_required,
      label: s.request_id ?? '—',
      status: s.status,
      badgeVariant: 'status' as const,
      subtitle: `${s.requester?.name ?? '—'} · ${s.lines?.length ?? 0} líneas${s.lines?.some((l: { notes?: string | null }) => l.notes) ? ' 📝' : ''}`,
      href: `/solicitudes/${s.id}`,
    }))
  }, [priorityFilteredSolicitudes])

  // --- Chips de filtros activos ---
  const filterChips = useMemo<FilterChip[]>(() => {
    const chips: FilterChip[] = []
    if (filters.projectId && projectName) {
      chips.push({
        key: 'project',
        label: projectName.code,
        onRemove: () => setFilters({ projectId: null }),
      })
    }
    if (filters.statuses.length > 0) {
      for (const s of filters.statuses) {
        chips.push({
          key: `status-${s}`,
          label: s,
          onRemove: () =>
            setFilters({ statuses: filters.statuses.filter((x) => x !== s) }),
        })
      }
    }
    if (filters.priorities.length > 0) {
      for (const p of filters.priorities) {
        chips.push({
          key: `priority-${p}`,
          label: p,
          onRemove: () =>
            setFilters({ priorities: filters.priorities.filter((x) => x !== p) }),
        })
      }
    }
    if (dateFilter) {
      const d = new Date(dateFilter + 'T00:00:00')
      chips.push({
        key: 'date',
        label: d.toLocaleDateString('es-PA', { day: 'numeric', month: 'short' }),
        onRemove: () => setDateFilter(null),
      })
    }
    if (filters.dateFrom) {
      chips.push({
        key: 'dateFrom',
        label: `Desde ${formatDate(filters.dateFrom)}`,
        onRemove: () => setFilters({ dateFrom: null }),
      })
    }
    if (filters.dateTo) {
      chips.push({
        key: 'dateTo',
        label: `Hasta ${formatDate(filters.dateTo)}`,
        onRemove: () => setFilters({ dateTo: null }),
      })
    }
    if (filters.search) {
      chips.push({
        key: 'search',
        label: `"${filters.search}"`,
        onRemove: () => { setFilters({ search: '' }); setSearchInput('') },
      })
    }
    return chips
  }, [filters, projectName, dateFilter, setFilters])

  const clearAllFilters = useCallback(() => {
    setFilters({
      projectId: null,
      statuses: [],
      priorities: [],
      dateFrom: null,
      dateTo: null,
      search: '',
      requesterId: null,
    })
    setSearchInput('')
    setDateFilter(null)
  }, [setFilters])

  // Toggle helpers
  const toggleStatus = useCallback(
    (status: string) => {
      const current = filters.statuses
      if (current.includes(status)) {
        setFilters({ statuses: current.filter((s) => s !== status) })
      } else {
        setFilters({ statuses: [...current, status] })
      }
    },
    [filters.statuses, setFilters],
  )

  const togglePriority = useCallback(
    (priority: string) => {
      const current = filters.priorities
      if (current.includes(priority)) {
        setFilters({ priorities: current.filter((p) => p !== priority) })
      } else {
        setFilters({ priorities: [...current, priority] })
      }
    },
    [filters.priorities, setFilters],
  )

  const handleRowClick = useCallback(
    (row: SolicitudWithRelations) => {
      router.push(`/solicitudes/${row.id}`)
    },
    [router],
  )

  // Columnas — orden: ID, Proyecto, Solicitante, Líneas, Fecha Req., Estado, Prioridad, Vence
  const columns: Column<SolicitudWithRelations>[] = useMemo(
    () => [
      {
        key: 'request_id',
        header: 'ID',
        sortable: true,
        className: 'w-[160px]',
        render: (row) => (
          <a
            href={`/solicitudes/${row.id}`}
            onClick={(e) => { e.stopPropagation(); router.push(`/solicitudes/${row.id}`) }}
            className="font-mono text-sm font-medium text-navy hover:underline"
          >
            {row.request_id ?? '—'}
          </a>
        ),
        sortValue: (row) => row.request_id ?? '',
      },
      {
        key: 'project',
        header: 'Proyecto',
        sortable: true,
        render: (row) =>
          row.project ? (
            <span className="text-sm text-gray-900">
              <span className="font-medium">{row.project.code}</span>
              <span className="text-iconsa-gray"> — {row.project.name}</span>
            </span>
          ) : (
            <span className="text-sm text-iconsa-gray">—</span>
          ),
        sortValue: (row) => row.project?.code ?? '',
      },
      {
        key: 'requester',
        header: 'Solicitante',
        sortable: true,
        render: (row) => (
          <span className="text-sm text-gray-900">{row.requester?.name ?? '—'}</span>
        ),
        sortValue: (row) => row.requester?.name ?? '',
      },
      {
        key: 'lines',
        header: 'Líneas',
        className: 'w-[80px] text-center',
        render: (row) => (
          <span className="text-sm text-gray-900">{row.lines?.length ?? 0}</span>
        ),
      },
      {
        key: 'date_required',
        header: 'Fecha Req.',
        sortable: true,
        className: 'w-[120px]',
        render: (row) => (
          <span className="text-sm text-gray-900">{formatDate(row.date_required)}</span>
        ),
        sortValue: (row) => row.date_required,
      },
      {
        key: 'status',
        header: 'Estado',
        sortable: true,
        className: 'w-[130px]',
        render: (row) => <Badge label={row.status} variant="status" />,
        sortValue: (row) => row.status,
      },
      {
        key: 'priority',
        header: 'Prioridad',
        sortable: true,
        className: 'w-[110px]',
        render: (row) => {
          const livePriority = calculatePriority(row.date_required)
          return <Badge label={livePriority} variant="priority" />
        },
        sortValue: (row) => PRIORITY_ORDER[calculatePriority(row.date_required)] ?? 3,
      },
      {
        key: 'days',
        header: 'Vence',
        sortable: true,
        className: 'w-[70px] text-center',
        render: (row) => {
          const days = daysUntilDue(row.date_required)
          return (
            <span className={`font-mono text-xs font-semibold ${daysUntilDueColor(days)}`}>
              {formatDaysUntilDue(row.date_required)}
            </span>
          )
        },
        sortValue: (row) => daysUntilDue(row.date_required),
      },
    ],
    [],
  )

  const mobileRender = useCallback(
    (row: SolicitudWithRelations) => (
      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2 active:bg-gray-50">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-sm font-bold text-navy">{row.request_id ?? '—'}</span>
          <Badge label={calculatePriority(row.date_required)} variant="priority" />
        </div>
        <div className="text-sm text-gray-900">
          {row.project ? (
            <>
              <span className="font-medium">{row.project.code}</span>
              <span className="text-iconsa-gray"> — {row.project.name}</span>
            </>
          ) : '—'}
        </div>
        <div className="flex items-center justify-between gap-2 text-sm text-iconsa-gray">
          <span>{row.requester?.name ?? '—'}</span>
          <span>{formatDate(row.date_required)}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <Badge label={row.status} variant="status" />
          <span className="text-xs text-iconsa-gray">
            {row.lines?.length ?? 0} {(row.lines?.length ?? 0) === 1 ? 'linea' : 'lineas'}
          </span>
        </div>
      </div>
    ),
    [],
  )

  const isLoading = authLoading || listLoading

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-navy">Solicitudes de Movilización</h1>
        {canCreateSolicitud(role) && (
          <Button onClick={() => router.push('/solicitudes/nueva')} className="shrink-0">
            <Plus className="h-4 w-4" />
            Nueva Solicitud
          </Button>
        )}
      </div>

      {/* FilterBar */}
      <FilterBar chips={filterChips} onClearAll={clearAllFilters}>
        <div className="w-full sm:w-56">
          <Select
            placeholder="Proyecto"
            options={projectOptions}
            value={filters.projectId}
            onChange={(val) => setFilters({ projectId: val })}
            disabled={projectsLoading}
          />
        </div>
        <div className="relative w-full sm:w-48">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por ID..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-8 pr-3 text-sm placeholder:text-gray-400 focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-iconsa-gray whitespace-nowrap">Desde</span>
          <input
            type="date"
            title="Fecha desde"
            value={filters.dateFrom ?? ''}
            onChange={(e) => setFilters({ dateFrom: e.target.value || null })}
            className="rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue"
          />
          <span className="text-xs font-medium text-iconsa-gray whitespace-nowrap">Hasta</span>
          <input
            type="date"
            title="Fecha hasta"
            value={filters.dateTo ?? ''}
            onChange={(e) => setFilters({ dateTo: e.target.value || null })}
            className="rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue"
          />
        </div>
      </FilterBar>

      {/* Badges: Estado + Prioridad */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-iconsa-gray">Estado:</span>
          {REQUEST_STATUSES.map((status) => {
            const isActive = filters.statuses.includes(status)
            return (
              <button
                key={status}
                type="button"
                aria-label={`Filtrar por estado ${status}`}
                onClick={() => toggleStatus(status)}
                className={`transition-all ${
                  isActive ? 'ring-2 ring-navy ring-offset-1' : 'opacity-50 hover:opacity-80'
                }`}
              >
                <Badge label={status} variant="status" />
              </button>
            )
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-iconsa-gray">Prioridad:</span>
          {PRIORITIES.map((priority) => {
            const isActive = filters.priorities.includes(priority)
            return (
              <button
                key={priority}
                type="button"
                aria-label={`Filtrar por prioridad ${priority}`}
                onClick={() => togglePriority(priority)}
                className={`transition-all ${
                  isActive ? 'ring-2 ring-navy ring-offset-1' : 'opacity-50 hover:opacity-80'
                }`}
              >
                <Badge label={priority} variant="priority" />
              </button>
            )
          })}
        </div>
      </div>

      {/* MiniCalendar */}
      <MiniCalendar
        items={calendarItems}
        selectedDate={dateFilter}
        onSelectDate={setDateFilter}
      />

      {/* Error */}
      {listError && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-iconsa-red">
          Error al cargar solicitudes: {listError}
        </div>
      )}

      {/* Tabla */}
      <DataTable<SolicitudWithRelations>
        columns={columns}
        data={displayedSolicitudes}
        keyExtractor={(row) => row.id}
        loading={isLoading}
        emptyMessage="No hay solicitudes que mostrar"
        mobileRender={mobileRender}
        expandRender={(row) => {
          const lines = row.lines ?? []
          if (lines.length === 0) return <p className="text-sm text-iconsa-gray">Sin líneas</p>
          return (
            <div className="space-y-1.5">
              {lines.map((line) => {
                const fromName = line.from_location?.name ?? line.from_text ?? '—'
                const toName = line.to_location?.name ?? line.to_text ?? '—'
                const unitName = line.unit?.code ?? line.unit_text ?? ''
                const isEquipo = line.line_type === 'Equipo'
                return (
                  <div key={line.id} className="flex items-center gap-2 text-sm">
                    {isEquipo ? (
                      <Wrench className="h-3.5 w-3.5 shrink-0 text-iconsa-blue" />
                    ) : (
                      <Package className="h-3.5 w-3.5 shrink-0 text-gold" />
                    )}
                    <span className="min-w-0 max-w-[200px] truncate font-medium text-gray-900" title={line.description}>
                      {line.description}
                    </span>
                    <span className="flex items-center gap-1 text-iconsa-gray">
                      <span className="max-w-[100px] truncate">{fromName}</span>
                      <ArrowRight className="h-3 w-3 shrink-0 text-gray-400" />
                      <span className="max-w-[100px] truncate">{toName}</span>
                    </span>
                    <span className="shrink-0 text-gray-600">{line.quantity} {unitName}</span>
                    <Badge label={line.status} variant="line" />
                    {line.notes && (
                      <span className="max-w-[150px] truncate text-xs italic text-amber-600" title={line.notes}>
                        {line.notes}
                      </span>
                    )}
                  </div>
                )
              })}
              <a
                href={`/solicitudes/${row.id}`}
                onClick={(e) => { e.stopPropagation(); router.push(`/solicitudes/${row.id}`) }}
                className="mt-1 inline-block text-xs font-medium text-iconsa-blue hover:underline"
              >
                Ver detalle completo
              </a>
            </div>
          )
        }}
      />
    </div>
  )
}
