'use client'

import { useRouter } from 'next/navigation'
import { Menu, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ROLE_LABELS, type AppRole } from '@/lib/utils/constants'

interface TopbarProps {
  personName: string
  role: AppRole
  onToggleMobile: () => void
}

export function Topbar({ personName, role, onToggleMobile }: TopbarProps) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-gray-200 bg-white px-4 md:pl-64">
      {/* Hamburger — solo mobile */}
      <button
        onClick={onToggleMobile}
        className="rounded-lg p-1.5 text-iconsa-gray hover:bg-gray-100 md:hidden"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* User info */}
      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-gray-900">{personName}</p>
          <p className="text-xs text-iconsa-gray">{ROLE_LABELS[role]}</p>
        </div>

        {/* Badge de rol — visible en mobile */}
        <span className="inline-flex items-center rounded-full bg-navy/10 px-2.5 py-0.5 text-xs font-medium text-navy sm:hidden">
          {ROLE_LABELS[role]}
        </span>

        <button
          onClick={handleSignOut}
          className="rounded-lg p-1.5 text-iconsa-gray hover:bg-gray-100"
          title="Cerrar sesión"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  )
}
