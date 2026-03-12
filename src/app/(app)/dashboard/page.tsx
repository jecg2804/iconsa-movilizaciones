import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FileText, Package, Truck, CheckCircle, AlertTriangle } from 'lucide-react'
import { ROLE_LABELS, type AppRole } from '@/lib/utils/constants'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { SolicitudesByProjectChart, type ProjectData } from '@/components/dashboard/SolicitudesByProjectChart'
import { formatDate } from '@/lib/utils/format'
import type { RecentSolicitud, RecentTrip } from '@/components/dashboard/RecentActivity'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: person } = await supabase
    .from('people')
    .select('id, name, app_role')
    .eq('auth_id', user.id)
    .single()

  if (!person) redirect('/login')

  const role = person.app_role as AppRole

  // TODO: Re-enable role-based filtering when needed
  // Actualmente todos los roles ven todas las métricas globales

  // Fechas para queries
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
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]

  // Queries globales — todos los roles ven todas las métricas
  const buildPendientesQuery = () =>
    supabase
      .from('sm_requests')
      .select('id', { count: 'exact', head: true })
      .in('status', ['Enviada', 'En Proceso', 'Parcial'])

  const buildSinProgramarQuery = () =>
    supabase
      .from('sm_request_lines')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'Pendiente')

  const buildCompletadasQuery = () =>
    supabase
      .from('sm_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'Completada')
      .gte('updated_at', firstOfMonth)

  const buildRecentSolicitudesQuery = () =>
    supabase
      .from('sm_requests')
      .select(
        'id, request_id, status, priority, date_required, project:projects(code, name), requester:people!requester_id(name)',
      )
      .in('status', ['Borrador', 'Enviada', 'En Proceso', 'Parcial'])
      .order('updated_at', { ascending: false })
      .limit(5)

  // Queries paralelas
  const [
    pendientesResult,
    sinProgramarResult,
    viajesResult,
    completadasResult,
    recentSolicitudesResult,
    viajesHoyResult,
  ] = await Promise.all([
    buildPendientesQuery(),
    buildSinProgramarQuery(),
    // KPI 3: Viajes (global para todos)
    supabase
      .from('trips')
      .select('id', { count: 'exact', head: true })
      .in('status', ['Programado', 'En Ruta'])
      .gte('scheduled_date', today)
      .lte('scheduled_date', threeDaysLater),
    buildCompletadasQuery(),
    buildRecentSolicitudesQuery(),
    // Viajes hoy (global)
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

  // Mapear solicitudes recientes
  const rawSolicitudes = recentSolicitudesResult.data ?? []
  const rawTrips = viajesHoyResult.data ?? []

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

  const mesActual = new Date().toLocaleString('es-PA', {
    month: 'long',
    year: 'numeric',
  })

  // --- Chart + Backlog Crítico (visible para todos) ---
  let chartData: ProjectData[] = []
  let backlogCritico: Array<{
    id: string
    description: string
    project_code: string
    request_id: string
    date_required: string
    priority: string
    line_type: string
  }> = []

  // Chart: solicitudes activas por proyecto
  const { data: chartRaw } = await supabase
    .from('sm_requests')
    .select('project_id, project:projects(code, name)')
    .in('status', ['Enviada', 'En Proceso', 'Parcial'])

  if (chartRaw) {
    const countsByProject = new Map<string, { code: string; name: string; count: number }>()
    for (const row of chartRaw) {
      const proj = Array.isArray(row.project) ? row.project[0] : row.project
      if (!proj) continue
      const key = row.project_id
      const existing = countsByProject.get(key)
      if (existing) {
        existing.count++
      } else {
        countsByProject.set(key, { code: proj.code, name: proj.name, count: 1 })
      }
    }
    chartData = Array.from(countsByProject.values()).sort((a, b) => b.count - a.count)
  }

  // Backlog crítico: líneas pendientes cuya solicitud tiene date_required vencida o >7 días sin programar
  const { data: backlogRaw } = await supabase
    .from('sm_request_lines')
    .select(
      'id, description, line_type, sm_requests!inner(request_id, date_required, priority, project:projects(code))',
    )
    .eq('status', 'Pendiente')
    .order('created_at', { ascending: true })
    .limit(10)

  if (backlogRaw) {
    backlogCritico = backlogRaw
      .map((row) => {
        const req = Array.isArray(row.sm_requests) ? row.sm_requests[0] : row.sm_requests
        if (!req) return null
        const proj = Array.isArray(req.project) ? req.project[0] : req.project
        // Solo mostrar si la fecha requerida ya pasó o fue hace más de 7 días sin programar
        const dateRequired = req.date_required
        if (dateRequired > sevenDaysAgo && dateRequired > today) return null
        return {
          id: row.id,
          description: row.description,
          project_code: proj?.code ?? '',
          request_id: req.request_id ?? '',
          date_required: dateRequired,
          priority: req.priority ?? 'Normal',
          line_type: row.line_type,
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
  }

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
          sublabel="Enviadas + En Proceso + Parcial"
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

      {/* Chart + Backlog Crítico */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Chart: Solicitudes por Proyecto */}
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-900">
                Solicitudes Activas por Proyecto
              </h2>
            </div>
            <div className="p-4">
              <SolicitudesByProjectChart data={chartData} />
            </div>
          </div>

          {/* Backlog Crítico */}
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-iconsa-orange" />
              <h2 className="text-sm font-semibold text-gray-900">Backlog Crítico</h2>
            </div>

            {backlogCritico.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-iconsa-gray">No hay líneas críticas pendientes</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {backlogCritico.map((item) => (
                  <li key={item.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {item.description}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-iconsa-gray">
                          <span className="font-mono font-semibold text-navy">{item.request_id}</span>
                          <span>{item.project_code}</span>
                          <span>Req. {formatDate(item.date_required)}</span>
                        </div>
                      </div>
                      <span className="text-xs text-iconsa-gray">{formatDate(item.date_required)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {backlogCritico.length > 0 && (
              <div className="border-t border-gray-100 px-4 py-2">
                <Link
                  href="/programacion"
                  className="text-xs font-medium text-iconsa-blue hover:underline"
                >
                  Ver backlog completo →
                </Link>
              </div>
            )}
          </div>
      </div>

      {/* Actividad reciente */}
      <RecentActivity solicitudes={recentSolicitudes} trips={recentTrips} />
    </div>
  )
}
