'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Loader2, KeyRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useProjects } from '@/hooks/useProjects'
import { useEquipment } from '@/hooks/useEquipment'
import { useLocations } from '@/hooks/useLocations'
import { useSubmitGuard } from '@/hooks/useSubmitGuard'
import {
  useSolicitudes,
  type SolicitudInput,
  type LineInput,
  type SolicitudWithRelations,
  type LineWithRelations,
} from '@/hooks/useSolicitudes'
import { canEditSolicitud } from '@/lib/utils/roles'
import { formatDate, formatDateTime, formatQty } from '@/lib/utils/format'
import { checkDuplicateLines } from '@/lib/utils/duplicates'
import { notifySolicitudEnviada, notifySolicitudUrgenteNueva } from '@/lib/notifications/actions'
import type { DuplicateMatch } from '@/components/ui/DuplicateWarning'
import type { SelectOption } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SolicitudForm, type FormMode } from '@/components/solicitudes/SolicitudForm'
import { LineEditor } from '@/components/solicitudes/LineEditor'
import { LineRow } from '@/components/solicitudes/LineRow'
import type { AssociatedTrip, TripLineInfo, TripEventInfo } from '@/components/solicitudes/types'
import ActiveTripPanel from '@/components/solicitudes/ActiveTripPanel'
import { usePickupOrders } from '@/hooks/usePickupOrders'
import { useExternalOrders } from '@/hooks/useExternalOrders'
import { PickupOrderCard, type PickupOrderWithLines } from '@/components/programacion/PickupOrderCard'
import { ExternalOrderCard, type ExternalOrderWithLines } from '@/components/programacion/ExternalOrderCard'
import { ConfirmPickupOrderDeliveryModal } from '@/components/programacion/ConfirmPickupOrderDeliveryModal'
import { ConfirmExternalOrderDeliveryModal } from '@/components/programacion/ConfirmExternalOrderDeliveryModal'
import type { Attachment } from '@/lib/supabase/storage'

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
    category: line.category,
    material_category: line.material_category,
    po_reference: line.po_reference,
    notes: line.notes,
    designated_receiver_id: line.designated_receiver_id ?? null,
    designated_receiver_name: line.designated_receiver_name ?? null,
  }
}

/** Determina el modo del formulario segun estado y permisos */
function determineMode(
  status: string,
  role: string | null,
  projectId: string,
  userProjectIds: string[],
): FormMode {
  if (role === 'admin' && status !== 'Cancelada') return 'edit'
  if (status === 'Completada' || status === 'Cancelada') return 'readonly'
  if (status === 'En Proceso') return 'readonly'
  if (!canEditSolicitud(role, projectId, userProjectIds)) return 'readonly'
  return 'edit'
}

// --- Componente principal ---

