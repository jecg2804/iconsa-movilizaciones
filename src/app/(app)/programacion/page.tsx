'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Truck, Lock, Siren, Search, Wrench, Package, ArrowRight, ChevronsDownUp, ChevronsUpDown, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useProjects } from '@/hooks/useProjects'
import { useTrips, type TripWithRelations } from '@/hooks/useTrips'
import { usePickup } from '@/hooks/usePickup'
import { useExternal } from '@/hooks/useExternal'
import { PickupDeliveryModal, type PendingPickupLine } from '@/components/programacion/PickupDeliveryModal'
import { ExternalDeliveryModal, type PendingExternalLine } from '@/components/programacion/ExternalDeliveryModal'
import { getFileUrl } from '@/lib/supabase/storage'
import {
  ExternalApprovalForm,
  EMPTY_FORM_VALUES,
  validateApprovalForm,
  type ExternalApprovalFormValues,
  type ExternalApprovalFormErrors,
} from '@/components/programacion/ExternalApprovalForm'
import type { Attachment } from '@/lib/supabase/storage'
import { canCreateTrip } from '@/lib/utils/roles'
import { TRIP_STATUSES } from '@/lib/utils/constants'
import { formatDate, formatCurrency } from '@/lib/utils/format'
import { BacklogTable } from '@/components/programacion/BacklogTable'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { MiniCalendar, type CalendarItem } from '@/components/ui/MiniCalendar'

// Tipos de línea para el filtro del backlog
const LINE_TYPES = ['Todos', 'Equipo', 'Material'] as const
type LineTypeFilter = (typeof LINE_TYPES)[number]

