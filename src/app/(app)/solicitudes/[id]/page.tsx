'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useProjects } from '@/hooks/useProjects'
import { useEquipment } from '@/hooks/useEquipment'
import { useLocations } from '@/hooks/useLocations'
import {
  useSolicitudes,
  type SolicitudInput,
  type LineInput,
  type SolicitudWithRelations,
  type LineWithRelations,
} from '@/hooks/useSolicitudes'
import { canEditSolicitud } from '@/lib/utils/roles'
import { checkDuplicateLines } from '@/lib/utils/duplicates'
import type { DuplicateMatch } from '@/components/ui/DuplicateWarning'
import type { SelectOption } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { SolicitudForm, type FormMode } from '@/components/solicitudes/SolicitudForm'
import { LineEditor } from '@/components/solicitudes/LineEditor'
import { LineRow } from '@/components/solicitudes/LineRow'

// --- Helpers ---

/** Convierte una LineWithRelations a LineInput para edicion */
function lineToInput(line: LineWithRelations): LineInput {
  return {
    id: line.id,
    line_type: line.line_type as 'Equipo' | 'Material',
    equipment_id: line.equipment_id,
    equipment_text: line.equipment_text,
    description: line.description,
    from_location_id: line.from_location_id,
    from_text: line.from_text,
    to_location_id: line.to_location_id,
    to_text: line.to_text,
    quantity: line.quantity,
    unit_id: line.unit_id,
    unit_text: line.unit_text,
    cost_code_id: line.cost_code_id,
    category: line.category,
    po_reference: line.po_reference,
    notes: line.notes,
  }
}

/** Determina el modo del formulario segun estado y permisos */
function determineMode(
  status: string,
  role: string | null,
  projectId: string,
  userProjectIds: string[],
): FormMode {
  if (status === 'Completada' || status === 'Cancelada') return 'readonly'
  if (status === 'En Proceso' || status === 'Parcial') return 'readonly'
  if (!canEditSolicitud(role, projectId, userProjectIds)) return 'readonly'
  return 'edit'
}

// --- Componente principal ---

