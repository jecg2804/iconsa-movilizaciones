'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, ArrowLeft, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useProjects } from '@/hooks/useProjects'
import { useEquipment } from '@/hooks/useEquipment'
import { useLocations } from '@/hooks/useLocations'
import { useSolicitudes, type SolicitudInput, type LineInput } from '@/hooks/useSolicitudes'
import { useSubmitGuard } from '@/hooks/useSubmitGuard'
import { canCreateSolicitud } from '@/lib/utils/roles'
import { checkDuplicateLines } from '@/lib/utils/duplicates'
import type { DuplicateMatch } from '@/components/ui/DuplicateWarning'
import type { SelectOption } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { SolicitudForm } from '@/components/solicitudes/SolicitudForm'
import { LineEditor } from '@/components/solicitudes/LineEditor'
import { LineRow } from '@/components/solicitudes/LineRow'

// --- Tipos internos ---

interface PersonRow {
  id: string
  name: string
}

interface UnitRow {
  id: string
  code: string
  description: string | null
}

// --- Helpers ---

/** Resuelve el label de una opcion por su ID */
function getDisplayName(options: SelectOption[], id: string | null): string {
  if (!id) return ''
  return options.find((o) => o.value === id)?.label ?? ''
}

// --- Pagina ---

export default function NuevaSolicitudPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  // Auth y permisos
  const { person, role, userProjects: authUserProjects, userProjectIds, loading: authLoading } = useAuth()

  // Datos maestros
  const { allProjects, userProjects: projectsFromHook, loading: projectsLoading } = useProjects()
  const { equipment, loading: equipmentLoading } = useEquipment()
  const { locations, loading: locationsLoading } = useLocations()

  // Datos adicionales (fetch inline)
  const [people, setPeople] = useState<PersonRow[]>([])
  const [approvers, setApprovers] = useState<PersonRow[]>([])
  const [units, setUnits] = useState<UnitRow[]>([])
  const [peopleLoading, setPeopleLoading] = useState(true)
  const [unitsLoading, setUnitsLoading] = useState(true)

  // Estado del formulario
  const [header, setHeader] = useState<SolicitudInput>({
    project_id: '',
    requester_id: '',
    date_required: '',
    notes: null,
    fulfillment_type: 'fleet',
  })
  const [lines, setLines] = useState<LineInput[]>([])
  const [showLineEditor, setShowLineEditor] = useState(false)
  const [editingLineIndex, setEditingLineIndex] = useState<number | null>(null)
  // bulkRequiresCode eliminado — códigos siempre obligatorios (2026-04-16)
  const [headerErrors, setHeaderErrors] = useState<Record<string, string>>({})

  // Hook de solicitudes (para saveSolicitud)
  const { saveSolicitud, saving, saveError } = useSolicitudes()
  const guard = useSubmitGuard()

  // --- Fetch personas activas (solicitante) + aprobadores (pm) en paralelo ---
  useEffect(() => {
    async function fetchPeople() {
      setPeopleLoading(true)
      const [allResult, pmResult] = await Promise.all([
        supabase.from('people').select('id, name').eq('status', 'Activo').order('name'),
        supabase.from('people').select('id, name').eq('status', 'Activo').eq('app_role', 'pm').order('name'),
      ])
      setPeople(allResult.data ?? [])
      setApprovers(pmResult.data ?? [])
      setPeopleLoading(false)
    }
    fetchPeople()
  }, [supabase])

  // --- Fetch unidades ---
  useEffect(() => {
    async function fetchUnits() {
      setUnitsLoading(true)
      const { data } = await supabase
        .from('units')
        .select('id, code, description')
        .order('code')
      setUnits(data ?? [])
      setUnitsLoading(false)
    }
    fetchUnits()
  }, [supabase])

  // (Carga de cost_codes movida al hook useCostCodeCascade dentro de SolicitudForm — Cambio 2)

  // --- Inicializar requester_id con la persona logueada ---
  useEffect(() => {
    if (person && !header.requester_id) {
      setHeader((prev) => ({ ...prev, requester_id: person.id }))
    }
  }, [person, header.requester_id])

  // --- Transformar datos a SelectOption ---

  // Para PM: solo sus proyectos asignados. Para admin: todos los activos.
  const projectOptions: SelectOption[] = useMemo(() => {
    const projects = role === 'admin' ? allProjects : authUserProjects
    return projects.map((p) => ({
      value: p.id,
      label: `${p.code} — ${p.name}`,
    }))
  }, [role, allProjects, authUserProjects])

  const peopleOptions: SelectOption[] = useMemo(() => {
    return people.map((p) => ({ value: p.id, label: p.name }))
  }, [people])

  const approversOptions: SelectOption[] = useMemo(() => {
    return approvers.map((p) => ({ value: p.id, label: p.name }))
  }, [approvers])

  const equipmentOptions: SelectOption[] = useMemo(() => {
    return equipment.map((e) => ({
      value: e.id,
      label: `${e.spectrum_code ?? ''} – ${e.description}`.trim(),
      sublabel: e.equipment_type ?? undefined,
    }))
  }, [equipment])

  const locationOptions: SelectOption[] = useMemo(() => {
    return locations.map((l) => ({
      value: l.id,
      label: l.name,
      sublabel: l.location_type ?? undefined,
    }))
  }, [locations])

  const unitOptions: SelectOption[] = useMemo(() => {
    return units.map((u) => ({
      value: u.id,
      label: u.code,
      sublabel: u.description ?? undefined,
    }))
  }, [units])

  // (costCodeOptions eliminado — el hook useCostCodeCascade en SolicitudForm los carga directamente — Cambio 2)

  // --- Handlers de lineas ---

  const handleAddLine = useCallback(() => {
    setEditingLineIndex(null)
    setShowLineEditor(true)
  }, [])

  const handleEditLine = useCallback((index: number) => {
    setEditingLineIndex(index)
    setShowLineEditor(true)
  }, [])

  const handleDeleteLine = useCallback((index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index))
  }, [])

  // J8b: duplicar línea — copia la línea y la agrega al final de la lista.
  // No abre el editor; el usuario puede editar la copia después si quiere.
  const handleDuplicateLine = useCallback((index: number) => {
    setLines((prev) => {
      const original = prev[index]
      if (!original) return prev
      return [...prev, { ...original }]
    })
  }, [])

  const handleLineSave = useCallback(
    (line: LineInput) => {
      if (editingLineIndex !== null) {
        setLines((prev) =>
          prev.map((existing, i) => (i === editingLineIndex ? line : existing)),
        )
      } else {
        setLines((prev) => [...prev, line])
      }
      setShowLineEditor(false)
      setEditingLineIndex(null)
    },
    [editingLineIndex],
  )

  const handleLineCancel = useCallback(() => {
    setShowLineEditor(false)
    setEditingLineIndex(null)
  }, [])

  // --- Verificacion de duplicados ---
  const handleCheckDuplicates = useCallback(
    async (line: LineInput): Promise<DuplicateMatch[]> => {
      const results = await checkDuplicateLines(supabase, {
        lineType: line.line_type,
        equipmentId: line.equipment_id,
        description: line.description,
        fromLocationId: line.from_location_id,
        toLocationId: line.to_location_id,
      })
      return results.map((r) => ({
        requestId: r.requestId,
        lineNumber: r.lineNumber,
        description: r.description,
        status: r.status,
        route: `${r.fromName} → ${r.toName}`,
      }))
    },
    [supabase],
  )

  // --- Validacion ---

  const validateForDraft = useCallback((): boolean => {
    const errors: Record<string, string> = {}
    if (!header.project_id) errors.project = 'Seleccione un proyecto'
    if (!header.requester_id) errors.requester = 'Seleccione el solicitante'
    setHeaderErrors(errors)
    return Object.keys(errors).length === 0
  }, [header.project_id, header.requester_id])

  const validateForSend = useCallback((): boolean => {
    const errors: Record<string, string> = {}
    if (!header.project_id) errors.project = 'Seleccione un proyecto'
    if (!header.requester_id) errors.requester = 'Seleccione el solicitante'
    if (!header.date_required) {
      errors.date = 'Ingrese la fecha requerida'
    } else if (role !== 'admin') {
      const today = new Date().toISOString().split('T')[0]
      if (header.date_required < today) {
        errors.date = 'La fecha requerida no puede ser en el pasado'
      }
    }
    if (lines.length === 0) {
      errors.lines = 'Agregue al menos una linea a la solicitud'
    }
    if (!header.cost_code_id) {
      errors.cost_code = 'Seleccione el código de costo (Fase)'
    }
    if (!header.cost_category_id) {
      errors.cost_category = 'Seleccione la categoría de costo'
    }
    setHeaderErrors(errors)
    return Object.keys(errors).length === 0
  }, [header.project_id, header.requester_id, header.date_required, header.cost_code_id, header.cost_category_id, lines.length])

  // --- Guardar borrador ---
  const handleSaveDraft = guard(async () => {
    if (!validateForDraft()) return
    const result = await saveSolicitud(header, lines, [], 'Borrador', person?.id)
    if (result) {
      router.push('/solicitudes')
    }
  })

  // --- Enviar solicitud ---
  const handleSend = guard(async () => {
    if (!validateForSend()) return
    const result = await saveSolicitud(header, lines, [], 'Enviada', person?.id)
    if (result) {
      router.push('/solicitudes')
    }
  })

  // --- Estado de carga global ---
  const isLoading = authLoading || projectsLoading || equipmentLoading || locationsLoading || peopleLoading || unitsLoading

  // --- Guard de acceso ---
  if (!authLoading && !canCreateSolicitud(role)) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4">
        <h1 className="text-xl font-bold text-gray-900">Acceso denegado</h1>
        <p className="text-sm text-iconsa-gray">
          No tiene permisos para crear solicitudes.
        </p>
        <Button variant="secondary" onClick={() => router.push('/solicitudes')}>
          Volver a Solicitudes
        </Button>
      </div>
    )
  }

  // --- Loading ---
  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-navy" />
          <p className="text-sm text-iconsa-gray">Cargando formulario...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 pb-32 pt-4 sm:px-6 sm:pb-8 sm:pt-6">
      {/* Navegacion superior */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push('/solicitudes')}
          className="flex items-center gap-1.5 text-sm text-iconsa-gray hover:text-navy transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Solicitudes
        </button>
      </div>

      {/* Titulo */}
      <h1 className="text-2xl font-bold text-gray-900">Nueva Solicitud</h1>

      {/* Error global de guardado */}
      {saveError && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {saveError}
        </div>
      )}

      {/* Errores de validacion del header */}
      {(headerErrors.project || headerErrors.requester || headerErrors.date) && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3">
          <ul className="space-y-1 text-sm text-red-800">
            {headerErrors.project && <li>{headerErrors.project}</li>}
            {headerErrors.requester && <li>{headerErrors.requester}</li>}
            {headerErrors.date && <li>{headerErrors.date}</li>}
          </ul>
        </div>
      )}

      {/* Formulario de cabecera */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <SolicitudForm
          mode="create"
          projects={projectOptions}
          people={peopleOptions}
          approvers={approversOptions}
          onChange={setHeader}
          currentPersonId={person?.id ?? ''}
          role={role}
        />
      </div>

      {/* Seccion de lineas */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        {/* Header de seccion */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">
              Lineas de Solicitud
            </h2>
            {lines.length > 0 && (
              <span className="rounded-full bg-navy/10 px-2.5 py-0.5 text-xs font-medium text-navy">
                {lines.length}
              </span>
            )}
          </div>
          {!showLineEditor && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleAddLine}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Agregar Linea
            </Button>
          )}
        </div>

        {/* Error de lineas vacias */}
        {headerErrors.lines && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800">
            {headerErrors.lines}
          </div>
        )}

        {/* Lista de lineas */}
        {lines.length === 0 && !showLineEditor && (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-12 text-center">
            <p className="text-sm text-iconsa-gray">
              No hay lineas todavia.
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Agregue al menos una linea antes de enviar la solicitud.
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={handleAddLine}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Agregar Linea
            </Button>
          </div>
        )}

        {lines.length > 0 && (
          <div className="space-y-2">
            {lines.map((line, index) => (
              <LineRow
                key={`line-${index}`}
                line={line}
                lineNumber={index + 1}
                editable={true}
                canDelete={true}
                isScheduled={false}
                onEdit={() => handleEditLine(index)}
                onDelete={() => handleDeleteLine(index)}
                onDuplicate={() => handleDuplicateLine(index)}
                fromDisplay={getDisplayName(locationOptions, line.from_location_id)}
                toDisplay={getDisplayName(locationOptions, line.to_location_id)}
                unitDisplay={
                  line.unit_id
                    ? getDisplayName(unitOptions, line.unit_id)
                    : (line.unit_text ?? undefined)
                }
              />
            ))}
          </div>
        )}

        {/* Editor de linea (agregar o editar) */}
        {showLineEditor && (
          <div className="mt-4">
            <LineEditor
              equipment={equipmentOptions}
              locations={locationOptions}
              units={unitOptions}
              projectId={header.project_id}
              initialData={editingLineIndex !== null ? lines[editingLineIndex] : undefined}
              isEditing={editingLineIndex !== null}
              onSave={handleLineSave}
              onCancel={handleLineCancel}
              onCheckDuplicates={handleCheckDuplicates}
            />
          </div>
        )}
      </div>

      {/* Barra de acciones — sticky en mobile */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white px-4 py-3 shadow-lg sm:static sm:inset-auto sm:z-auto sm:mt-6 sm:rounded-lg sm:border sm:shadow-sm sm:px-6 sm:py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 sm:justify-end">
          <Button
            variant="ghost"
            onClick={() => router.push('/solicitudes')}
            disabled={saving}
          >
            Cancelar
          </Button>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={handleSaveDraft}
              loading={saving}
              disabled={saving}
            >
              Guardar Borrador
            </Button>
            <Button
              variant="primary"
              onClick={handleSend}
              loading={saving}
              disabled={saving}
            >
              Enviar Solicitud
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
