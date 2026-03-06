import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FileText, Package, Truck, CheckCircle } from 'lucide-react'
import { ROLE_LABELS, type AppRole } from '@/lib/utils/constants'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import type { RecentSolicitud, RecentTrip } from '@/components/dashboard/RecentActivity'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: person } = await supabase
    .from('people')
    .select('name, app_role')
    .eq('auth_id', user.id)
    .single()

  if (!person) redirect('/login')

  const role = person.app_role as AppRole

  // Fechas para los queries
  const today = new Date().toISOString().split('T')[0]
  const firstOfMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  )
    .toISOString()
    .split('T')[0]
  const threeDaysLater = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]

  // Queries paralelas para los KPIs
  const [
    pendientesResult,
    sinProgramarResult,
    viajesResult,
    completadasResult,
    recentSolicitudesResult,
    viajesHoyResult,
  ] = await Promise.all([
    // KPI 1: Solicitudes en estados activos (Enviada + En Proceso)
    supabase
      .from('sm_requests')
      .select('id', { count: 'exact', head: true })
      .in('status', ['Enviada', 'En Proceso']),

    // KPI 2: Líneas pendientes de programar
    supabase
      .from('sm_request_lines')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'Pendiente'),

    // KPI 3: Viajes activos para hoy y próximos 3 días
    supabase
      .from('trips')
      .select('id', { count: 'exact', head: true })
      .in('status', ['Programado', 'En Ruta'])
      .gte('scheduled_date', today)
      .lte('scheduled_date', threeDaysLater),

    // KPI 4: Solicitudes completadas este mes
    supabase
      .from('sm_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'Completada')
      .gte('updated_at', firstOfMonth),

    // Solicitudes activas recientes (últimas 5)
    supabase
      .from('sm_requests')
      .select(
        'id, request_id, status, priority, date_required, project:projects(code, name), requester:people!requester_id(name)',
      )
      .in('status', ['Borrador', 'Enviada', 'En Proceso', 'Parcial'])
      .order('updated_at', { ascending: false })
      .limit(5),

    // Viajes de hoy
    supabase
      .from('trips')
      .select(
        'id, trip_id, scheduled_date, status, driver:people!driver_id(name), vehicle:equipment!vehicle_id(description)',
      )
      .in('status', ['Programado', 'En Ruta'])
      .eq('scheduled_date', today)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const pendientesCount = pendientesResult.count ?? 0
  const sinProgramarCount = sinProgramarResult.count ?? 0
  const viajesCount = viajesResult.count ?? 0
  const completadasCount = completadasResult.count ?? 0

  // Extraer arrays para actividad reciente con tipos seguros
  const rawSolicitudes = recentSolicitudesResult.data ?? []
  const rawTrips = viajesHoyResult.data ?? []

  // Mapear a tipos de RecentActivity (aplanar relaciones que Supabase retorna como array o objeto)
  const recentSolicitudes: RecentSolicitud[] = rawSolicitudes.map((s) => ({
    id: s.id,
    request_id: s.request_id,
    status: s.status,
    priority: s.priority,
    date_required: s.date_required,
    project: Array.isArray(s.project) ? (s.project[0] ?? null) : s.project,
    requester: Array.isArray(s.requester) ? (s.requester[0] ?? null) : s.requester,
  }))

  const recentTrips: RecentTrip[] = rawTrips.map((t) => ({
    id: t.id,
    trip_id: t.trip_id,
    scheduled_date: t.scheduled_date,
    status: t.status,
    driver: Array.isArray(t.driver) ? (t.driver[0] ?? null) : t.driver,
    vehicle: Array.isArray(t.vehicle) ? (t.vehicle[0] ?? null) : t.vehicle,
  }))

  // Mes actual para sublabel
  const mesActual = new Date().toLocaleString('es-PA', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 pb-8 pt-4 sm:px-6 sm:pt-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-iconsa-gray">
          Bienvenido, <span className="font-medium text-gray-700">{person.name}</span>
          {' · '}
          {ROLE_LABELS[role]}
        </p>
      </div>

      {/* Grid de KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Solicitudes Pendientes"
          value={pendientesCount}
          sublabel="Enviadas + En Proceso"
          icon={FileText}
          color="orange"
        />
        <KpiCard
          label="Ítems Sin Programar"
          value={sinProgramarCount}
          sublabel="Líneas pendientes"
          icon={Package}
          color="blue"
        />
        <KpiCard
          label="Viajes Próximos"
          value={viajesCount}
          sublabel="Hoy + próximos 3 días"
          icon={Truck}
          color="navy"
        />
        <KpiCard
          label="Completadas (mes)"
          value={completadasCount}
          sublabel={mesActual}
          icon={CheckCircle}
          color="green"
        />
      </div>

      {/* Actividad reciente */}
      <RecentActivity solicitudes={recentSolicitudes} trips={recentTrips} />
    </div>
  )
}
