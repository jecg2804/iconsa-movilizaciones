import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import type { AppRole } from '@/lib/utils/constants'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Buscar persona asociada al usuario autenticado
  const { data: person } = await supabase
    .from('people')
    .select('name, app_role')
    .eq('auth_id', user.id)
    .single()

  if (!person?.app_role) {
    // Usuario sin rol asignado — no tiene acceso
    redirect('/login')
  }

  return (
    <AppShell personName={person.name} role={person.app_role as AppRole}>
      {children}
    </AppShell>
  )
}
