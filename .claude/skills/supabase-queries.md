# Skill: Queries de Supabase

Patrones estándar para queries en este proyecto.

## Cliente correcto
- **Server Components / Route Handlers:** `import { createClient } from '@/lib/supabase/server'`
- **Client Components (hooks):** `import { createClient } from '@/lib/supabase/client'`

## Query con relaciones (joins)
```typescript
const { data, error } = await supabase
  .from('sm_requests')
  .select(`
    *,
    project:projects!sm_requests_project_id_fkey(id, code, name),
    requester:people!sm_requests_requester_id_fkey(id, name),
    lines:sm_request_lines(id, status)
  `)
  .order('date_required', { ascending: true })
```

## Filtros dinámicos
```typescript
let query = supabase.from('tabla').select('...')
if (filtro.projectId) query = query.eq('project_id', filtro.projectId)
if (filtro.statuses.length > 0) query = query.in('status', filtro.statuses)
```

## Filtros de equipos
- Solicitud (ingeniero escoge equipo): `type_code NOT IN ('ING')`
- Vehículo (Charris): `type_code IN ('VHL','VHP')`
- Remolque: filtrar por description ILIKE '%CAMA%' OR '%PLATAFORMA%' OR '%REMOLQUE%'

## Filtros de personas
- Conductor: filtrar por app_role = 'campo' O por lista específica de Charris (TBD)
- Solicitante: mostrar personas con app_role IN ('pm', 'admin')
- Aprobado por: mismo que solicitante

## Manejo de errores
```typescript
if (error) {
  console.error('Error:', error.message)
  setError(error.message)
  return
}
```

## NUNCA
- No usar `supabase.rpc()` sin verificar que la función existe
- No hacer queries sin tipado (usar Database types)
- No hardcodear UUIDs
- No usar `user_app_roles` en código MVP — usar `people.app_role` por ahora
- `user_app_roles` es fundación multi-app, se usa cuando se construya segunda app
