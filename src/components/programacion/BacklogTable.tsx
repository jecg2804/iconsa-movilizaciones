'use client'

import { Wrench, Package, ArrowRight, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils/format'
import type { BacklogLine } from '@/hooks/useTrips'

interface BacklogTableProps {
  lines: BacklogLine[]
  loading: boolean
  /** Si true, muestra checkboxes para seleccion multiple */
  selectable?: boolean
  selectedLineIds?: Set<string>
  onToggleSelect?: (lineId: string) => void
  onSelectAll?: (selected: boolean) => void
  /** Callback cuando se hace click en el ID de solicitud */
  onRequestClick?: (requestId: string) => void
}

/** Resuelve el nombre de origen de una linea de backlog */
function resolveFrom(line: BacklogLine): string {
  return line.from_location?.name ?? line.from_text ?? '—'
}

/** Resuelve el nombre de destino de una linea de backlog */
function resolveTo(line: BacklogLine): string {
  return line.to_location?.name ?? line.to_text ?? '—'
}

/** Resuelve la unidad de una linea de backlog */
function resolveUnit(line: BacklogLine): string {
  return line.unit?.code ?? line.unit_text ?? ''
}

function BacklogTable({
  lines,
  loading,
  selectable = false,
  selectedLineIds,
  onToggleSelect,
  onSelectAll,
  onRequestClick,
}: BacklogTableProps) {
  // Determinar si todas las lineas estan seleccionadas
  const allSelected =
    lines.length > 0 &&
    !!selectedLineIds &&
    lines.every((l) => selectedLineIds.has(l.id))

  const someSelected =
    !!selectedLineIds &&
    lines.some((l) => selectedLineIds.has(l.id)) &&
    !allSelected

  // --- Estado de carga ---
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-iconsa-gray">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span className="text-sm">Cargando backlog...</span>
      </div>
    )
  }

  // --- Estado vacio ---
  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-iconsa-gray">
        <Package className="h-8 w-8 mb-2 text-gray-300" />
        <p className="text-sm font-medium">No hay lineas pendientes</p>
        <p className="text-xs mt-1">El backlog esta al dia</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Header de seleccion (solo desktop, solo si selectable) */}
      {selectable && (
        <div className="hidden md:flex items-center gap-3 px-4 py-2 text-xs font-medium text-iconsa-gray uppercase tracking-wide">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected
              }}
              onChange={(e) => onSelectAll?.(e.target.checked)}
              className="rounded border-gray-300 text-navy focus:ring-navy"
            />
            <span>Seleccionar todo</span>
          </label>
        </div>
      )}

      {/* Lista de lineas */}
      {lines.map((line) => {
        const isSelected = selectedLineIds?.has(line.id) ?? false
        const isEquipo = line.line_type === 'Equipo'
        const fromName = resolveFrom(line)
        const toName = resolveTo(line)
        const unitCode = resolveUnit(line)
        const requestDisplayId = line.request.request_id ?? line.request_id.slice(0, 8)
        const priority = line.request.priority ?? 'Normal'

        return (
          <div
            key={line.id}
            className={`
              rounded-lg border bg-white transition-colors
              ${isSelected ? 'border-navy ring-1 ring-navy bg-navy/5' : 'border-gray-200 hover:bg-gray-50/50'}
            `}
          >
            {/* Desktop layout: visible a partir de md */}
            <div className="hidden md:flex items-center gap-3 px-4 py-3 text-sm">
              {/* Checkbox de seleccion */}
              {selectable && (
                <label className="shrink-0 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect?.(line.id)}
                    className="rounded border-gray-300 text-navy focus:ring-navy"
                  />
                </label>
              )}

              {/* Badge de prioridad */}
              <div className="shrink-0">
                <Badge variant="priority" label={priority} />
              </div>

              {/* Icono de tipo */}
              <span className="shrink-0" title={line.line_type}>
                {isEquipo ? (
                  <Wrench className="h-4 w-4 text-iconsa-blue" />
                ) : (
                  <Package className="h-4 w-4 text-gold" />
                )}
              </span>

              {/* Descripcion */}
              <span
                className="min-w-0 max-w-[200px] truncate font-medium text-gray-900"
                title={line.description}
              >
                {line.description}
              </span>

              {/* ID de solicitud */}
              <span
                className={`shrink-0 font-mono text-xs text-iconsa-gray ${onRequestClick ? 'cursor-pointer hover:text-iconsa-blue hover:underline' : ''}`}
                title={`Solicitud ${requestDisplayId}`}
                onClick={onRequestClick ? () => onRequestClick(line.request_id) : undefined}
              >
                {requestDisplayId}
              </span>

              {/* Codigo de proyecto */}
              <span className="shrink-0 text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                {line.request.project?.code ?? '—'}
              </span>

              {/* Ruta: desde → hasta */}
              <span className="flex min-w-0 items-center gap-1.5 text-iconsa-gray">
                <span className="max-w-[110px] truncate text-xs" title={fromName}>
                  {fromName}
                </span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                <span className="max-w-[110px] truncate text-xs" title={toName}>
                  {toName}
                </span>
              </span>

              {/* Cantidad + unidad */}
              <span className="shrink-0 whitespace-nowrap text-gray-700 text-xs ml-auto">
                {line.quantity} {unitCode}
              </span>

              {/* Fecha requerida */}
              <span className="shrink-0 whitespace-nowrap text-xs text-iconsa-gray">
                {formatDate(line.request.date_required)}
              </span>
            </div>

            {/* Mobile layout: visible hasta md */}
            <div className="flex flex-col gap-2 p-3 md:hidden">
              {/* Fila 1: checkbox + prioridad + tipo + descripcion */}
              <div className="flex items-start gap-2">
                {selectable && (
                  <label className="shrink-0 pt-0.5 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect?.(line.id)}
                      className="rounded border-gray-300 text-navy focus:ring-navy"
                    />
                  </label>
                )}
                <Badge variant="priority" label={priority} />
                {isEquipo ? (
                  <Wrench className="h-4 w-4 shrink-0 text-iconsa-blue mt-0.5" />
                ) : (
                  <Package className="h-4 w-4 shrink-0 text-gold mt-0.5" />
                )}
                <span className="min-w-0 truncate text-sm font-medium text-gray-900">
                  {line.description}
                </span>
              </div>

              {/* Fila 2: ID solicitud + proyecto */}
              <div className="flex items-center gap-2 text-xs">
                <span
                  className={`font-mono text-iconsa-gray ${onRequestClick ? 'cursor-pointer hover:text-iconsa-blue hover:underline' : ''}`}
                  onClick={onRequestClick ? () => onRequestClick(line.request_id) : undefined}
                >
                  {requestDisplayId}
                </span>
                <span className="text-gray-400">·</span>
                <span className="font-medium text-gray-600">
                  {line.request.project?.code ?? '—'}
                </span>
              </div>

              {/* Fila 3: ruta desde → hasta */}
              <div className="flex items-center gap-1.5 text-xs text-iconsa-gray">
                <span className="max-w-[130px] truncate">{fromName}</span>
                <ArrowRight className="h-3 w-3 shrink-0 text-gray-400" />
                <span className="max-w-[130px] truncate">{toName}</span>
              </div>

              {/* Fila 4: cantidad + fecha requerida */}
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>
                  {line.quantity} {unitCode}
                </span>
                <span className="text-iconsa-gray">
                  {formatDate(line.request.date_required)}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export { BacklogTable }
export type { BacklogTableProps }
