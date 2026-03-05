'use client'

import { useState, useCallback } from 'react'
import { Select, type SelectOption } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'

export interface SelectWithFallbackValue {
  id: string | null
  text: string | null
}

interface SelectWithFallbackProps {
  label?: string
  placeholder?: string
  options: SelectOption[]
  value: SelectWithFallbackValue
  onChange: (value: SelectWithFallbackValue) => void
  error?: string
  disabled?: boolean
  fallbackLabel?: string
  fallbackPlaceholder?: string
  className?: string
}

function SelectWithFallback({
  label,
  placeholder = 'Seleccionar...',
  options,
  value,
  onChange,
  error,
  disabled = false,
  fallbackLabel = 'No está en la lista',
  fallbackPlaceholder = 'Escriba el valor...',
  className = '',
}: SelectWithFallbackProps) {
  // Si el valor actual tiene text pero no id, estamos en modo fallback
  const [isFallback, setIsFallback] = useState(
    value.text !== null && value.id === null,
  )

  const handleToggleToFallback = useCallback(() => {
    setIsFallback(true)
    onChange({ id: null, text: '' })
  }, [onChange])

  const handleToggleToList = useCallback(() => {
    setIsFallback(false)
    onChange({ id: null, text: null })
  }, [onChange])

  const handleSelectChange = useCallback(
    (selectedId: string | null) => {
      onChange({ id: selectedId, text: null })
    },
    [onChange],
  )

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ id: null, text: e.target.value })
    },
    [onChange],
  )

  if (isFallback) {
    return (
      <div className={className}>
        <Input
          label={label}
          placeholder={fallbackPlaceholder}
          value={value.text ?? ''}
          onChange={handleTextChange}
          error={error}
          disabled={disabled}
        />
        {!disabled && (
          <button
            type="button"
            onClick={handleToggleToList}
            className="mt-1 text-xs font-medium text-iconsa-blue hover:text-iconsa-blue/80 hover:underline"
          >
            Volver a la lista
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={className}>
      <Select
        label={label}
        placeholder={placeholder}
        options={options}
        value={value.id}
        onChange={handleSelectChange}
        error={error}
        disabled={disabled}
        searchable
      />
      {!disabled && (
        <button
          type="button"
          onClick={handleToggleToFallback}
          className="mt-1 text-xs font-medium text-iconsa-gray hover:text-iconsa-blue hover:underline"
        >
          {fallbackLabel}
        </button>
      )}
    </div>
  )
}

export { SelectWithFallback }
