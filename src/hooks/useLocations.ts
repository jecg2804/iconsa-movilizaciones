'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Row } from '@/lib/types/database'

interface UseLocationsReturn {
  /** Ubicaciones activas para dropdowns Desde/Hasta */
  locations: Row<'locations'>[]
  loading: boolean
  error: string | null
}

export function useLocations(): UseLocationsReturn {
  const [locations, setLocations] = useState<Row<'locations'>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function fetchLocations() {
      try {
        setLoading(true)
        setError(null)

        const { data, error: fetchError } = await supabase
          .from('locations')
          .select('*')
          .eq('is_active', true)
          .order('name')

        if (fetchError) throw fetchError
        setLocations(data ?? [])
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al cargar ubicaciones'
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    fetchLocations()
  }, [supabase])

  return { locations, loading, error }
}
