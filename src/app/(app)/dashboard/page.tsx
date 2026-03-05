import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ROLE_LABELS, type AppRole } from '@/lib/utils/constants'

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

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <div className="mt-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <p className="text-lg text-gray-700">
          Bienvenido, <span className="font-semibold">{person.name}</span>
        </p>
        <p className="mt-1 text-sm text-iconsa-gray">
          Rol: {ROLE_LABELS[role]}
        </p>
      </div>

      {/* Placeholder para KPIs — Fase 5 */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          'Solicitudes Pendientes',
          'Ítems Sin Programar',
          'Viajes Programados',
          'Completadas',
        ].map((label) => (
          <div
            key={label}
            className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200"
          >
            <p className="text-sm text-iconsa-gray">{label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">—</p>
          </div>
        ))}
      </div>
    </div>
  )
}
