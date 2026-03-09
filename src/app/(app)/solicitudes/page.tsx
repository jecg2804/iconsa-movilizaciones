'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useProjects } from '@/hooks/useProjects'
import { useSolicitudes, type SolicitudWithRelations } from '@/hooks/useSolicitudes'
import { canCreateSolicitud } from '@/lib/utils/roles'
import { formatDate } from '@/lib/utils/format'
import { REQUEST_STATUSES, PRIORITIES } from '@/lib/utils/constants'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select, type SelectOption } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'

// Orden de prioridad para sort (menor = más urgente)
const PRIORITY_ORDER: Record<string, number> = {
  Vencida: 0,
  Urgente: 1,
  'Próxima': 2,
  Normal: 3,
}

export default function SolicitudesPage() {
  const router = useRouter()
  const { role, person, userProjects, loading: authLoading } = useAuth()
  const { allProjects, loading: projectsLoading } = useProjects()

  // Para PM: default filter = su primer proyecto asignado
  const [initialFilterApplied, setInitialFilterApplied] = useState(false)

  const defaultProjectId = useMemo(() => {
    if (role === 'pm' && userProjects.length > 0) {
      return userProjects[0].id
    }
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

  // Aplicar filtro inicial para PM una vez que carga auth
  useEffect(() => {
    if (!authLoading && !initialFilterApplied && role === 'pm' && defaultProjectId) {
      setFilters({ projectId: defaultProjectId })
      setInitialFilterApplied(true)
    } else if (!authLoading && !initialFilterApplied) {
      setInitialFilterApplied(true)
    }
  }, [authLoading, role, defaultProjectId, initialFilterApplied, setFilters])

  // Estado local para el campo de búsqueda (debounced)
  const [searchInput, setSearchInput] = useState('')

  // Debounce del campo de búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ search: searchInput })
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput, setFilters])

  // Opciones de proyectos para el dropdown
  const projectOptions: SelectOption[] = useMemo(
    () =>
      allProjects.map((p) => ({
        value: p.id,
        label: `${p.code} — ${p.name}`,
      })),
    [allProjects],
  )

  // Verificar si hay algun filtro activo
  const hasActiveFilters = useMemo(
    () =>
      filters.projectId !== null ||
      filters.statuses.length > 0 ||
      filters.priorities.length > 0 ||
      filters.dateFrom !== null ||
      filters.dateTo !== null ||
      filters.search !== '',
    [filters],
  )

  // Limpiar todos los filtros
  const clearFilters = useCallback(() => {
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
  }, [setFilters])

  // Toggle de un status en el filtro
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

  // Toggle de una prioridad en el filtro
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

  // Navegar al detalle
  const handleRowClick = useCallback(
    (row: SolicitudWithRelations) => {
      router.push(`/solicitudes/${row.id}`)
    },
    [router],
  )

  // Columnas de la tabla
  const columns: Column<SolicitudWithRelations>[] = useMemo(
    () => [
      {
        key: 'request_id',
        header: 'ID',
        sortable: true,
        className: 'w-[160px]',
        render: (row) => (
          <span className="font-mono text-sm font-medium text-navy">
            {row.request_id ?? '—'}
          </span>
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
          <span className="text-sm text-gray-900">
            {row.requester?.name ?? '—'}
          </span>
        ),
        sortValue: (row) => row.requester?.name ?? '',
      },
      {
        key: 'date_required',
        header: 'Fecha Req.',
        sortable: true,
        className: 'w-[120px]',
        render: (row) => (
          <span className="text-sm text-gray-900">
            {formatDate(row.date_required)}
          </span>
        ),
        sortValue: (row) => row.date_required,
      },
      {
        key: 'lines',
        header: 'Lineas',
        className: 'w-[80px] text-center',
        render: (row) => (
          <span className="text-sm text-gray-900">
            {row.lines?.length ?? 0}
          </span>
        ),
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
        render: (row) =>
          row.priority ? (
            <Badge label={row.priority} variant="priority" />
          ) : (
            <span className="text-sm text-iconsa-gray">—</span>
          ),
        sortValue: (row) => PRIORITY_ORDER[row.priority ?? 'Normal'] ?? 3,
      },
    ],
    [],
  )

  // Render mobile: tarjeta compacta para cada solicitud
  const mobileRender = useCallback(
    (row: SolicitudWithRelations) => (
      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2 active:bg-gray-50">
        {/* Fila 1: ID + Prioridad */}
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-sm font-bold text-navy">
            {row.request_id ?? '—'}
          </span>
          {row.priority && <Badge label={row.priority} variant="priority" />}
        </div>

        {/* Fila 2: Proyecto */}
        <div className="text-sm text-gray-900">
          {row.project ? (
            <>
              <span className="font-medium">{row.project.code}</span>
              <span className="text-iconsa-gray"> — {row.project.name}</span>
            </>
          ) : (
            '—'
          )}
        </div>

        {/* Fila 3: Solicitante + Fecha */}
        <div className="flex items-center justify-between gap-2 text-sm text-iconsa-gray">
          <span>{row.requester?.name ?? '—'}</span>
          <span>{formatDate(row.date_required)}</span>
        </div>

        {/* Fila 4: Estado + Lineas */}
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

  // Loading: auth o datos
  const isLoading = authLoading || listLoading

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-navy">
          Solicitudes de Movilizacion
        </h1>

        {canCreateSolicitud(role) && (
          <Button
            onClick={() => router.push('/solicitudes/nueva')}
            className="shrink-0"
          >
            <Plus className="h-4 w-4" />
            Nueva Solicitud
          </Button>
        )}
      </div>

      {/* Filtros */}
      <div className="space-y-3 rounded-xl bg-white p-4 ring-1 ring-gray-200">
        {/* Primera fila: Proyecto + Busqueda */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="w-full sm:w-72">
            <Select
              placeholder="Todos los proyectos"
              options={projectOptions}
              value={filters.projectId}
              onChange={(val) => setFilters({ projectId: val })}
              disabled={projectsLoading}
            />
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por ID..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm placeholder:text-gray-400 focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue"
            />
          </div>

          {/* Fechas */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-iconsa-gray">Desde</span>
            <Input
              type="date"
              value={filters.dateFrom ?? ''}
              onChange={(e) =>
                setFilters({ dateFrom: e.target.value || null })
              }
            />
            <span className="text-xs font-medium text-iconsa-gray">Hasta</span>
            <Input
              type="date"
              value={filters.dateTo ?? ''}
              onChange={(e) =>
                setFilters({ dateTo: e.target.value || null })
              }
            />
          </div>
        </div>

        {/* Segunda fila: Badges de estado + Limpiar */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-iconsa-gray">Estado:</span>
          {REQUEST_STATUSES.map((status) => {
            const isActive = filters.statuses.includes(status)
            return (
              <button
                key={status}
                type="button"
                onClick={() => toggleStatus(status)}
                className={`transition-all ${
                  isActive
                    ? 'ring-2 ring-navy ring-offset-1'
                    : 'opacity-50 hover:opacity-80'
                }`}
              >
                <Badge label={status} variant="status" />
              </button>
            )
          })}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-iconsa-gray hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Tercera fila: Badges de prioridad */}
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
                  isActive
                    ? 'ring-2 ring-navy ring-offset-1'
                    : 'opacity-50 hover:opacity-80'
                }`}
              >
                <Badge label={priority} variant="priority" />
              </button>
            )
          })}
        </div>
      </div>

      {/* Error */}
      {listError && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-iconsa-red">
          Error al cargar solicitudes: {listError}
        </div>
      )}

      {/* Tabla */}
      <DataTable<SolicitudWithRelations>
        columns={columns}
        data={solicitudes}
        keyExtractor={(row) => row.id}
        onRowClick={handleRowClick}
        loading={isLoading}
        emptyMessage="No hay solicitudes que mostrar"
        mobileRender={mobileRender}
      />
    </div>
  )
}
