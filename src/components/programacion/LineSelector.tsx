'use client'

import { useCallback } from 'react'
import { Wrench, Package, ArrowRight, Plus, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { BacklogLine, AssignmentInput } from '@/hooks/useTrips'

interface LineSelectorProps {
  /** Lineas disponibles en el backlog (Pendiente) */
  backlogLines: BacklogLine[]
  /** Asignaciones actuales (lineas ya seleccionadas para este viaje) */
  currentAssignments: AssignmentInput[]
  /** Callback cuando cambian las asignaciones */
  onChange: (assignments: AssignmentInput[]) => void
  loading?: boolean
}

/** Calcula la cantidad disponible de una linea (cantidad total - ya programada) */
function getAvailableQty(line: BacklogLine): number {
  return Math.max(0, line.quantity - line.qty_scheduled)
}

/** Resuelve el nombre de origen de una linea */
function resolveFrom(line: BacklogLine): string {
  return line.from_location?.name ?? line.from_text ?? '—'
}

/** Resuelve el nombre de destino de una linea */
function resolveTo(line: BacklogLine): string {
  return line.to_location?.name ?? line.to_text ?? '—'
}

/** Resuelve la unidad de una linea */
function resolveUnit(line: BacklogLine): string {
  return line.unit?.code ?? line.unit_text ?? ''
}

function LineSelector({
  backlogLines,
  currentAssignments,
  onChange,
  loading = false,
}: LineSelectorProps) {
  // IDs de las lineas ya seleccionadas para filtrarlas del backlog disponible
  const assignedLineIds = new Set(currentAssignments.map((a) => a.request_line_id))

  // Lineas disponibles = las que aun no estan en las asignaciones actuales
  const availableLines = backlogLines.filter((l) => !assignedLineIds.has(l.id))

  // --- Agregar una linea al viaje ---
  const handleAdd = useCallback(
    (line: BacklogLine) => {
      const availableQty = getAvailableQty(line)
      const newAssignment: AssignmentInput = {
        request_line_id: line.id,
        quantity_assigned: availableQty > 0 ? availableQty : line.quantity,
      }
      onChange([...currentAssignments, newAssignment])
    },
    [currentAssignments, onChange],
  )

  // --- Quitar una linea del viaje ---
  const handleRemove = useCallback(
    (lineId: string) => {
      onChange(currentAssignments.filter((a) => a.request_line_id !== lineId))
    },
    [currentAssignments, onChange],
  )

  // --- Actualizar cantidad asignada ---
  const handleQtyChange = useCallback(
    (lineId: string, newQty: number) => {
      onChange(
        currentAssignments.map((a) =>
          a.request_line_id === lineId ? { ...a, quantity_assigned: newQty } : a,
        ),
      )
    },
    [currentAssignments, onChange],
  )

  // --- Obtener datos de una linea por su ID (para mostrar info en la seccion de seleccionadas) ---
  function findLineById(lineId: string): BacklogLine | undefined {
    return backlogLines.find((l) => l.id === lineId)
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
      {/* Lineas seleccionadas para este viaje */}
      {currentAssignments.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-900">
            Lineas seleccionadas ({currentAssignments.length})
          </h4>

          {currentAssignments.map((assignment) => {
            const line = findLineById(assignment.request_line_id)
            const isEquipo = line?.line_type === 'Equipo'
            const fromName = line ? resolveFrom(line) : '—'
            const toName = line ? resolveTo(line) : '—'
            const unitCode = line ? resolveUnit(line) : ''
            const requestDisplayId = line?.request.request_id ?? assignment.request_line_id.slice(0, 8)
            const availableQty = line ? getAvailableQty(line) : assignment.quantity_assigned

            return (
              <div
                key={assignment.request_line_id}
                className="flex flex-col gap-2 rounded-lg border border-navy/20 bg-navy/5 p-3 sm:flex-row sm:items-start sm:gap-3"
              >
                {/* Icono de tipo */}
                <span className="shrink-0 hidden sm:block pt-0.5" title={line?.line_type}>
                  {isEquipo ? (
                    <Wrench className="h-4 w-4 text-iconsa-blue" />
                  ) : (
                    <Package className="h-4 w-4 text-gold" />
                  )}
                </span>

                {/* Info de la linea */}
                <div className="min-w-0 flex-1 space-y-1">
                  {/* Descripcion + ID */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Icono de tipo visible solo en mobile (en desktop el bloque sm: lo muestra) */}
                    <span className="sm:hidden shrink-0" title={line?.line_type ?? isEquipo ? 'Equipo' : 'Material'}>
                      {isEquipo ? (
                        <Wrench className="h-4 w-4 text-iconsa-blue" />
                      ) : (
                        <Package className="h-4 w-4 text-gold" />
                      )}
                    </span>
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {line?.description ?? 'Cargando...'}
                    </span>
                    <span className="font-mono text-xs text-iconsa-gray shrink-0">
                      {requestDisplayId}
                    </span>
                  </div>

                  {/* Ruta */}
                  {line && (
                    <div className="flex items-center gap-1 text-xs text-iconsa-gray">
                      <span className="truncate max-w-27.5">{fromName}</span>
                      <ArrowRight className="h-3 w-3 shrink-0 text-gray-400" />
                      <span className="truncate max-w-27.5">{toName}</span>
                    </div>
                  )}
                </div>

                {/* Input de cantidad asignada */}
                <div className="flex items-center gap-2 shrink-0">
                  <label className="text-xs text-iconsa-gray whitespace-nowrap">
                    Cant. asignada:
                  </label>
                  <input
                    type="number"
                    value={assignment.quantity_assigned}
                    min={0.01}
                    max={availableQty > 0 ? availableQty : undefined}
                    step={0.01}
                    onChange={(e) =>
                      handleQtyChange(
                        assignment.request_line_id,
                        parseFloat(e.target.value) || 0,
                      )
                    }
                    className="w-20 rounded border border-gray-300 px-2 py-1 text-sm text-right focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue"
                  />
                  {unitCode && (
                    <span className="text-xs text-gray-500">{unitCode}</span>
                  )}
                </div>

                {/* Boton quitar */}
                <button
                  type="button"
                  onClick={() => handleRemove(assignment.request_line_id)}
                  className="shrink-0 self-start rounded p-1.5 text-iconsa-gray hover:bg-red-50 hover:text-iconsa-red transition-colors"
                  title="Quitar linea del viaje"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Separador si hay seleccionadas y disponibles */}
      {currentAssignments.length > 0 && availableLines.length > 0 && (
        <div className="border-t border-gray-200" />
      )}

      {/* Lineas disponibles del backlog */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-900">
          Lineas disponibles ({availableLines.length})
        </h4>

        {loading && (
          <div className="flex items-center justify-center py-6 text-iconsa-gray">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm">Cargando backlog...</span>
          </div>
        )}

        {!loading && availableLines.length === 0 && (
          <p className="text-center py-6 text-sm text-iconsa-gray">
            {backlogLines.length === 0
              ? 'No hay lineas pendientes en el backlog'
              : 'Todas las lineas del backlog han sido agregadas'}
          </p>
        )}

        {!loading &&
          availableLines.map((line) => {
            const isEquipo = line.line_type === 'Equipo'
            const fromName = resolveFrom(line)
            const toName = resolveTo(line)
            const unitCode = resolveUnit(line)
            const availableQty = getAvailableQty(line)
            const requestDisplayId = line.request.request_id ?? line.request_id.slice(0, 8)

            return (
              <div
                key={line.id}
                className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3 sm:flex-row sm:items-center sm:gap-3 hover:bg-gray-50/50 transition-colors"
              >
                {/* Icono de tipo */}
                <span className="shrink-0 hidden sm:block" title={line.line_type}>
                  {isEquipo ? (
                    <Wrench className="h-4 w-4 text-iconsa-blue" />
                  ) : (
                    <Package className="h-4 w-4 text-gold" />
                  )}
                </span>

                {/* Info de la linea */}
                <div className="min-w-0 flex-1 space-y-1">
                  {/* Descripcion + ID + proyecto */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="sm:hidden shrink-0" title={line.line_type}>
                      {isEquipo ? (
                        <Wrench className="h-4 w-4 text-iconsa-blue" />
                      ) : (
                        <Package className="h-4 w-4 text-gold" />
                      )}
                    </span>
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {line.description}
                    </span>
                    <span className="font-mono text-xs text-iconsa-gray shrink-0">
                      {requestDisplayId}
                    </span>
                    {line.request.project?.code && (
                      <span className="text-xs font-medium text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">
                        {line.request.project.code}
                      </span>
                    )}
                  </div>

                  {/* Ruta */}
                  <div className="flex items-center gap-1 text-xs text-iconsa-gray">
                    <span className="truncate max-w-30">{fromName}</span>
                    <ArrowRight className="h-3 w-3 shrink-0 text-gray-400" />
                    <span className="truncate max-w-30">{toName}</span>
                  </div>
                </div>

                {/* Cantidad disponible */}
                <span className="shrink-0 text-xs text-gray-500 whitespace-nowrap">
                  Disp: {availableQty} {unitCode}
                </span>

                {/* Boton agregar */}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAdd(line)}
                  className="shrink-0 gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Agregar
                </Button>
              </div>
            )
          })}
      </div>
    </div>
  )
}

export { LineSelector }
export type { LineSelectorProps }
