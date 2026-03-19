'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Wrench, Package, ArrowRight, Paperclip, ChevronsDownUp, ChevronsUpDown } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useProjects } from '@/hooks/useProjects'
import { useSolicitudes, type SolicitudWithRelations } from '@/hooks/useSolicitudes'
import { canCreateSolicitud } from '@/lib/utils/roles'
import { formatDate, formatQty, daysUntilDue, formatDaysUntilDue, daysUntilDueColor, formatCompletionDelta } from '@/lib/utils/format'
import { REQUEST_STATUSES } from '@/lib/utils/constants'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select, type SelectOption } from '@/components/ui/Select'
import { MiniCalendar, type CalendarItem } from '@/components/ui/MiniCalendar'
import { FilterBar, type FilterChip } from '@/components/ui/FilterBar'

type DateFilter =
  | { type: 'single'; date: string }
  | { type: 'range'; from: string | null; to: string | null }
  | null

export default function SolicitudesPage() {
  const router = useRouter()
  const { role, loading: authLoading } = useAuth()
  const { allProjects, loading: projectsLoading } = useProjects()

  const {
    solicitudes,
    filters,
    setFilters,
    listLoading,
    listError,
    totalCount,
  } = useSolicitudes()

  // --- Control de expandir/colapsar (controlled state) ---
  const [solExpandedKeys, setSolExpandedKeys] = useState<Set<string>>(new Set())
  const [expandInitialized, setExpandInitialized] = useState(false)

  // Búsqueda local (debounced)
  const [searchInput, setSearchInput] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ search: searchInput, page: 0 })
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput, setFilters])

  // Fecha: filtro client-side para no vaciar el calendario al seleccionar un día
  const [dateFilter, setDateFilter] = useState<DateFilter>(null)
  const calendarDate = dateFilter?.type === 'single' ? dateFilter.date : null
  const setCalendarDate = useCallback((date: string | null) => {
    if (!date) { setDateFilter(null); return }
    setDateFilter((prev) => {
      if (prev?.type === 'single' && prev.date === date) return null
      return { type: 'single', date }
    })
  }, [])

  // Inicializar expandido al cargar datos
  useEffect(() => {
    if (!expandInitialized && solicitudes.length > 0) {
      setSolExpandedKeys(new Set(solicitudes.map((s) => s.id)))
      setExpandInitialized(true)
    }
  }, [expandInitialized, solicitudes])

  const allSolExpanded = solExpandedKeys.size > 0

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

  // calendarItems para MiniCalendar
  const calendarItems = useMemo<CalendarItem[]>(() => {
    return solicitudes.map((s) => ({
      id: s.id,
      date: s.date_required,
      label: s.request_id ?? '—',
      status: s.status,
      badgeVariant: 'status' as const,
      subtitle: `${s.requester?.name ?? '—'} · ${s.lines?.length ?? 0} líneas${s.lines?.some((l: { notes?: string | null }) => l.notes) ? ' 📝' : ''}`,
      href: `/solicitudes/${s.id}`,
    }))
  }, [solicitudes])

  // Solicitudes filtradas por fecha (client-side) — la tabla usa esto, el calendario usa solicitudes sin filtro
  const displayedSolicitudes = useMemo(() => {
    if (!dateFilter) return solicitudes
    if (dateFilter.type === 'single') {
      return solicitudes.filter((s) => s.date_required === dateFilter.date)
    }
    let result = solicitudes
    if (dateFilter.from) result = result.filter((s) => s.date_required >= dateFilter.from!)
    if (dateFilter.to) result = result.filter((s) => s.date_required <= dateFilter.to!)
    return result
  }, [solicitudes, dateFilter])

  // --- Chips de filtros activos ---
  const filterChips = useMemo<FilterChip[]>(() => {
    const chips: FilterChip[] = []
    if (filters.projectId && projectName) {
      chips.push({
        key: 'project',
        label: projectName.code,
        onRemove: () => setFilters({ projectId: null, page: 0 }),
      })
    }
    if (filters.statuses.length > 0) {
      for (const s of filters.statuses) {
        chips.push({
          key: `status-${s}`,
          label: s,
          onRemove: () =>
            setFilters({ statuses: filters.statuses.filter((x) => x !== s), page: 0 }),
        })
      }
    }
    if (dateFilter?.type === 'single') {
      const d = new Date(dateFilter.date + 'T00:00:00')
      chips.push({
        key: 'date',
        label: d.toLocaleDateString('es-PA', { day: 'numeric', month: 'short' }),
        onRemove: () => setDateFilter(null),
      })
    } else if (dateFilter?.type === 'range') {
      if (dateFilter.from) {
        chips.push({
          key: 'dateFrom',
          label: `Desde ${formatDate(dateFilter.from)}`,
          onRemove: () => setDateFilter((prev) => prev?.type === 'range' ? { ...prev, from: null } : null),
        })
      }
      if (dateFilter.to) {
        chips.push({
          key: 'dateTo',
          label: `Hasta ${formatDate(dateFilter.to)}`,
          onRemove: () => setDateFilter((prev) => prev?.type === 'range' ? { ...prev, to: null } : null),
        })
      }
    }
    if (filters.search) {
      chips.push({
        key: 'search',
        label: `"${filters.search}"`,
        onRemove: () => { setFilters({ search: '', page: 0 }); setSearchInput('') },
      })
    }
    return chips
  }, [filters, projectName, dateFilter, setFilters])

  const clearAllFilters = useCallback(() => {
    setDateFilter(null)
    setFilters({
      projectId: null,
      statuses: [],
      priorities: [],
      search: '',
      requesterId: null,
      page: 0,
    })
    setSearchInput('')
  }, [setFilters])

  // Toggle helpers
  const toggleStatus = useCallback(
    (status: string) => {
      const current = filters.statuses
      if (current.includes(status)) {
        setFilters({ statuses: current.filter((s) => s !== status), page: 0 })
      } else {
        setFilters({ statuses: [...current, status], page: 0 })
      }
    },
    [filters.statuses, setFilters],
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
        render: (row) => {
          const hasAttachments = Array.isArray(row.attachments) && row.attachments.length > 0
          return (
            <span className="inline-flex items-center gap-1">
              <a
                href={`/solicitudes/${row.id}`}
                onClick={(e) => { e.stopPropagation(); router.push(`/solicitudes/${row.id}`) }}
                className="font-mono text-sm font-medium text-navy hover:underline"
              >
                {row.request_id ?? '—'}
              </a>
              {hasAttachments && (
                <span title="Tiene adjuntos"><Paperclip className="h-3.5 w-3.5 text-iconsa-gray" /></span>
              )}
            </span>
          )
        },
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
        key: 'date_submitted',
        header: 'Fecha Enviada',
        sortable: true,
        className: 'w-[120px]',
        render: (row) => (
          <span className="text-sm text-gray-900">{row.date_submitted ? formatDate(row.date_submitted) : '—'}</span>
        ),
        sortValue: (row) => row.date_submitted ?? '',
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
        key: 'days',
        header: 'Días',
        sortable: true,
        className: 'w-[80px] text-center',
        render: (row) => {
          if (row.status === 'Cancelada') {
            return <span className="font-mono text-xs text-gray-400">—</span>
          }
          if (row.status === 'Completada' && row.date_completed) {
            const delta = formatCompletionDelta(row.date_required, row.date_completed)
            return <span className={`font-mono text-xs font-semibold ${delta.color}`}>{delta.text}</span>
          }
          const days = daysUntilDue(row.date_required)
          return (
            <span className={`font-mono text-xs font-semibold ${daysUntilDueColor(days)}`}>
              {formatDaysUntilDue(row.date_required)}
            </span>
          )
        },
        sortValue: (row) => {
          if (row.status === 'Cancelada') return 9999
          if (row.status === 'Completada' && row.date_completed) {
            const completedFull = new Date(row.date_completed)
            const completed = new Date(completedFull.getFullYear(), completedFull.getMonth(), completedFull.getDate())
            const required = new Date(row.date_required + 'T00:00:00')
            return required.getTime() - completed.getTime()
          }
          return daysUntilDue(row.date_required)
        },
      },
    ],
    [],
  )

  const mobileRender = useCallback(
    (row: SolicitudWithRelations) => (
      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2 active:bg-gray-50">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1">
            <span className="font-mono text-sm font-bold text-navy">{row.request_id ?? '—'}</span>
            {Array.isArray(row.attachments) && row.attachments.length > 0 && (
              <Paperclip className="h-3.5 w-3.5 text-iconsa-gray" />
            )}
          </span>
          <Badge label={row.status} variant="status" />
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
        {row.date_submitted && (
          <div className="text-xs text-iconsa-gray">
            Enviada: {formatDate(row.date_submitted)}
          </div>
        )}
        <div className="flex items-center justify-between gap-2 text-xs text-iconsa-gray">
          <span>{row.lines?.length ?? 0} {(row.lines?.length ?? 0) === 1 ? 'línea' : 'líneas'}</span>
          {row.status !== 'Cancelada' && (
            <span className={`font-mono font-semibold ${
              row.status === 'Completada' && row.date_completed
                ? formatCompletionDelta(row.date_required, row.date_completed).color
                : daysUntilDueColor(daysUntilDue(row.date_required))
            }`}>
              {row.status === 'Completada' && row.date_completed
                ? formatCompletionDelta(row.date_required, row.date_completed).text
                : formatDaysUntilDue(row.date_required)}
            </span>
          )}
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
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-navy">Solicitudes de Movilización</h1>
          {solicitudes.length > 0 && (
            <button
              type="button"
              onClick={() => setSolExpandedKeys((prev) =>
                prev.size > 0 ? new Set() : new Set(solicitudes.map((s) => s.id))
              )}
              className="flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {allSolExpanded ? <ChevronsDownUp className="h-3.5 w-3.5" /> : <ChevronsUpDown className="h-3.5 w-3.5" />}
              {allSolExpanded ? 'Colapsar' : 'Expandir'}
            </button>
          )}
        </div>
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
            onChange={(val) => setFilters({ projectId: val, page: 0 })}
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
            value={(dateFilter?.type === 'range' ? dateFilter.from : null) ?? ''}
            onChange={(e) => {
              const from = e.target.value || null
              setDateFilter((prev) => ({ type: 'range', from, to: prev?.type === 'range' ? prev.to : null }))
            }}
            className="rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue"
          />
          <span className="text-xs font-medium text-iconsa-gray whitespace-nowrap">Hasta</span>
          <input
            type="date"
            title="Fecha hasta"
            value={(dateFilter?.type === 'range' ? dateFilter.to : null) ?? ''}
            onChange={(e) => {
              const to = e.target.value || null
              setDateFilter((prev) => ({ type: 'range', from: prev?.type === 'range' ? prev.from : null, to }))
            }}
            className="rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue"
          />
        </div>
      </FilterBar>

      {/* Badges: Estado */}
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

      {/* MiniCalendar */}
      <MiniCalendar
        items={calendarItems}
        selectedDate={calendarDate}
        onSelectDate={setCalendarDate}
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
        pagination="server"
        pageSize={filters.pageSize}
        totalCount={totalCount}
        currentPage={filters.page}
        onPageChange={(page) => setFilters({ page })}
        onPageSizeChange={(size) => setFilters({ pageSize: size, page: 0 })}
        expandedKeys={solExpandedKeys}
        onExpandedKeysChange={setSolExpandedKeys}
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
                    <span className="shrink-0 text-gray-600">{formatQty(line.quantity)} {unitName}</span>
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
