'use client'

import { CalendarDays } from 'lucide-react'

export default function CalendarioPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <CalendarDays className="h-12 w-12 text-gray-300 mb-4" />
      <h1 className="text-xl font-semibold text-navy mb-2">
        Calendario de Viajes
      </h1>
      <p className="text-sm italic text-iconsa-gray">
        Vista de calendario — disponible próximamente
      </p>
    </div>
  )
}