export default function SolicitudDetailPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  // Auth y datos maestros
  const { person, role, userProjectIds, loading: authLoading } = useAuth()
  const { allProjects, loading: projectsLoading } = useProjects()
  const { equipment, loading: equipmentLoading } = useEquipment()
  const { locations, loading: locationsLoading } = useLocations()

  // Hook de solicitudes
  const { fetchSolicitud, updateSolicitud, cancelSolicitud, saving, saveError } = useSolicitudes()

  // Estado principal
  const [solicitud, setSolicitud] = useState<SolicitudWithRelations | null>(null)
  const [header, setHeader] = useState<SolicitudInput>({
    project_id: '',
    requester_id: '',
    date_required: '',
  })
  const [lines, setLines] = useState<LineInput[]>([])
  const [deletedLineIds, setDeletedLineIds] = useState<string[]>([])
  const [showLineEditor, setShowLineEditor] = useState(false)
  const [editingLineIndex, setEditingLineIndex] = useState<number | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [deleteLineIndex, setDeleteLineIndex] = useState<number | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)

  // Datos auxiliares (people, units, costCodes) — se cargan inline
  const [people, setPeople] = useState<SelectOption[]>([])
  const [units, setUnits] = useState<SelectOption[]>([])
  const [costCodes, setCostCodes] = useState<SelectOption[]>([])

  // --- Cargar solicitud ---
  useEffect(() => {
    async function load() {
      setPageLoading(true)
      const data = await fetchSolicitud(id)
      if (data) {
        setSolicitud(data)
        setHeader({
          project_id: data.project_id,
          requester_id: data.requester_id,
          approved_by: data.approved_by,
          date_required: data.date_required,
          notes: data.notes,
        })
        setLines(data.lines.map(lineToInput))
      }
      setPageLoading(false)
    }
    load()
    // Solo al montar o cuando cambia el ID
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // --- Cargar people ---
  useEffect(() => {
    async function fetchPeople() {
      const { data } = await supabase
        .from('people')
        .select('id, name')
        .eq('status', 'Activo')
        .order('name')
      setPeople(
        (data ?? []).map((p) => ({ value: p.id, label: p.name })),
      )
    }
    fetchPeople()
  }, [supabase])

  // --- Cargar units ---
  useEffect(() => {
    async function fetchUnits() {
      const { data } = await supabase
        .from('units')
        .select('id, code, description')
        .order('code')
      setUnits(
        (data ?? []).map((u) => ({
          value: u.id,
          label: u.description ? `${u.code} — ${u.description}` : u.code,
        })),
      )
    }
    fetchUnits()
  }, [supabase])

  // --- Cargar cost codes filtrados por proyecto ---
  useEffect(() => {
    async function fetchCostCodes() {
      if (!header.project_id) {
        setCostCodes([])
        return
      }
      const { data } = await supabase
        .from('cost_codes')
        .select('id, phase_code, phase_description, full_code')
        .eq('project_id', header.project_id)
        .order('phase_code')
      setCostCodes(
        (data ?? []).map((cc) => ({
          value: cc.id,
          label: cc.full_code
            ? `${cc.full_code} — ${cc.phase_description ?? ''}`
            : `${cc.phase_code} — ${cc.phase_description ?? ''}`,
        })),
      )
    }
    fetchCostCodes()
  }, [supabase, header.project_id])

  // --- Modo del formulario ---
  const mode = useMemo<FormMode>(() => {
    if (!solicitud) return 'readonly'
    return determineMode(solicitud.status, role, solicitud.project_id, userProjectIds)
  }, [solicitud, role, userProjectIds])

  // --- Opciones de dropdowns ---
  const projectOptions = useMemo<SelectOption[]>(
    () => allProjects.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` })),
    [allProjects],
  )

  const equipmentOptions = useMemo<SelectOption[]>(
    () =>
      equipment.map((e) => ({
        value: e.id,
        label: e.spectrum_code ? `${e.spectrum_code} — ${e.description}` : e.description,
      })),
    [equipment],
  )

  const locationOptions = useMemo<SelectOption[]>(
    () => locations.map((l) => ({ value: l.id, label: l.name })),
    [locations],
  )

  // --- Header onChange ---
  const handleHeaderChange = useCallback((data: SolicitudInput) => {
    setHeader(data)
    setIsDirty(true)
  }, [])

  // --- Gestion de lineas ---
  const canAddLines = mode === 'edit' && solicitud?.status === 'Borrador'

  const handleAddLine = useCallback((line: LineInput) => {
    setLines((prev) => [...prev, line])
    setShowLineEditor(false)
    setIsDirty(true)
  }, [])

  const handleEditLine = useCallback((line: LineInput) => {
    setLines((prev) => {
      if (editingLineIndex === null) return prev
      const updated = [...prev]
      updated[editingLineIndex] = { ...line, id: prev[editingLineIndex].id }
      return updated
    })
    setEditingLineIndex(null)
    setIsDirty(true)
  }, [editingLineIndex])

  const handleDeleteLine = useCallback((index: number) => {
    const line = lines[index]
    // Si es linea programada, mostrar confirmacion
    const originalLine = solicitud?.lines.find((l) => l.id === line.id)
    if (originalLine?.status === 'Programada') {
      setDeleteLineIndex(index)
      return
    }
    // Eliminar directamente
    performDeleteLine(index)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, solicitud])

  const performDeleteLine = useCallback((index: number) => {
    setLines((prev) => {
      const line = prev[index]
      if (line.id) {
        setDeletedLineIds((ids) => [...ids, line.id!])
      }
      return prev.filter((_, i) => i !== index)
    })
    setDeleteLineIndex(null)
    setIsDirty(true)
  }, [])

  // --- Verificacion de duplicados (solo en Borrador) ---
  const handleCheckDuplicates = useCallback(
    async (line: LineInput): Promise<DuplicateMatch[]> => {
      const results = await checkDuplicateLines(supabase, {
        lineType: line.line_type,
        equipmentId: line.equipment_id,
        description: line.description,
        fromLocationId: line.from_location_id,
        toLocationId: line.to_location_id,
        excludeRequestId: solicitud?.id,
      })
      return results.map((r) => ({
        requestId: r.requestId,
        lineNumber: r.lineNumber,
        description: r.description,
        status: r.status,
        route: `${r.fromName} → ${r.toName}`,
      }))
    },
    [supabase, solicitud?.id],
  )

  // --- Guardar cambios ---
  const handleSave = useCallback(async () => {
    if (!solicitud) return
    const success = await updateSolicitud(solicitud.id, header, lines, deletedLineIds)
    if (success) {
      const updated = await fetchSolicitud(id)
      if (updated) {
        setSolicitud(updated)
        setLines(updated.lines.map(lineToInput))
        setDeletedLineIds([])
        setIsDirty(false)
      }
    }
  }, [solicitud, header, lines, deletedLineIds, updateSolicitud, fetchSolicitud, id])

  // --- Enviar solicitud (Borrador → Enviada) ---
  const handleSend = useCallback(async () => {
    if (!solicitud) return
    setSendError(null)

    // Validaciones
    if (!header.project_id) { setSendError('Seleccione un proyecto'); return }
    if (!header.requester_id) { setSendError('Seleccione el solicitante'); return }
    if (!header.date_required) { setSendError('Ingrese la fecha requerida'); return }
    if (lines.length === 0) { setSendError('Agregue al menos una linea a la solicitud'); return }

    // Primero guardar los cambios pendientes
    const saveSuccess = await updateSolicitud(solicitud.id, header, lines, deletedLineIds)
    if (!saveSuccess) return

    // Actualizar status a Enviada
    const { error } = await supabase
      .from('sm_requests')
      .update({ status: 'Enviada' })
      .eq('id', solicitud.id)

    if (error) {
      setSendError(error.message)
      return
    }

    // Refrescar datos
    const updated = await fetchSolicitud(id)
    if (updated) {
      setSolicitud(updated)
      setLines(updated.lines.map(lineToInput))
      setDeletedLineIds([])
      setIsDirty(false)
    }
  }, [solicitud, header, lines, deletedLineIds, updateSolicitud, fetchSolicitud, id, supabase])

  // --- Cancelar solicitud ---
  const handleCancel = useCallback(async () => {
    if (!solicitud) return
    const success = await cancelSolicitud(solicitud.id)
    if (success) {
      const updated = await fetchSolicitud(id)
      if (updated) {
        setSolicitud(updated)
        setLines(updated.lines.map(lineToInput))
        setShowCancelConfirm(false)
      }
    }
  }, [solicitud, cancelSolicitud, fetchSolicitud, id])

  // --- Resolver nombres para LineRow ---
  const getLineDisplayNames = useCallback(
    (line: LineInput, index: number) => {
      const originalLine = solicitud?.lines.find((l) => l.id === line.id)
      return {
        fromDisplay: originalLine?.from_location?.name ?? line.from_text ?? '',
        toDisplay: originalLine?.to_location?.name ?? line.to_text ?? '',
        unitDisplay: originalLine?.unit?.code ?? line.unit_text ?? '',
        costCodeDisplay:
          originalLine?.cost_code?.full_code ??
          originalLine?.cost_code?.phase_code ??
          '',
      }
    },
    [solicitud],
  )

  // --- Loading global ---
  const isLoading = pageLoading || authLoading || projectsLoading || equipmentLoading || locationsLoading
  const errorMessage = saveError ?? sendError

  // --- Verificar si se puede cancelar ---
  const canCancelSolicitud =
    mode === 'edit' &&
    solicitud &&
    ['Borrador', 'Enviada', 'En Proceso'].includes(solicitud.status)

  // --- Render ---
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-navy" />
      </div>
    )
  }

  if (!solicitud) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <button
          onClick={() => router.push('/solicitudes')}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-iconsa-gray hover:text-navy transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Solicitudes
        </button>
        <div className="rounded-lg border border-gray-200 bg-white px-6 py-12 text-center">
          <p className="text-iconsa-gray">Solicitud no encontrada.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Navegacion */}
      <button
        onClick={() => router.push('/solicitudes')}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-iconsa-gray hover:text-navy transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Solicitudes
      </button>

      {/* Error banner */}
      {errorMessage && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {/* Header del formulario */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
        <SolicitudForm
          mode={mode}
          initialData={{
            requestId: solicitud.request_id,
            projectId: solicitud.project_id,
            requesterId: solicitud.requester_id,
            approvedBy: solicitud.approved_by,
            dateRequired: solicitud.date_required,
            notes: solicitud.notes,
            status: solicitud.status,
            priority: solicitud.priority,
          }}
          projects={projectOptions}
          people={people}
          onChange={handleHeaderChange}
          currentPersonId={person?.id ?? ''}
        />
      </div>

      {/* Seccion de lineas */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            Lineas de Solicitud ({lines.length})
          </h2>
          {canAddLines && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setEditingLineIndex(null)
                setShowLineEditor(true)
              }}
              disabled={showLineEditor || editingLineIndex !== null}
            >
              <Plus className="h-4 w-4" />
              Agregar Linea
            </Button>
          )}
        </div>

        {/* Lista de lineas */}
        {lines.length === 0 && !showLineEditor ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-8 text-center">
            <p className="text-sm text-iconsa-gray">No hay lineas en esta solicitud.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {lines.map((line, index) => {
              const names = getLineDisplayNames(line, index)
              const originalLine = solicitud.lines.find((l) => l.id === line.id)
              const lineStatus = originalLine?.status ?? 'Pendiente'
              const isScheduled = lineStatus === 'Programada'

              return (
                <LineRow
                  key={line.id ?? `new-${index}`}
                  line={{ ...line, status: lineStatus }}
                  lineNumber={index + 1}
                  editable={mode === 'edit'}
                  canDelete={mode === 'edit'}
                  isScheduled={isScheduled}
                  onEdit={() => {
                    setShowLineEditor(false)
                    setEditingLineIndex(index)
                  }}
                  onDelete={() => handleDeleteLine(index)}
                  fromDisplay={names.fromDisplay}
                  toDisplay={names.toDisplay}
                  unitDisplay={names.unitDisplay}
                  costCodeDisplay={names.costCodeDisplay}
                />
              )
            })}
          </div>
        )}

        {/* Editor de linea nueva */}
        {showLineEditor && (
          <div className="mt-3">
            <LineEditor
              equipment={equipmentOptions}
              locations={locationOptions}
              units={units}
              costCodes={costCodes}
              isEditing={false}
              onSave={handleAddLine}
              onCancel={() => setShowLineEditor(false)}
              onCheckDuplicates={solicitud.status === 'Borrador' ? handleCheckDuplicates : undefined}
            />
          </div>
        )}

        {/* Editor de linea existente */}
        {editingLineIndex !== null && (
          <div className="mt-3">
            <LineEditor
              equipment={equipmentOptions}
              locations={locationOptions}
              units={units}
              costCodes={costCodes}
              initialData={lines[editingLineIndex]}
              isEditing
              onSave={handleEditLine}
              onCancel={() => setEditingLineIndex(null)}
            />
          </div>
        )}
      </div>

      {/* Informacion adicional en modo lectura para estados avanzados */}
      {['En Proceso', 'Parcial', 'Completada'].includes(solicitud.status) && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
          <h2 className="mb-2 text-base font-semibold text-gray-900">Programacion</h2>
          <p className="text-sm text-iconsa-gray">
            Informacion de programacion disponible en modulo de Programacion.
          </p>
        </div>
      )}

      {/* Barra de acciones */}
      {mode === 'edit' && (
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white p-4">
          <Button
            variant="primary"
            onClick={handleSave}
            loading={saving}
            disabled={!isDirty || saving}
          >
            Guardar Cambios
          </Button>

          {solicitud.status === 'Borrador' && (
            <Button
              variant="secondary"
              onClick={handleSend}
              loading={saving}
              disabled={saving}
            >
              Enviar Solicitud
            </Button>
          )}

          {canCancelSolicitud && (
            <Button
              variant="danger"
              onClick={() => setShowCancelConfirm(true)}
              disabled={saving}
            >
              Cancelar Solicitud
            </Button>
          )}

          <div className="ml-auto">
            <Button variant="ghost" onClick={() => router.push('/solicitudes')}>
              Volver
            </Button>
          </div>
        </div>
      )}

      {/* Volver en modo lectura */}
      {mode === 'readonly' && (
        <div className="mt-6">
          <Button variant="ghost" onClick={() => router.push('/solicitudes')}>
            <ArrowLeft className="h-4 w-4" />
            Volver a Solicitudes
          </Button>
        </div>
      )}

      {/* Modal de confirmacion de cancelacion */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Cancelar Solicitud</h3>
            <p className="mt-2 text-sm text-gray-600">
              ¿Esta seguro de que desea cancelar esta solicitud? Las lineas pendientes
              seran canceladas y las lineas programadas seran liberadas de sus viajes
              asignados. Esta accion no se puede deshacer.
            </p>
            <div className="mt-4 flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCancelConfirm(false)}
                disabled={saving}
              >
                No, volver
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleCancel}
                loading={saving}
              >
                Si, cancelar solicitud
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmacion de eliminar linea programada */}
      {deleteLineIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Eliminar Linea Programada</h3>
            <p className="mt-2 text-sm text-gray-600">
              Esta linea esta asignada a un viaje. Al eliminarla se removera la
              asignacion del viaje correspondiente. ¿Desea continuar?
            </p>
            <div className="mt-4 flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteLineIndex(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => performDeleteLine(deleteLineIndex)}
              >
                Eliminar linea
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