export default function ProgramacionPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { person, role, loading: authLoading } = useAuth()
  const { allProjects, loading: projectsLoading } = useProjects()
  const {
    backlog,
    backlogLoading,
    refetchBacklog,
    trips,
    tripsTotalCount,
    listLoading,
    listError,
    filters: tripFilters,
    setFilters: setTripFilters,
  } = useTrips()
  const pickup = usePickup()
  const [pickupConfirmLineId, setPickupConfirmLineId] = useState<string | null>(null)
  // Surface 3: Pickups Pendientes de Retiro
  const [pendingPickups, setPendingPickups] = useState<PendingPickupLine[]>([])
  const [pickupsLoading, setPickupsLoading] = useState(false)
  const [pickupDeliveryLine, setPickupDeliveryLine] = useState<PendingPickupLine | null>(null)
  const [pickupRevertLine, setPickupRevertLine] = useState<PendingPickupLine | null>(null)
  const [people, setPeople] = useState<{ id: string; name: string }[]>([])

  // Cambio 4 — Surface 1: Aprobar viaje externo desde backlog
  const external = useExternal()
  const [externalApproveModal, setExternalApproveModal] = useState<{
    lineId: string
  } | null>(null)
  const [externalApproveValues, setExternalApproveValues] = useState<ExternalApprovalFormValues>(EMPTY_FORM_VALUES)
  const [externalApproveErrors, setExternalApproveErrors] = useState<ExternalApprovalFormErrors>({})

  // Cambio 4 — Surface 3: Viajes Externos Pendientes
  const [pendingExternals, setPendingExternals] = useState<PendingExternalLine[]>([])
  const [externalsLoading, setExternalsLoading] = useState(false)
  const [externalDeliveryLine, setExternalDeliveryLine] = useState<PendingExternalLine | null>(null)
  const [externalRevertLine, setExternalRevertLine] = useState<PendingExternalLine | null>(null)

  // J4: todos los filtros de viajes son ahora server-side via tripFilters del hook.
  // Project filter usa 2-step query (trips no tiene project_id directo).
  // El calendario y la tabla son una sola "vista de datos" con filtros unificados.

  // --- Filtros del backlog (independientes del trip filter) ---
  const [typeFilter, setTypeFilter] = useState<LineTypeFilter>('Todos')
  const [backlogProjectFilter, setBacklogProjectFilter] = useState<string | null>(null)
  const [backlogSearch, setBacklogSearch] = useState('')

  // --- Control de expandir/colapsar viajes (controlled state) ---
  const [tripExpandedKeys, setTripExpandedKeys] = useState<Set<string>>(new Set())
  const [expandInitialized, setExpandInitialized] = useState(false)

  // Conductores para filtro
  const [conductors, setConductors] = useState<{ id: string; name: string }[]>([])
  useEffect(() => {
    supabase
      .from('people')
      .select('id, name')
      .eq('status', 'Activo')
      .eq('app_role', 'campo')
      .order('name')
      .then(({ data }) => setConductors(data ?? []))
  }, [supabase])

  // Personas activas para receptor de pickup (Cambio 3 — Surface 3)
  useEffect(() => {
    supabase
      .from('people')
      .select('id, name')
      .eq('status', 'Activo')
      .order('name')
      .then(({ data }) => setPeople(data ?? []))
  }, [supabase])

  // --- Fetch pickups pendientes de retiro (Cambio 3 — Surface 3) ---
  const refetchPendingPickups = useCallback(async () => {
    setPickupsLoading(true)
    try {
      const { data } = await supabase
        .from('sm_request_lines')
        .select(`
          id, description, line_type, quantity, unit_text,
          pickup_approved_at,
          unit:unit_id(code),
          request:request_id!inner(
            id, request_id,
            project:project_id(code, name)
          )
        `)
        .eq('status', 'Pickup Aprobado')
        .eq('pickup_by_project', true)
        .is('pickup_completed_at', null)
        .order('pickup_approved_at', { ascending: true })

      const mapped: PendingPickupLine[] = (data ?? []).map((row: Record<string, unknown>) => {
        const request = Array.isArray(row.request) ? row.request[0] : row.request
        const reqRec = (request ?? {}) as Record<string, unknown>
        const projRaw = reqRec.project as Record<string, unknown> | Record<string, unknown>[] | null
        const project = Array.isArray(projRaw) ? projRaw[0] : projRaw
        const unitRaw = row.unit as Record<string, unknown> | Record<string, unknown>[] | null
        const unit = Array.isArray(unitRaw) ? unitRaw[0] : unitRaw
        return {
          id: row.id as string,
          description: row.description as string,
          line_type: row.line_type as string,
          quantity: row.quantity as number,
          unitCode: ((unit as { code?: string } | null)?.code) ?? ((row.unit_text as string | null) ?? ''),
          request_id: ((reqRec.request_id as string | null) ?? ''),
          request_uuid: ((reqRec.id as string | null) ?? ''),
          project_code: ((project as { code?: string } | null)?.code) ?? null,
          project_name: ((project as { name?: string } | null)?.name) ?? null,
          pickup_approved_at: row.pickup_approved_at as string,
        }
      })
      setPendingPickups(mapped)
    } finally {
      setPickupsLoading(false)
    }
  }, [supabase])

  // Fetch pickups pendientes solo para logistica/admin
  useEffect(() => {
    if (role === 'logistica' || role === 'admin') {
      void refetchPendingPickups()
    }
  }, [role, refetchPendingPickups])

  // --- Fetch externos pendientes (Cambio 4 — Surface 3) ---
  const refetchPendingExternals = useCallback(async () => {
    setExternalsLoading(true)
    try {
      const { data } = await supabase
        .from('sm_request_lines')
        .select(`
          id, description, line_type, quantity, unit_text,
          external_approved_at, external_provider_name, external_invoice_amount,
          external_invoice_attachments, external_notes,
          unit:unit_id(code),
          request:request_id!inner(
            id, request_id,
            project:project_id(code, name)
          )
        `)
        .eq('status', 'Externo Aprobado')
        .eq('external_by_provider', true)
        .is('external_completed_at', null)
        .order('external_approved_at', { ascending: true })

      const mapped: PendingExternalLine[] = (data ?? []).map((row: Record<string, unknown>) => {
        const request = Array.isArray(row.request) ? row.request[0] : row.request
        const reqRec = (request ?? {}) as Record<string, unknown>
        const projRaw = reqRec.project as Record<string, unknown> | Record<string, unknown>[] | null
        const project = Array.isArray(projRaw) ? projRaw[0] : projRaw
        const unitRaw = row.unit as Record<string, unknown> | Record<string, unknown>[] | null
        const unit = Array.isArray(unitRaw) ? unitRaw[0] : unitRaw
        const attachmentsRaw = row.external_invoice_attachments
        const attachments = Array.isArray(attachmentsRaw) ? (attachmentsRaw as unknown as Attachment[]) : []
        return {
          id: row.id as string,
          description: row.description as string,
          line_type: row.line_type as string,
          quantity: row.quantity as number,
          unitCode: ((unit as { code?: string } | null)?.code) ?? ((row.unit_text as string | null) ?? ''),
          request_id: ((reqRec.request_id as string | null) ?? ''),
          request_uuid: ((reqRec.id as string | null) ?? ''),
          project_code: ((project as { code?: string } | null)?.code) ?? null,
          project_name: ((project as { name?: string } | null)?.name) ?? null,
          external_approved_at: row.external_approved_at as string,
          external_provider_name: row.external_provider_name as string,
          external_invoice_amount: row.external_invoice_amount as number,
          external_invoice_attachments: attachments,
          external_notes: (row.external_notes as string | null) ?? null,
        }
      })
      setPendingExternals(mapped)
    } finally {
      setExternalsLoading(false)
    }
  }, [supabase])

  // Fetch externos pendientes solo para logistica/admin
  useEffect(() => {
    if (role === 'logistica' || role === 'admin') {
      void refetchPendingExternals()
    }
  }, [role, refetchPendingExternals])

  const receiverOptions = useMemo(
    () => people.map((p) => ({ value: p.id, label: p.name })),
    [people],
  )

  // Selección de líneas
  const [selectedLineIds, setSelectedLineIds] = useState<Set<string>>(new Set())

  // --- Filtrado ---
  const filteredBacklog = useMemo(() => {
    return backlog.filter((line) => {
      if (backlogProjectFilter && line.request.project?.id !== backlogProjectFilter) return false
      if (typeFilter !== 'Todos' && line.line_type !== typeFilter) return false
      if (backlogSearch) {
        const q = backlogSearch.toLowerCase()
        const matchesId = line.request.request_id?.toLowerCase().includes(q) ?? false
        const matchesDesc = line.description?.toLowerCase().includes(q) ?? false
        const matchesEquip = line.equipment?.spectrum_code?.toLowerCase().includes(q) ?? false
        if (!matchesId && !matchesDesc && !matchesEquip) return false
      }
      return true
    })
  }, [backlog, backlogProjectFilter, typeFilter, backlogSearch])

  // Inicializar colapsado al cargar datos. trips ya viene filtrado server-side
  // por el hook según tripFilters (status, conductor, search, projectId,
  // dateFrom, dateTo) — no hay capa de filter client-side.
  useEffect(() => {
    if (!expandInitialized && trips.length > 0) {
      setTripExpandedKeys(new Set()) // default collapsed
      setExpandInitialized(true)
    }
  }, [expandInitialized, trips])

  const allTripsExpanded = tripExpandedKeys.size > 0

  // --- MiniCalendar items — query SIN paginación pero CON los mismos filtros que la tabla.
  // J4: calendario y tabla son una sola "vista de datos" con un set de filtros
  // unificado. Cualquier filtro activo (proyecto, status, conductor, fechas,
  // search) aplica por igual.
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>([])

  useEffect(() => {
    const fetchCalendarTrips = async () => {
      // Resolver projectId via 2-step (trips no tiene project_id directo)
      let projectTripIds: string[] | null = null
      if (tripFilters.projectId) {
        const { data: linkData } = await supabase
          .from('trip_line_assignments')
          .select('trip_id, line:request_line_id!inner(request:request_id!inner(project_id))')
          .eq('line.request.project_id', tripFilters.projectId)
        const ids = new Set<string>()
        for (const row of linkData ?? []) {
          const tripId = (row as { trip_id: string | null }).trip_id
          if (tripId) ids.add(tripId)
        }
        projectTripIds = Array.from(ids)
        if (projectTripIds.length === 0) {
          setCalendarItems([])
          return
        }
      }

      let query = supabase
        .from('trips')
        .select('id, trip_id, scheduled_date, status, driver:people!driver_id(name)')
        .order('scheduled_date')

      if (projectTripIds) {
        query = query.in('id', projectTripIds)
      }
      if (tripFilters.status) {
        query = query.eq('status', tripFilters.status)
      } else {
        query = query.not('status', 'in', '("Cancelado")')
      }
      if (tripFilters.conductorId) {
        query = query.eq('driver_id', tripFilters.conductorId)
      }
      if (tripFilters.dateFrom) {
        query = query.gte('scheduled_date', tripFilters.dateFrom)
      }
      if (tripFilters.dateTo) {
        query = query.lte('scheduled_date', tripFilters.dateTo)
      }
      if (tripFilters.search) {
        query = query.ilike('trip_id', `%${tripFilters.search}%`)
      }

      const { data } = await query
      setCalendarItems((data ?? []).map((t: Record<string, unknown>) => {
        const driver = Array.isArray(t.driver) ? t.driver[0] : t.driver
        return {
          id: t.id as string,
          date: t.scheduled_date as string,
          label: (t.trip_id as string) ?? '—',
          status: t.status as string,
          badgeVariant: 'trip' as const,
          subtitle: `${(driver as { name: string } | null)?.name ?? 'Sin conductor'}`,
          href: `/programacion/viaje/${t.id}`,
        }
      }))
    }
    fetchCalendarTrips()
  }, [
    supabase,
    tripFilters.projectId,
    tripFilters.status,
    tripFilters.conductorId,
    tripFilters.dateFrom,
    tripFilters.dateTo,
    tripFilters.search,
  ])

  // --- Handlers de filtro de fecha (todos server-side via setTripFilters) ---
  // J4-A: click en día del calendario usa `singleDay` (filtra solo la tabla,
  // el calendario sigue mostrando otros días). Desde/Hasta usa dateFrom/dateTo.
  const handleCalendarClick = useCallback(
    (date: string | null) => {
      if (!date) {
        setTripFilters({ singleDay: null, page: 0 })
        return
      }
      // Toggle: si es el mismo día ya seleccionado, des-seleccionar.
      if (tripFilters.singleDay === date) {
        setTripFilters({ singleDay: null, page: 0 })
      } else {
        setTripFilters({ singleDay: date, page: 0 })
      }
    },
    [tripFilters.singleDay, setTripFilters],
  )

  const handleDateFromChange = useCallback(
    (from: string | null) => {
      setTripFilters({ dateFrom: from, page: 0 })
    },
    [setTripFilters],
  )

  const handleDateToChange = useCallback(
    (to: string | null) => {
      setTripFilters({ dateTo: to, page: 0 })
    },
    [setTripFilters],
  )

  // --- Selección de líneas ---
  const visibleSelectedCount = useMemo(() => {
    return filteredBacklog.filter((l) => selectedLineIds.has(l.id)).length
  }, [filteredBacklog, selectedLineIds])

  const handleToggleSelect = useCallback((lineId: string) => {
    setSelectedLineIds((prev) => {
      const next = new Set(prev)
      if (next.has(lineId)) next.delete(lineId)
      else next.add(lineId)
      return next
    })
  }, [])

  const handleSelectAll = useCallback(
    (selected: boolean) => {
      setSelectedLineIds((prev) => {
        const next = new Set(prev)
        for (const line of filteredBacklog) {
          if (selected) next.add(line.id)
          else next.delete(line.id)
        }
        return next
      })
    },
    [filteredBacklog],
  )

  const handleCrearViajeConLineas = useCallback(() => {
    const ids = Array.from(selectedLineIds).join(',')
    router.push(`/programacion/viaje/nuevo?lines=${ids}`)
  }, [selectedLineIds, router])

  // --- Handlers Pickup (Cambio 3) ---
  const handleApprovePickup = useCallback((lineId: string) => {
    setPickupConfirmLineId(lineId)
  }, [])

  const confirmApprovePickup = useCallback(async () => {
    if (!pickupConfirmLineId || !person?.id) return
    const result = await pickup.approvePickupFromBacklog(pickupConfirmLineId, person.id)
    if (result.ok) {
      setPickupConfirmLineId(null)
      refetchBacklog()
      void refetchPendingPickups()
    }
    // Errores se muestran via pickup.error en el modal
  }, [pickupConfirmLineId, person, pickup, refetchBacklog, refetchPendingPickups])

  const handleCompletePickup = useCallback(async (data: {
    receivedById: string | null
    receivedByName: string
    notes: string
    attachments: Attachment[]
  }) => {
    if (!pickupDeliveryLine) return
    const result = await pickup.completePickup(
      pickupDeliveryLine.id,
      data.receivedById,
      data.receivedByName,
      data.notes,
      data.attachments,
    )
    if (result.ok) {
      setPickupDeliveryLine(null)
      void refetchPendingPickups()
    }
    // Errores via pickup.error en el modal
  }, [pickupDeliveryLine, pickup, refetchPendingPickups])

  const confirmRevertPickup = useCallback(async () => {
    if (!pickupRevertLine) return
    const result = await pickup.revertPickupToBacklog(pickupRevertLine.id)
    if (result.ok) {
      setPickupRevertLine(null)
      void refetchPendingPickups()
      refetchBacklog()
    }
    // Errores se muestran via pickup.error en el modal
  }, [pickupRevertLine, pickup, refetchPendingPickups, refetchBacklog])

  // --- Handlers Aprobar viaje externo (Cambio 4 — Surface 1) ---
  const handleApproveExternal = useCallback((lineId: string) => {
    setExternalApproveValues(EMPTY_FORM_VALUES)
    setExternalApproveErrors({})
    setExternalApproveModal({ lineId })
  }, [])

  const closeExternalApproveModal = useCallback(() => {
    setExternalApproveModal(null)
    setExternalApproveValues(EMPTY_FORM_VALUES)
    setExternalApproveErrors({})
  }, [])

  const confirmApproveExternal = useCallback(async () => {
    if (!externalApproveModal || !person?.id) return
    const { valid, errors } = validateApprovalForm(externalApproveValues)
    if (!valid) {
      setExternalApproveErrors(errors)
      return
    }
    setExternalApproveErrors({})
    const result = await external.approveExternal(
      externalApproveModal.lineId,
      person.id,
      externalApproveValues.providerName,
      parseFloat(externalApproveValues.invoiceAmount),
      externalApproveValues.invoiceAttachments,
      externalApproveValues.notes,
    )
    if (result.ok) {
      setExternalApproveModal(null)
      setExternalApproveValues(EMPTY_FORM_VALUES)
      setExternalApproveErrors({})
      refetchBacklog()
      void refetchPendingExternals()
    }
  }, [externalApproveModal, person, external, externalApproveValues, refetchBacklog, refetchPendingExternals])

  // --- Handlers Confirmar entrega externo + Devolver al backlog (Cambio 4 — Surface 3) ---
  const handleCompleteExternal = useCallback(async (data: {
    receivedById: string | null
    receivedByName: string
    notes: string
    additionalAttachments: Attachment[]
  }) => {
    if (!externalDeliveryLine) return
    const result = await external.completeExternal(
      externalDeliveryLine.id,
      data.receivedById,
      data.receivedByName || null,
      data.notes || null,
      data.additionalAttachments,
    )
    if (result.ok) {
      setExternalDeliveryLine(null)
      void refetchPendingExternals()
    }
  }, [externalDeliveryLine, external, refetchPendingExternals])

  const confirmRevertExternal = useCallback(async () => {
    if (!externalRevertLine) return
    const result = await external.revertExternalToBacklog(externalRevertLine.id)
    if (result.ok) {
      setExternalRevertLine(null)
      void refetchPendingExternals()
      refetchBacklog()
    }
  }, [externalRevertLine, external, refetchPendingExternals, refetchBacklog])

  const handleRequestClick = useCallback(
    (requestId: string) => {
      router.push(`/solicitudes/${requestId}`)
    },
    [router],
  )

  const puedeCrearViaje = canCreateTrip(role)

  // --- Columnas de tabla de viajes ---
  const columns: Column<TripWithRelations>[] = useMemo(
    () => [
      {
        key: 'trip_id',
        header: 'ID',
        sortable: true,
        serverSortKey: 'trip_id',
        className: 'w-[150px]',
        render: (row) => (
          <a
            href={`/programacion/viaje/${row.id}`}
            onClick={(e) => { e.stopPropagation(); router.push(`/programacion/viaje/${row.id}`) }}
            className="font-mono text-sm font-medium text-navy hover:underline"
          >
            {row.trip_id ?? '—'}
          </a>
        ),
        sortValue: (row) => row.trip_id ?? '',
      },
      {
        key: 'scheduled_date',
        header: 'Fecha',
        sortable: true,
        serverSortKey: 'scheduled_date',
        className: 'w-[120px]',
        render: (row) => (
          <span className="text-sm text-gray-900">
            {formatDate(row.scheduled_date)}
          </span>
        ),
        sortValue: (row) => row.scheduled_date,
      },
      {
        key: 'driver',
        header: 'Conductor',
        sortable: true,
        render: (row) => (
          <span className="text-sm text-gray-900">
            {row.driver?.name ?? '—'}
          </span>
        ),
        sortValue: (row) => row.driver?.name ?? '',
      },
      {
        key: 'vehicle',
        header: 'Vehículo',
        render: (row) => (
          <span
            className="max-w-[160px] truncate block text-sm text-gray-900"
            title={row.vehicle?.description ?? '—'}
          >
            {row.vehicle?.description ?? '—'}
          </span>
        ),
      },
      {
        key: 'rate',
        header: 'Tarifa',
        render: (row) =>
          row.rate ? (
            <span
              className="text-sm text-gray-900"
              title={row.rate.code}
            >
              {formatCurrency(row.rate.rate)}
            </span>
          ) : (
            <span className="text-sm text-iconsa-gray">—</span>
          ),
      },
      {
        key: 'route',
        header: 'Ruta',
        render: (row) => {
          const origins = new Set<string>()
          const destinations = new Set<string>()
          for (const a of row.assignments) {
            const from = a.line?.from_location?.name ?? a.line?.from_text ?? null
            const to = a.line?.to_location?.name ?? a.line?.to_text ?? null
            if (from) origins.add(from)
            if (to) destinations.add(to)
          }
          if (origins.size === 0 && destinations.size === 0) {
            return <span className="text-sm text-iconsa-gray">—</span>
          }
          if (origins.size > 1 || destinations.size > 1) {
            return <span className="text-sm text-gray-900">Multi-ruta</span>
          }
          const from = Array.from(origins)[0] ?? ''
          const to = Array.from(destinations)[0] ?? ''
          return (
            <span
              className="max-w-[200px] truncate block text-sm text-gray-900"
              title={`${from} → ${to}`}
            >
              {from} → {to}
            </span>
          )
        },
      },
      {
        key: 'lines',
        header: 'Líneas',
        className: 'w-[80px] text-center',
        render: (row) => (
          <span className="text-sm text-gray-900">{row.assignments.length}</span>
        ),
      },
      {
        key: 'status',
        header: 'Estado',
        sortable: true,
        serverSortKey: 'status',
        className: 'w-[130px]',
        render: (row) => (
          <span className="flex items-center gap-1.5">
            <Badge label={row.status} variant="trip" />
            {row.status === 'En Ruta' && row.assignments?.some(a => a.line && (a.line.status === 'Entregada' || a.line.status === 'Parcial')) && (
              <span className="text-green-600 text-xs" title="Material entregado">✅</span>
            )}
          </span>
        ),
        sortValue: (row) => row.status,
      },
      {
        key: 'badges',
        header: '',
        className: 'w-[72px]',
        render: (row) => (
          <span className="flex items-center gap-1">
            {row.att_permit && (
              <span title="Requiere permiso ATTT" className="inline-flex items-center rounded-full bg-orange-100 px-1.5 py-0.5 text-xs font-medium text-orange-700">
                <Lock className="h-3 w-3" />
              </span>
            )}
            {row.escort && (
              <span title="Requiere escolta" className="inline-flex items-center rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">
                <Siren className="h-3 w-3" />
              </span>
            )}
          </span>
        ),
      },
      {
        key: 'actions',
        header: '',
        className: 'w-[110px]',
        render: (row: TripWithRelations) => {
          const today = new Date().toISOString().split('T')[0]
          if (row.status === 'Programado' && row.scheduled_date === today) {
            return (
              <a href={`/mis-viajes/${row.id}?action=dispatch`}
                 className="text-xs font-medium text-navy hover:underline whitespace-nowrap">
                🚛 Despachar →
              </a>
            )
          }
          if (row.status === 'En Ruta') {
            return (
              <a href={`/mis-viajes/${row.id}`}
                 className="text-xs font-medium text-blue-600 hover:underline whitespace-nowrap">
                Ver Eventos →
              </a>
            )
          }
          return null
        },
      },
    ],
    [],
  )

  const mobileRender = useCallback(
    (row: TripWithRelations) => (
      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2 active:bg-gray-50">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-sm font-bold text-navy">{row.trip_id ?? '—'}</span>
          <Badge label={row.status} variant="trip" />
        </div>
        <div className="flex items-center justify-between gap-2 text-sm text-gray-900">
          <span>{formatDate(row.scheduled_date)}</span>
          <span className="text-iconsa-gray">{row.driver?.name ?? '—'}</span>
        </div>
        <div className="text-sm text-iconsa-gray truncate">{row.vehicle?.description ?? '—'}</div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-iconsa-gray">
            {row.assignments.length} {row.assignments.length === 1 ? 'línea' : 'líneas'}
          </span>
          <span className="flex items-center gap-1">
            {row.att_permit && (
              <span title="Permiso ATTT" className="inline-flex items-center rounded-full bg-orange-100 px-1.5 py-0.5 text-xs font-medium text-orange-700">
                <Lock className="h-3 w-3" />
              </span>
            )}
            {row.escort && (
              <span title="Escolta" className="inline-flex items-center rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">
                <Siren className="h-3 w-3" />
              </span>
            )}
          </span>
        </div>
      </div>
    ),
    [],
  )

  const isLoading = authLoading

  // Estilo compartido para selects nativos
  const selectClass = 'rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 bg-white focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue'
  const inputClass = 'w-full rounded-lg border border-gray-200 pl-8 pr-3 py-1.5 text-sm placeholder:text-gray-400 focus:border-iconsa-blue focus:outline-none focus:ring-1 focus:ring-iconsa-blue'

  return (
    <div className="space-y-6">
      {/* Header — un solo botón contextual */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-navy">Programación de Movilizaciones</h1>
        {puedeCrearViaje && (
          <div className="flex items-center gap-2">
            {visibleSelectedCount > 0 && (
              <button type="button" title="Deseleccionar todo" onClick={() => setSelectedLineIds(new Set())} className="rounded-full p-1.5 text-iconsa-gray hover:bg-gray-100 transition-colors">
                <X className="h-4 w-4" />
              </button>
            )}
            <Button
              onClick={visibleSelectedCount > 0 ? handleCrearViajeConLineas : () => router.push('/programacion/viaje/nuevo')}
              className="shrink-0"
            >
              {visibleSelectedCount > 0 ? (
                <><Truck className="h-4 w-4" /> Crear Movilización ({visibleSelectedCount} {visibleSelectedCount === 1 ? 'línea' : 'líneas'})</>
              ) : (
                <><Plus className="h-4 w-4" /> Nueva Movilización</>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* ─── Sección Pickups Pendientes de Retiro (Cambio 3 — Surface 3) ─── */}
      {(role === 'logistica' || role === 'admin') && (pickupsLoading || pendingPickups.length > 0) && (
        <section className="rounded-xl border border-amber-200 bg-amber-50/30">
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-gray-900">Pickups Pendientes de Retiro</h2>
              {!pickupsLoading && (
                <span className="rounded-full bg-amber-200 text-amber-900 px-2 py-0.5 text-xs font-medium">
                  {pendingPickups.length}
                </span>
              )}
            </div>
          </div>
          <div className="px-4 pb-4">
            {pickupsLoading ? (
              <p className="py-4 text-center text-sm text-iconsa-gray">Cargando pickups...</p>
            ) : (
              <div className="space-y-2">
                {pendingPickups.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 rounded-lg border border-amber-200 bg-white px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{p.description}</p>
                      <p className="text-xs text-iconsa-gray">
                        <span className="font-mono">{p.request_id}</span>
                        {p.project_code && <span> · {p.project_code}</span>}
                        <span> · {p.quantity} {p.unitCode}</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPickupRevertLine(p)}
                      className="shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                      title="Devolver línea al backlog"
                    >
                      Devolver al backlog
                    </button>
                    <button
                      type="button"
                      onClick={() => setPickupDeliveryLine(p)}
                      className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 transition-colors"
                    >
                      Registrar entrega
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ─── Sección Viajes Externos Pendientes (Cambio 4 — Surface 3) ─── */}
      {(role === 'logistica' || role === 'admin') && (externalsLoading || pendingExternals.length > 0) && (
        <section className="rounded-xl border border-blue-200 bg-blue-50/30">
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-gray-900">Viajes Externos Pendientes</h2>
              {!externalsLoading && (
                <span className="rounded-full bg-blue-200 text-blue-900 px-2 py-0.5 text-xs font-medium">
                  {pendingExternals.length}
                </span>
              )}
            </div>
          </div>
          <div className="px-4 pb-4">
            {externalsLoading ? (
              <p className="py-4 text-center text-sm text-iconsa-gray">Cargando externos...</p>
            ) : (
              <div className="space-y-2">
                {pendingExternals.map((p) => {
                  const firstInvoicePath = p.external_invoice_attachments[0]?.path ?? null
                  const handleOpenInvoice = async () => {
                    if (!firstInvoicePath) return
                    const url = await getFileUrl(firstInvoicePath)
                    if (url) window.open(url, '_blank', 'noopener,noreferrer')
                  }
                  return (
                    <div key={p.id} className="flex items-center gap-3 rounded-lg border border-blue-200 bg-white px-4 py-2.5 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">{p.description}</p>
                        <p className="text-xs text-iconsa-gray">
                          <span className="font-mono">{p.request_id}</span>
                          {p.project_code && <span> · {p.project_code}</span>}
                          <span> · {p.quantity} {p.unitCode}</span>
                          <span> · {p.external_provider_name}</span>
                          <span> · {formatCurrency(p.external_invoice_amount)}</span>
                        </p>
                        {p.external_notes && (
                          <p className="mt-0.5 text-xs italic text-gray-500 truncate" title={p.external_notes}>
                            {p.external_notes}
                          </p>
                        )}
                      </div>
                      {firstInvoicePath && (
                        <button
                          type="button"
                          onClick={handleOpenInvoice}
                          className="shrink-0 rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 transition-colors"
                          title="Ver factura"
                        >
                          Ver factura
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setExternalRevertLine(p)}
                        className="shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                        title="Devolver línea al backlog"
                      >
                        Devolver al backlog
                      </button>
                      <button
                        type="button"
                        onClick={() => setExternalDeliveryLine(p)}
                        className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 transition-colors"
                      >
                        Confirmar entrega
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ─── Sección 1: Sin Programar ─── */}
      <section className="rounded-xl border border-gray-200 bg-white">
        <div className="px-4 pt-4 pb-3 space-y-3">
          {/* Header: título + count + toggle tipo */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-gray-900">Sin Programar</h2>
              {!backlogLoading && (
                <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-medium">
                  {filteredBacklog.length}
                </span>
              )}
            </div>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
              {LINE_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1.5 font-medium transition-colors ${
                    typeFilter === t
                      ? 'bg-navy text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Filtros inline */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              title="Filtrar por proyecto"
              value={backlogProjectFilter ?? ''}
              onChange={(e) => setBacklogProjectFilter(e.target.value || null)}
              className={selectClass}
              disabled={projectsLoading}
            >
              <option value="">Proyecto</option>
              {allProjects.map((p) => (
                <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
              ))}
            </select>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar equipo, solicitud..."
                value={backlogSearch}
                onChange={(e) => setBacklogSearch(e.target.value)}
                className={inputClass}
              />
            </div>
            {(backlogProjectFilter || backlogSearch) && (
              <button
                type="button"
                onClick={() => { setBacklogProjectFilter(null); setBacklogSearch('') }}
                className="text-xs text-iconsa-blue hover:underline"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Tabla backlog */}
        <div className="px-1 pb-1">
          <BacklogTable
            lines={filteredBacklog}
            loading={backlogLoading}
            selectable={puedeCrearViaje}
            selectedLineIds={selectedLineIds}
            onToggleSelect={handleToggleSelect}
            onSelectAll={handleSelectAll}
            onRequestClick={handleRequestClick}
            onApprovePickup={(role === 'logistica' || role === 'admin') ? handleApprovePickup : undefined}
            onApproveExternal={(role === 'logistica' || role === 'admin') ? handleApproveExternal : undefined}
          />
        </div>
      </section>

      {/* ─── Sección 2: Movilizaciones ─── */}
      <section className="rounded-xl border border-gray-200 bg-white">
        <div className="px-4 pt-4 pb-3 space-y-3">
          {/* Header */}
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-gray-900">Movilizaciones</h2>
            {trips.length > 0 && (
              <button
                type="button"
                onClick={() => setTripExpandedKeys((prev) =>
                  prev.size > 0 ? new Set() : new Set(trips.map((t) => t.id))
                )}
                className="flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {allTripsExpanded ? <ChevronsDownUp className="h-3.5 w-3.5" /> : <ChevronsUpDown className="h-3.5 w-3.5" />}
                {allTripsExpanded ? 'Colapsar' : 'Expandir'}
              </button>
            )}
          </div>

          {/* Filtros inline */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              title="Filtrar por proyecto"
              value={tripFilters.projectId ?? ''}
              onChange={(e) => setTripFilters({ projectId: e.target.value || null, page: 0 })}
              className={selectClass}
              disabled={projectsLoading}
            >
              <option value="">Proyecto</option>
              {allProjects.map((p) => (
                <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
              ))}
            </select>
            <select
              title="Filtrar por estado"
              value={tripFilters.status ?? ''}
              onChange={(e) => setTripFilters({ status: e.target.value || null, page: 0 })}
              className={selectClass}
            >
              <option value="">Estado</option>
              {TRIP_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              title="Filtrar por conductor"
              value={tripFilters.conductorId ?? ''}
              onChange={(e) => setTripFilters({ conductorId: e.target.value || null, page: 0 })}
              className={selectClass}
            >
              <option value="">Conductor</option>
              {conductors.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar movilización..."
                value={tripFilters.search ?? ''}
                onChange={(e) => setTripFilters({ search: e.target.value || null, page: 0 })}
                className={inputClass}
              />
            </div>
            {/* Rango de fechas */}
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-iconsa-gray whitespace-nowrap">Desde</label>
              <input
                type="date"
                title="Fecha desde"
                value={tripFilters.dateFrom ?? ''}
                onChange={(e) => handleDateFromChange(e.target.value || null)}
                className={selectClass}
              />
              <label className="text-xs text-iconsa-gray whitespace-nowrap">Hasta</label>
              <input
                type="date"
                title="Fecha hasta"
                value={tripFilters.dateTo ?? ''}
                onChange={(e) => handleDateToChange(e.target.value || null)}
                className={selectClass}
              />
            </div>
            {(tripFilters.projectId || tripFilters.status || tripFilters.conductorId || tripFilters.search || tripFilters.dateFrom || tripFilters.dateTo || tripFilters.singleDay) && (
              <button
                type="button"
                onClick={() => setTripFilters({ projectId: null, status: null, conductorId: null, search: null, dateFrom: null, dateTo: null, singleDay: null, page: 0 })}
                className="text-xs text-iconsa-blue hover:underline"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Calendario */}
        <div className="px-4 pb-3">
          <MiniCalendar
            items={calendarItems}
            selectedDate={tripFilters.singleDay ?? null}
            onSelectDate={handleCalendarClick}
          />
        </div>

        {/* Tabla de viajes */}
        <div className="px-1 pb-1">
          {listError && (
            <div className="mx-3 mb-3 rounded-lg bg-red-50 p-3 text-sm text-iconsa-red">
              Error al cargar movilizaciones: {listError}
            </div>
          )}

          <DataTable<TripWithRelations>
            columns={columns}
            data={trips}
            keyExtractor={(row) => row.id}
            loading={listLoading}
            emptyMessage="No hay movilizaciones para mostrar"
            mobileRender={mobileRender}
            expandedKeys={tripExpandedKeys}
            onExpandedKeysChange={setTripExpandedKeys}
            pagination="server"
            pageSize={tripFilters.pageSize}
            totalCount={tripsTotalCount}
            currentPage={tripFilters.page}
            onPageChange={(page) => setTripFilters({ page })}
            onPageSizeChange={(size) => setTripFilters({ pageSize: size, page: 0 })}
            externalSort={{
              column: tripFilters.sortColumn ?? null,
              direction: tripFilters.sortDirection ?? 'desc',
              onSortChange: (column, direction) => setTripFilters({ sortColumn: column, sortDirection: direction, page: 0 }),
            }}
            expandRender={(row) => {
              const assignments = row.assignments ?? []
              if (assignments.length === 0) return <p className="text-sm text-iconsa-gray">Sin líneas asignadas</p>
              return (
                <div className="space-y-1.5">
                  {assignments.map((a) => {
                    const line = a.line
                    if (!line) return null
                    const fromName = line.from_location?.name ?? line.from_text ?? '—'
                    const toName = line.to_location?.name ?? line.to_text ?? '—'
                    const unitName = line.unit?.code ?? line.unit_text ?? ''
                    const isEquipo = line.line_type === 'Equipo'
                    return (
                      <div key={a.id} className="flex items-center gap-2 text-sm py-1">
                        {isEquipo ? (
                          <Wrench className="h-3.5 w-3.5 shrink-0 text-iconsa-blue" />
                        ) : (
                          <Package className="h-3.5 w-3.5 shrink-0 text-gold" />
                        )}
                        <span className="font-medium text-gray-900 truncate max-w-[250px]" title={line.description}>
                          {line.description}
                        </span>
                        <span className="text-gray-300">·</span>
                        <span className="font-semibold text-gray-700 whitespace-nowrap bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                          {a.quantity_assigned} {unitName}
                        </span>
                        <span className="text-xs text-gray-400 whitespace-nowrap">{fromName} → {toName}</span>
                        {line.status !== 'Programada' && line.status !== 'En Transito' && (
                          <Badge label={line.status} variant="line" />
                        )}
                      </div>
                    )
                  })}
                  <a
                    href={`/programacion/viaje/${row.id}`}
                    onClick={(e) => { e.stopPropagation(); router.push(`/programacion/viaje/${row.id}`) }}
                    className="mt-1 inline-block text-xs font-medium text-iconsa-blue hover:underline"
                  >
                    Ver detalle de la movilización
                  </a>
                </div>
              )
            }}
          />
        </div>
      </section>

      {/* Modal Registrar entrega pickup (Surface 3) */}
      {pickupDeliveryLine && (
        <PickupDeliveryModal
          line={pickupDeliveryLine}
          receiverOptions={receiverOptions}
          onConfirm={handleCompletePickup}
          onClose={() => setPickupDeliveryLine(null)}
          loading={pickup.loading}
          error={pickup.error}
        />
      )}

      {/* Modal confirmación Devolver al backlog (Cambio 3 polish — revert pickup) */}
      {pickupRevertLine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">¿Devolver al backlog?</h3>
            <p className="mt-2 text-sm text-gray-600">
              La línea volverá a estado Pendiente y aparecerá en el backlog. Podrás programarla en un viaje o aprobarla como pickup de nuevo.
            </p>
            {pickup.error && (
              <p className="mt-2 text-sm text-red-600">{pickup.error}</p>
            )}
            <div className="mt-4 flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPickupRevertLine(null)}
                disabled={pickup.loading}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={confirmRevertPickup}
                loading={pickup.loading}
              >
                Devolver
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmación Aprobar pickup (Cambio 3 — Surface 1) */}
      {pickupConfirmLineId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Aprobar pickup</h3>
            <p className="mt-2 text-sm text-gray-600">
              ¿Aprobar como retiro por proyecto? La línea pasará a "Pickups Pendientes de Retiro" y dejará de aparecer en el backlog.
            </p>
            {pickup.error && (
              <p className="mt-2 text-sm text-red-600">{pickup.error}</p>
            )}
            <div className="mt-4 flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPickupConfirmLineId(null)}
                disabled={pickup.loading}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={confirmApprovePickup}
                loading={pickup.loading}
              >
                Aprobar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Aprobar viaje externo (Cambio 4 — Surface 1) */}
      {externalApproveModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl sm:p-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Aprobar viaje externo
            </h3>

            <ExternalApprovalForm
              values={externalApproveValues}
              onChange={setExternalApproveValues}
              errors={externalApproveErrors}
              lineFolderId={`external/${externalApproveModal.lineId}`}
              disabled={external.loading}
            />

            {external.error && (
              <p className="mt-3 text-sm text-red-600">{external.error}</p>
            )}

            <div className="mt-4 flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={closeExternalApproveModal}
                disabled={external.loading}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={confirmApproveExternal}
                loading={external.loading}
              >
                Aprobar viaje externo
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar entrega externo (Cambio 4 — Surface 3) */}
      {externalDeliveryLine && (
        <ExternalDeliveryModal
          line={externalDeliveryLine}
          receiverOptions={receiverOptions}
          onConfirm={handleCompleteExternal}
          onClose={() => setExternalDeliveryLine(null)}
          loading={external.loading}
          error={external.error}
        />
      )}

      {/* Modal Devolver al backlog externo (Cambio 4 — Surface 3 revert) */}
      {externalRevertLine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">¿Devolver al backlog?</h3>
            <p className="mt-2 text-sm text-gray-600">
              La línea volverá a estado Pendiente y aparecerá en el backlog. La factura subida queda preservada para evitar archivos huérfanos en Storage. Podrás programarla en un viaje, aprobarla como pickup, o aprobarla de nuevo como externo.
            </p>
            {external.error && (
              <p className="mt-2 text-sm text-red-600">{external.error}</p>
            )}
            <div className="mt-4 flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExternalRevertLine(null)}
                disabled={external.loading}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={confirmRevertExternal}
                loading={external.loading}
              >
                Devolver
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
