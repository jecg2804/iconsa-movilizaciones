'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Row } from '@/lib/types/database'

interface UseVehiclesReturn {
  /** Vehículos activos aptos para cabezal de viaje (VHL y VHP) */
  vehicles: Row<'equipment'>[]
  /** Remolques activos filtrados por descripción (CAMA, PLATAFORMA, REMOLQUE) */
  trailers: Row<'equipment'>[]
  loading: boolean
  error: string | null
}

export function useVehicles(): UseVehiclesReturn {
  const [vehicles, setVehicles] = useState<Row<'equipment'>[]>([])
  const [trailers, setTrailers] = useState<Row<'equipment'>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function fetchVehicles() {
      try {
        setLoading(true)
        setError(null)

        const [vehiclesResult, trailersResult] = await Promise.all([
          // Vehículos de transporte: cabezales y plataformas propulsadas
          supabase
            .from('equipment')
            .select('*')
            .eq('status', 'Activo')
            .in('type_code', ['VHL', 'VHP'])
            .order('spectrum_code'),

          // Remolques: camas, plataformas y remolques sin propulsión propia
          supabase
            .from('equipment')
            .select('*')
            .eq('status', 'Activo')
            .or('description.ilike.%CAMA%,description.ilike.%PLATAFORMA%,description.ilike.%REMOLQUE%')
            .order('spectrum_code'),
        ])

        if (vehiclesResult.error) throw vehiclesResult.error
        if (trailersResult.error) throw trailersResult.error

        setVehicles(vehiclesResult.data ?? [])
        setTrailers(trailersResult.data ?? [])
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al cargar vehículos'
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    fetchVehicles()
  }, [supabase])

  return { vehicles, trailers, loading, error }
}
