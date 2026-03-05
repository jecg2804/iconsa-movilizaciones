'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import type { Row } from '@/lib/types/database'

interface UseProjectsReturn {
  /** Todos los proyectos activos (para filtros y dropdowns globales) */
  allProjects: Row<'projects'>[]
  /** Proyectos asignados al usuario actual via person_projects (para crear/editar) */
  userProjects: Row<'projects'>[]
  loading: boolean
  error: string | null
}

export function useProjects(): UseProjectsReturn {
  const [allProjects, setAllProjects] = useState<Row<'projects'>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = useMemo(() => createClient(), [])
  const { userProjects, loading: authLoading } = useAuth()

  useEffect(() => {
    async function fetchProjects() {
      try {
        setLoading(true)
        setError(null)

        const { data, error: fetchError } = await supabase
          .from('projects')
          .select('*')
          .eq('status', 'Activo')
          .order('code')

        if (fetchError) throw fetchError
        setAllProjects(data ?? [])
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al cargar proyectos'
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [supabase])

  return {
    allProjects,
    userProjects,
    loading: loading || authLoading,
    error,
  }
}