export default function SolicitudDetailPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const guard = useSubmitGuard()

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

  // Viajes asociados a esta solicitud
  const [associatedTrips, setAssociatedTrips] = useState<AssociatedTrip[]>([])

  // Datos auxiliares (people, units) — se cargan inline.
  // costCodes ahora se cargan dentro del SolicitudForm via useCostCodeCascade (Cambio 2).
  const [people, setPeople] = useState<SelectOption[]>([])
  const [approvers, setApprovers] = useState<SelectOption[]>([])
  const [units, setUnits] = useState<SelectOption[]>([])

  // --- Cambio 5 T8: pickup_orders + external_orders related a esta solicitud ---
  const pickupOrders = usePickupOrders()
  const externalOrders = useExternalOrders()

  const [relatedPickupOrders, setRelatedPickupOrders] = useState<PickupOrderWithLines[]>([])
  const [relatedExternalOrders, setRelatedExternalOrders] = useState<ExternalOrderWithLines[]>([])
  const [pmProjectIds, setPmProjectIds] = useState<Set<string>>(new Set())

  const [confirmPickupOrder, setConfirmPickupOrder] = useState<PickupOrderWithLines | null>(null)
  const [confirmExternalOrder, setConfirmExternalOrder] = useState<ExternalOrderWithLines | null>(null)
  const [cancelPickupModal, setCancelPickupModal] = useState<{ order: PickupOrderWithLines; deliveredCount: number; deliveredQty: number } | null>(null)
  const [cancelExternalModal, setCancelExternalModal] = useState<{ order: ExternalOrderWithLines; deliveredCount: number; deliveredQty: number } | null>(null)

  const [receiverOptions, setReceiverOptions] = useState<{ value: string; label: string }[]>([])

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

  // --- Cargar viajes asociados ---
  useEffect(() => {
    async function fetchTrips() {
      if (!solicitud || solicitud.status === 'Borrador') {
        setAssociatedTrips([])
        return
      }
      // Buscar trip_line_assignments que referencien líneas de esta solicitud
      const lineIds = solicitud.lines.map((l) => l.id)
      if (lineIds.length === 0) return

      const { data } = await supabase
        .from('trip_line_assignments')
        .select(`
          trip_id,
          quantity_assigned,
          qty_delivered,
          sm_request_lines!inner(description, line_type, status),
          trips!inner(
            id,
            trip_id,
            scheduled_date,
            status,
            confirmation_code,
            att_permit,
            escort,
            driver:driver_id(name),
            vehicle:vehicle_id(description, spectrum_code, gps_vehicle_id),
            trailer:trailer_id(description, spectrum_code),
            trip_events(event_type, event_timestamp, received_by_name, notes)
          )
        `)
        .in('request_line_id', lineIds)

      if (!data) return

      // Agrupar líneas por viaje
      const tripMap = new Map<string, AssociatedTrip>()
      for (const row of data as unknown as Record<string, unknown>[]) {
        const trip = Array.isArray(row.trips) ? row.trips[0] : row.trips
        if (!trip) continue
        const t = trip as Record<string, unknown>
        const tripUuid = t.id as string

        // Extraer info de la línea asignada
        const lineRaw = Array.isArray(row.sm_request_lines) ? row.sm_request_lines[0] : row.sm_request_lines
        const lineInfo: TripLineInfo | null = lineRaw
          ? {
              description: (lineRaw as Record<string, unknown>).description as string,
              line_type: (lineRaw as Record<string, unknown>).line_type as string,
              status: (lineRaw as Record<string, unknown>).status as string,
              quantity_assigned: row.quantity_assigned as number,
              qty_delivered: (row.qty_delivered as number) ?? 0,
            }
          : null

        const existing = tripMap.get(tripUuid)
        if (existing) {
          if (lineInfo) existing.lines.push(lineInfo)
          continue
        }

        const driver = Array.isArray(t.driver) ? t.driver[0] : t.driver
        const vehicle = Array.isArray(t.vehicle) ? t.vehicle[0] : t.vehicle
        const trailer = Array.isArray(t.trailer) ? t.trailer[0] : t.trailer
        const rawEvents = Array.isArray(t.trip_events) ? t.trip_events : []
        const events = (rawEvents as TripEventInfo[]).sort(
          (a, b) => new Date(a.event_timestamp).getTime() - new Date(b.event_timestamp).getTime()
        )

        tripMap.set(tripUuid, {
          id: tripUuid,
          trip_id: (t.trip_id as string | null) ?? null,
          scheduled_date: t.scheduled_date as string,
          status: t.status as string,
          confirmation_code: (t.confirmation_code as string | null) ?? null,
          driver: driver as { name: string } | null,
          vehicle: vehicle as { description: string; spectrum_code: string | null; gps_vehicle_id: string | null } | null,
          trailer: trailer as { description: string; spectrum_code: string | null } | null,
          att_permit: (t.att_permit as boolean) ?? false,
          escort: (t.escort as boolean) ?? false,
          lines: lineInfo ? [lineInfo] : [],
          events,
        })
      }
      const trips = Array.from(tripMap.values()).sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
      setAssociatedTrips(trips)
    }
    fetchTrips()
  }, [solicitud, supabase])

  // --- Cargar people ---
  useEffect(() => {
    async function fetchPeople() {
      const [allResult, pmResult] = await Promise.all([
        supabase.from('people').select('id, name').eq('status', 'Activo').order('name'),
        supabase.from('people').select('id, name').eq('status', 'Activo').eq('app_role', 'pm').order('name'),
      ])
      setPeople((allResult.data ?? []).map((p) => ({ value: p.id, label: p.name })))
      setApprovers((pmResult.data ?? []).map((p) => ({ value: p.id, label: p.name })))
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

  // (Carga de cost_codes movida al hook useCostCodeCascade dentro de SolicitudForm — Cambio 2)

  // --- Cambio 5 T8: PM project_ids fetch (sólo si role === 'pm') ---
  // Versión (b) SIMPLIFICACIÓN PRACTICAL: single fetch + JS-side filter.
  // Versión (a) inline N-queries con `.eq` sobre nested joins NO funciona en
  // Supabase JS client (filtering on nested joins via .eq/.in no soportado).
  useEffect(() => {
    if (!person?.id || role !== 'pm') {
      setPmProjectIds(new Set())
      return
    }
    const fetchPmProjects = async () => {
      const { data } = await supabase
        .from('person_projects')
        .select('project_id')
        .eq('person_id', person.id)
        .eq('is_active', true)
      setPmProjectIds(new Set((data ?? []).map((pp) => pp.project_id)))
    }
    void fetchPmProjects()
  }, [person, role, supabase])

  // Helper PM permission per order — JS-side filter (versión b).
  // INNER JOIN behavior: cuando una línea tiene to_location_id=null (free-text),
  // to_location es null. El check `if (!toLoc) return false` correctamente
  // excluye esas líneas (E11). Si TODAS las líneas son free-text, PM no puede
  // confirmar — solo admin/logistica.
  // location_type === 'proyecto' es lowercase per Cambio 1 (E12).
  // AT LEAST 1 match — `lines.some(...)` retorna true al primer match.
  const checkPmCanConfirmOrder = useCallback(
    (lines: PickupOrderWithLines['lines'] | ExternalOrderWithLines['lines']): boolean => {
      if (role === 'admin' || role === 'logistica') return true
      if (role !== 'pm') return false
      return lines.some((ol) => {
        const toLoc = ol.line?.to_location
        if (!toLoc) return false  // free-text destination → no contribuye (E11)
        if (toLoc.location_type !== 'proyecto') return false  // LOWERCASE per Cambio 1
        return toLoc.project_id != null && pmProjectIds.has(toLoc.project_id)
      })
    },
    [role, pmProjectIds],
  )

  // --- Cambio 5 T8: refetch de pickup_orders y external_orders related ---
  // Filtramos por `lines.line.request_id` con !inner para que solo aparezcan
  // orders que tienen AT LEAST 1 línea perteneciente a esta solicitud.
  const refetchRelatedPickupOrders = useCallback(async () => {
    if (!id) return
    const { data } = await supabase
      .from('pickup_orders')
      .select(`
        id, pickup_id, status, approved_at, completed_at, cancelled_at,
        received_by_id, received_by_name, notes, attachments,
        approved_by_person:people!pickup_orders_approved_by_fkey(name),
        completed_by_person:people!pickup_orders_completed_by_fkey(name),
        cancelled_by_person:people!pickup_orders_cancelled_by_fkey(name),
        lines:pickup_order_lines!inner(
          id, request_line_id, quantity_assigned, qty_delivered,
          line:request_line_id!inner(
            description, line_type, quantity, request_id,
            unit:unit_id(code), unit_text,
            from_location:from_location_id(name), from_text,
            to_location:to_location_id(id, name, project_id, location_type), to_text,
            request:request_id!inner(id, request_id, project:project_id(code, name))
          )
        )
      `)
      .eq('lines.line.request_id', id)

    const mapped: PickupOrderWithLines[] = (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      pickup_id: row.pickup_id as string,
      status: row.status as 'Aprobado' | 'Entregado' | 'Cancelado',
      approved_at: row.approved_at as string,
      approved_by_name: ((row.approved_by_person as { name?: string } | null)?.name) ?? null,
      completed_at: (row.completed_at as string | null) ?? null,
      completed_by_name: ((row.completed_by_person as { name?: string } | null)?.name) ?? null,
      cancelled_at: (row.cancelled_at as string | null) ?? null,
      cancelled_by_name: ((row.cancelled_by_person as { name?: string } | null)?.name) ?? null,
      received_by_id: (row.received_by_id as string | null) ?? null,
      received_by_name: (row.received_by_name as string | null) ?? null,
      notes: (row.notes as string | null) ?? null,
      attachments: Array.isArray(row.attachments) ? (row.attachments as unknown as Attachment[]) : [],
      lines: (Array.isArray(row.lines) ? row.lines : []) as PickupOrderWithLines['lines'],
    }))
    setRelatedPickupOrders(mapped)
  }, [supabase, id])

  const refetchRelatedExternalOrders = useCallback(async () => {
    if (!id) return
    const { data } = await supabase
      .from('external_orders')
      .select(`
        id, external_id, status, provider_name, invoice_amount, invoice_attachments,
        approved_at, completed_at, cancelled_at,
        received_by_id, received_by_name, notes,
        approved_by_person:people!external_orders_approved_by_fkey(name),
        completed_by_person:people!external_orders_completed_by_fkey(name),
        cancelled_by_person:people!external_orders_cancelled_by_fkey(name),
        lines:external_order_lines!inner(
          id, request_line_id, quantity_assigned, qty_delivered,
          line:request_line_id!inner(
            description, line_type, quantity, request_id,
            unit:unit_id(code), unit_text,
            from_location:from_location_id(name), from_text,
            to_location:to_location_id(id, name, project_id, location_type), to_text,
            request:request_id!inner(id, request_id, project:project_id(code, name))
          )
        )
      `)
      .eq('lines.line.request_id', id)

    const mapped: ExternalOrderWithLines[] = (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      external_id: row.external_id as string,
      status: row.status as 'Aprobado' | 'Entregado' | 'Cancelado',
      provider_name: row.provider_name as string,
      invoice_amount: row.invoice_amount as number,
      invoice_attachments: Array.isArray(row.invoice_attachments) ? (row.invoice_attachments as unknown as Attachment[]) : [],
      approved_at: row.approved_at as string,
      approved_by_name: ((row.approved_by_person as { name?: string } | null)?.name) ?? null,
      completed_at: (row.completed_at as string | null) ?? null,
      completed_by_name: ((row.completed_by_person as { name?: string } | null)?.name) ?? null,
      cancelled_at: (row.cancelled_at as string | null) ?? null,
      cancelled_by_name: ((row.cancelled_by_person as { name?: string } | null)?.name) ?? null,
      received_by_id: (row.received_by_id as string | null) ?? null,
      received_by_name: (row.received_by_name as string | null) ?? null,
      notes: (row.notes as string | null) ?? null,
      lines: (Array.isArray(row.lines) ? row.lines : []) as ExternalOrderWithLines['lines'],
    }))
    setRelatedExternalOrders(mapped)
  }, [supabase, id])

  useEffect(() => {
    void refetchRelatedPickupOrders()
    void refetchRelatedExternalOrders()
  }, [refetchRelatedPickupOrders, refetchRelatedExternalOrders])

  // Receivers para modales de confirm delivery
  useEffect(() => {
    supabase
      .from('people')
      .select('id, name')
      .eq('status', 'Activo')
      .order('name')
      .then(({ data }) => setReceiverOptions((data ?? []).map((p) => ({ value: p.id, label: p.name }))))
  }, [supabase])

  // --- Handlers Cambio 5 T8 ---
  const handleConfirmPickupDelivery = useCallback(async (data: {
    receivedById: string | null
    receivedByName: string
    notes: string
    additionalAttachments: Attachment[]
  }) => {
    if (!confirmPickupOrder || !person?.id) return
    const result = await pickupOrders.completePickupOrder(
      confirmPickupOrder.id, person.id, data.receivedById, data.receivedByName, data.notes, data.additionalAttachments,
    )
    if (result.ok) {
      setConfirmPickupOrder(null)
      void refetchRelatedPickupOrders()
    }
  }, [confirmPickupOrder, person, pickupOrders, refetchRelatedPickupOrders])

  const handleConfirmExternalDelivery = useCallback(async (data: {
    receivedById: string | null
    receivedByName: string
    notes: string
    additionalAttachments: Attachment[]
  }) => {
    if (!confirmExternalOrder || !person?.id) return
    const result = await externalOrders.completeExternalOrder(
      confirmExternalOrder.id, person.id, data.receivedById, data.receivedByName, data.notes, data.additionalAttachments,
    )
    if (result.ok) {
      setConfirmExternalOrder(null)
      void refetchRelatedExternalOrders()
    }
  }, [confirmExternalOrder, person, externalOrders, refetchRelatedExternalOrders])

  const handleOpenCancelPickup = useCallback(async (order: PickupOrderWithLines) => {
    const { data } = await supabase
      .from('pickup_order_lines')
      .select('id, qty_delivered')
      .eq('pickup_order_id', order.id)
    const deliveredLines = (data ?? []).filter((l) => (l.qty_delivered ?? 0) > 0)
    setCancelPickupModal({
      order,
      deliveredCount: deliveredLines.length,
      deliveredQty: deliveredLines.reduce((sum, l) => sum + (l.qty_delivered ?? 0), 0),
    })
  }, [supabase])

  const handleOpenCancelExternal = useCallback(async (order: ExternalOrderWithLines) => {
    const { data } = await supabase
      .from('external_order_lines')
      .select('id, qty_delivered')
      .eq('external_order_id', order.id)
    const deliveredLines = (data ?? []).filter((l) => (l.qty_delivered ?? 0) > 0)
    setCancelExternalModal({
      order,
      deliveredCount: deliveredLines.length,
      deliveredQty: deliveredLines.reduce((sum, l) => sum + (l.qty_delivered ?? 0), 0),
    })
  }, [supabase])

  const confirmCancelPickup = useCallback(async () => {
    if (!cancelPickupModal || !person?.id) return
    const result = await pickupOrders.cancelPickupOrder(cancelPickupModal.order.id, person.id)
    if (result.ok) {
      setCancelPickupModal(null)
      void refetchRelatedPickupOrders()
    }
  }, [cancelPickupModal, person, pickupOrders, refetchRelatedPickupOrders])

  const confirmCancelExternal = useCallback(async () => {
    if (!cancelExternalModal || !person?.id) return
    const result = await externalOrders.cancelExternalOrder(cancelExternalModal.order.id, person.id)
    if (result.ok) {
      setCancelExternalModal(null)
      void refetchRelatedExternalOrders()
    }
  }, [cancelExternalModal, person, externalOrders, refetchRelatedExternalOrders])

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
  const canDeleteLines = canAddLines

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
    if (!canDeleteLines) return
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

  // J8b: duplicar línea — copia la existente como nueva (id=null para que
  // el save la inserte). Solo permitido en Borrador (regla #2 CLAUDE.md).
  const handleDuplicateLine = useCallback((index: number) => {
    if (!canAddLines) return
    setLines((prev) => {
      const original = prev[index]
      if (!original) return prev
      return [...prev, { ...original, id: undefined }]
    })
    setIsDirty(true)
  }, [canAddLines])

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
  const handleSave = guard(async () => {
    if (!solicitud) return
    const success = await updateSolicitud(solicitud.id, header, lines, deletedLineIds, person?.id)
    if (success) {
      const updated = await fetchSolicitud(id)
      if (updated) {
        setSolicitud(updated)
        setLines(updated.lines.map(lineToInput))
        setDeletedLineIds([])
        setIsDirty(false)
      }
    }
  })

  // --- Enviar solicitud (Borrador → Enviada) ---
  const handleSend = guard(async () => {
    if (!solicitud) return
    setSendError(null)

    // Validaciones (Borrador → Enviada). Cambio 2: cost_code/category requeridos al enviar.
    // Edits a solicitudes ya Enviadas/Completadas/Canceladas NO pasan por aquí, preserva históricas con NULL.
    if (!header.project_id) { setSendError('Seleccione un proyecto'); return }
    if (!header.requester_id) { setSendError('Seleccione el solicitante'); return }
    if (!header.date_required) { setSendError('Ingrese la fecha requerida'); return }
    if (lines.length === 0) { setSendError('Agregue al menos una linea a la solicitud'); return }
    if (!header.cost_code_id) { setSendError('Seleccione el código de costo (Fase)'); return }
    if (!header.cost_category_id) { setSendError('Seleccione la categoría de costo'); return }

    // Primero guardar los cambios pendientes
    const saveSuccess = await updateSolicitud(solicitud.id, header, lines, deletedLineIds, person?.id)
    if (!saveSuccess) return

    // Actualizar status a Enviada
    const { error } = await supabase
      .from('sm_requests')
      .update({ status: 'Enviada', updated_by: person?.id ?? null })
      .eq('id', solicitud.id)

    if (error) {
      setSendError(error.message)
      return
    }

    // Notificar a Charris
    notifySolicitudEnviada(solicitud.id).catch(console.error)
    notifySolicitudUrgenteNueva(solicitud.id).catch(console.error)

    // Refrescar datos
    const updated = await fetchSolicitud(id)
    if (updated) {
      setSolicitud(updated)
      setLines(updated.lines.map(lineToInput))
      setDeletedLineIds([])
      setIsDirty(false)
    }
  })

  // --- Cancelar solicitud ---
  const handleCancel = guard(async () => {
    if (!solicitud) return
    const success = await cancelSolicitud(solicitud.id, person?.id)
    if (success) {
      const updated = await fetchSolicitud(id)
      if (updated) {
        setSolicitud(updated)
        setLines(updated.lines.map(lineToInput))
        setShowCancelConfirm(false)
      }
    }
  })

  // --- Resolver nombres para LineRow ---
  const getLineDisplayNames = useCallback(
    (line: LineInput, index: number) => {
      const originalLine = solicitud?.lines.find((l) => l.id === line.id)
      return {
        fromDisplay: originalLine?.from_location?.name ?? line.from_text ?? '',
        toDisplay: originalLine?.to_location?.name ?? line.to_text ?? '',
        unitDisplay: originalLine?.unit?.code ?? line.unit_text ?? '',
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

      {/* Paneles operativos de trips activos — uno por cada trip En Ruta
          con al menos una línea En Transito o Parcial. Ordenados por Salida
          descendente (más reciente primero). Reemplaza el antiguo banner
          "Material en camino" — todo el contexto operativo (código, mapa,
          botón Confirmar Recepción) vive ahora dentro del panel. */}
      {associatedTrips
        .filter(
          (t) =>
            t.status === 'En Ruta' &&
            t.lines.some(
              (l) => l.status === 'En Transito' || l.status === 'Parcial',
            ),
        )
        .sort((a, b) => {
          const aSalida =
            a.events.find((e) => e.event_type === 'Salida')?.event_timestamp ??
            ''
          const bSalida =
            b.events.find((e) => e.event_type === 'Salida')?.event_timestamp ??
            ''
          return bSalida.localeCompare(aSalida)
        })
        .map((t) => <ActiveTripPanel key={t.id} trip={t} role={role} />)}

      {/* Cambio 5 T8: Pickup Orders related a la solicitud */}
      {relatedPickupOrders.length > 0 && (
        <section className="mb-6 rounded-xl border border-amber-200 bg-amber-50/30">
          <div className="px-4 pt-4 pb-3 flex items-center gap-2">
            <h2 className="text-base font-semibold text-gray-900">Pickup Orders</h2>
            <span className="rounded-full bg-amber-200 text-amber-900 px-2 py-0.5 text-xs font-medium">
              {relatedPickupOrders.length}
            </span>
          </div>
          <div className="px-4 pb-4 space-y-2">
            {relatedPickupOrders.map((order) => {
              const isAdmin = role === 'admin' || role === 'logistica'
              const canConfirm = checkPmCanConfirmOrder(order.lines)
              const canCancel = isAdmin && order.status === 'Aprobado'
              return (
                <PickupOrderCard
                  key={order.id}
                  order={order}
                  canConfirmDelivery={canConfirm && order.status === 'Aprobado'}
                  canCancelOrder={canCancel}
                  onConfirmDelivery={() => setConfirmPickupOrder(order)}
                  onCancelOrder={() => handleOpenCancelPickup(order)}
                  showLinesInitially={true}
                />
              )
            })}
          </div>
        </section>
      )}

      {/* Cambio 5 T8: Viajes Externos related a la solicitud */}
      {relatedExternalOrders.length > 0 && (
        <section className="mb-6 rounded-xl border border-blue-200 bg-blue-50/30">
          <div className="px-4 pt-4 pb-3 flex items-center gap-2">
            <h2 className="text-base font-semibold text-gray-900">Viajes Externos</h2>
            <span className="rounded-full bg-blue-200 text-blue-900 px-2 py-0.5 text-xs font-medium">
              {relatedExternalOrders.length}
            </span>
          </div>
          <div className="px-4 pb-4 space-y-2">
            {relatedExternalOrders.map((order) => {
              const isAdmin = role === 'admin' || role === 'logistica'
              const canConfirm = checkPmCanConfirmOrder(order.lines)
              const canCancel = isAdmin && order.status === 'Aprobado'
              return (
                <ExternalOrderCard
                  key={order.id}
                  order={order}
                  canConfirmDelivery={canConfirm && order.status === 'Aprobado'}
                  canCancelOrder={canCancel}
                  onConfirmDelivery={() => setConfirmExternalOrder(order)}
                  onCancelOrder={() => handleOpenCancelExternal(order)}
                  showLinesInitially={true}
                />
              )
            })}
          </div>
        </section>
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
            dateCreated: solicitud.date_created ?? solicitud.created_at ?? undefined,
            notes: solicitud.notes,
            status: solicitud.status,
            priority: solicitud.priority,
            dateSubmitted: solicitud.date_submitted ?? undefined,
            dateCompleted: solicitud.date_completed ?? undefined,
            dateCancelled: solicitud.date_cancelled ?? undefined,
            costCodeId: solicitud.cost_code_id ?? null,
            costCategoryId: solicitud.cost_category_id ?? null,
          }}
          projects={projectOptions}
          people={people}
          approvers={approvers}
          onChange={handleHeaderChange}
          currentPersonId={person?.id ?? ''}
          role={role}
          solicitudId={solicitud.id}
          initialAttachments={(solicitud.attachments as unknown[])?.map(a => a as import('@/lib/supabase/storage').Attachment) ?? []}
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
                  canDelete={canDeleteLines}
                  isScheduled={isScheduled}
                  onEdit={() => {
                    setShowLineEditor(false)
                    setEditingLineIndex(index)
                  }}
                  onDelete={() => handleDeleteLine(index)}
                  onDuplicate={canAddLines ? () => handleDuplicateLine(index) : undefined}
                  fromDisplay={names.fromDisplay}
                  toDisplay={names.toDisplay}
                  unitDisplay={names.unitDisplay}
                  fulfillments={originalLine?.fulfillments ?? []}
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
              projectId={header.project_id}
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
              projectId={header.project_id}
              initialData={lines[editingLineIndex]}
              isEditing
              onSave={handleEditLine}
              onCancel={() => setEditingLineIndex(null)}
            />
          </div>
        )}
      </div>

      {/* Movilizaciones Programadas — visible cuando solicitud no está en Borrador */}
      {solicitud.status !== 'Borrador' && associatedTrips.length > 0 && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
          <h2 className="mb-3 text-base font-semibold text-gray-900">
            Movilizaciones Programadas ({associatedTrips.length})
          </h2>
          <div className="space-y-3">
            {associatedTrips.map((t) => (
              <div
                key={t.id}
                className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => router.push(`/programacion/viaje/${t.id}`)}
                      className="font-mono text-sm font-bold text-navy hover:underline cursor-pointer"
                    >
                      {t.trip_id ?? t.id.slice(0, 8)}
                    </button>
                    <Badge variant="trip" label={t.status} />
                  </div>
                  <span className="text-sm text-iconsa-gray">
                    {formatDate(t.scheduled_date)}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 text-sm text-gray-700">
                  {t.driver && (
                    <span>
                      <span className="text-iconsa-gray">Conductor:</span> {t.driver.name}
                    </span>
                  )}
                  {t.vehicle && (
                    <span>
                      <span className="text-iconsa-gray">Vehículo:</span>{' '}
                      {t.vehicle.spectrum_code ? `${t.vehicle.spectrum_code} — ` : ''}
                      {t.vehicle.description}
                    </span>
                  )}
                  {t.trailer && (
                    <span>
                      <span className="text-iconsa-gray">Remolque:</span>{' '}
                      {t.trailer.spectrum_code ? `${t.trailer.spectrum_code} — ` : ''}
                      {t.trailer.description}
                    </span>
                  )}
                  {t.att_permit && (
                    <span className="inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                      ATTT
                    </span>
                  )}
                  {t.escort && (
                    <span className="inline-flex items-center rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">
                      Escolta
                    </span>
                  )}
                </div>
                {/* Líneas asignadas al viaje */}
                {t.lines.length > 0 && (
                  <ul className="mt-2 space-y-0.5">
                    {t.lines.map((line, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="text-xs">
                          {line.line_type === 'Equipo' ? '🔧' : '📦'}
                        </span>
                        <span title={line.description}>{line.description}</span>
                        <span className="shrink-0 text-xs text-iconsa-gray">
                          ×{formatQty(line.quantity_assigned)}
                        </span>
                        {(line.qty_delivered ?? 0) > 0 && (
                          <span className="shrink-0 text-xs text-orange-600">
                            ({formatQty(line.qty_delivered)} entregadas)
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {/* Mini-timeline de eventos */}
                {t.events.length > 0 && (
                  <div className="mt-2 space-y-1 border-t border-gray-200 pt-2">
                    {t.events.map((ev, idx) => {
                      const icon = ev.event_type === 'Salida' ? '🚛'
                        : ev.event_type === 'Llegada' ? '📍'
                        : ev.event_type === 'Entrega' ? '✅'
                        : ev.event_type === 'Retorno' ? '🏠'
                        : '⚠️'
                      return (
                        <div key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="text-xs shrink-0">{icon}</span>
                          <span className="font-medium shrink-0">{ev.event_type}:</span>
                          <span className="text-iconsa-gray">{formatDateTime(ev.event_timestamp)}</span>
                          {ev.event_type === 'Entrega' && ev.received_by_name && (
                            <span className="text-iconsa-gray">— Recibido por: {ev.received_by_name}</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
                {/* Código de confirmación — visible para pm, logistica, admin */}
                {(role === 'pm' || role === 'logistica' || role === 'admin') && t.confirmation_code && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-navy/5 border border-navy/20 px-3 py-1.5">
                    <KeyRound className="h-3.5 w-3.5 text-navy shrink-0" />
                    <span className="text-xs text-iconsa-gray">Código:</span>
                    <span className="font-mono text-lg font-bold text-navy tracking-[0.25em]">
                      {t.confirmation_code}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
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

      {/* Cambio 5 T8: Modales pickup/external orders */}
      {confirmPickupOrder && (
        <ConfirmPickupOrderDeliveryModal
          order={confirmPickupOrder}
          receiverOptions={receiverOptions}
          onConfirm={handleConfirmPickupDelivery}
          onClose={() => setConfirmPickupOrder(null)}
          loading={pickupOrders.loading}
          error={pickupOrders.error}
        />
      )}

      {confirmExternalOrder && (
        <ConfirmExternalOrderDeliveryModal
          order={confirmExternalOrder}
          receiverOptions={receiverOptions}
          onConfirm={handleConfirmExternalDelivery}
          onClose={() => setConfirmExternalOrder(null)}
          loading={externalOrders.loading}
          error={externalOrders.error}
        />
      )}

      {cancelPickupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">
              ¿Cancelar pickup {cancelPickupModal.order.pickup_id}?
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              {cancelPickupModal.deliveredCount > 0 ? (
                <>
                  Cancelar este pickup va a devolver al backlog las líneas no entregadas.
                  Las {cancelPickupModal.deliveredCount}{' '}
                  {cancelPickupModal.deliveredCount === 1 ? 'línea ya entregada' : 'líneas ya entregadas'}{' '}
                  ({cancelPickupModal.deliveredQty} unidades en total) quedan registradas como entregadas (no se invierten). ¿Confirmar?
                </>
              ) : (
                <>Las líneas volverán al backlog. ¿Confirmar?</>
              )}
            </p>
            {pickupOrders.error && (
              <p className="mt-2 text-sm text-red-600">{pickupOrders.error}</p>
            )}
            <div className="mt-4 flex items-center justify-end gap-3">
              <Button variant="ghost" size="sm" onClick={() => setCancelPickupModal(null)} disabled={pickupOrders.loading}>
                Volver
              </Button>
              <Button variant="danger" size="sm" onClick={confirmCancelPickup} loading={pickupOrders.loading}>
                Sí, cancelar pickup
              </Button>
            </div>
          </div>
        </div>
      )}

      {cancelExternalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">
              ¿Cancelar viaje externo {cancelExternalModal.order.external_id}?
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              {cancelExternalModal.deliveredCount > 0 ? (
                <>
                  Cancelar este viaje externo va a devolver al backlog las líneas no entregadas.
                  Las {cancelExternalModal.deliveredCount}{' '}
                  {cancelExternalModal.deliveredCount === 1 ? 'línea ya entregada' : 'líneas ya entregadas'}{' '}
                  ({cancelExternalModal.deliveredQty} unidades en total) quedan registradas como entregadas. La factura subida se preserva. ¿Confirmar?
                </>
              ) : (
                <>Las líneas volverán al backlog. La factura subida se preserva. ¿Confirmar?</>
              )}
            </p>
            {externalOrders.error && (
              <p className="mt-2 text-sm text-red-600">{externalOrders.error}</p>
            )}
            <div className="mt-4 flex items-center justify-end gap-3">
              <Button variant="ghost" size="sm" onClick={() => setCancelExternalModal(null)} disabled={externalOrders.loading}>
                Volver
              </Button>
              <Button variant="danger" size="sm" onClick={confirmCancelExternal} loading={externalOrders.loading}>
                Sí, cancelar viaje externo
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
