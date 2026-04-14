'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'
import {
  notifyLineasProgramadas,
  notifyViajeAsignadoConductor,
  notifyViajeCancelado,
} from '@/lib/notifications/actions'

// --- Tipos exportados ---

// Línea de backlog: sm_request_lines con info de la solicitud padre
export interface BacklogLine {
  id: string
  request_id: string
  line_number: number
  line_type: string
  equipment_id: string | null
  description: string
  from_location_id: string | null
  from_text: string | null
  to_location_id: string | null
  to_text: string | null
  quantity: number
  unit_id: string | null
  unit_text: string | null
  cost_code_id: string | null
  category: string | null
  status: string
  notes: string | null
  qty_scheduled: number
  qty_delivered: number
  // Relaciones unidas
  equipment: { id: string; spectrum_code: string | null; description: string } | null
  from_location: { id: string; name: string } | null
  to_location: { id: string; name: string } | null
  unit: { id: string; code: string } | null
  // Info de la solicitud padre
  request: {
    id: string
    request_id: string | null
    project: { id: string; code: string; name: string } | null
    requester: { id: string; name: string } | null
    priority: string | null
    date_required: string
    status: string
    notes: string | null
    attachments: unknown[] | null
  }
}

export interface TripAssignment {
  id: string
  trip_id: string
  request_line_id: string
  quantity_assigned: number
  qty_delivered: number
  qty_dispatched: number
  // Info de la línea asignada
  line: {
    id: string
    line_number: number
    line_type: string
    description: string
    quantity: number
    status: string
    notes: string | null
    from_location: { id: string; name: string } | null
    to_location: { id: string; name: string } | null
    unit: { id: string; code: string } | null
    qty_scheduled: number
    qty_delivered: number
    from_text: string | null
    to_text: string | null
    unit_text: string | null
    requires_code: boolean
    designated_receiver_id: string | null
    designated_receiver_name: string | null
    equipment: { id: string; spectrum_code: string | null; description: string } | null
    request: {
      id: string
      request_id: string | null
      project: { id: string; code: string; name: string } | null
      date_required: string | null
      requester: { id: string; name: string } | null
    }
  } | null
}

export interface TripWithRelations {
  id: string
  trip_id: string | null
  scheduled_date: string
  driver_id: string | null
  vehicle_id: string | null
  trailer_id: string | null
  rate_id: string | null
  cost: number | null
  att_permit: boolean | null
  escort: boolean | null
  confirmation_code: string | null
  status: string
  notes: string | null
  actual_departure: string | null
  actual_arrival: string | null
  route_summary: string | null
  is_external: boolean | null
  is_self_pickup: boolean
  attachments: unknown[] | null
  created_at: string
  updated_at: string
  // Relaciones unidas
  driver: { id: string; name: string } | null
  vehicle: { id: string; spectrum_code: string | null; description: string } | null
  trailer: { id: string; spectrum_code: string | null; description: string } | null
  rate: { id: string; code: string; description: string; rate: number } | null
  assignments: TripAssignment[]
}

export interface TripInput {
  scheduled_date: string
  scheduled_time: string | null
  driver_id: string | null
  vehicle_id: string | null
  trailer_id: string | null
  rate_id: string | null
  cost: number | null
  att_permit: boolean
  escort: boolean
  notes: string | null
  is_external: boolean
  is_self_pickup?: boolean
  attachments?: unknown[] | null
}

export interface AssignmentInput {
  request_line_id: string
  quantity_assigned: number
}

export interface ModifiedAssignment {
  id: string                // trip_line_assignments.id
  request_line_id: string
  quantity_assigned: number // nuevo valor
  original_quantity: number // valor original para calcular delta
}

export interface TripsFilter {
  status?: string | null
  dateFrom?: string | null
  dateTo?: string | null
  conductorId?: string | null
  search?: string | null
  page: number
  pageSize: number
}

// --- Constantes privadas ---

// Orden de prioridad para clasificar líneas del backlog (menor = más urgente)
const PRIORITY_ORDER: Record<string, number> = {
  Vencida: 0,
  Urgente: 1,
  'Próxima': 2,
  Normal: 3,
}

const DEFAULT_FILTER: TripsFilter = {
  status: null,
  dateFrom: null,
  dateTo: null,
  conductorId: null,
  search: null,
  page: 0,
  pageSize: 20,
}

// --- Helpers privados ---

