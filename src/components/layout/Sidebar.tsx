'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  Calendar,
  Truck,
  Settings,
} from 'lucide-react'
import { ROLE_ROUTES, type AppRole } from '@/lib/utils/constants'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const ALL_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Solicitudes', href: '/solicitudes', icon: FileText },
  { label: 'Programación', href: '/programacion', icon: Calendar },
  { label: 'Mis Movilizaciones', href: '/mis-viajes', icon: Truck },
  { label: 'Admin', href: '/admin', icon: Settings },
]

interface SidebarProps {
  role: AppRole
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()

  const allowedRoutes = ROLE_ROUTES[role] ?? []
  const navItems = ALL_NAV_ITEMS.filter((item) =>
    allowedRoutes.some((route) => item.href.startsWith(route)),
  )

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 bg-navy">
      {/* Logo */}
      <div className="flex h-14 items-center px-5">
        <Link href="/dashboard" className="text-xl font-bold text-white">
          Movimient<span className="text-gold">OS</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="mt-4 flex-1 space-y-1 px-3">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium
                transition-colors duration-150
                ${
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }
              `}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 px-5 py-3">
        <p className="text-xs text-white/40">ICONSA © 2026</p>
      </div>
    </aside>
  )
}

export { ALL_NAV_ITEMS }
export type { NavItem }
