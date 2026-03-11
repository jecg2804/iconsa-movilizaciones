'use client'

import { useState, useMemo, useCallback } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown, Loader2 } from 'lucide-react'

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
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

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

  return (
    <div className={className}>
      {/* Vista desktop */}
      <div className="hidden md:block">
        <div className="overflow-hidden rounded-xl ring-1 ring-gray-200">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
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
              {sortedData.map((row) => (
                <tr
                  key={keyExtractor(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`bg-white transition-colors ${
                    onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''
                  } ${rowClassName ? rowClassName(row) : ''}`}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-4 py-3 ${column.className ?? ''}`}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vista mobile */}
      <div className="flex flex-col gap-3 md:hidden">
        {sortedData.map((row) => {
          const key = keyExtractor(row)

          if (mobileRender) {
            return (
              <div
                key={key}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`${onRowClick ? 'cursor-pointer' : ''} ${rowClassName ? rowClassName(row) : ''}`}
              >
                {mobileRender(row)}
              </div>
            )
          }

          // Vista mobile por defecto: tarjeta con columnas apiladas
          return (
            <div
              key={key}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`rounded-xl border border-gray-200 bg-white p-4 ${
                onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''
              } ${rowClassName ? rowClassName(row) : ''}`}
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
          )
        })}
      </div>
    </div>
  )
}

export { DataTable }