/**
 * Extrae un objeto de relación Supabase que puede llegar como array o como objeto.
 * Supabase devuelve joins como objetos para to-one y arrays para to-many.
 */
function unwrapRelation<T>(value: T | T[] | null | undefined): T | null {
  if (value === null || value === undefined) return null
  if (Array.isArray(value)) return value[0] ?? null
  return value
}

/**
 * Mapea una fila cruda de la lista de viajes al tipo TripWithRelations.
 * Las asignaciones en la lista no incluyen detalles de línea.
 */
function mapTripRow(row: Record<string, unknown>): TripWithRelations {
  const driver = unwrapRelation(row.driver as TripWithRelations['driver'] | TripWithRelations['driver'][])
  const vehicle = unwrapRelation(row.vehicle as TripWithRelations['vehicle'] | TripWithRelations['vehicle'][])
  const trailer = unwrapRelation(row.trailer as TripWithRelations['trailer'] | TripWithRelations['trailer'][])
  const rate = unwrapRelation(row.rate as TripWithRelations['rate'] | TripWithRelations['rate'][])
  const rawAssignments = Array.isArray(row.assignments) ? row.assignments : []

  // Las asignaciones de la lista incluyen datos mínimos de línea (solo from/to para ruta)
  const assignments: TripAssignment[] = (rawAssignments as Record<string, unknown>[]).map((a) => {
    const rawLine = a.line as Record<string, unknown> | null
    let line: TripAssignment['line'] = null
    if (rawLine) {
      const fromLoc = unwrapRelation(rawLine.from_location as { id: string; name: string } | null)
      const toLoc = unwrapRelation(rawLine.to_location as { id: string; name: string } | null)
      const rawRequest = unwrapRelation(rawLine.request as Record<string, unknown> | null) as Record<string, unknown> | null
      const unitRel = unwrapRelation(rawLine.unit as { id: string; code: string } | null)
      const equipRel = unwrapRelation(rawLine.equipment as { id: string; spectrum_code: string | null; description: string } | null)
      line = {
        id: rawLine.id as string,
        line_number: (rawLine.line_number as number) ?? 0,
        line_type: (rawLine.line_type as string) ?? '',
        description: (rawLine.description as string) ?? '',
        quantity: (rawLine.quantity as number) ?? 0,
        status: (rawLine.status as string) ?? '',
        notes: (rawLine.notes as string | null) ?? null,
        qty_scheduled: (rawLine.qty_scheduled as number) ?? 0,
        qty_delivered: (rawLine.qty_delivered as number) ?? 0,
        from_location: fromLoc,
        to_location: toLoc,
        unit: unitRel,
        from_text: (rawLine.from_text as string | null) ?? null,
        to_text: (rawLine.to_text as string | null) ?? null,
        unit_text: (rawLine.unit_text as string | null) ?? null,
        requires_code: (rawLine.requires_code as boolean) ?? false,
        designated_receiver_id: (rawLine.designated_receiver_id as string | null) ?? null,
        designated_receiver_name: (rawLine.designated_receiver_name as string | null) ?? null,
        equipment: equipRel,
        request: rawRequest
          ? {
              id: rawRequest['id'] as string,
              request_id: (rawRequest['request_id'] as string | null) ?? null,
              date_required: (rawRequest['date_required'] as string | null) ?? null,
              project: unwrapRelation(rawRequest['project'] as { id: string; code: string; name: string } | null),
              requester: unwrapRelation(rawRequest['requester'] as { id: string; name: string } | null),
            }
          : { id: '', request_id: null, date_required: null, project: null, requester: null },
      }
    }
    return {
      id: a.id as string,
      trip_id: a.trip_id as string,
      request_line_id: a.request_line_id as string,
      quantity_assigned: a.quantity_assigned as number,
      qty_delivered: (a.qty_delivered as number) ?? 0,
      qty_dispatched: (a.qty_dispatched as number) ?? 0,
      line,
    }
  })

  return {
    id: row.id as string,
    trip_id: (row.trip_id as string | null) ?? null,
    scheduled_date: row.scheduled_date as string,
    driver_id: (row.driver_id as string | null) ?? null,
    vehicle_id: (row.vehicle_id as string | null) ?? null,
    trailer_id: (row.trailer_id as string | null) ?? null,
    rate_id: (row.rate_id as string | null) ?? null,
    cost: (row.cost as number | null) ?? null,
    att_permit: (row.att_permit as boolean | null) ?? null,
    escort: (row.escort as boolean | null) ?? null,
    confirmation_code: (row.confirmation_code as string | null) ?? null,
    status: row.status as string,
    notes: (row.notes as string | null) ?? null,
    actual_departure: (row.actual_departure as string | null) ?? null,
    actual_arrival: (row.actual_arrival as string | null) ?? null,
    route_summary: (row.route_summary as string | null) ?? null,
    is_external: (row.is_external as boolean | null) ?? null,
    is_self_pickup: (row.is_self_pickup as boolean) ?? false,
    attachments: (row.attachments as unknown[] | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    driver,
    vehicle,
    trailer,
    rate,
    assignments,
  }
}

/**
 * Mapea una asignación con detalles completos de línea para la vista de detalle.
 */
function mapAssignmentWithLine(a: Record<string, unknown>): TripAssignment {
  const rawLine = a.line as Record<string, unknown> | null
  let line: TripAssignment['line'] = null

  if (rawLine) {
    const fromLoc = unwrapRelation(rawLine.from_location as { id: string; name: string } | null)
    const toLoc = unwrapRelation(rawLine.to_location as { id: string; name: string } | null)
    const unit = unwrapRelation(rawLine.unit as { id: string; code: string } | null)
    const equipment = unwrapRelation(rawLine.equipment as { id: string; spectrum_code: string | null; description: string } | null)
    const rawRequest = unwrapRelation(rawLine.request as Record<string, unknown> | null) as Record<string, unknown> | null

    line = {
      id: rawLine.id as string,
      line_number: rawLine.line_number as number,
      line_type: rawLine.line_type as string,
      description: rawLine.description as string,
      quantity: rawLine.quantity as number,
      status: rawLine.status as string,
      notes: (rawLine.notes as string | null) ?? null,
      qty_scheduled: (rawLine.qty_scheduled as number) ?? 0,
      qty_delivered: (rawLine.qty_delivered as number) ?? 0,
      from_location: fromLoc,
      to_location: toLoc,
      unit,
      from_text: (rawLine.from_text as string | null) ?? null,
      to_text: (rawLine.to_text as string | null) ?? null,
      unit_text: (rawLine.unit_text as string | null) ?? null,
      requires_code: (rawLine.requires_code as boolean) ?? false,
      designated_receiver_id: (rawLine.designated_receiver_id as string | null) ?? null,
      designated_receiver_name: (rawLine.designated_receiver_name as string | null) ?? null,
      equipment,
      request: rawRequest
        ? {
            id: rawRequest['id'] as string,
            request_id: (rawRequest['request_id'] as string | null) ?? null,
            date_required: (rawRequest['date_required'] as string | null) ?? null,
            project: unwrapRelation(rawRequest['project'] as { id: string; code: string; name: string } | null),
            requester: unwrapRelation(rawRequest['requester'] as { id: string; name: string } | null),
          }
        : { id: '', request_id: null, date_required: null, project: null, requester: null },
    }
  }

  return {
    id: a.id as string,
    trip_id: a.trip_id as string,
    request_line_id: a.request_line_id as string,
    quantity_assigned: a.quantity_assigned as number,
    qty_delivered: (a.qty_delivered as number) ?? 0,
    qty_dispatched: (a.qty_dispatched as number) ?? 0,
    line,
  }
}

// --- Función auxiliar para actualizar líneas al cancelar asignaciones ---

/**
 * Libera una línea de una asignación de viaje:
 * - Resta la cantidad asignada de qty_scheduled
 * - Si qty_scheduled llega a 0, revierte el estado a 'Pendiente'
 */
async function releaseLineFromAssignment(
  supabase: SupabaseClient<Database>,
  requestLineId: string,
  quantityAssigned: number,
): Promise<boolean> {
  // Obtener el estado actual y qty_scheduled de la línea
  const { data: line, error: fetchError } = await supabase
    .from('sm_request_lines')
    .select('id, status, qty_scheduled, qty_delivered')
    .eq('id', requestLineId)
    .single()

  if (fetchError || !line) return false

  // No revertir líneas en estados terminales (protección contra datos inconsistentes)
  if (['Entregada', 'Cancelada'].includes(line.status)) return true

  const newQtyScheduled = Math.max(0, (line.qty_scheduled ?? 0) - quantityAssigned)
  // Si no queda cantidad programada, determinar estado según entregas previas
  let newStatus = line.status
  if (newQtyScheduled <= 0) {
    newStatus = (line.qty_delivered ?? 0) > 0 ? 'Parcial' : 'Pendiente'
  }

  const { error: updateError } = await supabase
    .from('sm_request_lines')
    .update({
      qty_scheduled: newQtyScheduled,
      status: newStatus,
    })
    .eq('id', requestLineId)

  return !updateError
}

// --- Hook principal ---

export function useTrips(initialFilter?: Partial<TripsFilter>) {
  const supabase = useMemo(() => createClient(), [])

  // Estado del backlog de líneas pendientes
  const [backlog, setBacklog] = useState<BacklogLine[]>([])
  const [backlogLoading, setBacklogLoading] = useState(false)

  // Estado de la lista de viajes
  const [trips, setTrips] = useState<TripWithRelations[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [tripsTotalCount, setTripsTotalCount] = useState(0)

  // Filtros para la lista de viajes
  const [filters, setFiltersState] = useState<TripsFilter>({
    ...DEFAULT_FILTER,
    ...initialFilter,
  })

  // Estado de mutaciones
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const busyRef = useRef(false)

  // --- Actualizar filtros parcialmente ---
  const setFilters = useCallback((updates: Partial<TripsFilter>) => {
    setFiltersState((prev) => ({ ...prev, ...updates }))
  }, [])

  // --- Fetch backlog de líneas pendientes ---
  const refetchBacklog = useCallback(async () => {
    setBacklogLoading(true)

    try {
      // Traer todas las líneas en estado Pendiente cuyas solicitudes padre
      // no estén Canceladas, Completadas, ni en Borrador (no enviadas aún)
      const { data, error } = await supabase
        .from('sm_request_lines')
        .select(`
          id,
          request_id,
          line_number,
          line_type,
          equipment_id,
          description,
          from_location_id,
          from_text,
          to_location_id,
          to_text,
          quantity,
          unit_id,
          unit_text,
          cost_code_id,
          category,
          notes,
          status,
          qty_scheduled,
          qty_delivered,
          equipment:equipment_id(id, spectrum_code, description),
          from_location:from_location_id(id, name),
          to_location:to_location_id(id, name),
          unit:unit_id(id, code),
          request:request_id!inner(
            id,
            request_id,
            priority,
            date_required,
            status,
            notes,
            attachments,
            project:project_id(id, code, name),
            requester:requester_id(id, name)
          )
        `)
        .in('status', ['Pendiente', 'Parcial', 'Programada', 'En Transito'])
        // Excluir solicitudes que no deben aparecer en el backlog
        .not('request.status', 'in', '("Cancelada","Completada","Borrador")')

      if (error) {
        // Error silencioso en backlog — la UI mostrará lista vacía
        setBacklog([])
        return
      }

      const rows = (data ?? []) as unknown as Record<string, unknown>[]

      const mapped: BacklogLine[] = rows.map((row) => {
        const equipment = unwrapRelation(row.equipment as BacklogLine['equipment'] | BacklogLine['equipment'][])
        const fromLoc = unwrapRelation(row.from_location as BacklogLine['from_location'] | BacklogLine['from_location'][])
        const toLoc = unwrapRelation(row.to_location as BacklogLine['to_location'] | BacklogLine['to_location'][])
        const unit = unwrapRelation(row.unit as BacklogLine['unit'] | BacklogLine['unit'][])
        const rawRequest = unwrapRelation(row.request as Record<string, unknown> | Record<string, unknown>[])

        const request: BacklogLine['request'] = rawRequest
          ? {
              id: rawRequest.id as string,
              request_id: (rawRequest.request_id as string | null) ?? null,
              priority: (rawRequest.priority as string | null) ?? null,
              date_required: rawRequest.date_required as string,
              status: rawRequest.status as string,
              notes: (rawRequest.notes as string | null) ?? null,
              attachments: (rawRequest.attachments as unknown[] | null) ?? null,
              project: unwrapRelation(rawRequest.project as BacklogLine['request']['project'] | null),
              requester: unwrapRelation(rawRequest.requester as BacklogLine['request']['requester'] | null),
            }
          : { id: '', request_id: null, priority: null, date_required: '', status: '', notes: null, attachments: null, project: null, requester: null }

        return {
          id: row.id as string,
          request_id: row.request_id as string,
          line_number: row.line_number as number,
          line_type: row.line_type as string,
          equipment_id: (row.equipment_id as string | null) ?? null,
          description: row.description as string,
          from_location_id: (row.from_location_id as string | null) ?? null,
          from_text: (row.from_text as string | null) ?? null,
          to_location_id: (row.to_location_id as string | null) ?? null,
          to_text: (row.to_text as string | null) ?? null,
          quantity: row.quantity as number,
          unit_id: (row.unit_id as string | null) ?? null,
          unit_text: (row.unit_text as string | null) ?? null,
          cost_code_id: (row.cost_code_id as string | null) ?? null,
          category: (row.category as string | null) ?? null,
          notes: (row.notes as string | null) ?? null,
          status: row.status as string,
          qty_scheduled: (row.qty_scheduled as number) ?? 0,
          qty_delivered: (row.qty_delivered as number) ?? 0,
          equipment,
          from_location: fromLoc,
          to_location: toLoc,
          unit,
          request,
        }
      })

      // Ordenar por prioridad (Vencida primero) luego por fecha requerida ascendente.
      // El ordenamiento se hace en cliente porque priority es campo calculado en la BD.
      const sorted = [...mapped].sort((a, b) => {
        const pa = PRIORITY_ORDER[a.request.priority ?? 'Normal'] ?? 3
        const pb = PRIORITY_ORDER[b.request.priority ?? 'Normal'] ?? 3
        if (pa !== pb) return pa - pb
        // Desempate por fecha requerida (más próxima primero)
        return a.request.date_required.localeCompare(b.request.date_required)
      })

      // Solo líneas con cantidad disponible > 0
      const available = sorted.filter((line) => {
        const avail = line.quantity - (line.qty_scheduled ?? 0) - (line.qty_delivered ?? 0)
        return avail > 0
      })

      setBacklog(available)
    } catch {
      setBacklog([])
    } finally {
      setBacklogLoading(false)
    }
  }, [supabase])

  // --- Fetch lista de viajes ---
  const refetchTrips = useCallback(async () => {
    setListLoading(true)
    setListError(null)

    try {
      let query = supabase
        .from('trips')
        .select(`
          *,
          driver:driver_id(id, name),
          vehicle:vehicle_id(id, spectrum_code, description),
          trailer:trailer_id(id, spectrum_code, description),
          rate:rate_id(id, code, description, rate),
          assignments:trip_line_assignments(
            id,
            trip_id,
            request_line_id,
            quantity_assigned,
            qty_delivered,
            qty_dispatched,
            line:request_line_id(
              id,
              line_number,
              line_type,
              description,
              quantity,
              status,
              notes,
              qty_scheduled,
              qty_delivered,
              requires_code,
              designated_receiver_id,
              designated_receiver_name,
              from_location:from_location_id(id, name),
              to_location:to_location_id(id, name),
              from_text,
              to_text,
              unit_text,
              unit:unit_id(id, code),
              equipment:equipment_id(id, spectrum_code, description),
              request:request_id(
                id,
                request_id,
                date_required,
                project:project_id(id, code, name),
                requester:requester_id(id, name)
              )
            )
          )
        `, { count: 'exact' })
        .order('scheduled_date', { ascending: false })

      // Aplicar filtros dinámicamente
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.dateFrom) {
        query = query.gte('scheduled_date', filters.dateFrom)
      }
      if (filters.dateTo) {
        query = query.lte('scheduled_date', filters.dateTo)
      }
      if (filters.conductorId) {
        query = query.eq('driver_id', filters.conductorId)
      }
      if (filters.search) {
        query = query.ilike('trip_id', `%${filters.search}%`)
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

      const mapped: TripWithRelations[] = (data ?? []).map((row) =>
        mapTripRow(row as unknown as Record<string, unknown>),
      )

      setTripsTotalCount(count ?? 0)
      setTrips(mapped)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar viajes'
      setListError(message)
    } finally {
      setListLoading(false)
    }
  }, [supabase, filters])

  // Auto-fetch al montar y cuando cambian los filtros
  useEffect(() => {
    void refetchBacklog()
  }, [refetchBacklog])

  useEffect(() => {
    void refetchTrips()
  }, [refetchTrips])

  // --- Fetch detalle de un viaje (con líneas completas) ---
  const fetchTrip = useCallback(
    async (id: string): Promise<TripWithRelations | null> => {
      const { data, error } = await supabase
        .from('trips')
        .select(`
          *,
          driver:driver_id(id, name),
          vehicle:vehicle_id(id, spectrum_code, description),
          trailer:trailer_id(id, spectrum_code, description),
          rate:rate_id(id, code, description, rate),
          assignments:trip_line_assignments(
            id,
            trip_id,
            request_line_id,
            quantity_assigned,
            qty_delivered,
            qty_dispatched,
            line:request_line_id(
              id,
              line_number,
              line_type,
              description,
              quantity,
              status,
              notes,
              qty_scheduled,
              qty_delivered,
              requires_code,
              designated_receiver_id,
              designated_receiver_name,
              from_text,
              to_text,
              unit_text,
              from_location:from_location_id(id, name),
              to_location:to_location_id(id, name),
              unit:unit_id(id, code),
              equipment:equipment_id(id, spectrum_code, description),
              request:request_id(
                id,
                request_id,
                date_required,
                project:project_id(id, code, name),
                requester:requester_id(id, name)
              )
            )
          )
        `)
        .eq('id', id)
        .single()

      if (error || !data) {
        return null
      }

      const row = data as unknown as Record<string, unknown>
      const driver = unwrapRelation(row.driver as TripWithRelations['driver'] | TripWithRelations['driver'][])
      const vehicle = unwrapRelation(row.vehicle as TripWithRelations['vehicle'] | TripWithRelations['vehicle'][])
      const trailer = unwrapRelation(row.trailer as TripWithRelations['trailer'] | TripWithRelations['trailer'][])
      const rate = unwrapRelation(row.rate as TripWithRelations['rate'] | TripWithRelations['rate'][])
      const rawAssignments = Array.isArray(row.assignments) ? row.assignments : []

      // Mapear asignaciones con detalle completo de línea para la vista de detalle
      const assignments: TripAssignment[] = (rawAssignments as Record<string, unknown>[]).map(
        mapAssignmentWithLine,
      )

      return {
        id: row.id as string,
        trip_id: (row.trip_id as string | null) ?? null,
        scheduled_date: row.scheduled_date as string,
        driver_id: (row.driver_id as string | null) ?? null,
        vehicle_id: (row.vehicle_id as string | null) ?? null,
        trailer_id: (row.trailer_id as string | null) ?? null,
        rate_id: (row.rate_id as string | null) ?? null,
        cost: (row.cost as number | null) ?? null,
        att_permit: (row.att_permit as boolean | null) ?? null,
        escort: (row.escort as boolean | null) ?? null,
        confirmation_code: (row.confirmation_code as string | null) ?? null,
        status: row.status as string,
        notes: (row.notes as string | null) ?? null,
        actual_departure: (row.actual_departure as string | null) ?? null,
        actual_arrival: (row.actual_arrival as string | null) ?? null,
        route_summary: (row.route_summary as string | null) ?? null,
        is_external: (row.is_external as boolean | null) ?? null,
    is_self_pickup: (row.is_self_pickup as boolean) ?? false,
        attachments: (row.attachments as unknown[] | null) ?? null,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
        driver,
        vehicle,
        trailer,
        rate,
        assignments,
      }
    },
    [supabase],
  )

  // --- Crear viaje nuevo con asignaciones ---
  const saveTrip = useCallback(
    async (
      input: TripInput,
      assignments: AssignmentInput[],
      personId?: string,
    ): Promise<{ id: string; tripId: string | null } | null> => {
      if (busyRef.current) return null
      busyRef.current = true
      setSaving(true)
      setSaveError(null)

      try {
        // 1. Insertar el viaje. Los triggers BD asignan trip_id y
        //    confirmation_code (generate_confirmation_code). No generamos
        //    el código en cliente para evitar doble-generación.
        const { data: insertedTrip, error: tripError } = await supabase
          .from('trips')
          .insert({
            scheduled_date: input.scheduled_date,
            scheduled_time: input.scheduled_time ?? null,
            driver_id: input.driver_id,
            vehicle_id: input.vehicle_id,
            trailer_id: input.trailer_id,
            rate_id: input.rate_id,
            cost: input.cost,
            att_permit: input.att_permit,
            escort: input.escort,
            notes: input.notes,
            is_external: input.is_external,
            is_self_pickup: input.is_self_pickup ?? false,
            attachments: JSON.parse(JSON.stringify(input.attachments ?? [])),
            created_by: personId ?? null,
          })
          .select('id, trip_id')
          .single()

        if (tripError || !insertedTrip) {
          setSaveError(tripError?.message ?? 'Error al crear el viaje')
          return null
        }

        const newTripId = insertedTrip.id

        // 2. Insertar asignaciones de líneas al viaje
        if (assignments.length > 0) {
          const assignmentRows = assignments.map((a) => ({
            trip_id: newTripId,
            request_line_id: a.request_line_id,
            quantity_assigned: a.quantity_assigned,
          }))

          const { error: assignError } = await supabase
            .from('trip_line_assignments')
            .insert(assignmentRows)

          if (assignError) {
            // Limpiar viaje huérfano para no dejar datos inconsistentes
            await supabase.from('trips').delete().eq('id', newTripId)
            setSaveError(`Error al asignar líneas: ${assignError.message}`)
            return null
          }

          // 3. Actualizar el estado de cada línea asignada a 'Programada'
          //    y sumar la cantidad programada acumulada
          for (const a of assignments) {
            const { data: currentLine } = await supabase
              .from('sm_request_lines')
              .select('qty_scheduled, quantity')
              .eq('id', a.request_line_id)
              .single()

            const currentScheduled = currentLine?.qty_scheduled ?? 0
            const totalQty = currentLine?.quantity ?? a.quantity_assigned
            // Clampear para no exceder la cantidad total de la línea
            const newQtyScheduled = Math.min(totalQty, currentScheduled + a.quantity_assigned)

            await supabase
              .from('sm_request_lines')
              .update({
                status: 'Programada',
                qty_scheduled: newQtyScheduled,
              })
              .eq('id', a.request_line_id)
          }
        }

        // 4. Re-fetch para obtener el trip_id auto-generado por el trigger
        const { data: refreshed } = await supabase
          .from('trips')
          .select('trip_id')
          .eq('id', newTripId)
          .single()

        // 5. Notificaciones: líneas programadas a PMs + viaje asignado a conductor
        const { data: lineRequests } = await supabase
          .from('sm_request_lines')
          .select('request_id')
          .in('id', assignments.map(a => a.request_line_id))

        const uniqueRequestIds = [...new Set((lineRequests ?? []).map(l => l.request_id))]
        for (const reqId of uniqueRequestIds) {
          notifyLineasProgramadas(newTripId, reqId).catch(console.error)
        }
        notifyViajeAsignadoConductor(newTripId).catch(console.error)

        return {
          id: newTripId,
          tripId: refreshed?.trip_id ?? null,
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error inesperado al guardar viaje'
        setSaveError(message)
        return null
      } finally {
        busyRef.current = false
        setSaving(false)
      }
    },
    [supabase],
  )

  // --- Actualizar viaje existente ---
  const updateTrip = useCallback(
    async (
      id: string,
      input: TripInput,
      addAssignments: AssignmentInput[],
      removeAssignmentIds: string[],
      personId?: string,
      modifiedAssignments?: ModifiedAssignment[],
    ): Promise<boolean> => {
      if (busyRef.current) return false
      busyRef.current = true
      setSaving(true)
      setSaveError(null)

      try {
        // 1. Actualizar los campos del viaje
        const { error: updateError } = await supabase
          .from('trips')
          .update({
            scheduled_date: input.scheduled_date,
            scheduled_time: input.scheduled_time ?? null,
            driver_id: input.driver_id,
            vehicle_id: input.vehicle_id,
            trailer_id: input.trailer_id,
            rate_id: input.rate_id,
            cost: input.cost,
            att_permit: input.att_permit,
            escort: input.escort,
            notes: input.notes,
            is_external: input.is_external,
            is_self_pickup: input.is_self_pickup ?? false,
            attachments: JSON.parse(JSON.stringify(input.attachments ?? [])),
            updated_by: personId ?? null,
          })
          .eq('id', id)

        if (updateError) {
          setSaveError(updateError.message)
          return false
        }

        // 2. Eliminar asignaciones removidas y liberar las líneas de vuelta al backlog
        for (const assignmentId of removeAssignmentIds) {
          // Obtener la asignación para saber cuánto restar de qty_scheduled
          const { data: assignment, error: fetchAssignError } = await supabase
            .from('trip_line_assignments')
            .select('request_line_id, quantity_assigned')
            .eq('id', assignmentId)
            .single()

          if (fetchAssignError || !assignment) continue

          // Eliminar la asignación del viaje
          await supabase
            .from('trip_line_assignments')
            .delete()
            .eq('id', assignmentId)

          // Liberar la línea: restar qty_scheduled, volver a Pendiente si llega a 0
          await releaseLineFromAssignment(
            supabase,
            assignment.request_line_id,
            assignment.quantity_assigned,
          )
        }

        // 2.5. Actualizar cantidades de asignaciones existentes modificadas
        if (modifiedAssignments && modifiedAssignments.length > 0) {
          for (const mod of modifiedAssignments) {
            const delta = mod.quantity_assigned - mod.original_quantity

            // Actualizar la asignación
            await supabase
              .from('trip_line_assignments')
              .update({ quantity_assigned: mod.quantity_assigned })
              .eq('id', mod.id)

            // Ajustar qty_scheduled de la línea
            if (delta !== 0) {
              const { data: currentLine } = await supabase
                .from('sm_request_lines')
                .select('qty_scheduled')
                .eq('id', mod.request_line_id)
                .single()

              const newQtyScheduled = Math.max(0, (currentLine?.qty_scheduled ?? 0) + delta)

              await supabase
                .from('sm_request_lines')
                .update({ qty_scheduled: newQtyScheduled })
                .eq('id', mod.request_line_id)
            }
          }
        }

        // 3. Agregar nuevas asignaciones y marcar las líneas como Programadas
        if (addAssignments.length > 0) {
          const newRows = addAssignments.map((a) => ({
            trip_id: id,
            request_line_id: a.request_line_id,
            quantity_assigned: a.quantity_assigned,
          }))

          const { error: insertError } = await supabase
            .from('trip_line_assignments')
            .insert(newRows)

          if (insertError) {
            setSaveError(`Error al agregar asignaciones: ${insertError.message}`)
            return false
          }

          // Actualizar estado y cantidad programada de las líneas recién asignadas
          for (const a of addAssignments) {
            const { data: currentLine } = await supabase
              .from('sm_request_lines')
              .select('qty_scheduled')
              .eq('id', a.request_line_id)
              .single()

            const newQtyScheduled = (currentLine?.qty_scheduled ?? 0) + a.quantity_assigned

            await supabase
              .from('sm_request_lines')
              .update({
                status: 'Programada',
                qty_scheduled: newQtyScheduled,
              })
              .eq('id', a.request_line_id)
          }
        }

        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error inesperado al actualizar viaje'
        setSaveError(message)
        return false
      } finally {
        busyRef.current = false
        setSaving(false)
      }
    },
    [supabase],
  )

  // --- Cancelar viaje ---
  const cancelTrip = useCallback(
    async (id: string): Promise<boolean> => {
      if (busyRef.current) return false
      busyRef.current = true
      setSaving(true)
      setSaveError(null)

      try {
        // 1. Obtener todas las asignaciones del viaje para liberar las líneas
        const { data: assignments, error: fetchError } = await supabase
          .from('trip_line_assignments')
          .select('id, request_line_id, quantity_assigned')
          .eq('trip_id', id)

        if (fetchError) {
          setSaveError(fetchError.message)
          return false
        }

        // 2. Liberar cada línea asignada de vuelta al backlog.
        //    El trigger cascade_request_status() actualizará automáticamente
        //    el estado de las solicitudes padre cuando las líneas vuelvan a Pendiente.
        for (const assignment of assignments ?? []) {
          await releaseLineFromAssignment(
            supabase,
            assignment.request_line_id,
            assignment.quantity_assigned,
          )
        }

        // 3. Eliminar todas las asignaciones del viaje
        const { error: deleteAssignError } = await supabase
          .from('trip_line_assignments')
          .delete()
          .eq('trip_id', id)

        if (deleteAssignError) {
          setSaveError(deleteAssignError.message)
          return false
        }

        // 4. Marcar el viaje como Cancelado
        const { error: cancelError } = await supabase
          .from('trips')
          .update({ status: 'Cancelado' })
          .eq('id', id)

        if (cancelError) {
          setSaveError(cancelError.message)
          return false
        }

        // Notificar cancelación de viaje a PMs afectados
        notifyViajeCancelado(id).catch(console.error)

        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error inesperado al cancelar viaje'
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
    // Backlog de líneas pendientes (vista de Charris)
    backlog,
    backlogLoading,
    refetchBacklog,

    // Lista de viajes
    trips,
    tripsTotalCount,
    listLoading,
    listError,
    refetchTrips,

    // Filtros de la lista
    filters,
    setFilters,

    // Detalle de un viaje individual
    fetchTrip,

    // Mutaciones
    saveTrip,
    updateTrip,
    cancelTrip,

    // Estado de mutaciones
    saving,
    saveError,
  }
}
