'use client'

import FileUploader from '@/components/ui/FileUploader'
import type { Attachment } from '@/lib/supabase/storage'

export interface ExternalApprovalFormValues {
  providerName: string
  invoiceAmount: string
  invoiceAttachments: Attachment[]
  notes: string
}

export type ExternalApprovalFormErrors = Partial<Record<keyof ExternalApprovalFormValues, string>>

export const EMPTY_FORM_VALUES: ExternalApprovalFormValues = {
  providerName: '',
  invoiceAmount: '',
  invoiceAttachments: [],
  notes: '',
}

export function validateApprovalForm(
  values: ExternalApprovalFormValues,
): { valid: boolean; errors: ExternalApprovalFormErrors } {
  const errors: ExternalApprovalFormErrors = {}

  if (values.providerName.trim() === '') {
    errors.providerName = 'El nombre del proveedor es requerido'
  } else if (values.providerName.length > 100) {
    errors.providerName = 'Máximo 100 caracteres'
  }

  const amount = parseFloat(values.invoiceAmount)
  if (!Number.isFinite(amount) || amount <= 0) {
    errors.invoiceAmount = 'El costo debe ser mayor a cero'
  }

  if (values.invoiceAttachments.length === 0) {
    errors.invoiceAttachments = 'Adjunta al menos una cotización o factura'
  }

  if (values.notes.length > 500) {
    errors.notes = 'Máximo 500 caracteres'
  }

  return { valid: Object.keys(errors).length === 0, errors }
}

interface ExternalApprovalFormProps {
  values: ExternalApprovalFormValues
  onChange: (v: ExternalApprovalFormValues) => void
  errors?: ExternalApprovalFormErrors
  lineFolderId: string
  disabled?: boolean
}

export function ExternalApprovalForm({
  values,
  onChange,
  errors = {},
  lineFolderId,
  disabled = false,
}: ExternalApprovalFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="external-provider" className="mb-1 block text-sm font-medium text-gray-700">
          Proveedor / Empresa transportista <span className="text-red-600">*</span>
        </label>
        <input
          id="external-provider"
          type="text"
          maxLength={100}
          value={values.providerName}
          onChange={(e) => onChange({ ...values, providerName: e.target.value })}
          disabled={disabled}
          placeholder="Nombre del proveedor"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue disabled:bg-gray-50"
        />
        {errors.providerName && (
          <p className="mt-1 text-xs text-red-600">{errors.providerName}</p>
        )}
      </div>

      <div>
        <label htmlFor="external-cost" className="mb-1 block text-sm font-medium text-gray-700">
          Costo del servicio (B/.) <span className="text-red-600">*</span>
        </label>
        <input
          id="external-cost"
          type="number"
          step="0.01"
          min="0.01"
          value={values.invoiceAmount}
          onChange={(e) => onChange({ ...values, invoiceAmount: e.target.value })}
          disabled={disabled}
          placeholder="0.00"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue disabled:bg-gray-50"
        />
        {errors.invoiceAmount && (
          <p className="mt-1 text-xs text-red-600">{errors.invoiceAmount}</p>
        )}
      </div>

      <div>
        <FileUploader
          attachments={values.invoiceAttachments}
          folder={lineFolderId}
          onChange={(files) => onChange({ ...values, invoiceAttachments: files })}
          label="Cotización / Factura"
          hint="PDF, JPG, PNG o WEBP (max 10MB) — al menos 1 archivo requerido"
          disabled={disabled}
        />
        {errors.invoiceAttachments && (
          <p className="mt-1 text-xs text-red-600">{errors.invoiceAttachments}</p>
        )}
      </div>

      <div>
        <label htmlFor="external-notes" className="mb-1 block text-sm font-medium text-gray-700">
          Notas (opcional)
        </label>
        <textarea
          id="external-notes"
          maxLength={500}
          rows={2}
          value={values.notes}
          onChange={(e) => onChange({ ...values, notes: e.target.value })}
          disabled={disabled}
          placeholder="Observaciones del servicio externo..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue disabled:bg-gray-50"
        />
        {errors.notes && (
          <p className="mt-1 text-xs text-red-600">{errors.notes}</p>
        )}
      </div>
    </div>
  )
}
