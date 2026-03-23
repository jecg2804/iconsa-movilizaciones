'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'
import {
  notifySolicitudEnviada,
  notifySolicitudEditada,
  notifySolicitudCancelada,
  notifySolicitudUrgenteNueva,
} from '@/lib/notifications/actions'

// --- Tipos exportados ---

export interface SolicitudWithRelations {
  id: string
  request_id: string | null
  project_id: string
  requester_id: string
  approved_by: string | null
  date_required: string
  date_created: string | null
  date_submitted: string | null
  date_completed: string | null
  date_cancelled: string | null
  status: string
  priority: string | null
  notes: string | null
  attachments: unknown
  created_at: string | null
  updated_at: string | null
  project: { id: string; code: string; name: string } | null
  requester: { id: string; name: string } | null
  lines: LineWithRelations[]
}

export interface LineWithRelations {
  id: string
  request_id: string
  line_number: number
  line_type: string
  equipment_id: string | null
  description: string
  equipment_text: string | null
  from_location_id: string | null
  from_text: string | null
  to_location_id: string | null
  to_text: string | null
  quantity: number
  unit_id: string | null
  unit_text: string | null
  cost_code_id: string | null
  cost_category_id: string | null
  category: string | null
  material_category: string | null
  po_reference: string | null
  notes: string | null
  status: string
  qty_scheduled: number | null
  qty_delivered: number | null
  created_at: string
  updated_at: string
  equipment: { id: string; spectrum_code: string | null; description: string } | null
  from_location: { id: string; name: string } | null
  to_location: { id: string; name: string } | null
  unit: { id: string; code: string; description: string | null } | null
  cost_code: { id: string; phase_code: string; phase_description: string | null; full_code: string | null } | null
  cost_category: { id: string; code: string; description: string | null } | null
}

export interface SolicitudInput {
  project_id: string
  requester_id: string
  approved_by?: string | null
  date_required: string
  notes?: string | null
  attachments?: unknown[] | null
  fulfillment_type?: string | null
}

export interface LineInput {
  id?: string
  line_type: 'Equipo' | 'Material'
  equipment_id: string | null
  equipment_text: string | null
  description: string
  from_location_id: string | null
  from_text: string | null
  to_location_id: string | null
  to_text: string | null
  quantity: number
  unit_id: string | null
  unit_text: string | null
  cost_code_id: string | null
  cost_category_id: string | null
  category: string | null
  material_category: string | null
  po_reference: string | null
  notes: string | null
  requires_code?: boolean | null
  designated_receiver_id?: string | null
  designated_receiver_name?: string | null
}

export interface SolicitudesFilter {
  projectId: string | null
  statuses: string[]
  priorities: string[]
  dateFrom: string | null
  dateTo: string | null
  search: string
  requesterId: string | null
  page: number
  pageSize: number
}

// --- Helpers privados ---

const DEFAULT_FILTER: SolicitudesFilter = {
  projectId: null,
  statuses: [],
  priorities: [],
  dateFrom: null,
  dateTo: null,
  search: '',
  requesterId: null,
  page: 0,
  pageSize: 20,
}

const SEQUENCE_CONFLICT_ERROR =
  'there is no unique or exclusion constraint matching the ON CONFLICT specification'

function isSequenceConflictError(message: string | undefined): boolean {
  if (!message) return false
  return message.toLowerCase().includes(SEQUENCE_CONFLICT_ERROR)
}

/**
 * Fallback para generar request_id desde cliente si el trigger falla por ON CONFLICT.
 * Mantiene formato {project_code}-SM-{###} por proyecto.
 */
async function generateRequestIdFallback(
  supabase: SupabaseClient<Database>,
  projectId: string,
): Promise<string | null> {
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('code')
    .eq('id', projectId)
    .single()

  if (projectError || !project?.code) {
    return null
  }

  const { data: existingRows } = await supabase
    .from('sm_requests')
    .select('request_id')
    .eq('project_id', projectId)
    .not('request_id', 'is', null)

  let maxSequence = 0
  for (const row of existingRows ?? []) {
    const requestId = row.request_id
    if (!requestId) continue

    const match = requestId.match(/-SM-(\d+)$/)
    if (!match) continue

    const parsed = Number(match[1])
    if (!Number.isNaN(parsed)) {
      maxSequence = Math.max(maxSequence, parsed)
    }
  }

  const nextSequence = maxSequence + 1
  const suffix = String(nextSequence).padStart(3, '0')
  return `${project.code}-SM-${suffix}`
}

