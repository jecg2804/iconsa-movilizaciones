'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Row } from '@/lib/types/database'

/** Códigos de tipo excluidos del dropdown de solicitudes (solo ingeniería — spec: NOT IN ING) */
const EXCLUDED_TYPE_CODES = '("ING")'

interface UseEquipmentReturn {
  /** Equipos activos aptos para líneas de solicitud (excluye solo ING; incluye VHL, VHP, TEC) */
  equipment: Row<'equipment'>[]
  loading: boolean
  error: string | null
}

export function useEquipment(): UseEquipmentReturn {
  const [equipment, setEquipment] = useState<Row<'equipment'>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function fetchEquipment() {
      try {
        setLoading(true)
        setError(null)

        const { data, error: fetchError } = await supabase
          .from('equipment')
          .select('*')
          .eq('status', 'Activo')
          .not('type_code', 'in', EXCLUDED_TYPE_CODES)
          .order('spectrum_code')

        if (fetchError) throw fetchError
        setEquipment(data ?? [])
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al cargar equipos'
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    fetchEquipment()
  }, [supabase])

  return { equipment, loading, error }
}
