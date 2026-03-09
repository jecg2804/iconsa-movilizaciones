'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { ChevronDown, X } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
  sublabel?: string
  /** Valor numérico opcional — usado para auto-fill (ej: monto de tarifa de movilización) */
  amount?: number
}

interface SelectProps {
  label?: string
  placeholder?: string
  options: SelectOption[]
  value: string | null
  onChange: (value: string | null) => void
  error?: string
  disabled?: boolean
  searchable?: boolean
  emptyMessage?: string
  className?: string
  id?: string
}

function Select({
  label,
  placeholder = 'Seleccionar...',
  options,
  value,
  onChange,
  error,
  disabled = false,
  searchable = true,
  emptyMessage = 'No se encontraron resultados',
  className = '',
  id,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value) ?? null,
    [options, value],
  )

  const filteredOptions = useMemo(() => {
    if (!search) return options
    const term = search.toLowerCase()
    return options.filter((opt) => opt.label.toLowerCase().includes(term))
  }, [options, search])

  // Cerrar al hacer click afuera
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [])

  // Auto-focus en el input de busqueda al abrir
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen, searchable])

  const handleToggle = useCallback(() => {
    if (disabled) return
    setIsOpen((prev) => {
      if (prev) setSearch('')
      return !prev
    })
  }, [disabled])

  const handleSelect = useCallback(
    (optionValue: string) => {
      onChange(optionValue)
      setIsOpen(false)
      setSearch('')
    },
    [onChange],
  )

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onChange(null)
      setIsOpen(false)
      setSearch('')
    },
    [onChange],
  )

  // Reset highlight cuando cambian las opciones filtradas
  useEffect(() => {
    setHighlightedIndex(-1)
  }, [filteredOptions.length])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
        setSearch('')
        return
      }

      if (!isOpen) {
        if (e.key === 'ArrowDown' || e.key === 'Enter') {
          e.preventDefault()
          setIsOpen(true)
        }
        return
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightedIndex((prev) => {
          const next = prev < filteredOptions.length - 1 ? prev + 1 : 0
          listRef.current?.children[next]?.scrollIntoView({ block: 'nearest' })
          return next
        })
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightedIndex((prev) => {
          const next = prev > 0 ? prev - 1 : filteredOptions.length - 1
          listRef.current?.children[next]?.scrollIntoView({ block: 'nearest' })
          return next
        })
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleSelect(filteredOptions[highlightedIndex].value)
        }
      }
    },
    [isOpen, filteredOptions, highlightedIndex, handleSelect],
  )

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          {label}
        </label>
      )}

      {/* Trigger */}
      <button
        type="button"
        id={inputId}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`
          flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm text-left
          focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue
          disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
          ${error ? 'border-iconsa-red' : 'border-gray-300'}
        `}
      >
        <span className={selectedOption ? 'text-gray-900' : 'text-gray-400'}>
          {selectedOption?.label ?? placeholder}
        </span>
        <span className="flex items-center gap-1">
          {value !== null && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleClear(e as unknown as React.MouseEvent)
              }}
              className="rounded p-0.5 hover:bg-gray-100"
            >
              <X className="h-3.5 w-3.5 text-gray-400" />
            </span>
          )}
          <ChevronDown
            className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-gray-300 bg-white shadow-lg"
        >
          {searchable && (
            <div className="sticky top-0 border-b border-gray-200 bg-white p-2">
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Buscar..."
                className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm placeholder:text-gray-400 focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue"
              />
            </div>
          )}

          {filteredOptions.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-gray-500">
              {emptyMessage}
            </div>
          ) : (
            <ul role="listbox" ref={listRef}>
              {filteredOptions.map((option, idx) => (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={option.value === value}
                  onClick={() => handleSelect(option.value)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`
                    cursor-pointer px-3 py-2 text-sm
                    ${idx === highlightedIndex ? 'bg-gray-100' : 'hover:bg-gray-50'}
                    ${option.value === value ? 'bg-iconsa-blue/5 font-medium text-iconsa-blue' : 'text-gray-900'}
                  `}
                >
                  <span className="block">{option.label}</span>
                  {option.sublabel && (
                    <span className="block text-xs text-gray-500">{option.sublabel}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && (
        <p className="mt-1 text-sm text-iconsa-red">{error}</p>
      )}
    </div>
  )
}

export { Select }
export type { SelectProps }
