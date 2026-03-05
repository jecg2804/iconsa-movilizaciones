'use client'

import { useState, useCallback } from 'react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { MobileNav } from './MobileNav'
import type { AppRole } from '@/lib/utils/constants'

interface AppShellProps {
  personName: string
  role: AppRole
  children: React.ReactNode
}

export function AppShell({ personName, role, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleClose = useCallback(() => setMobileOpen(false), [])

  return (
    <>
      <Sidebar role={role} />
      <MobileNav role={role} open={mobileOpen} onClose={handleClose} />

      <div className="md:pl-60">
        <Topbar
          personName={personName}
          role={role}
          onToggleMobile={() => setMobileOpen((prev) => !prev)}
        />
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </>
  )
}
