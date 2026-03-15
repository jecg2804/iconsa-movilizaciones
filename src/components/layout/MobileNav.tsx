'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'
import { ROLE_ROUTES, type AppRole } from '@/lib/utils/constants'
import { ALL_NAV_ITEMS } from './Sidebar'

interface MobileNavProps {
  role: AppRole
  open: boolean
  onClose: () => void
}

export function MobileNav({ role, open, onClose }: MobileNavProps) {
  const pathname = usePathname()

  // Cerrar al navegar
  useEffect(() => {
    onClose()
  }, [pathname, onClose])

  // Prevenir scroll del body cuando está abierto
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  const allowedRoutes = ROLE_ROUTES[role] ?? []
  const navItems = ALL_NAV_ITEMS.filter((item) =>
    allowedRoutes.some((route) => item.href.startsWith(route)),
  )

  return (
    <div className="fixed inset-0 z-40 md:hidden">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="fixed inset-y-0 left-0 w-64 bg-navy shadow-xl">
        {/* Header */}
        <div className="flex h-14 items-center justify-between px-5">
          <span className="text-xl font-bold text-white">
            Movimient<span className="text-gold">OS</span>
          </span>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/70 hover:text-white"
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="mt-4 space-y-1 px-3">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium
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
      </div>
    </div>
  )
}
