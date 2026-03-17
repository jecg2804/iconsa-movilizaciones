'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react'

export interface Column<T> {
  key: string
  header: string
  sortable?: boolean
  className?: string
  render: (row: T) => React.ReactNode
  sortValue?: (row: T) => string | number | Date
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (row: T) => string
  emptyMessage?: string
  onRowClick?: (row: T) => void
  loading?: boolean
  className?: string
  mobileRender?: (row: T) => React.ReactNode
  /** Función opcional para aplicar clases CSS condicionales a cada fila */
  rowClassName?: (row: T) => string
  /** Contenido expandible debajo de cada fila. Si se provee, click en fila togglea expansión. */
  expandRender?: (row: T) => React.ReactNode
  /** Controlled: keys expandidas (si se pasa, DataTable no maneja su propio state) */
  expandedKeys?: Set<string>
  /** Controlled: callback cuando cambian las keys expandidas */
  onExpandedKeysChange?: (keys: Set<string>) => void

  /** Modo de paginación. Default: 'none'.
   *  'client' = DataTable pagina internamente
   *  'server' = parent controla la data por página */
  pagination?: 'none' | 'client' | 'server'
  /** Filas por página. Default: 20 */
  pageSize?: number
  /** Opciones de page size para el selector. Default: [10, 20, 50] */
  pageSizeOptions?: number[]
  /** Total de registros (para calcular páginas). Solo server mode. */
  totalCount?: number
  /** Página actual (0-indexed). Solo server mode. */
  currentPage?: number
  /** Callback cuando cambia la página. Solo server mode. */
  onPageChange?: (page: number) => void
  /** Callback cuando cambia el page size. Solo server mode. */
  onPageSizeChange?: (size: number) => void
}

type SortDirection = 'asc' | 'desc'

