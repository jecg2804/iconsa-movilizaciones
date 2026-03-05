'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Row } from '@/lib/types/database'
import type { AppRole } from '@/lib/utils/constants'

interface AuthState {
  user: User | null
  person: Row<'people'> | null
  role: AppRole | null
  loading: boolean
  userProjects: Row<'projects'>[]
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    person: null,
    role: null,
    loading: true,
    userProjects: [],
  })

  const supabase = createClient()

  const fetchPersonAndProjects = useCallback(
    async (userId: string) => {
      // Buscar persona por auth_id
      const { data: person } = await supabase
        .from('people')
        .select('*')
        .eq('auth_id', userId)
        .single()

      if (!person) {
        setState((prev) => ({ ...prev, person: null, role: null, userProjects: [], loading: false }))
        return
      }

      // Buscar proyectos asignados (para PM)
      const { data: personProjects } = await supabase
        .from('person_projects')
        .select('project_id')
        .eq('person_id', person.id)
        .eq('is_active', true)

      const projectIds = personProjects?.map((pp) => pp.project_id) ?? []

      let projects: Row<'projects'>[] = []
      if (projectIds.length > 0) {
        const { data } = await supabase
          .from('projects')
          .select('*')
          .in('id', projectIds)
        projects = data ?? []
      }

      setState((prev) => ({
        ...prev,
        person,
        role: person.app_role as AppRole | null,
        userProjects: projects,
        loading: false,
      }))
    },
    [supabase],
  )

  useEffect(() => {
    // Obtener sesión actual
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setState((prev) => ({ ...prev, user }))
        fetchPersonAndProjects(user.id)
      } else {
        setState((prev) => ({ ...prev, loading: false }))
      }
    })

    // Escuchar cambios de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null
      setState((prev) => ({ ...prev, user }))

      if (user) {
        fetchPersonAndProjects(user.id)
      } else {
        setState({
          user: null,
          person: null,
          role: null,
          loading: false,
          userProjects: [],
        })
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchPersonAndProjects, supabase.auth])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [supabase.auth])

  return {
    ...state,
    signOut,
    userProjectIds: state.userProjects.map((p) => p.id),
  }
}