/**
 * Crea registros en la tabla suggestions para valores de fallback (texto libre).
 * Se ignoran errores silenciosamente — las sugerencias son best-effort.
 */
async function createSuggestions(
  supabase: SupabaseClient<Database>,
  lines: LineInput[],
  personId: string,
): Promise<void> {
  const suggestions: Array<{
    table_name: string
    suggested_value: string
    suggested_by: string
  }> = []

  for (const line of lines) {
    if (line.equipment_text) {
      suggestions.push({
        table_name: 'equipment',
        suggested_value: line.equipment_text,
        suggested_by: personId,
      })
    }
    if (line.from_text) {
      suggestions.push({
        table_name: 'locations',
        suggested_value: line.from_text,
        suggested_by: personId,
      })
    }
    if (line.to_text) {
      suggestions.push({
        table_name: 'locations',
        suggested_value: line.to_text,
        suggested_by: personId,
      })
    }
    if (line.unit_text) {
      suggestions.push({
        table_name: 'units',
        suggested_value: line.unit_text,
        suggested_by: personId,
      })
    }
  }

  if (suggestions.length > 0) {
    await supabase.from('suggestions').insert(suggestions)
  }
}

/**
 * Convierte un LineInput al formato que espera Supabase para INSERT/UPDATE
 * en sm_request_lines.
 */
function lineInputToRow(
  line: LineInput,
  requestId: string,
  lineNumber: number,
) {
  return {
    request_id: requestId,
    line_number: lineNumber,
    line_type: line.line_type,
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
    cost_category_id: line.cost_category_id,
    category: line.category,
    material_category: line.material_category,
    po_reference: line.po_reference,
    notes: line.notes,
    requires_code: line.requires_code ?? false,
    designated_receiver_id: line.designated_receiver_id ?? null,
    designated_receiver_name: line.designated_receiver_name ?? null,
  }
}

// --- Hook principal ---

