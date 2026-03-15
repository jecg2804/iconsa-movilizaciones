'use client'

import { type ReactNode } from 'react'
import { X } from 'lucide-react'

interface FilterChip {
  key: string
  label: string
  onRemove: () => void
}

interface FilterBarProps {
  /** Chips de filtros activos */
  chips: FilterChip[]
  /** Callback para limpiar todos los filtros */
  onClearAll: () => void
  /** Controles de filtro (dropdowns, inputs) como children */
  children: ReactNode
}

function FilterBar({ chips, onClearAll, children }: FilterBarProps) {
  const hasActive = chips.length > 0

  return (
    <div className="space-y-2">
      {/* Fila de controles */}
      <div className="flex flex-wrap items-end gap-2">
        {children}
      </div>

      {/* Chips de filtros activos */}
      {hasActive && (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 rounded-full bg-iconsa-blue/10 px-2.5 py-0.5 text-xs font-medium text-iconsa-blue"
            >
              {chip.label}
              <button
                type="button"
                onClick={chip.onRemove}
                className="rounded-full p-0.5 hover:bg-iconsa-blue/20"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Limpiar filtros
          </button>
        </div>
      )}
    </div>
  )
}

export { FilterBar }
export type { FilterBarProps, FilterChip }