function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'No hay datos para mostrar',
  onRowClick,
  loading = false,
  className = '',
  mobileRender,
  rowClassName,
  expandRender,
  expandedKeys: controlledExpandedKeys,
  onExpandedKeysChange,
  pagination = 'none',
  pageSize = 20,
  pageSizeOptions = [10, 20, 50],
  totalCount,
  currentPage,
  onPageChange,
  onPageSizeChange,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [internalExpandedKeys, setInternalExpandedKeys] = useState<Set<string>>(new Set())

  // --- Pagination internal state (client mode) ---
  const [clientPage, setClientPage] = useState(0)
  const [internalPageSize, setInternalPageSize] = useState(pageSize)

  // Resetear página client cuando data cambia (filtros aplicados)
  useEffect(() => {
    setClientPage(0)
  }, [data.length])

  // Controlled vs uncontrolled expand state
  const isControlled = controlledExpandedKeys !== undefined
  const expandedKeys = isControlled ? controlledExpandedKeys : internalExpandedKeys
  const setExpandedKeys = isControlled ? (onExpandedKeysChange ?? setInternalExpandedKeys) : setInternalExpandedKeys

  const handleSort = useCallback(
    (columnKey: string) => {
      if (sortKey === columnKey) {
        if (sortDirection === 'asc') {
          setSortDirection('desc')
        } else {
          // Tercer click: quitar sort
          setSortKey(null)
          setSortDirection('asc')
        }
      } else {
        setSortKey(columnKey)
        setSortDirection('asc')
      }
    },
    [sortKey, sortDirection],
  )

  const toggleExpand = useCallback(
    (key: string) => {
      const next = new Set(expandedKeys)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      setExpandedKeys(next)
    },
    [expandedKeys, setExpandedKeys],
  )

  const sortedData = useMemo(() => {
    if (!sortKey) return data

    const column = columns.find((col) => col.key === sortKey)
    if (!column) return data

    const sorted = [...data].sort((a, b) => {
      let aVal: string | number | Date
      let bVal: string | number | Date

      if (column.sortValue) {
        aVal = column.sortValue(a)
        bVal = column.sortValue(b)
      } else {
        // Intentar extraer texto del resultado de render
        const aRender = column.render(a)
        const bRender = column.render(b)
        aVal = typeof aRender === 'string' || typeof aRender === 'number' ? aRender : String(aRender ?? '')
        bVal = typeof bRender === 'string' || typeof bRender === 'number' ? bRender : String(bRender ?? '')
      }

      // Comparacion
      if (aVal instanceof Date && bVal instanceof Date) {
        return aVal.getTime() - bVal.getTime()
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return aVal - bVal
      }
      return String(aVal).localeCompare(String(bVal), 'es')
    })

    return sortDirection === 'desc' ? sorted.reverse() : sorted
  }, [data, sortKey, sortDirection, columns])

  // --- Paginación ---
  const paginatedData = useMemo(() => {
    if (pagination === 'none') return sortedData
    if (pagination === 'client') {
      const start = clientPage * internalPageSize
      return sortedData.slice(start, start + internalPageSize)
    }
    // server: data ya viene paginada del parent
    return sortedData
  }, [sortedData, pagination, clientPage, internalPageSize])

  const total = pagination === 'server' ? (totalCount ?? data.length) : data.length
  const activePage = pagination === 'server' ? (currentPage ?? 0) : clientPage
  const activePageSize = pagination === 'server' ? pageSize : internalPageSize
  const totalPages = Math.ceil(total / activePageSize)

  const handlePageChange = useCallback(
    (newPage: number) => {
      if (pagination === 'server') {
        onPageChange?.(newPage)
      } else {
        setClientPage(newPage)
      }
    },
    [pagination, onPageChange],
  )

  const handlePageSizeChange = useCallback(
    (newSize: number) => {
      if (pagination === 'server') {
        onPageSizeChange?.(newSize)
        onPageChange?.(0)
      } else {
        setInternalPageSize(newSize)
        setClientPage(0)
      }
    },
    [pagination, onPageSizeChange, onPageChange],
  )

  // Estado de carga
  if (loading) {
    return (
      <div className={`flex items-center justify-center py-16 ${className}`}>
        <Loader2 className="h-8 w-8 animate-spin text-iconsa-gray" />
      </div>
    )
  }

  // Sin datos
  if (data.length === 0) {
    return (
      <div className={`flex items-center justify-center py-16 ${className}`}>
        <p className="text-sm text-iconsa-gray">{emptyMessage}</p>
      </div>
    )
  }

  const renderSortIcon = (column: Column<T>) => {
    if (!column.sortable) return null

    if (sortKey !== column.key) {
      return <ArrowUpDown className="ml-1 inline h-3.5 w-3.5 text-gray-400" />
    }

    return sortDirection === 'asc' ? (
      <ArrowUp className="ml-1 inline h-3.5 w-3.5 text-iconsa-blue" />
    ) : (
      <ArrowDown className="ml-1 inline h-3.5 w-3.5 text-iconsa-blue" />
    )
  }

  // --- Pagination UI component ---
  const paginationUI = pagination !== 'none' && totalPages > 1 && (
    <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 text-sm">
      <span className="text-gray-500">
        {activePage * activePageSize + 1}–{Math.min((activePage + 1) * activePageSize, total)} de {total}
      </span>

      <div className="flex items-center gap-2">
        <span className="text-gray-500 text-xs hidden sm:inline">Filas:</span>
        <select
          title="Filas por página"
          value={activePageSize}
          onChange={(e) => handlePageSizeChange(Number(e.target.value))}
          className="rounded border border-gray-200 px-2 py-1 text-xs"
        >
          {pageSizeOptions.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          title="Página anterior"
          onClick={() => handlePageChange(activePage - 1)}
          disabled={activePage === 0}
          className="rounded px-2 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-gray-700 px-2">
          {activePage + 1} / {totalPages}
        </span>
        <button
          type="button"
          title="Página siguiente"
          onClick={() => handlePageChange(activePage + 1)}
          disabled={activePage >= totalPages - 1}
          className="rounded px-2 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )

  return (
    <div className={className}>
      {/* Vista desktop */}
      <div className="hidden md:block">
        <div className="overflow-hidden rounded-xl ring-1 ring-gray-200">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {expandRender && <th className="w-8 px-2 py-3"><span className="sr-only">Expandir</span></th>}
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-iconsa-gray ${
                      column.sortable ? 'cursor-pointer select-none hover:text-navy' : ''
                    } ${column.className ?? ''}`}
                    onClick={column.sortable ? () => handleSort(column.key) : undefined}
                  >
                    <span className="inline-flex items-center">
                      {column.header}
                      {renderSortIcon(column)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedData.map((row) => {
                const rowKey = keyExtractor(row)
                const isExpanded = expandedKeys.has(rowKey)
                const handleRowClick = expandRender
                  ? () => toggleExpand(rowKey)
                  : onRowClick
                    ? () => onRowClick(row)
                    : undefined
                const colCount = columns.length + (expandRender ? 1 : 0)

                return (
                  <React.Fragment key={rowKey}>
                    <tr
                      onClick={handleRowClick}
                      className={`bg-white transition-colors ${
                        handleRowClick ? 'cursor-pointer hover:bg-gray-50' : ''
                      } ${rowClassName ? rowClassName(row) : ''}`}
                    >
                      {expandRender && (
                        <td className="w-8 px-2 py-3">
                          <ChevronRight
                            className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                          />
                        </td>
                      )}
                      {columns.map((column) => (
                        <td
                          key={column.key}
                          className={`px-4 py-3 ${column.className ?? ''}`}
                        >
                          {column.render(row)}
                        </td>
                      ))}
                    </tr>
                    {isExpanded && expandRender && (
                      <tr>
                        <td colSpan={colCount} className="border-t-0 bg-gray-50 px-6 py-3">
                          {expandRender(row)}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
          {paginationUI}
        </div>
      </div>

      {/* Vista mobile */}
      <div className="flex flex-col gap-3 md:hidden">
        {paginatedData.map((row) => {
          const key = keyExtractor(row)
          const isExpanded = expandedKeys.has(key)
          const handleMobileClick = expandRender
            ? () => toggleExpand(key)
            : onRowClick
              ? () => onRowClick(row)
              : undefined

          if (mobileRender) {
            return (
              <div key={key}>
                <div
                  onClick={handleMobileClick}
                  className={`${handleMobileClick ? 'cursor-pointer' : ''} ${rowClassName ? rowClassName(row) : ''}`}
                >
                  {mobileRender(row)}
                </div>
                {isExpanded && expandRender && (
                  <div className="rounded-b-xl border border-t-0 border-gray-200 bg-gray-50 px-4 py-3">
                    {expandRender(row)}
                  </div>
                )}
              </div>
            )
          }

          // Vista mobile por defecto: tarjeta con columnas apiladas
          return (
            <div key={key}>
              <div
                onClick={handleMobileClick}
                className={`rounded-xl border border-gray-200 bg-white p-4 ${
                  handleMobileClick ? 'cursor-pointer hover:bg-gray-50' : ''
                } ${rowClassName ? rowClassName(row) : ''} ${isExpanded ? 'rounded-b-none' : ''}`}
              >
                <div className="space-y-2">
                  {columns.map((column) => (
                    <div key={column.key} className="flex items-start justify-between gap-2">
                      <span className="shrink-0 text-xs font-medium text-iconsa-gray">
                        {column.header}
                      </span>
                      <span className="text-right text-sm text-gray-900">
                        {column.render(row)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              {isExpanded && expandRender && (
                <div className="rounded-b-xl border border-t-0 border-gray-200 bg-gray-50 px-4 py-3">
                  {expandRender(row)}
                </div>
              )}
            </div>
          )
        })}
        {/* Paginación mobile — debajo de las cards */}
        {paginationUI}
      </div>
    </div>
  )
}

export { DataTable }