export function useSolicitudes(initialFilter?: Partial<SolicitudesFilter>) {
  const supabase = useMemo(() => createClient(), [])

  // Estado de lista
  const [solicitudes, setSolicitudes] = useState<SolicitudWithRelations[]>([])
  const [filters, setFiltersState] = useState<SolicitudesFilter>({
    ...DEFAULT_FILTER,
    ...initialFilter,
  })
  const [listLoading, setListLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)

  // Estado de mutaciones
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const busyRef = useRef(false)

  // --- Actualizar filtros parcialmente ---
  const setFilters = useCallback((updates: Partial<SolicitudesFilter>) => {
    setFiltersState((prev) => ({ ...prev, ...updates }))
  }, [])

  // --- Fetch lista ---
  const refetchList = useCallback(async () => {
    setListLoading(true)
    setListError(null)

    try {
      let query = supabase
        .from('sm_requests')
        .select(`
          *,
          project:projects!sm_requests_project_id_fkey(id, code, name),
          requester:people!sm_requests_requester_id_fkey(id, name),
          lines:sm_request_lines(id, status, line_type, description, quantity, notes, from_text, to_text, unit_text, from_location:locations!sm_request_lines_from_location_id_fkey(name), to_location:locations!sm_request_lines_to_location_id_fkey(name), unit:units(code))
        `, { count: 'exact' })
        .order('date_required', { ascending: true })

      // Aplicar filtros dinamicamente
      if (filters.projectId) {
        query = query.eq('project_id', filters.projectId)
      }
      if (filters.statuses.length > 0) {
        query = query.in('status', filters.statuses)
      }
      // Prioridad se filtra client-side (calculatePriority viva vs BD stale)
      if (filters.dateFrom) {
        query = query.gte('date_required', filters.dateFrom)
      }
      if (filters.dateTo) {
        query = query.lte('date_required', filters.dateTo)
      }
      if (filters.search) {
        query = query.ilike('request_id', `%${filters.search}%`)
      }
      if (filters.requesterId) {
        query = query.eq('requester_id', filters.requesterId)
      }

      // Paginación server-side
      const from = filters.page * filters.pageSize
      const to = from + filters.pageSize - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) {
        setListError(error.message)
        return
      }

      // Mapear la respuesta al tipo esperado
      const mapped: SolicitudWithRelations[] = (data ?? []).map((row) => {
        // Supabase devuelve el join como objeto o array segun cardinalidad
        const project = Array.isArray(row.project) ? row.project[0] : row.project
        const requester = Array.isArray(row.requester) ? row.requester[0] : row.requester
        const lines = Array.isArray(row.lines) ? row.lines : []

        return {
          id: row.id,
          request_id: row.request_id,
          project_id: row.project_id,
          requester_id: row.requester_id,
          approved_by: row.approved_by,
          date_required: row.date_required,
          date_created: row.date_created,
          date_submitted: row.date_submitted ?? null,
          date_completed: row.date_completed ?? null,
          date_cancelled: row.date_cancelled ?? null,
          status: row.status,
          priority: row.priority,
          notes: row.notes,
          attachments: row.attachments,
          created_at: row.created_at,
          updated_at: row.updated_at,
          project: project as SolicitudWithRelations['project'],
          requester: requester as SolicitudWithRelations['requester'],
          // Para la lista, las lineas solo traen id y status (sin relaciones completas)
          lines: lines as unknown as LineWithRelations[],
        }
      })

      setTotalCount(count ?? 0)
      setSolicitudes(mapped)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar solicitudes'
      setListError(message)
    } finally {
      setListLoading(false)
    }
  }, [supabase, filters])

  // Auto-fetch cuando cambian los filtros
  useEffect(() => {
    void refetchList()
  }, [refetchList])

  // --- Fetch detalle de una solicitud ---
  const fetchSolicitud = useCallback(
    async (id: string): Promise<SolicitudWithRelations | null> => {
      const { data, error } = await supabase
        .from('sm_requests')
        .select(`
          *,
          project:projects!sm_requests_project_id_fkey(id, code, name),
          requester:people!sm_requests_requester_id_fkey(id, name),
          lines:sm_request_lines(
            *,
            equipment:equipment!sm_request_lines_equipment_id_fkey(id, spectrum_code, description),
            from_location:locations!sm_request_lines_from_location_id_fkey(id, name),
            to_location:locations!sm_request_lines_to_location_id_fkey(id, name),
            unit:units!sm_request_lines_unit_id_fkey(id, code, description),
            cost_code:cost_codes!sm_request_lines_cost_code_id_fkey(id, phase_code, phase_description, full_code),
            cost_category:cost_categories!sm_request_lines_cost_category_id_fkey(id, code, description)
          )
        `)
        .eq('id', id)
        .single()

      if (error || !data) {
        return null
      }

      const project = Array.isArray(data.project) ? data.project[0] : data.project
      const requester = Array.isArray(data.requester) ? data.requester[0] : data.requester
      const rawLines = Array.isArray(data.lines) ? data.lines : []

      // Ordenar lineas por line_number
      const sortedLines = [...rawLines].sort(
        (a, b) => (a as { line_number: number }).line_number - (b as { line_number: number }).line_number,
      )

      // Mapear lineas con sus relaciones
      const lines: LineWithRelations[] = sortedLines.map((rawLine) => {
        const line = rawLine as Record<string, unknown>
        const eq = line.equipment as LineWithRelations['equipment']
        const fromLoc = line.from_location as LineWithRelations['from_location']
        const toLoc = line.to_location as LineWithRelations['to_location']
        const unit = line.unit as LineWithRelations['unit']
        const costCode = line.cost_code as LineWithRelations['cost_code']
        const costCategory = line.cost_category as LineWithRelations['cost_category']

        return {
          id: line.id as string,
          request_id: line.request_id as string,
          line_number: line.line_number as number,
          line_type: line.line_type as string,
          equipment_id: (line.equipment_id as string | null) ?? null,
          description: line.description as string,
          equipment_text: (line.equipment_text as string | null) ?? null,
          from_location_id: (line.from_location_id as string | null) ?? null,
          from_text: (line.from_text as string | null) ?? null,
          to_location_id: (line.to_location_id as string | null) ?? null,
          to_text: (line.to_text as string | null) ?? null,
          quantity: line.quantity as number,
          unit_id: (line.unit_id as string | null) ?? null,
          unit_text: (line.unit_text as string | null) ?? null,
          cost_code_id: (line.cost_code_id as string | null) ?? null,
          cost_category_id: (line.cost_category_id as string | null) ?? null,
          category: (line.category as string | null) ?? null,
          material_category: (line.material_category as string | null) ?? null,
          po_reference: (line.po_reference as string | null) ?? null,
          notes: (line.notes as string | null) ?? null,
          requires_code: (line.requires_code as boolean | null) ?? false,
          designated_receiver_id: (line.designated_receiver_id as string | null) ?? null,
          designated_receiver_name: (line.designated_receiver_name as string | null) ?? null,
          status: line.status as string,
          qty_scheduled: (line.qty_scheduled as number | null) ?? null,
          qty_delivered: (line.qty_delivered as number | null) ?? null,
          created_at: line.created_at as string,
          updated_at: line.updated_at as string,
          equipment: eq ? (Array.isArray(eq) ? eq[0] : eq) : null,
          from_location: fromLoc ? (Array.isArray(fromLoc) ? fromLoc[0] : fromLoc) : null,
          to_location: toLoc ? (Array.isArray(toLoc) ? toLoc[0] : toLoc) : null,
          unit: unit ? (Array.isArray(unit) ? unit[0] : unit) : null,
          cost_code: costCode ? (Array.isArray(costCode) ? costCode[0] : costCode) : null,
          cost_category: costCategory ? (Array.isArray(costCategory) ? costCategory[0] : costCategory) : null,
        }
      })

      return {
        id: data.id,
        request_id: data.request_id,
        project_id: data.project_id,
        requester_id: data.requester_id,
        approved_by: data.approved_by,
        date_required: data.date_required,
        date_created: data.date_created,
        date_submitted: data.date_submitted,
        date_completed: data.date_completed,
        date_cancelled: data.date_cancelled,
        status: data.status,
        priority: data.priority,
        notes: data.notes,
        attachments: data.attachments,
        created_at: data.created_at,
        updated_at: data.updated_at,
        project: project as SolicitudWithRelations['project'],
        requester: requester as SolicitudWithRelations['requester'],
        lines,
      }
    },
    [supabase],
  )

  // --- Crear solicitud nueva ---
  const saveSolicitud = useCallback(
    async (
      header: SolicitudInput,
      lines: LineInput[],
      _deletedLineIds: string[],
      status: 'Borrador' | 'Enviada',
      personId?: string,
    ): Promise<{ id: string; requestId: string } | null> => {
      if (busyRef.current) return null
      busyRef.current = true
      setSaving(true)
      setSaveError(null)

      try {
        const headerPayload = {
          project_id: header.project_id,
          requester_id: header.requester_id,
          approved_by: header.approved_by ?? null,
          date_required: header.date_required,
          notes: header.notes ?? null,
          attachments: JSON.parse(JSON.stringify(header.attachments ?? [])),
          fulfillment_type: header.fulfillment_type ?? 'fleet',
          status,
          created_by: personId ?? null,
        }

        // 1. Insertar el header
        let { data: insertedRequest, error: headerError } = await supabase
          .from('sm_requests')
          .insert(headerPayload)
          .select('id, request_id')
          .single()

        // Fallback: si falla trigger por ON CONFLICT, reintentar enviando request_id manual.
        if ((headerError || !insertedRequest) && isSequenceConflictError(headerError?.message)) {
          const fallbackRequestId = await generateRequestIdFallback(supabase, header.project_id)

          if (fallbackRequestId) {
            const retry = await supabase
              .from('sm_requests')
              .insert({
                ...headerPayload,
                request_id: fallbackRequestId,
              })
              .select('id, request_id')
              .single()

            insertedRequest = retry.data
            headerError = retry.error
          }
        }

        if (headerError || !insertedRequest) {
          setSaveError(headerError?.message ?? 'Error al crear la solicitud')
          return null
        }

        const newId = insertedRequest.id

        // 2. Insertar lineas
        if (lines.length > 0) {
          const lineRows = lines.map((line, index) =>
            lineInputToRow(line, newId, index + 1),
          )

          const { error: linesError } = await supabase
            .from('sm_request_lines')
            .insert(lineRows)

          if (linesError) {
            setSaveError(`Solicitud creada pero error al guardar líneas: ${linesError.message}`)
            return null
          }
        }

        // 3. Crear sugerencias para valores de fallback
        await createSuggestions(supabase, lines, header.requester_id)

        // 4. Re-fetch para obtener el request_id auto-generado por trigger
        const { data: refreshed } = await supabase
          .from('sm_requests')
          .select('request_id')
          .eq('id', newId)
          .single()

        // Notificar si se envió directamente (status = Enviada)
        if (status === 'Enviada') {
          notifySolicitudEnviada(newId).catch(console.error)
          notifySolicitudUrgenteNueva(newId).catch(console.error)
        }

        return {
          id: newId,
          requestId: refreshed?.request_id ?? '',
        }
      } catch (err) {
        busyRef.current = false
        const message = err instanceof Error ? err.message : 'Error inesperado al guardar'
        setSaveError(message)
        return null
      } finally {
        setSaving(false)
      }
    },
    [supabase],
  )

  // --- Actualizar solicitud existente ---
  const updateSolicitud = useCallback(
    async (
      id: string,
      header: Partial<SolicitudInput>,
      lines: LineInput[],
      deletedLineIds: string[],
      personId?: string,
    ): Promise<boolean> => {
      if (busyRef.current) return false
      busyRef.current = true
      setSaving(true)
      setSaveError(null)

      try {
        // 1. Actualizar header
        const headerUpdate: Record<string, unknown> = {}
        if (header.project_id !== undefined) headerUpdate.project_id = header.project_id
        if (header.requester_id !== undefined) headerUpdate.requester_id = header.requester_id
        if (header.approved_by !== undefined) headerUpdate.approved_by = header.approved_by
        if (header.date_required !== undefined) headerUpdate.date_required = header.date_required
        if (header.notes !== undefined) headerUpdate.notes = header.notes
        if (header.attachments !== undefined) headerUpdate.attachments = header.attachments
        if (header.fulfillment_type !== undefined) headerUpdate.fulfillment_type = header.fulfillment_type
        if (personId) headerUpdate.updated_by = personId

        if (Object.keys(headerUpdate).length > 0) {
          const { error: headerError } = await supabase
            .from('sm_requests')
            .update(headerUpdate)
            .eq('id', id)

          if (headerError) {
            setSaveError(headerError.message)
            return false
          }
        }

        // 2. Eliminar lineas marcadas para eliminacion
        for (const lineId of deletedLineIds) {
          // Primero eliminar asignaciones de viaje (si existen)
          await supabase
            .from('trip_line_assignments')
            .delete()
            .eq('request_line_id', lineId)

          // Luego eliminar la linea
          const { error: deleteError } = await supabase
            .from('sm_request_lines')
            .delete()
            .eq('id', lineId)

          if (deleteError) {
            setSaveError(`Error al eliminar línea: ${deleteError.message}`)
            return false
          }
        }

        // 3. Calcular el proximo line_number para lineas nuevas
        const { data: existingLines } = await supabase
          .from('sm_request_lines')
          .select('line_number')
          .eq('request_id', id)
          .order('line_number', { ascending: false })
          .limit(1)

        let nextLineNumber = (existingLines?.[0]?.line_number ?? 0) + 1

        // 4. Actualizar lineas existentes e insertar nuevas
        for (const line of lines) {
          if (line.id) {
            // Linea existente: actualizar
            const lineUpdate: Record<string, unknown> = {
                line_type: line.line_type,
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
                cost_category_id: line.cost_category_id,
                category: line.category,
                material_category: line.material_category,
                po_reference: line.po_reference,
                notes: line.notes,
                requires_code: line.requires_code ?? false,
                designated_receiver_id: line.designated_receiver_id ?? null,
                designated_receiver_name: line.designated_receiver_name ?? null,
              }
            if (personId) lineUpdate.updated_by = personId

            const { error: updateError } = await supabase
              .from('sm_request_lines')
              .update(lineUpdate)
              .eq('id', line.id)

            if (updateError) {
              setSaveError(`Error al actualizar línea: ${updateError.message}`)
              return false
            }
          } else {
            // Linea nueva: insertar (solo permitido en Borrador)
            const { error: insertError } = await supabase
              .from('sm_request_lines')
              .insert(lineInputToRow(line, id, nextLineNumber))

            if (insertError) {
              setSaveError(`Error al agregar línea: ${insertError.message}`)
              return false
            }
            nextLineNumber++
          }
        }

        // 5. Crear sugerencias para valores de fallback de lineas nuevas
        const newLines = lines.filter((l) => !l.id)
        if (newLines.length > 0) {
          const requesterId = header.requester_id
          if (requesterId) {
            await createSuggestions(supabase, newLines, requesterId)
          }
        }

        // Notificar edición (action verifica que status sea Enviada/En Proceso)
        if (personId) {
          notifySolicitudEditada(id, personId).catch(console.error)
        }

        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error inesperado al actualizar'
        setSaveError(message)
        return false
      } finally {
        busyRef.current = false
        setSaving(false)
      }
    },
    [supabase],
  )

  // --- Cancelar solicitud ---
  const cancelSolicitud = useCallback(
    async (id: string, personId?: string): Promise<boolean> => {
      if (busyRef.current) return false
      busyRef.current = true
      setSaving(true)
      setSaveError(null)

      try {
        // 1. Obtener las lineas de la solicitud
        const { data: lines, error: fetchError } = await supabase
          .from('sm_request_lines')
          .select('id, status')
          .eq('request_id', id)

        if (fetchError) {
          setSaveError(fetchError.message)
          return false
        }

        // 2. Para lineas Programadas: eliminar asignaciones de viaje
        const programmedLines = (lines ?? []).filter((l) => l.status === 'Programada')
        for (const line of programmedLines) {
          await supabase
            .from('trip_line_assignments')
            .delete()
            .eq('request_line_id', line.id)
        }

        // 3. Actualizar todas las lineas Pendiente y Programada a Cancelada
        const lineIdsToCancel = (lines ?? [])
          .filter((l) => l.status === 'Pendiente' || l.status === 'Programada')
          .map((l) => l.id)

        if (lineIdsToCancel.length > 0) {
          const { error: cancelLinesError } = await supabase
            .from('sm_request_lines')
            .update({ status: 'Cancelada' })
            .in('id', lineIdsToCancel)

          if (cancelLinesError) {
            setSaveError(cancelLinesError.message)
            return false
          }
        }

        // 4. Actualizar el status del header a Cancelada
        const { error: cancelError } = await supabase
          .from('sm_requests')
          .update({ status: 'Cancelada' })
          .eq('id', id)

        if (cancelError) {
          setSaveError(cancelError.message)
          return false
        }

        // Notificar cancelación
        notifySolicitudCancelada(id, personId).catch(console.error)

        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error inesperado al cancelar'
        setSaveError(message)
        return false
      } finally {
        busyRef.current = false
        setSaving(false)
      }
    },
    [supabase],
  )

  return {
    // Lista
    solicitudes,
    totalCount,
    filters,
    setFilters,
    listLoading,
    listError,
    refetchList,

    // Detalle
    fetchSolicitud,

    // Mutaciones
    saveSolicitud,
    updateSolicitud,
    cancelSolicitud,

    saving,
    saveError,
  }
}
