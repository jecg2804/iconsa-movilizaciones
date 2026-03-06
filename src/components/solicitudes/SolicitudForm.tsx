'use client'

import { useState, useEffect, useCallback } from 'react'
import { Select, type SelectOption } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import type { SolicitudInput } from '@/hooks/useSolicitudes'

type FormMode = 'create' | 'edit' | 'readonly'

interface SolicitudFormProps {
  mode: FormMode
  initialData?: {
    requestId?: string | null
    projectId: string
    requesterId: string
    approvedBy: string | null
    dateRequired: string
    notes: string | null
    status: string
    priority: string | null
  }
  /** Proyectos disponibles para el dropdown (para PM, solo sus proyectos asignados) */
  projects: SelectOption[]
  /** Personas disponibles para el dropdown de solicitante */
  people: SelectOption[]
  /** Personas disponibles para el dropdown "Aprobado por". Si no se provee, usa people. */
  approvers?: SelectOption[]
  /** Callback cada vez que cambian los datos del header */
  onChange: (data: SolicitudInput) => void
  /** ID de la persona actualmente logueada (auto-rellena solicitante en modo creacion) */
  currentPersonId: string
}

function SolicitudForm({
  mode,
  initialData,
  projects,
  people,
  approvers,
  onChange,
  currentPersonId,
}: SolicitudFormProps) {
  const approverOptions = approvers ?? people
  const isReadonly = mode === 'readonly'

  // --- Estado interno del formulario ---
  const [projectId, setProjectId] = useState<string>(
    initialData?.projectId ?? '',
  )
  const [requesterId, setRequesterId] = useState<string>(
    initialData?.requesterId ?? currentPersonId,
  )
  const [approvedBy, setApprovedBy] = useState<string | null>(
    initialData?.approvedBy ?? null,
  )
  const [dateRequired, setDateRequired] = useState<string>(
    initialData?.dateRequired ?? '',
  )
  const [notes, setNotes] = useState<string>(initialData?.notes ?? '')

  // --- Propagar cambios al padre ---
  const propagate = useCallback(
    (overrides?: Partial<SolicitudInput>) => {
      const data: SolicitudInput = {
        project_id: overrides?.project_id ?? projectId,
        requester_id: overrides?.requester_id ?? requesterId,
        approved_by: overrides?.approved_by !== undefined ? overrides.approved_by : approvedBy,
        date_required: overrides?.date_required ?? dateRequired,
        notes: overrides?.notes !== undefined ? overrides.notes : notes || null,
      }
      onChange(data)
    },
    [projectId, requesterId, approvedBy, dateRequired, notes, onChange],
  )

  // Propagar el estado inicial al montar
  useEffect(() => {
    propagate()
    // Solo en el montaje inicial
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- Handlers de cambio ---
  const handleProjectChange = useCallback(
    (value: string | null) => {
      const newVal = value ?? ''
      setProjectId(newVal)
      propagate({ project_id: newVal })
    },
    [propagate],
  )

  const handleApprovedByChange = useCallback(
    (value: string | null) => {
      setApprovedBy(value)
      propagate({ approved_by: value })
    },
    [propagate],
  )

  const handleDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newVal = e.target.value
      setDateRequired(newVal)
      propagate({ date_required: newVal })
    },
    [propagate],
  )

  const handleNotesChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newVal = e.target.value
      setNotes(newVal)
      propagate({ notes: newVal || null })
    },
    [propagate],
  )

  // Datos de visualizacion
  const requestId = initialData?.requestId
  const status = initialData?.status
  const priority = initialData?.priority

  return (
    <div className="space-y-4">
      {/* Barra de identificacion */}
      <div className="flex flex-col gap-2 rounded-lg bg-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {requestId ? (
            <span className="text-lg font-bold font-mono text-navy">
              {requestId}
            </span>
          ) : (
            <span className="text-sm italic text-iconsa-gray">
              Se generara al guardar
            </span>
          )}
        </div>
        {(status || priority) && (
          <div className="flex items-center gap-2">
            {status && <Badge variant="status" label={status} />}
            {priority && <Badge variant="priority" label={priority} />}
          </div>
        )}
      </div>

      {/* Campos del header */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Select
          label="Proyecto"
          placeholder="Seleccionar proyecto..."
          options={projects}
          value={projectId || null}
          onChange={handleProjectChange}
          disabled={isReadonly}
          searchable
        />

        {/* Solicitante — siempre fijo al usuario logueado, no editable */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Solicitante
          </label>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
            {people.find((p) => p.value === requesterId)?.label ?? '—'}
          </div>
        </div>

        <Select
          label="Aprobado por"
          placeholder="Seleccionar (opcional)..."
          options={approverOptions}
          value={approvedBy}
          onChange={handleApprovedByChange}
          disabled={isReadonly}
          searchable
        />

        <Input
          label="Fecha Requerida"
          type="date"
          value={dateRequired}
          onChange={handleDateChange}
          disabled={isReadonly}
        />

        {/* Notas — full width */}
        <div className="md:col-span-2">
          <label
            htmlFor="solicitud-notes"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Notas
          </label>
          <textarea
            id="solicitud-notes"
            value={notes}
            onChange={handleNotesChange}
            disabled={isReadonly}
            placeholder="Observaciones generales sobre la solicitud (opcional)"
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>
      </div>

      {/* Placeholder de adjuntos en modo lectura */}
      {isReadonly && (
        <p className="text-xs italic text-iconsa-gray">
          Adjuntos disponibles proximamente
        </p>
      )}
    </div>
  )
}

export { SolicitudForm }
export type { SolicitudFormProps, FormMode }
