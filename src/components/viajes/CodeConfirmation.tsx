'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface CodeConfirmationProps {
  /** Código esperado — usado SOLO para validación interna. NUNCA mostrar en UI. */
  expectedCode: string | null
  onConfirm: (codeUsed: string, receivedByName: string) => void
  onCancel: () => void
}

export function CodeConfirmation({ expectedCode, onConfirm, onCancel }: CodeConfirmationProps) {
  const [code, setCode] = useState('')
  const [receivedByName, setReceivedByName] = useState('')
  const [showMismatchWarning, setShowMismatchWarning] = useState(false)

  const canConfirm = code.trim().length > 0 || receivedByName.trim().length > 0

  const handleConfirm = () => {
    // Validación interna: comparar con expectedCode (sin mostrarlo en UI)
    if (expectedCode && code.trim() && code.trim() !== expectedCode) {
      setShowMismatchWarning(true)
      return
    }
    onConfirm(code.trim(), receivedByName.trim())
  }

  const handleConfirmAnyway = () => {
    onConfirm(code.trim(), receivedByName.trim())
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-700">
        Solicite el código de confirmación al receptor en campo e ingréselo aquí.
      </p>

      <div className="space-y-3">
        {/* Código de confirmación */}
        <Input
          label="Código de confirmación (4 dígitos)"
          type="text"
          inputMode="numeric"
          maxLength={4}
          placeholder="0000"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, ''))
            setShowMismatchWarning(false)
          }}
        />

        {/* Nombre del receptor */}
        <Input
          label="Nombre del receptor"
          type="text"
          placeholder="Requerido si no hay código"
          value={receivedByName}
          onChange={(e) => setReceivedByName(e.target.value)}
        />
      </div>

      {/* Warning de código incorrecto */}
      {showMismatchWarning && (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3">
          <p className="text-sm font-medium text-yellow-800">
            Código incorrecto. ¿Desea confirmar la entrega de todas formas?
          </p>
          <div className="mt-3 flex gap-2">
            <Button variant="primary" onClick={handleConfirmAnyway} disabled={!canConfirm}>
              Confirmar de todas formas
            </Button>
            <Button variant="ghost" onClick={() => setShowMismatchWarning(false)}>
              Corregir código
            </Button>
          </div>
        </div>
      )}

      {/* Acciones principales */}
      {!showMismatchWarning && (
        <div className="flex gap-2">
          <Button variant="primary" onClick={handleConfirm} disabled={!canConfirm}>
            Confirmar Entrega
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      )}
    </div>
  )
}
