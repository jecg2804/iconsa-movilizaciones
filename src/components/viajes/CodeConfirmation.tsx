'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { SelectWithFallback, type SelectWithFallbackValue } from '@/components/ui/SelectWithFallback'
import type { SelectOption } from '@/components/ui/Select'

interface CodeConfirmationProps {
  /** Código esperado — usado SOLO para validación interna. NUNCA mostrar en UI. */
  expectedCode: string | null
  /** Opciones para el dropdown de receptor */
  receiverOptions: SelectOption[]
  onConfirm: (codeUsed: string, receivedById: string | null, receivedByName: string) => void
  onCancel: () => void
}

export function CodeConfirmation({
  expectedCode,
  receiverOptions,
  onConfirm,
  onCancel,
}: CodeConfirmationProps) {
  const [code, setCode] = useState('')
  const [receiver, setReceiver] = useState<SelectWithFallbackValue>({ id: null, text: null })
  const [showHelp, setShowHelp] = useState(false)

  // Validación del código
  const codeComplete = code.trim().length === 4
  const codeCorrect = codeComplete && expectedCode !== null && code.trim() === expectedCode
  const codeIncorrect = codeComplete && expectedCode !== null && code.trim() !== expectedCode

  // Receptor lleno: seleccionó del dropdown (id) o escribió texto (text)
  const receiverFilled = (receiver.id !== null) || (receiver.text !== null && receiver.text.trim().length > 0)

  // Nombre del receptor para denormalización
  const receiverName = useMemo(() => {
    if (receiver.id) {
      const opt = receiverOptions.find((o) => o.value === receiver.id)
      return opt?.label ?? ''
    }
    return receiver.text?.trim() ?? ''
  }, [receiver, receiverOptions])

  const canConfirm = codeCorrect && receiverFilled

  const handleConfirm = () => {
    if (!canConfirm) return
    onConfirm(code.trim(), receiver.id, receiverName)
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
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          error={codeIncorrect ? 'Código incorrecto. Verifique con el solicitante.' : undefined}
        />

        {/* Mensaje de código correcto */}
        {codeCorrect && (
          <p className="text-sm font-medium text-iconsa-green">Código verificado ✓</p>
        )}

        {/* Recibido por — SelectWithFallback */}
        <SelectWithFallback
          label="Recibido por"
          placeholder="Seleccionar receptor..."
          options={receiverOptions}
          value={receiver}
          onChange={setReceiver}
          fallbackLabel="No está en la lista"
          fallbackPlaceholder="Nombre del receptor"
        />
      </div>

      {/* Link de ayuda */}
      <button
        type="button"
        onClick={() => setShowHelp(!showHelp)}
        className="text-xs font-medium text-iconsa-blue hover:underline"
      >
        ¿No tiene el código?
      </button>

      {showHelp && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-sm text-blue-800">
            Contacte al solicitante o al coordinador de logística para obtener el código de confirmación.
            La entrega no puede registrarse sin el código correcto.
          </p>
        </div>
      )}

      {/* Acciones */}
      <div className="flex gap-2">
        <Button variant="primary" onClick={handleConfirm} disabled={!canConfirm}>
          Confirmar Entrega
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
